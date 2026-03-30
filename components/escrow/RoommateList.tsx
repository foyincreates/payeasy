"use client";

import { User, CheckCircle2, Clock, XCircle, Users, Activity, ExternalLink } from "lucide-react";
import { getExplorerLink } from "@/lib/stellar/explorer";

export interface Roommate {
  /**
   * The Stellar public key of the roommate.
   */
  address: string;
  /**
   * The total amount this roommate is expected to contribute.
   */
  expectedShare: string;
  /**
   * The amount that has been successfully paid on-chain.
   */
  paidAmount: string;
  /**
   * Boolean flag indicating if the contribution is complete.
   */
  isPaid: boolean;
}

interface RoommateListProps {
  /**
   * Array of roommate objects to display.
   */
  roommates: Roommate[];
}

/**
 * A comprehensive list of agreement participants and their funding statuses.
 * Integrates with Stellar explorer links for individual account verification.
 */
export default function RoommateList({ roommates }: RoommateListProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-backwards delay-500">
      <header className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
         <div className="flex items-center gap-4">
            <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20 shadow-inner group transition-transform hover:rotate-12 duration-500">
              <Users className="h-5 w-5 text-brand-400" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.1em] leading-none">Agreement Participants</h3>
              <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest">{roommates.length} Active Roommates</p>
            </div>
         </div>
         <div className="h-10 w-10 flex items-center justify-center rounded-full bg-dark-900 shadow-inner border border-white/5">
            <Activity className="h-4 w-4 text-dark-600 animate-pulse" />
         </div>
      </header>

      <div className="space-y-5">
        {roommates.map((roommate, idx) => (
          <div key={idx} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-8 group transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1 duration-500">
             <div className="flex items-center gap-5 min-w-0">
                <div className={`p-4 rounded-3xl border transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                   roommate.isPaid ? 'bg-accent-500/10 text-accent-400 border-accent-500/30 shadow-[0_0_15px_rgba(32,201,151,0.2)] rotate-6' : 'bg-dark-900/60 text-dark-500 border-white/5'
                } group-hover:scale-110 shadow-inner`}>
                   <User className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-1.5 flex-1">
                   <div className="flex items-center gap-2">
                     <p className="text-sm font-mono text-dark-200 truncate group-hover:text-white transition-colors select-none">
                        {roommate.address.slice(0, 12)}...{roommate.address.slice(-12)}
                     </p>
                     <a 
                       href={getExplorerLink("account", roommate.address)}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="p-1 rounded-md text-dark-600 hover:text-brand-400 hover:bg-brand-500/10 transition-all opacity-0 group-hover:opacity-100"
                     >
                       <ExternalLink className="h-3 w-3" />
                     </a>
                   </div>
                   <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                     roommate.isPaid ? 'bg-accent-500/15 text-accent-300 border-accent-500/20' : 'bg-white/5 text-dark-500 border-white/5 group-hover:border-white/10'
                   }`}>
                      {roommate.isPaid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5 animate-spin" />}
                      {roommate.isPaid ? "Payment Verified" : "Awaiting Transaction"}
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-10 ml-auto shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-6 sm:pt-0 sm:pl-10">
                <div className="text-right space-y-1">
                   <p className="text-[10px] text-dark-600 uppercase tracking-widest font-black mb-1 group-hover:text-dark-400 transition-colors">On-Chain Contribution</p>
                   <div className="flex flex-col items-end">
                      <span className={`text-2xl font-black tracking-tighter leading-none ${roommate.isPaid ? 'text-accent-400' : 'text-white'}`}>
                        {roommate.paidAmount} <span className="text-[10px] text-dark-600 ml-1">Paid</span>
                      </span>
                      <span className="text-[11px] text-dark-500 font-bold uppercase tracking-tight mt-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                        Goal: {roommate.expectedShare} <span className="opacity-50">XLM</span>
                      </span>
                   </div>
                </div>

                <div className={`p-2.5 rounded-2xl border transition-all duration-1000 cubic-bezier(0.19, 1, 0.22, 1) ${
                   roommate.isPaid ? 'bg-accent-500/20 text-accent-400 border-accent-500/40 shadow-[0_0_20px_rgba(32,201,151,0.25)] scale-110 rotate-12' : 'bg-white/5 text-dark-700 border-white/5'
                } group-hover:scale-125`}>
                   {roommate.isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
