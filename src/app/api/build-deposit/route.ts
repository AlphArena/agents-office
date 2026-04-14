import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferCheckedInstruction } from "@solana/spl-token";
import bs58 from "bs58";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TREASURY_WALLET = process.env.TREASURY_WALLET || "";

let keypair: Keypair | null = null;
let connection: Connection | null = null;

function getKeypair(): Keypair {
  if (!keypair) {
    const key = process.env.TREASURY_PRIVATE_KEY;
    if (!key) throw new Error("TREASURY_PRIVATE_KEY required");
    keypair = Keypair.fromSecretKey(bs58.decode(key));
  }
  return keypair;
}

function getConn(): Connection {
  if (!connection) connection = new Connection(RPC_URL, "confirmed");
  return connection;
}

// POST /api/build-deposit — build a gasless USDC deposit tx (treasury pays gas)
export async function POST(req: NextRequest) {
  const { wallet, amount } = await req.json();

  if (!wallet || !amount || amount <= 0) {
    return NextResponse.json({ error: "wallet and amount required" }, { status: 400 });
  }

  try {
    const conn = getConn();
    const treasury = getKeypair();
    const userPubkey = new PublicKey(wallet);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);

    const sourceATA = getAssociatedTokenAddressSync(USDC_MINT, userPubkey);
    const destATA = getAssociatedTokenAddressSync(USDC_MINT, treasuryPubkey);

    const { blockhash } = await conn.getLatestBlockhash();

    // Treasury pays gas — user only signs the USDC transfer
    const tx = new Transaction({
      feePayer: treasury.publicKey,
      recentBlockhash: blockhash,
    });

    tx.add(
      createTransferCheckedInstruction(
        sourceATA,
        USDC_MINT,
        destATA,
        userPubkey,
        BigInt(amount),
        USDC_DECIMALS,
      ),
    );

    // Treasury signs as fee payer
    tx.partialSign(treasury);

    const serialized = tx.serialize({ requireAllSignatures: false });

    return NextResponse.json({
      transaction: serialized.toString("base64"),
      blockhash,
      amount,
    });
  } catch (err) {
    console.error("build-deposit error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to build transaction" }, { status: 500 });
  }
}
