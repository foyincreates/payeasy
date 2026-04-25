"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getContractState, ContractQueryError, type ContractState } from "@/lib/stellar/queries";

export interface UseContractPollingOptions {
  pollingInterval?: number;
}

export interface UseContractPollingResult {
  contractState: ContractState | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export default function useContractPolling(
  contractId: string,
  options: UseContractPollingOptions = {}
): UseContractPollingResult {
  const { pollingInterval = 30_000 } = options;

  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchState = useCallback(async () => {
    if (!contractId) return;
    try {
      const state = await getContractState(contractId);
      if (mountedRef.current) {
        setContractState(state);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof ContractQueryError
            ? err.message
            : "Network error. Please check your connection and try again."
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [contractId]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);

    void fetchState();

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void fetchState();
    };

    const handle = setInterval(tick, pollingInterval);
    document.addEventListener("visibilitychange", tick);

    return () => {
      mountedRef.current = false;
      clearInterval(handle);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [contractId, pollingInterval, fetchState]);

  return { contractState, isLoading, error, refresh: fetchState };
}
