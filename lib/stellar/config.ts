import { rpc } from "@stellar/stellar-sdk";

export type StellarNetwork = "testnet" | "mainnet";

export interface NetworkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  networkPassphrase: string;
  friendbotUrl?: string;
}

export const NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://soroban-rpc.mainnet.stellar.org:443",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
  },
};

/**
 * Gets the current Stellar network from environment variables.
 * Defaults to 'testnet' if not specified.
 */
export function getCurrentNetwork(): StellarNetwork {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toLowerCase();
  if (network === "mainnet") return "mainnet";
  return "testnet";
}

/**
 * Returns the configuration for the current Stellar network.
 */
export function getNetworkConfig(): NetworkConfig {
  const network = getCurrentNetwork();
  return NETWORKS[network];
}

// Export a configured rpc.Server instance
const config = getNetworkConfig();
export const rpcServer = new rpc.Server(config.rpcUrl);
export const networkPassphrase = config.networkPassphrase;
