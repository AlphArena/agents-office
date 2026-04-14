import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  walletAddress: string;
  balance: number; // in USDC atomic units (6 decimals)
  totalDeposited: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    totalDeposited: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export interface ITransaction extends Document {
  walletAddress: string;
  type: "deposit" | "spend";
  amount: number;
  txSignature?: string;
  agentName?: string;
  task?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    walletAddress: { type: String, required: true, index: true },
    type: { type: String, enum: ["deposit", "spend"], required: true },
    amount: { type: Number, required: true },
    txSignature: { type: String },
    agentName: { type: String },
    task: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", transactionSchema);
