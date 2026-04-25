// @stellar/freighter-api is a CJS module; default import avoids Node ESM named-export error
import freighterApi from "@stellar/freighter-api";
const { isConnected, isAllowed, setAllowed, requestAccess, getAddress, signTransaction } =
  freighterApi as typeof import("@stellar/freighter-api");
import { getCurrentNetwork } from "./config.ts";

/**
 * Checks if the Freighter extension is installed in the browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Checks if the user is currently connected to Freighter.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
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
    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) {
      const setResult = await setAllowed();
      if (!setResult.isAllowed) return null;
    }

    const accessResult = await requestAccess();
    if ("error" in accessResult && accessResult.error) return null;
    return accessResult.address || null;
  } catch (error) {
    console.error("Failed to connect to Freighter:", error);
    return null;
  }
}

/**
 * Gets the connected user's public key.
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    const result = await getAddress();
    if ("error" in result && result.error) return null;
    return result.address || null;
  } catch {
    return null;
  }
}

/**
 * Signs a transaction XDR using Freighter.
 */
export async function signTx(xdr: string, network?: string): Promise<string | null> {
  try {
    const networkToUse = network || getCurrentNetwork().toUpperCase();
    const result = await signTransaction(xdr, {
      networkPassphrase:
        networkToUse === "TESTNET"
          ? "Test SDF Network ; September 2015"
          : "Public Global Stellar Network ; September 2015",
    });

    if ("error" in result && result.error) {
      throw new Error(String(result.error));
    }

    return result.signedTxXdr;
  } catch (error) {
    console.error("Freighter signing failed:", error);
    return null;
  }
}

/**
 * Returns the installed Freighter extension version string (e.g. "12.1.0"),
 * or null if Freighter is not installed or the version cannot be determined.
 */
export async function getFreighterVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const win = window as Window & {
      freighter?: { version?: string; getVersion?: () => string };
    };
    if (!win.freighter) return null;

    if (typeof win.freighter.version === "string") {
      return win.freighter.version;
    }
    if (typeof win.freighter.getVersion === "function") {
      return win.freighter.getVersion() ?? null;
    }

    // Fallback: try the freighter-api module's getVersion export if present
    const freighterModule = await import("@stellar/freighter-api");
    if (typeof (freighterModule as Record<string, unknown>).getVersion === "function") {
      const result = await (freighterModule as unknown as { getVersion: () => Promise<{ version: string }> }).getVersion();
      return result?.version ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

const MINIMUM_FREIGHTER_VERSION = [10, 0, 0] as const;

function parseVersion(v: string): [number, number, number] {
  const parts = v.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Returns true if the installed Freighter version meets the minimum requirement (10.0.0).
 * Returns null when the version cannot be determined.
 */
export async function isFreighterVersionSupported(): Promise<boolean | null> {
  const version = await getFreighterVersion();
  if (!version) return null;

  const [major, minor, patch] = parseVersion(version);
  const [minMajor, minMinor, minPatch] = MINIMUM_FREIGHTER_VERSION;

  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

/**
 * Gets the current network of the connected Freighter wallet.
 * Returns "TESTNET" or "MAINNET" if connected and network can be determined.
 * Returns null if Freighter is not available, not connected, or network cannot be determined.
 */
export async function getFreighterNetwork(): Promise<"TESTNET" | "MAINNET" | null> {
  if (typeof window === "undefined") return null;
  try {
    // Check if Freighter is connected
    const connected = await isConnected();
    if (!connected.isConnected) return null;

    // Try to get the network from the Freighter API
    const freighterModule = await import("@stellar/freighter-api");
    if (typeof freighterModule.getNetwork === "function") {
      const networkResult = await freighterModule.getNetwork();
      return networkResult.network.toUpperCase() as "TESTNET" | "MAINNET";
    } else {
      // Fallback: if getNetwork is not available, we cannot determine the network
      return null;
    }
  } catch (error) {
    console.error("Failed to get Freighter network:", error);
    return null;
  }
}
