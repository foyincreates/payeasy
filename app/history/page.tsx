import { Metadata } from "next";
import { Suspense } from "react";
import HistoryClient from "./HistoryClient";
import TransactionListSkeleton from "@/components/history/TransactionListSkeleton";
import { History, LayoutDashboard, Database } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transaction History | PayEasy",
  description: "View your recent escrow contributions and rent payments verified on the Stellar blockchain.",
};

export default function HistoryPage() {
  return (
    <main id="main-content" aria-label="Transaction History" className="min-h-screen pt-28 pb-20 relative overflow-hidden bg-[#0a0a0f]">
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
            <HistoryClient />
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
