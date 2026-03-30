"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Check, X, FileText, Globe, Loader2 } from "lucide-react";
import { validateTransactionSafety, type ValidationSummary, isValidStellarAddress } from "@/lib/stellar/validation";

interface TransactionReviewProps {
  /**
   * Base64-encoded transaction XDR.
   */
  xdr: string;
  /**
   * Expected network (e.g., 'testnet', 'public').
   */
  network: string;
  /**
   * Optional destination address for verification.
   */
  destination?: string;
  /**
   * Callback when the user confirms the transaction.
   */
  onConfirm: () => void;
  /**
   * Callback when the user cancels or rejects the transaction.
   */
  onCancel: () => void;
  /**
   * Whether the transaction is currently being submitted.
   */
  isSubmitting?: boolean;
}

/**
 * A security review component that displays transaction details and performs safety checks.
 * Integrates with client-side validation logic to prevent signing invalid or malicious transactions.
 */
export default function TransactionReview({
  xdr,
  network,
  destination,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: TransactionReviewProps) {
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    async function performValidation() {
      setIsValidating(true);
      const result = await validateTransactionSafety(xdr, network);

      // Perform address validation if available
      if (destination && !isValidStellarAddress(destination)) {
        result.isValid = false;
        result.errors.push(`Invalid destination address: ${destination}`);
      }

      setValidation(result);
      setIsValidating(false);
    }

    void performValidation();
  }, [xdr, network, destination]);

  return (
    <div className="max-w-md w-full glass-card overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-brand-500/10 border-b border-white/5 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-400/20 shadow-[0_0_15px_rgba(92,124,250,0.2)]">
            <Shield className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h3 className="font-bold text-dark-100 leading-none">Security Review</h3>
            <p className="text-[10px] text-dark-500 uppercase tracking-widest mt-1">Transaction Validation</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-full border border-white/10 shadow-inner">
          <Globe className="h-3 w-3 text-brand-400" />
          <span className="text-[10px] uppercase font-bold text-dark-300 tracking-wider">
            {network}
          </span>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {isValidating ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            <p className="text-dark-400 text-sm animate-pulse">Running security checks...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    {validation?.isValid ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
                        <span className="text-accent-300 font-bold text-sm">Security Checks Passed</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-red-300 font-bold text-sm">Validation Failed</span>
                      </>
                    )}
                  </div>
                </div>
                {destination && (
                  <div className="text-right">
                    <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black mb-1">Destination</p>
                    <p className="text-dark-100 font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      {destination.slice(0, 6)}...{destination.slice(-6)}
                    </p>
                  </div>
                )}
              </div>

              {validation?.errors.map((error, idx) => (
                <div key={idx} className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 transition-all hover:scale-110" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              ))}

              {validation?.warnings.map((warning, idx) => (
                <div key={idx} className="flex gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="leading-relaxed">{warning}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-dark-900/40 border border-white/5 p-4 group transition-all hover:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-dark-500 group-hover:text-brand-400 transition-colors" />
                  <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest">Transaction XDR</p>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400/50" />
              </div>
              <p className="font-mono text-[9px] text-dark-500 break-all line-clamp-3 italic leading-normal select-all">
                {xdr}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="btn-secondary !py-3 !text-xs w-full !justify-center !rounded-xl !border-white/5 hover:!bg-white/10 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!validation?.isValid || isSubmitting}
                className="btn-primary !py-3 !text-xs w-full !justify-center !rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 transition-transform group-hover:scale-125" />
                )}
                {isSubmitting ? "Signing..." : "Approve & Sign"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
