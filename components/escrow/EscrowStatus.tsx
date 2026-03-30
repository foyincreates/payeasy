"use client";

import { Home, Calendar, ShieldCheck, Wallet, User, Hash, Info } from "lucide-react";

interface EscrowStatusProps {
  /**
   * The public address of the landlord who will receive the rent.
   */
  landlordAddress: string;
  /**
   * Total rent amount required for the escrow.
   */
  totalRent: string;
  /**
   * Human-readable deadline date.
   */
  deadline: string;
  /**
   * Current lifecycle state of the escrow contract.
   */
  status: "active" | "funded" | "released" | "expired";
}

/**
 * Displays the core information and status of a rent escrow agreement.
 * Features a high-contrast status badge and detailed property alignment.
 */
export default function EscrowStatus({
  landlordAddress,
  totalRent,
  deadline,
  status,
}: EscrowStatusProps) {
  const statusConfig = {
    active: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Awaiting Funding", icon: <Info className="h-3.5 w-3.5" /> },
    funded: { color: "bg-accent-500/10 text-accent-400 border-accent-500/20", label: "Fully Funded", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    released: { color: "bg-brand-500/10 text-brand-400 border-brand-500/20", label: "Released to Landlord", icon: <Wallet className="h-3.5 w-3.5" /> },
    expired: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Agreement Expired", icon: <Calendar className="h-3.5 w-3.5" /> },
  }[status];

  return (
    <div className="glass-card overflow-hidden shadow-2xl relative group">
      {/* Decorative vertical bar based on status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${status === 'active' ? 'bg-blue-500' : status === 'funded' ? 'bg-accent-500' : status === 'released' ? 'bg-brand-500' : 'bg-red-500'}`} />
      
      <div className="p-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-2.5">
            <p className="text-[11px] text-dark-500 uppercase tracking-[0.2em] font-black leading-none">
              Agreement Lifecycle
            </p>
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest shadow-inner ${statusConfig.color} backdrop-blur-md`}>
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-current" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-current animate-ping opacity-50" />
              </div>
              {statusConfig.label}
              <div className="h-3 w-px bg-current opacity-20 mx-1" />
              {statusConfig.icon}
            </div>
          </div>
          
          <div className="text-left md:text-right space-y-1.5">
            <p className="text-[11px] text-dark-500 uppercase tracking-[0.2em] font-black leading-none">
              Total Contract Value
            </p>
            <div className="flex items-baseline md:justify-end gap-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter transition-all group-hover:scale-105 active:scale-95 duration-500">
                {totalRent}
              </h2>
              <span className="text-brand-400 text-xl font-black tracking-tight uppercase">XLM</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
          <div className="flex items-start gap-5 group/item">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-dark-400 transition-all group-hover/item:border-brand-500/40 group-hover/item:bg-brand-500/10 group-hover/item:text-brand-400 shadow-inner group-hover/item:-translate-y-1">
              <User className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black">Designated Landlord</p>
              <p className="text-sm font-mono text-dark-200 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 transition-all group-hover/item:border-white/20 select-all">
                {landlordAddress}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-5 group/item">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-dark-400 transition-all group-hover/item:border-brand-500/40 group-hover/item:bg-brand-500/10 group-hover/item:text-brand-400 shadow-inner group-hover/item:-translate-y-1">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black">Release Deadline</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-white tracking-tight">
                  {deadline}
                </p>
                <div className="h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_8px_rgba(32,201,151,0.5)]" />
              </div>
              <p className="text-[10px] text-dark-500 font-medium">Automatic return after 48h of expiration</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background aesthetic detail */}
      <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-brand-500/5 blur-3xl rounded-full" />
    </div>
  );
}
