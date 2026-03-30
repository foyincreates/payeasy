/**
 * Stellar uses 7-decimal precision for all assets.
 */
export const STELLAR_DECIMALS = 7;

/**
 * Formats a human-readable amount to Stellar's 7-decimal integer representation.
 * Example: "1.5" -> 15000000
 */
export function toStellarAmount(amount: string | number): bigint {
  const sAmount = String(amount);
  if (!sAmount.includes(".")) {
    return BigInt(sAmount + "0".repeat(STELLAR_DECIMALS));
  }
  const [integral, fractional] = sAmount.split(".");
  const paddedFractional = fractional.padEnd(STELLAR_DECIMALS, "0").slice(0, STELLAR_DECIMALS);
  return BigInt(integral + paddedFractional);
}

/**
 * Formats a Stellar integer amount to a human-readable string.
 * Example: 15000000 -> "1.5"
 */
export function fromStellarAmount(amount: bigint | string): string {
  const s = String(amount).padStart(STELLAR_DECIMALS + 1, "0");
  const decIndex = s.length - STELLAR_DECIMALS;
  const integral = s.slice(0, decIndex);
  const fractional = s.slice(decIndex).replace(/0+$/, "");
  
  // Clean up leading zeros in integral part unless it's "0"
  const cleanIntegral = BigInt(integral).toString();
  
  return fractional ? `${cleanIntegral}.${fractional}` : cleanIntegral;
}
