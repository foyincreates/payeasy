import {
  isConnected as freighterIsConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

/**
 * Check if Freighter browser extension is installed and available.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const result = await freighterIsConnected();
    return result.isConnected;
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
 * Request access to the user's Freighter wallet.
 * Returns the public key on success.
 */
export async function connectWallet(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error("Freighter wallet extension is not installed");
  }

  const allowed = await isAllowed();
  if (!allowed.isAllowed) {
    const accessResult = await requestAccess();
    if ("error" in accessResult) {
      throw new Error("User rejected wallet connection");
    }
  }

  const addressResult = await getAddress();
  if ("error" in addressResult) {
    throw new Error("Failed to get wallet address");
  }

  return addressResult.address;
}

/**
 * Get the currently connected public key, or null if not connected.
 */
export async function getPublicKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const installed = await isFreighterInstalled();
    if (!installed) return null;

    const allowed = await isAllowed();
    if (!allowed.isAllowed) return null;

    const addressResult = await getAddress();
    if ("error" in addressResult) return null;

    return addressResult.address;
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
 * Checks if the user is currently connected to Freighter.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { isConnected } = await freighter.isConnected();
    return isConnected;
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
 * Sign a transaction XDR string using Freighter.
 */
export async function signWithFreighter(
  transactionXDR: string,
  networkPassphrase: string
): Promise<string> {
  const result = await signTransaction(transactionXDR, {
    networkPassphrase,
  });

  if ("error" in result) {
    throw new Error(`Transaction signing failed: ${result.error}`);
  }

  return result.signedTxXdr;
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
