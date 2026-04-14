import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import nacl from "tweetnacl";
import bs58 from "bs58";

// POST /api/auth — verify wallet signature, create or return user
export async function POST(req: NextRequest) {
  const { walletAddress, signature, message } = await req.json();

  if (!walletAddress || !signature || !message) {
    return NextResponse.json({ error: "walletAddress, signature, and message are required" }, { status: 400 });
  }

  // Verify signature
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  await connectDB();

  // Find or create user
  let user = await User.findOne({ walletAddress });
  if (!user) {
    user = await User.create({ walletAddress, balance: 0 });
  }

  return NextResponse.json({
    walletAddress: user.walletAddress,
    balance: user.balance,
    totalDeposited: user.totalDeposited,
    totalSpent: user.totalSpent,
  });
}
