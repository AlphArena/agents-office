"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

const PRESETS = [
  { label: "$0.10", amount: 100000 },
  { label: "$0.50", amount: 500000 },
  { label: "$1.00", amount: 1000000 },
  { label: "$5.00", amount: 5000000 },
];

const MIN_DEPOSIT = 10000; // $0.01 minimum

export default function CreditsPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  async function loadBalance() {
    if (!publicKey) return;
    const res = await fetch(`/api/balance?wallet=${publicKey.toBase58()}`);
    const d = await res.json();
    setBalance(d.balance || 0);
  }

  async function deposit(amountAtomic: number) {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    setStatus("Building transaction...");

    try {
      // Step 1: Backend builds the tx (treasury pays gas)
      const buildRes = await fetch("/api/build-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58(), amount: amountAtomic }),
      });

      if (!buildRes.ok) {
        const err = await buildRes.json();
        throw new Error(err.error || "Failed to build transaction");
      }

      const { transaction: txBase64 } = await buildRes.json();

      // Step 2: User signs (gasless — treasury already signed as feePayer)
      setStatus("Approve USDC transfer (gasless)...");
      const tx = Transaction.from(Buffer.from(txBase64, "base64"));
      const signed = await signTransaction(tx);

      // Step 3: Send to Solana
      const txSig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });

      setStatus("Confirming on Solana...");
      await new Promise((r) => setTimeout(r, 5000));

      // Step 4: Verify deposit and add to balance
      setStatus("Verifying deposit...");
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          txSignature: txSig,
          amount: amountAtomic,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
        setStatus(`Deposited ${(amountAtomic / 1_000_000).toFixed(2)} USDC — ${Math.floor(data.balance / 50)} agent calls available`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setStatus(msg.includes("User rejected") ? "Transaction cancelled" : `Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  // Load balance on mount
  if (publicKey && balance === null) loadBalance();

  return (
    <main className="flex-1 flex flex-col items-center justify-center font-[family-name:var(--font-mono)] bg-[#0c0c14] min-h-screen px-4">
      <div className="max-w-sm w-full">
        <Link href="/office" className="text-[10px] text-[#5a5a6a] hover:text-white transition-colors mb-6 inline-block">
          ← back to office
        </Link>

        <h1 className="text-lg font-bold text-white mb-2">Load Credits</h1>
        <p className="text-xs text-[#6a6a8a] mb-6">
          Deposit USDC to your account. Each agent call costs $0.00005.
        </p>

        {/* Wallet */}
        <div className="mb-6">
          <WalletMultiButton className="!bg-[#1a1a2e] !border !border-[#2a2a3a] !text-[#8b8ba0] !text-xs !font-medium !rounded-lg !h-10 !w-full !justify-center" />
        </div>

        {connected && publicKey && (
          <>
            {/* Balance */}
            <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded-lg p-4 mb-6">
              <p className="text-[10px] text-[#5a5a6a] mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-emerald-400">
                {balance !== null ? (balance / 1_000_000).toFixed(4) : "..."} <span className="text-sm text-[#5a5a6a]">USDC</span>
              </p>
              {balance !== null && (
                <p className="text-[10px] text-[#4a4a5a] mt-1">
                  ~{Math.floor(balance / 50)} agent calls remaining
                </p>
              )}
            </div>

            {/* Deposit presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.amount}
                  onClick={() => deposit(p.amount)}
                  disabled={loading}
                  className="bg-[#1a1a2e] border border-[#2a2a3a] hover:border-[#fbbf24]/30 rounded-lg py-3 text-center transition-colors disabled:opacity-40"
                >
                  <p className="text-sm font-bold text-white">{p.label}</p>
                  <p className="text-[9px] text-[#5a5a6a]">{(p.amount / 50).toLocaleString()} calls</p>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#5a5a6a]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                  className="w-full bg-[#1a1a2e] border border-[#2a2a3a] rounded-lg py-2.5 pl-6 pr-3 text-sm text-white placeholder-[#3a3a4a] outline-none focus:border-[#fbbf24]/30 disabled:opacity-40"
                />
              </div>
              <button
                onClick={() => {
                  const val = parseFloat(customAmount);
                  if (!val || val < 0.01) return;
                  deposit(Math.round(val * 1_000_000));
                }}
                disabled={loading || !customAmount || parseFloat(customAmount) < 0.01}
                className="bg-[#fbbf24] text-black px-4 rounded-lg text-xs font-bold hover:bg-[#fbbf24]/80 transition-colors disabled:opacity-40"
              >
                Deposit
              </button>
            </div>
            {customAmount && parseFloat(customAmount) >= 0.01 && (
              <p className="text-[9px] text-[#4a4a5a] mb-4 -mt-2">
                = {Math.floor(parseFloat(customAmount) * 1_000_000 / 50).toLocaleString()} agent calls
              </p>
            )}

            {/* Status */}
            {status && (
              <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded-lg px-3 py-2 text-[10px] text-[#8b8ba0]">
                {status}
              </div>
            )}
          </>
        )}

        {!connected && (
          <p className="text-xs text-[#4a4a5a] text-center py-8">
            Connect your wallet to load credits
          </p>
        )}
      </div>
    </main>
  );
}
