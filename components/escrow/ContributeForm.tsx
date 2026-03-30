"use client";

import { useState } from "react";
import { Wallet, Info, ArrowRight, CheckCircle2 } from "lucide-react";
import useFreighter from "@/hooks/useFreighter.ts";
import TransactionConfirmModal from "./TransactionConfirmModal.tsx";
import { validateContributionAmount } from "./contributeForm.helpers.ts";

interface ContributeFormProps {
  escrowId: string;
  expectedShare: string;
  remainingBalance: string;
  onSuccess?: (txHash: string) => void;
}

/**
 * A form for roommates to contribute their share to an escrow agreement.
 * Includes validation and integrates with the Freighter wallet.
 */
export default function ContributeForm({
  escrowId,
  expectedShare,
  remainingBalance,
  onSuccess,
}: ContributeFormProps) {
  const { isConnected, connect, publicKey } = useFreighter();
  
  const [amount, setAmount] = useState(expectedShare);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  const validation = validateContributionAmount(amount, remainingBalance);
  const isValid = validation.isValid;

  const handleContributeClick = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    if (!isValid) {
      setError(validation.error || "Invalid amount");
      return;
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Logic for submitting transaction would go here.
      // For now, we simulate a successful transaction.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const simulatedHash = "0x" + Math.random().toString(16).slice(2, 66);
      
      setTxHash(simulatedHash);
      onSuccess?.(simulatedHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-6 sm:p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-dark-100 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand-400" />
            Contribute Share
          </h3>
          <p className="text-sm text-dark-500">Pay your part of the rent split.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black">Your Progress</p>
          <div className="flex items-center gap-1.5 mt-1 justify-end">
            <span className="text-lg font-black text-white">{expectedShare}</span>
            <span className="text-xs text-brand-400 font-bold">/ {expectedShare}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-xs uppercase tracking-widest font-black text-dark-500">
            Contribution Amount (XLM)
          </label>
          <div className="relative group">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-12 text-lg font-bold text-dark-100 focus:border-brand-400 focus:outline-none transition-all group-hover:bg-white/[0.08]"
              placeholder="0.00"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 font-black text-sm">
              XLM
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2 text-dark-500 text-xs uppercase tracking-widest font-black">
            <Info className="h-3 w-3" />
            Balance Remaining
          </div>
          <p className="text-2xl font-black text-dark-100 tracking-tight">
            {remainingBalance} <span className="text-xs text-dark-500 font-medium">XLM Total</span>
          </p>
        </div>
      </div>

  {!isValid && parseFloat(amount) > 0 && (
    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
      <ArrowRight className="h-3 w-3 rotate-180" />
      {validation.error}
    </div>
  )}

      <button
        type="button"
        onClick={handleContributeClick}
        disabled={!isValid || isSubmitting}
        className="w-full btn-primary !py-4 !text-base shadow-xl shadow-brand-500/30 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isConnected ? "Connect Wallet to Pay" : "Contribute Now"}
        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>

      <TransactionConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Contribution"
        description="You are about to send funds to the rent escrow contract. This action requires signature."
        amount={amount}
        fee="0.00001" // Simulated fee
        isSubmitting={isSubmitting}
        transactionHash={txHash}
        error={error}
      />

      {txHash && (
        <div className="mt-6 p-4 rounded-xl bg-accent-500/10 border border-accent-500/30 flex items-center gap-3 text-accent-100 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>Payment successful! Transaction recorded on-chain.</p>
        </div>
      )}
    </div>
  );
}
