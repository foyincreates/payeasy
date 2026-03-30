/**
 * Validates a contribution amount against the remaining balance.
 * 
 * @param amount The amount to contribute as a string.
 * @param remainingBalance The remaining balance as a string.
 * @returns { isValid: boolean, error?: string }
 */
export function validateContributionAmount(
  amount: string,
  remainingBalance: string
): { isValid: boolean; error?: string } {
  const amountNum = parseFloat(amount);
  const remainingNum = parseFloat(remainingBalance);

  if (isNaN(amountNum) || amountNum <= 0) {
    return { isValid: false, error: "Contribution amount must be greater than zero." };
  }

  if (amountNum > remainingNum) {
    return { 
      isValid: false, 
      error: `Amount cannot exceed the remaining balance of ${remainingBalance} XLM.` 
    };
  }

  return { isValid: true };
}
