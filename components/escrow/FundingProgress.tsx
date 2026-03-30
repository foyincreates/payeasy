"use client";

import { useMemo } from "react";
import { TrendingUp, Percent, ShieldCheck, Wallet, Zap } from "lucide-react";

interface FundingProgressProps {
  /**
   * Current total amount funded by all roommates.
   */
  totalFunded: number;
  /**
   * The goal amount required to complete the escrow.
   */
  totalRequired: number;
}

/**
 * A visual progress tracker for the escrow funding state.
 * Features a dynamic progress bar with premium gradients and animations.
 */
export default function FundingProgress({
  totalFunded,
  totalRequired,
}: FundingProgressProps) {
  const percentage = useMemo(() => {
    if (totalRequired <= 0) return 0;
    return Math.min(100, Math.floor((totalFunded / totalRequired) * 100));
  }, [totalFunded, totalRequired]);

  const isComplete = percentage >= 100;

  return (
    <div className="glass-card p-8 border-brand-500/10 shadow-2xl relative overflow-hidden group">
      {/* Dynamic background glow */}
      <div className={`absolute -top-12 -left-12 h-40 w-40 blur-[80px] rounded-full transition-colors duration-1000 opacity-20 ${
        isComplete ? "bg-accent-500" : "bg-brand-500"
      }`} />

      <div className="flex items-center justify-between mb-10 gap-6 relative z-10">
        <div className="space-y-2">
          <p className="text-[11px] text-dark-500 uppercase tracking-[0.2em] font-black leading-none flex items-center gap-2">
            <Zap className={`h-3 w-3 ${isComplete ? 'text-accent-400' : 'text-brand-400'}`} />
            Funding Progress
          </p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-md">
              {percentage}%
            </h3>
            <span className="text-dark-400 text-xs font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
              Verified
            </span>
          </div>
        </div>
        
        <div className={`p-4 rounded-3xl border shadow-2xl transition-all duration-700 ease-in-out group-hover:scale-110 group-hover:rotate-6 ${
           isComplete ? "bg-accent-500/20 text-accent-300 border-accent-500/40 shadow-accent-500/10" : 
           "bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-brand-500/10"
        }`}>
          {isComplete ? <ShieldCheck className="h-10 w-10" /> : <TrendingUp className="h-10 w-10 animate-pulse" />}
        </div>
      </div>

      <div className="relative h-6 w-full bg-dark-900/40 rounded-3xl overflow-hidden border border-white/10 p-1 shadow-inner backdrop-blur-sm">
         <div 
           className={`h-full rounded-2xl transition-all duration-[1.5s] cubic-bezier(0.34, 1.56, 0.64, 1) relative ${
             isComplete ? "bg-gradient-to-r from-accent-600 via-accent-400 to-accent-500 shadow-[0_0_20px_rgba(32,201,151,0.5)]" : 
             "bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 shadow-[0_0_20px_rgba(76,110,245,0.4)]"
           }`}
           style={{ width: `${percentage}%` }}
         >
           {/* Animated shimmer effect */}
           <div className="absolute inset-0 bg-white/10 animate-shimmer" style={{ backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)' }} />
           
           {/* Glossy top highlight */}
           <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-2xl pointer-events-none" />
         </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-10 p-5 rounded-2xl bg-white/5 border border-white/5 relative z-10 transition-all group-hover:bg-white/10">
        <div className="space-y-1.5 border-r border-white/10 pr-6 text-left">
          <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black">Currently Funded</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-accent-300 tracking-tight">{totalFunded.toLocaleString()}</span>
            <span className="text-[10px] font-black text-accent-500 uppercase">XLM</span>
          </div>
        </div>
        <div className="space-y-1.5 pl-6 text-right">
          <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black">Target Amount</p>
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-2xl font-black text-dark-100 tracking-tight">{totalRequired.toLocaleString()}</span>
            <span className="text-[10px] font-black text-dark-500 uppercase">XLM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
