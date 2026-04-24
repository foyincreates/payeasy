import { Metadata } from "next";
import { Suspense } from "react";
import TransactionList from "@/components/history/TransactionList";
import TransactionListSkeleton from "@/components/history/TransactionListSkeleton";
import { History, LayoutDashboard, Database } from "lucide-react";
import Link from "next/link";
import { type Transaction } from "@/components/history/TransactionCard";

export const metadata: Metadata = {
  title: "Transaction History | PayEasy",
  description: "View your recent escrow contributions and rent payments verified on the Stellar blockchain.",
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    type: "contribute",
    amount: "450.00 XLM",
    status: "success",
    timestamp: "2026-03-28T14:30:00.000Z",
    txHash: "7b4c8a2e1d0f5g9h3j6k5l8m4n2p9q0r1s7t4u3v6w5x8y2z1a0b5c9d8e7f6g5h",
  },
  {
    id: "tx-2",
    type: "release",
    amount: "1,250.00 XLM",
    status: "success",
    timestamp: "2026-03-25T09:12:45.000Z",
    txHash: "0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f",
  },
  {
    id: "tx-3",
    type: "contribute",
    amount: "450.00 XLM",
    status: "success",
    timestamp: "2026-03-22T18:45:12.000Z",
    txHash: "f1e2d3c4b5a6978876543210123456789abcdef0fedcba9876543210abcdefab",
  },
  {
    id: "tx-4",
    type: "refund",
    amount: "150.00 XLM",
    status: "success",
    timestamp: "2026-03-15T11:20:00.000Z",
    txHash: "9u8v7w6x5y4z3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z",
  },
  {
    id: "tx-5",
    type: "contribute",
    amount: "250.00 XLM",
    status: "failed",
    timestamp: "2026-03-10T22:10:05.000Z",
    txHash: "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4938271605b4a",
  },
  {
    id: "tx-6",
    type: "contribute",
    amount: "325.00 XLM",
    status: "pending",
    timestamp: "2026-03-29T08:00:00.000Z",
    txHash: "pending_hash_0123456789abcdef0123456789abcdef0123456789abcdef",
  },
  {
    id: "tx-7",
    type: "release",
    amount: "1,100.00 XLM",
    status: "success",
    timestamp: "2026-02-28T15:45:00.000Z",
    txHash: "2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g",
  },
  {
    id: "tx-8",
    type: "contribute",
    amount: "450.00 XLM",
    status: "success",
    timestamp: "2026-02-25T14:30:00.000Z",
    txHash: "h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2",
  },
];

async function TransactionData() {
  // Simulates Horizon API latency — skeleton renders immediately while this resolves
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return <TransactionList initialTransactions={MOCK_TRANSACTIONS} />;
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 relative overflow-hidden bg-[#0a0a0f]">
      {/* Background aesthetics */}
      <div className="mesh-gradient opacity-40 mix-blend-screen pointer-events-none fixed inset-0" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 max-w-7xl">
        <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[11px] font-black uppercase tracking-[0.2em] shadow-inner backdrop-blur-md">
              <History className="h-4 w-4" />
              On-Chain Transaction Log
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] bg-gradient-to-br from-white via-white to-dark-700 bg-clip-text text-transparent">
                Activity <span className="text-brand-400">Vault</span>
              </h1>
              <p className="text-dark-500 text-xl font-medium leading-relaxed max-w-2xl">
                Securely exploring every rent contribution, release, and on-chain interaction associated with your account on the <span className="text-white font-bold">Stellar Network</span>.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
            <div className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/5 text-dark-400 text-xs font-bold">
              <Database className="h-4 w-4 text-brand-400" />
              <span>Horizon API: Healthy</span>
              <div className="h-2 w-2 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(32,201,151,0.5)]" />
            </div>
            
            <Link 
              href="/dashboard"
              className="btn-secondary !text-xs !py-3.5 !px-8 group shadow-2xl hover:shadow-brand-500/10 !rounded-2xl !bg-dark-900/60 transition-all border-white/10"
            >
              <LayoutDashboard className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Overview
            </Link>
          </div>
        </header>

        <div className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-in-out fill-mode-backwards delay-300">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <Suspense fallback={<TransactionListSkeleton />}>
            <TransactionData />
          </Suspense>
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />
        </div>
      </div>
      
      {/* Decorative SVG elements */}
      <div className="fixed bottom-10 left-10 opacity-10 pointer-events-none">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="99.5" stroke="white" strokeDasharray="4 4" />
        </svg>
      </div>
    </main>
  );
}
