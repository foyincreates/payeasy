"use client";

import { User, CheckCircle2, Clock, Users, Activity, ExternalLink, AlertCircle } from "lucide-react";
import { getExplorerLink } from "@/lib/stellar/explorer";
import CopyButton from "@/components/ui/copy-button";

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

interface RoommateTableProps {
  /**
   * Array of roommate objects to display.
   */
  roommates: Roommate[];
}

/**
 * A comprehensive list of agreement participants and their funding statuses.
 * Integrates with Stellar explorer links for individual account verification.
 */
export default function RoommateTable({ roommates }: RoommateTableProps) {
  // Sorting logic: Pending/Partial first, then Paid
  const sortedRoommates = [...roommates].sort((a, b) => {
    if (a.isPaid === b.isPaid) return 0;
    return a.isPaid ? 1 : -1;
  });

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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="p-4 pl-6 text-[10px] text-dark-500 font-black uppercase tracking-widest">Participant</th>
                <th className="p-4 text-[10px] text-dark-500 font-black uppercase tracking-widest">Expected</th>
                <th className="p-4 text-[10px] text-dark-500 font-black uppercase tracking-widest">Paid</th>
                <th className="p-4 text-[10px] text-dark-500 font-black uppercase tracking-widest">Remaining</th>
                <th className="p-4 pr-6 text-[10px] text-dark-500 font-black uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedRoommates.map((roommate, idx) => {
                const remaining = Math.max(0, Number(roommate.expectedShare) - Number(roommate.paidAmount)).toFixed(2).replace(/\.00$/, "");
                const isPartial = !roommate.isPaid && Number(roommate.paidAmount) > 0;
                
                return (
                  <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl border transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                           roommate.isPaid ? 'bg-accent-500/10 text-accent-400 border-accent-500/30 shadow-[0_0_15px_rgba(32,201,151,0.2)] rotate-6' : 'bg-dark-900/60 text-dark-500 border-white/5'
                        } group-hover:scale-110 shadow-inner`}>
                           <User className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-mono text-dark-200 group-hover:text-white transition-colors">
                              {roommate.address.slice(0, 6)}...{roommate.address.slice(-6)}
                           </p>
                           <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <CopyButton value={roommate.address} label="Copy address" className="!p-1" />
                             <a 
                               href={getExplorerLink("account", roommate.address)}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="p-1 rounded-md text-dark-600 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
                               aria-label="View on Stellar Expert"
                             >
                               <ExternalLink className="h-3 w-3" />
                             </a>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-dark-200">{roommate.expectedShare} <span className="text-[10px] text-dark-600 ml-0.5">XLM</span></td>
                    <td className="p-4 text-sm font-bold text-white">{roommate.paidAmount} <span className="text-[10px] text-dark-600 ml-0.5">XLM</span></td>
                    <td className="p-4 text-sm font-bold text-dark-400">
                      {remaining} <span className="text-[10px] text-dark-600 ml-0.5">XLM</span>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                          roommate.isPaid 
                            ? 'bg-accent-500/15 text-accent-300 border-accent-500/20' 
                            : isPartial 
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' 
                              : 'bg-white/5 text-dark-500 border-white/5'
                        }`}>
                           {roommate.isPaid ? <CheckCircle2 className="h-3 w-3" /> : isPartial ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3 animate-pulse" />}
                           {roommate.isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
