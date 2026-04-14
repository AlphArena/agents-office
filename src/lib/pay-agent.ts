import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferCheckedInstruction, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import { AGENT_WALLETS, AGENT_PAY } from "./agent-wallets";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;

let treasuryKeypair: Keypair | null = null;
let connection: Connection | null = null;

function getTreasuryKeypair(): Keypair {
  if (!treasuryKeypair) {
    const key = process.env.TREASURY_PRIVATE_KEY;
    if (!key) throw new Error("TREASURY_PRIVATE_KEY is required for agent payments");
    treasuryKeypair = Keypair.fromSecretKey(bs58.decode(key));
  }
  return treasuryKeypair;
}

function getConnection(): Connection {
  if (!connection) {
    const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    connection = new Connection(rpc, "confirmed");
  }
  return connection;
}

export async function payAgent(agentName: string): Promise<{ success: boolean; txSignature?: string; error?: string }> {
  const agentWallet = AGENT_WALLETS[agentName.toLowerCase()];
  if (!agentWallet) {
    return { success: false, error: `Unknown agent: ${agentName}` };
  }

  try {
    const treasury = getTreasuryKeypair();
    const conn = getConnection();
    const agentPubkey = new PublicKey(agentWallet);

    const sourceATA = getAssociatedTokenAddressSync(USDC_MINT, treasury.publicKey);
    const destATA = getAssociatedTokenAddressSync(USDC_MINT, agentPubkey);

    const { blockhash } = await conn.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: treasury.publicKey,
      recentBlockhash: blockhash,
    });

    // Create agent's ATA if it doesn't exist
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        treasury.publicKey,
        destATA,
        agentPubkey,
        USDC_MINT,
      ),
      createTransferCheckedInstruction(
        sourceATA,
        USDC_MINT,
        destATA,
        treasury.publicKey,
        BigInt(AGENT_PAY),
        USDC_DECIMALS,
      ),
    );

    tx.sign(treasury);
    const txSignature = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });

    return { success: true, txSignature };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment failed";
    console.error(`Failed to pay agent ${agentName}:`, message);
    return { success: false, error: message };
  }
}
