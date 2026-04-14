import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { connectDB } from "@/lib/db";
import { User, Transaction } from "@/lib/models";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TREASURY_WALLET = process.env.TREASURY_WALLET || "";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Used tx signatures to prevent replay
const usedSignatures = new Set<string>();

// POST /api/credits — verify USDC deposit and add to balance
export async function POST(req: NextRequest) {
  const { walletAddress, txSignature, amount } = await req.json();

  if (!walletAddress || !txSignature) {
    return NextResponse.json({ error: "walletAddress and txSignature required" }, { status: 400 });
  }

  if (usedSignatures.has(txSignature)) {
    return NextResponse.json({ error: "Transaction already used" }, { status: 400 });
  }

  // Verify tx on-chain
  const conn = new Connection(RPC_URL, "confirmed");

  let tx = null;
  for (let i = 0; i < 5; i++) {
    tx = await conn.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (tx) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 400 });
  }

  if (tx.meta?.err) {
    return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
  }

  // Find USDC transfer to treasury
  let depositAmount = 0;
  const instructions = tx.transaction.message.instructions;

  for (const ix of instructions) {
    if (!("parsed" in ix)) continue;
    if (ix.program !== "spl-token") continue;
    if (ix.parsed.type !== "transferChecked" && ix.parsed.type !== "transfer") continue;

    const info = ix.parsed.info;
    const destination = info.destination;

    // Resolve destination ATA to owner
    const destInfo = await conn.getParsedAccountInfo(new PublicKey(destination));
    if (!destInfo.value) continue;
    const destData = destInfo.value.data as any;
    if (!("parsed" in destData)) continue;

    const destOwner = destData.parsed?.info?.owner;
    const destMint = destData.parsed?.info?.mint;

    if (destOwner === TREASURY_WALLET && destMint === USDC_MINT) {
      depositAmount = ix.parsed.type === "transferChecked"
        ? Number(info.tokenAmount?.amount || info.amount)
        : Number(info.amount);
      break;
    }
  }

  if (depositAmount <= 0) {
    return NextResponse.json({ error: "No USDC transfer to treasury found" }, { status: 400 });
  }

  usedSignatures.add(txSignature);

  // Update user balance
  await connectDB();

  const user = await User.findOneAndUpdate(
    { walletAddress },
    {
      $inc: { balance: depositAmount, totalDeposited: depositAmount },
      $setOnInsert: { walletAddress },
    },
    { upsert: true, new: true }
  );

  // Record transaction
  await Transaction.create({
    walletAddress,
    type: "deposit",
    amount: depositAmount,
    txSignature,
  });

  return NextResponse.json({
    balance: user.balance,
    deposited: depositAmount,
    depositedHuman: depositAmount / 1_000_000,
  });
}
