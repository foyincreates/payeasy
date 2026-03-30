"use client";

import { useMemo } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw, 
  ExternalLink, 
  Calendar, 
  Hash, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { getExplorerLink } from "@/lib/stellar/explorer";

export type TransactionType = "contribute" | "release" | "refund";
export type TransactionStatus = "success" | "pending" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  status: TransactionStatus;
  timestamp: string;
  txHash: string;
}

interface TransactionCardProps {
  /**
   * Transaction data to display.
   */
  transaction: Transaction;
}

/**
 * A card component that displays an individual transaction's details.
 * Features specialized icons and color schemes based on the transaction type.
 */
export default function TransactionCard({ transaction }: TransactionCardProps) {
  const explorerLink = useMemo(() => {
    try {
      return getExplorerLink("transaction", transaction.txHash);
    } catch {
      return "#";
    }
  }, [transaction.txHash]);

  const formattedDate = useMemo(() => {
    return new Date(transaction.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [transaction.timestamp]);

  const config = {
    contribute: {
      icon: <ArrowUpRight className="h-5 w-5" />,
      label: "Contribution",
      color: "text-brand-300",
      bg: "bg-brand-500/10",
      border: "border-brand-500/20",
      shadow: "shadow-brand-500/5",
    },
    release: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: "Agreement Released",
      color: "text-accent-300",
      bg: "bg-accent-500/10",
      border: "border-accent-500/20",
      shadow: "shadow-accent-500/5",
    },
    refund: {
      icon: <RefreshCcw className="h-5 w-5" />,
      label: "Refund Issued",
      color: "text-orange-300",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      shadow: "shadow-orange-500/5",
    },
  }[transaction.type];

  return (
    <div className={`glass-card p-5 group transition-all duration-300 hover:border-white/20 active:scale-[0.98] shadow-lg ${config.shadow} hover:shadow-xl`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${config.bg} ${config.color} border ${config.border} shadow-inner transition-transform group-hover:rotate-6 sm:group-hover:scale-110`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black truncate">
              {config.label}
            </p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-white/5 ${
              transaction.status === "success" ? "bg-accent-500/10 text-accent-300" : 
              transaction.status === "pending" ? "bg-blue-500/10 text-blue-300" : "bg-red-500/10 text-red-300"
            }`}>
              {transaction.status === "pending" ? <Clock className="h-2.5 w-2.5 animate-spin" /> : 
               transaction.status === "failed" ? <AlertCircle className="h-2.5 w-2.5" /> : 
               <CheckCircle2 className="h-2.5 w-2.5" />}
              {transaction.status}
            </div>
          </div>
          <h4 className={`text-xl font-black tracking-tight mt-0.5 ${config.color}`}>
            {transaction.amount}
          </h4>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 ml-4 pr-4 border-r border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-dark-300 font-medium">
            <Calendar className="h-3 w-3 text-dark-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-dark-600 font-mono italic">
            <Hash className="h-2.5 w-2.5 opacity-50" />
            <span>{transaction.txHash.slice(0, 8)}...{transaction.txHash.slice(-8)}</span>
          </div>
        </div>

        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl bg-white/5 border border-white/5 text-dark-400 transition-all hover:bg-white/10 hover:text-brand-300 hover:border-brand-500/40 group/link"
          aria-label="View on Stellar Explorer"
        >
          <ExternalLink className="h-5 w-5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </a>
      </div>
      
      {/* Mobile view for extra details */}
      <div className="mt-4 pt-4 border-t border-white/5 flex sm:hidden items-center justify-between text-[10px] text-dark-600 font-medium">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 opacity-70" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono italic">
          <Hash className="h-2.5 w-2.5 opacity-50" />
          <span>{transaction.txHash.slice(0, 12)}...</span>
        </div>
      </div>
    </div>
  );
}
