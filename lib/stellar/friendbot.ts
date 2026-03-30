import { getCurrentNetwork } from "./explorer";

/**
 * Funds a Stellar testnet account using the official Friendbot service.
 * Only works when the current network is set to testnet.
 * 
 * @param publicKey The Stellar public key to fund.
 * @throws Error if the network is not testnet or if the API call fails.
 */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const network = getCurrentNetwork();
  
  if (network !== "testnet") {
    throw new Error("Friendbot funding is only available on testnet.");
  }

  if (!publicKey || publicKey.length !== 56 || !publicKey.startsWith("G")) {
    throw new Error("Invalid Stellar public key format.");
  }

  try {
    const response = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Friendbot request failed with status ${response.status}`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while funding the account.");
  }
}
