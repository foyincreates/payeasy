"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  isFreighterInstalled as checkFreighter,
  connectFreighter,
  getPublicKey as fetchPublicKey,
  checkConnection
} from "@/lib/stellar/wallet";

interface StellarAuthContextType {
  publicKey: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const StellarAuthContext = createContext<StellarAuthContextType | undefined>(undefined);

const STORAGE_KEY = "payeasy_wallet_connected";

export function StellarAuthProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize connection state and handle auto-reconnect
  useEffect(() => {
    async function init() {
      const installed = await checkFreighter();
      setIsFreighterInstalled(installed);

      if (installed) {
        const wasConnected = localStorage.getItem(STORAGE_KEY) === "true";
        if (wasConnected) {
          const currentlyConnected = await checkConnection();
          if (currentlyConnected) {
            const key = await fetchPublicKey();
            if (key) {
              setPublicKey(key);
              setIsConnected(true);
            }
          }
        }
      }
    }
    init();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const installed = await checkFreighter();
      if (!installed) {
        throw new Error("Freighter extension not found. Please install it to continue.");
      }

      const key = await connectFreighter();
      if (key) {
        setPublicKey(key);
        setIsConnected(true);
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        throw new Error("User rejected connection or failed to retrieve public key.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet.");
      setIsConnected(false);
      setPublicKey(null);
      localStorage.setItem(STORAGE_KEY, "false");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const value = React.useMemo(() => ({
    publicKey,
    isConnected,
    isFreighterInstalled,
    isConnecting,
    connect,
    disconnect,
    error,
  }), [publicKey, isConnected, isFreighterInstalled, isConnecting, connect, disconnect, error]);

  return (
    <StellarAuthContext.Provider value={value}>
      {children}
    </StellarAuthContext.Provider>
  );
}

export function useStellarAuth() {
  const context = useContext(StellarAuthContext);
  if (context === undefined) {
    throw new Error("useStellarAuth must be used within a StellarAuthProvider");
  }
  return context;
}
