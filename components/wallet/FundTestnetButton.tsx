"use client";

import { useState } from "react";
import { fundTestnetAccount } from "@/lib/stellar/friendbot";
import { getCurrentNetwork } from "@/lib/stellar/explorer";
import { Coins, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface FundTestnetButtonProps {
  /**
   * The Stellar public key to fund.
   */
  publicKey: string;
  /**
   * Optional callback to trigger when funding is successful.
   */
  onSuccess?: () => void;
  className?: string;
}

/**
 * A button component that triggers testnet funding via Friendbot.
 * Automatically hides itself if the network is not set to testnet.
 */
export default function FundTestnetButton({
  publicKey,
  onSuccess,
  className = "",
}: FundTestnetButtonProps) {
  const [fundingStatus, setFundingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isTestnet = getCurrentNetwork() === "testnet";
  
  if (!isTestnet) {
    return null;
  }

  async function handleFund() {
    if (fundingStatus === "loading" || !publicKey) return;

    try {
      setFundingStatus("loading");
      setErrorMessage("");
      await fundTestnetAccount(publicKey);
      setFundingStatus("success");
      onSuccess?.();
    } catch (error) {
      setFundingStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to fund account.");
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        onClick={handleFund}
        disabled={fundingStatus === "loading" || !publicKey}
        className={`btn-primary w-full !justify-center !py-3 disabled:opacity-50 disabled:cursor-not-allowed group transition-all ${
          fundingStatus === "success" ? "!bg-accent-600/20 !text-accent-100 !border-accent-400" : ""
        }`}
      >
        {fundingStatus === "loading" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Funding Account...</span>
          </>
        ) : fundingStatus === "success" ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            <span>Account Funded</span>
          </>
        ) : (
          <>
            <Coins className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span>Fund Testnet Account (10k XLM)</span>
          </>
        )}
      </button>

      {fundingStatus === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs sm:text-sm text-red-200 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      {fundingStatus === "success" && (
        <p className="text-center text-xs text-accent-300 font-medium animate-in fade-in slide-in-from-top-1">
          Success! Your account has been funded on testnet.
        </p>
      )}
    </div>
  );
}
