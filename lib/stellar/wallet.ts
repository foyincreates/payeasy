import freighter from "@stellar/freighter-api";
import { getCurrentNetwork } from "./config.ts";

/**
 * Checks if the Freighter extension is installed in the browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await freighter.isConnected();
    return !result.error || result.isConnected; // If it returns something, it's installed
  } catch {
    return false;
  }
}

/**
 * Attempts to connect to Freighter.
 * If not already allowed, it will trigger the Freighter permission popup.
 */
export async function connectFreighter(): Promise<string | null> {
  try {
    const { isAllowed } = await freighter.isAllowed();
    if (!isAllowed) {
      const { isAllowed: nowAllowed } = await freighter.setAllowed();
      if (!nowAllowed) return null;
    }

    const { address } = await freighter.requestAccess();
    return address || null;
  } catch (error) {
    console.error("Failed to connect to Freighter:", error);
    return null;
  }
}

/**
 * Checks if the user has already allowed the application to access their Freighter account.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { isAllowed } = await freighter.isAllowed();
    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * Gets the connected user's public key.
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    const { address } = await freighter.requestAccess();
    return address || null;
  } catch {
    return null;
  }
}

/**
 * Signs a transaction XDR using Freighter.
 * 
 * @param xdr The transaction XDR to sign.
 * @param network The network to sign for (defaults to current config).
 */
export async function signTx(xdr: string, network?: string): Promise<string | null> {
  try {
    const networkToUse = network || getCurrentNetwork().toUpperCase();
    const result = await freighter.signTransaction(xdr, {
      networkPassphrase: networkToUse === "TESTNET" 
        ? "Test SDF Network ; September 2015" 
        : "Public Global Stellar Network ; September 2015",
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.signedTxXdr;
  } catch (error) {
    console.error("Freighter signing failed:", error);
    return null;
  }
}
