"use client";

import { X, ShieldCheck, AlertCircle, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { getExplorerLink } from "@/lib/stellar/explorer.ts";

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  amount: string;
  fee: string;
  isSubmitting: boolean;
  transactionHash?: string;
  error?: string | null;
}

/**
 * A modal for confirming Stellar transactions.
 * Displays amount, estimated fee, and provides feedback during/after submission.
 */
export default function TransactionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  amount,
  fee,
  isSubmitting,
  transactionHash,
  error,
}: TransactionConfirmModalProps) {
  if (!isOpen) return null;

  const isSuccess = !!transactionHash;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-dark-500 hover:text-white transition-colors"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isSuccess ? "bg-accent-500/10 border-accent-500/30 text-accent-400" : 
              error ? "bg-red-500/10 border-red-500/30 text-red-400" :
              "bg-brand-500/10 border-brand-500/30 text-brand-400"
            }`}>
              {isSuccess ? <CheckCircle2 className="h-6 w-6" /> : error ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <h3 className="text-xl font-bold text-dark-100">{isSuccess ? "Transaction Successful" : title}</h3>
            <p className="text-sm text-dark-400">{isSuccess ? "Your contribution has been recorded on the blockchain." : description}</p>
          </div>

          {!isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-500">Amount</span>
                  <span className="font-bold text-dark-100">{amount} XLM</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-500">Estimated Fee</span>
                  <span className="text-dark-300">{fee} XLM</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-dark-500">Total</span>
                  <span className="text-lg font-black text-brand-400">{(parseFloat(amount) + parseFloat(fee)).toFixed(7).replace(/\.0+$/, "")} XLM</span>
                </div>
              </div>

              {error && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 btn-secondary !py-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex-1 btn-primary !py-3 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing...
                    </>
                  ) : "Confirm & Sign"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl bg-accent-500/5 border border-accent-500/20 p-4">
                <p className="text-xs text-dark-500 uppercase tracking-widest font-black mb-2">Transaction Hash</p>
                <p className="font-mono text-xs text-accent-300 break-all">{transactionHash}</p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={getExplorerLink("transaction", transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-primary !bg-accent-600 !hover:bg-accent-500 !py-3 !text-sm !justify-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Stellar Explorer
                </a>
                <button
                  onClick={onClose}
                  className="w-full btn-secondary !py-3 !text-sm !justify-center"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
