"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchXlmBalance } from "@/lib/stellar/horizon";

interface WalletBalanceState {
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useWalletBalance(publicKey: string | null, enabled = false) {
  const [state, setState] = useState<WalletBalanceState>({
    balance: null,
    isLoading: false,
    error: null,
  });

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setState({ balance: null, isLoading: true, error: null });
    try {
      const raw = await fetchXlmBalance(publicKey, "testnet");
      // Format as "1,234.56"
      const num = parseFloat(raw);
      const formatted = num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setState({ balance: formatted, isLoading: false, error: null });
    } catch {
      setState({ balance: null, isLoading: false, error: "Failed to load balance" });
    }
  }, [publicKey]);

  useEffect(() => {
    if (enabled && publicKey) {
      fetchBalance();
    }
  }, [enabled, publicKey, fetchBalance]);

  return { ...state, refetch: fetchBalance };
}
