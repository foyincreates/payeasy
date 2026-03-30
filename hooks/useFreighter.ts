"use client";

import { useStellarAuth } from "@/contexts/StellarAuthContext";

/**
 * A custom hook to interact with the Freighter wallet.
 * This hook is a thin wrapper around the StellarAuthContext.
 * 
 * Returns:
 * - publicKey: The Stellar public key of the connected account (or null).
 * - isConnected: Whether the user is currently connected to Freighter.
 * - isFreighterInstalled: Whether the Freighter extension is installed.
 * - connect: A function to trigger the Freighter connection process.
 * - disconnect: A function to disconnect the wallet from the application.
 */
export default function useFreighter() {
  const { 
    publicKey, 
    isConnected, 
    isFreighterInstalled, 
    connect, 
    disconnect,
    isConnecting,
    error
  } = useStellarAuth();

  return {
    publicKey,
    isConnected,
    isFreighterInstalled,
    connect,
    disconnect,
    isConnecting,
    error,
  };
}
