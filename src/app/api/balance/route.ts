import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

// GET /api/balance?wallet=xxx — get user balance
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ walletAddress: wallet });

  if (!user) {
    return NextResponse.json({ balance: 0, totalDeposited: 0, totalSpent: 0 });
  }

  return NextResponse.json({
    balance: user.balance,
    totalDeposited: user.totalDeposited,
    totalSpent: user.totalSpent,
  });
}
