import { useState, useEffect } from "react";
import {
  getWalletData,
  getRecentTransactions,
  WalletData,
  Transaction,
} from "@/lib/mock/wallet";

export const useWallet = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [walletRes, transactionsRes] = await Promise.all([
          getWalletData(),
          getRecentTransactions(),
        ]);

        if (isMounted) {
          setWalletData(walletRes);
          setTransactions(transactionsRes);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch wallet data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    walletData,
    transactions,
    isLoading,
    error,
  };
};
