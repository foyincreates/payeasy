import { getCurrentNetwork } from "./explorer";

/**
 * Validates a Stellar public key (G... or C...).
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }
  // Basic regex for Stellar public keys
  return /^[G|C][A-Z2-7]{55}$/.test(address);
}

export interface ValidationSummary {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Performs client-side safety checks on a transaction XDR before signing.
 * 
 * Note: Full XDR decoding requires the 'stellar-sdk' library.
 * This implementation provides structural and environmental validation.
 * 
 * @param xdr The base64-encoded transaction XDR.
 * @param expectedNetwork The network passphrase or alias (e.g., 'testnet').
 */
export async function validateTransactionSafety(
  xdr: string,
  expectedNetwork: string
): Promise<ValidationSummary> {
  const result: ValidationSummary = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // 1. Basic XDR structural check (must be base64)
  if (!xdr || !/^[A-Za-z0-9+/=]+$/.test(xdr)) {
    result.isValid = false;
    result.errors.push("Invalid transaction XDR format (must be base64).");
  }

  // 2. Network mismatch check
  const currentNetwork = getCurrentNetwork();
  if (expectedNetwork.toLowerCase() !== currentNetwork.toLowerCase()) {
    result.isValid = false;
    result.errors.push(
      `Network mismatch: Transaction is for ${expectedNetwork}, but app is on ${currentNetwork}.`
    );
  }

  // 3. Size check (protect against massive transactions)
  if (xdr.length > 32768) {
    result.warnings.push("Transaction payload is unusually large.");
  }

  return result;
}

/**
 * Checks if a contract ID follows the expected format.
 */
export function isValidContractId(contractId: string): boolean {
  if (!contractId || contractId.length !== 56 || !contractId.startsWith("C")) {
    return false;
  }
  return true;
}
