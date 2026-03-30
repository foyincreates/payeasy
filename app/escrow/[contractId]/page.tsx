import { Metadata } from "next";
import EscrowStatus from "@/components/escrow/EscrowStatus";
import FundingProgress from "@/components/escrow/FundingProgress";
import RoommateList, { type Roommate } from "@/components/escrow/RoommateList";
import { ChevronLeft, Info, ExternalLink, ShieldCheck, Activity, Globe } from "lucide-react";
import Link from "next/link";
import { getExplorerLink } from "@/lib/stellar/explorer";

/**
 * Metadata generation for dynamic routes.
 */
export async function generateMetadata({ params }: { params: { contractId: string } }): Promise<Metadata> {
  const shortId = params.contractId.slice(0, 8);
  return {
    title: `Escrow Agreement ${shortId} | PayEasy`,
    description: `Monitor the real-time funding status and roommate contributions for rent escrow agreement ${params.contractId}.`,
  };
}

/**
 * Escrow Agreement Dashboard Page.
 * Displays the live on-chain state of a specific rent escrow contract.
 * Features real-time state visualization and participant status tracking.
 */
export default function EscrowDashboardPage({ params }: { params: { contractId: string } }) {
  // In a production environment, this data would be fetched from Soroban
  // using read-only queries from a client-side hook or server action.
  const MOCK_CONTRACT_STATE = {
    id: params.contractId,
    landlord: "GD7K4X5L7P2Q9F6N1M3R8S4T0U1V2W3X4Y5Z6A7B8C9D0E1F2G",
    totalRent: "1250",
    deadline: "April 05, 2026",
    status: "active" as const,
    totalFunded: 775,
    lastUpdate: new Date().toISOString(),
    roommates: [
      { 
        address: "GA3X2Y1Z0W9V8U7T6S5R4Q3P2O1N0M9L8K7J6I5H4G3F2E1D0C", 
        expectedShare: "450", 
        paidAmount: "450", 
        isPaid: true 
      },
      { 
        address: "GB5X4Y3Z2W1V0U9T8S7R6Q5P4O3N2M1L0K9J8I7H6G5F4E3D2C", 
        expectedShare: "450", 
        paidAmount: "325", 
        isPaid: false 
      },
      { 
        address: "GC7X6Y5Z4W3V2U1T0S9R8Q7P6O5N4M3L2K1J0I9H8G7F6E5D4C", 
        expectedShare: "350", 
        paidAmount: "0", 
        isPaid: false 
      },
    ] as Roommate[],
  };

  return (
    <main className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#07070a]">
      {/* Premium background aesthetics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,124,250,0.1),transparent_50%)] pointer-events-none" />
      <div className="mesh-gradient opacity-30 mix-blend-screen pointer-events-none fixed inset-0 saturate-150" />
      
      <div className="container relative z-10 mx-auto px-6 max-w-6xl">
        {/* Navigation Breadcrumb */}
        <nav className="mb-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-left-4 duration-700">
           <Link 
             href="/dashboard" 
             className="inline-flex items-center gap-2.5 text-dark-400 hover:text-brand-300 transition-all group font-black text-[10px] uppercase tracking-[0.2em]"
           >
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:bg-brand-500 group-hover:border-brand-400 group-hover:text-white transition-all">
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </div>
              Agreement Registry
           </Link>
           
           <div className="flex items-center gap-4 bg-dark-900/60 border border-white/5 px-5 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
               <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                 <div className="h-2 w-2 rounded-full bg-accent-400 animate-pulse shadow-[0_0_8px_rgba(32,201,151,0.5)]" />
                 <span className="text-[10px] text-dark-200 font-black uppercase tracking-widest italic flex items-center gap-1">
                   <Activity className="h-3.5 w-3.5 text-brand-400" />
                   Live Syncing
                 </span>
               </div>
               <div className="flex items-center gap-3">
                 <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest truncate max-w-[140px] md:max-w-none font-mono">
                    CX: {MOCK_CONTRACT_STATE.id}
                 </p>
                 <a 
                   href={getExplorerLink("contract", MOCK_CONTRACT_STATE.id)}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-1.5 rounded-lg text-dark-500 hover:text-brand-400 hover:bg-white/5 transition-all outline-none"
                   title="View on Stellar Expert"
                 >
                    <ExternalLink className="h-4 w-4" />
                 </a>
               </div>
           </div>
        </nav>

        {/* Header Section */}
        <header className="mb-20 space-y-8 animate-in fade-in slide-in-from-top-12 duration-1000 ease-out fill-mode-backwards delay-100">
           <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-dark-400 text-[10px] font-black uppercase tracking-widest shadow-inner">
               <Globe className="h-3.5 w-3.5 text-brand-500" />
               Contract Overview
             </div>
             <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] bg-gradient-to-br from-white via-white to-dark-600 bg-clip-text text-transparent">
                Escrow <span className="text-brand-400">Intelligence</span>
             </h1>
           </div>
           
           <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
             <p className="text-dark-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                Auditing the real-time on-chain status of your rent agreement. Every byte of funding is cryptographically secured on the <span className="text-white font-black italic">Stellar Ledger</span>.
             </p>
             <div className="h-16 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent hidden md:block" />
             <div className="space-y-1">
               <p className="text-[10px] text-dark-600 uppercase tracking-[0.2em] font-black">Refreshed</p>
               <p className="text-xs text-dark-200 font-mono font-bold uppercase tracking-widest mt-1">14s ago</p>
             </div>
           </div>
        </header>

        {/* Dashboard Grid */}
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out fill-mode-backwards delay-300">
           {/* Primary Status Card */}
           <EscrowStatus 
             landlordAddress={MOCK_CONTRACT_STATE.landlord}
             totalRent={MOCK_CONTRACT_STATE.totalRent}
             deadline={MOCK_CONTRACT_STATE.deadline}
             status={MOCK_CONTRACT_STATE.status}
           />
           
           {/* Progress and Secondary Features */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <FundingProgress 
                 totalFunded={MOCK_CONTRACT_STATE.totalFunded}
                 totalRequired={Number(MOCK_CONTRACT_STATE.totalRent)}
              />
              
              <div className="glass-card p-10 flex flex-col items-center justify-center text-center gap-8 border-dashed border-white/10 group transition-all hover:bg-brand-500/10 hover:border-brand-500/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(92,124,250,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="p-6 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 shadow-brand-500/10 transition-all duration-1000 relative z-10">
                     <ShieldCheck className="h-12 w-12" />
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <h3 className="text-white font-black text-2xl uppercase tracking-widest">Protocol Secured</h3>
                    <p className="text-dark-400 text-base font-medium leading-relaxed max-w-sm">
                       This agreement is governed by the <span className="text-brand-300 font-bold">PayEasy Rent Protocol</span>. Assets are only releasable once full funding is achieved or the refund window opens.
                    </p>
                  </div>
                  
                  <button className="btn-secondary !py-3 !px-10 !text-[11px] !border-white/10 hover:!border-brand-400/50 hover:!bg-brand-500/10 !text-dark-100 !rounded-2xl transition-all relative z-10 font-black uppercase tracking-widest">
                     Explore Contract Rules
                  </button>
              </div>
           </div>

           {/* Detailed Roommate Progress */}
           <RoommateList roommates={MOCK_CONTRACT_STATE.roommates} />
        </div>
      </div>
      
      {/* Scroll-tracked foreground aesthetic */}
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-accent-500/5 blur-[120px] rounded-full pointer-events-none" />
    </main>
  );
}
