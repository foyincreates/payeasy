import { rpcServer } from "./config.ts";

export type NetworkHealthStatus = "healthy" | "degraded" | "offline";

export interface HealthReport {
  status: NetworkHealthStatus;
  latestLedger: number;
  timestamp: number;
}

/**
 * Checks the health of the Soroban RPC node.
 * Performs a getHealth call and fetches the latest ledger sequence.
 */
export async function getNetworkStatus(): Promise<HealthReport> {
  const timestamp = Date.now();
  try {
    const health = await rpcServer.getHealth();
    const ledger = await rpcServer.getLatestLedger();

    let status: NetworkHealthStatus = "healthy";

    if (health.status !== "healthy") {
      status = "degraded";
    }

    return {
      status,
      latestLedger: ledger.sequence,
      timestamp,
    };
  } catch (error) {
    console.error("RPC Health Check Failed:", error);
    return {
      status: "offline",
      latestLedger: 0,
      timestamp,
    };
  }
}

/**
 * Helper to determine if a connection is stale based on ledger sequence.
 * Typically, Stellar ledgers are closed every ~5 seconds.
 */
export function isConnectionStale(lastLedger: number, currentLedger: number): boolean {
  // If the ledger hasn't advanced in a significant number of sequences, it's stale
  // For this utility, we simply compare the two values.
  return currentLedger <= lastLedger && lastLedger !== 0;
}
