"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  isFreighterInstalled as checkFreighter,
  connectFreighter,
  getPublicKey as fetchPublicKey,
  checkConnection
} from "@/lib/stellar/wallet";

interface StellarContextType {
  publicKey: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean;
  isConnecting: boolean;
  isRestoring: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const StellarContext = createContext<StellarContextType | undefined>(undefined);

export function StellarProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize connection state
  useEffect(() => {
    async function init() {
      setIsRestoring(true);
      try {
        const installed = await checkFreighter();
        setIsFreighterInstalled(installed);

        if (installed) {
          // Check if the site is allowed and the user is connected
          const connected = await checkConnection();
          if (connected) {
            const key = await fetchPublicKey();
            if (key) {
              setPublicKey(key);
              setIsConnected(true);
            }
          }
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        setIsRestoring(false);
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
      } else {
        throw new Error("User rejected connection or failed to retrieve public key.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet.");
      setIsConnected(false);
      setPublicKey(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    // Note: Freighter doesn't have a formal 'disconnect' API that clears permissions,
    // so we just clear our local state.
  }, []);

  return (
    <StellarContext.Provider
      value={{
        publicKey,
        isConnected,
        isFreighterInstalled,
        isConnecting,
        isRestoring,
        connect,
        disconnect,
        error,
      }}
    >
      {children}
    </StellarContext.Provider>
  );
}

export function useStellar() {
  const context = useContext(StellarContext);
  if (context === undefined) {
    throw new Error("useStellar must be used within a StellarProvider");
  }
  return context;
}

export const useStellarAuth = useStellar;
