/**
 * error: Stellar Error Handling & User Messaging
 * Centralized error handler that translates Stellar/Soroban errors into user-friendly messages.
 */

export const StellarErrorType = {
  INVALID_AMOUNT: "InvalidAmount",
  INSUFFICIENT_FUNDING: "InsufficientFunding",
  UNAUTHORIZED: "Unauthorized",
  DEADLINE_NOT_REACHED: "DeadlineNotReached",
  SHARE_SUM_EXCEEDS_RENT: "ShareSumExceedsRent",
  NOTHING_TO_REFUND: "NothingToRefund",
  RPC_NETWORK_TIMEOUT: "RpcNetworkTimeout",
  RPC_NODE_UNAVAILABLE: "RpcNodeUnavailable",
  RPC_SIMULATION_FAILURE: "RpcSimulationFailure",
  FREIGHTER_REJECTED: "FreighterRejected",
  FREIGHTER_LOCKED: "FreighterLocked",
  FREIGHTER_NOT_INSTALLED: "FreighterNotInstalled",
  UNKNOWN: "Unknown",
} as const;

export type StellarErrorType = (typeof StellarErrorType)[keyof typeof StellarErrorType];

export interface UserFriendlyError {
  type: StellarErrorType;
  message: string;
  guidance: string;
}

const ERROR_MAPPINGS: Record<number | string, UserFriendlyError> = {
  // Soroban Contract Errors (matched by code or name)
  1: {
    type: StellarErrorType.INVALID_AMOUNT,
    message: "The provided amount is invalid.",
    guidance: "Please check the amount and try again. It must be a positive number and meet the minimum rent requirement.",
  },
  2: {
    type: StellarErrorType.INSUFFICIENT_FUNDING,
    message: "Insufficient funding in the escrow.",
    guidance: "The contract does not have enough tokens to complete this release. Ensure all roommates have contributed.",
  },
  3: {
    type: StellarErrorType.UNAUTHORIZED,
    message: "You are not authorized to perform this action.",
    guidance: "Ensure you are using the correct account (e.g., the landlord or a registered roommate).",
  },
  4: {
    type: StellarErrorType.DEADLINE_NOT_REACHED,
    message: "The deadline has not been reached yet.",
    guidance: "Refunds or certain actions are only available after the escrow deadline has passed.",
  },
  5: {
    type: StellarErrorType.SHARE_SUM_EXCEEDS_RENT,
    message: "Total roommate shares exceed the rent amount.",
    guidance: "The sum of all roommate obligations cannot be greater than the total rent. Please adjust the shares.",
  },
  6: {
    type: StellarErrorType.NOTHING_TO_REFUND,
    message: "No funds available to refund.",
    guidance: "This account has no contributed balance in the escrow to reclaim.",
  },

  // RPC Errors
  "TIMEOUT": {
    type: StellarErrorType.RPC_NETWORK_TIMEOUT,
    message: "Network request timed out.",
    guidance: "The Stellar network is taking too long to respond. Please check your internet connection or try again in a few moments.",
  },
  "NODE_UNAVAILABLE": {
    type: StellarErrorType.RPC_NODE_UNAVAILABLE,
    message: "The Soroban RPC node is currently unavailable.",
    guidance: "We're having trouble connecting to the Stellar network. Please try again later.",
  },
  "SIMULATION_FAILURE": {
    type: StellarErrorType.RPC_SIMULATION_FAILURE,
    message: "Transaction simulation failed.",
    guidance: "The transaction would fail if submitted. This often happens if contract conditions aren't met.",
  },

  // Freighter Errors
  "User declined": {
    type: StellarErrorType.FREIGHTER_REJECTED,
    message: "Transaction rejected in Freighter.",
    guidance: "You cancelled the transaction in your wallet. If this was a mistake, please try again and approve the request.",
  },
  "Wallet is locked": {
    type: StellarErrorType.FREIGHTER_LOCKED,
    message: "Freighter wallet is locked.",
    guidance: "Please unlock your Freighter extension and try again.",
  },
  "Freighter not found": {
    type: StellarErrorType.FREIGHTER_NOT_INSTALLED,
    message: "Freighter extension not found.",
    guidance: "Please install the Freighter wallet extension to interact with this application.",
  },
};

/**
 * Translates a raw error from Stellar, Soroban, or Freighter into a user-friendly message.
 * @param error The raw error object or message string.
 */
export function translateStellarError(error: any): UserFriendlyError {
  let errorKey: string | number = "UNKNOWN";

  if (typeof error === "string") {
    const msg = error.toLowerCase();
    if (msg.includes("declined") || msg.includes("reject")) errorKey = "User declined";
    else if (msg.includes("timeout")) errorKey = "TIMEOUT";
    else if (msg.includes("unavailable") || msg.includes("fetch")) errorKey = "NODE_UNAVAILABLE";
    else if (msg.includes("lock")) errorKey = "Wallet is locked";
    else errorKey = error;
  } else if (error && typeof error === "object") {
    // Handle Soroban contract error codes (e.g., from simulation or resultXdr)
    if (typeof error.code === "number") {
      errorKey = error.code;
    } else if (error.message) {
      // Handle known error message substrings
      const msg = error.message.toLowerCase();
      if (msg.includes("timeout")) errorKey = "TIMEOUT";
      else if (msg.includes("unavailable") || msg.includes("fetch")) errorKey = "NODE_UNAVAILABLE";
      else if (msg.includes("declined") || msg.includes("reject")) errorKey = "User declined";
      else if (msg.includes("lock")) errorKey = "Wallet is locked";
      else if (msg.includes("simulation")) errorKey = "SIMULATION_FAILURE";
    }
  }

  const mapping = ERROR_MAPPINGS[errorKey];
  if (mapping) {
    return mapping;
  }

  // Fallback for unmapped errors
  return {
    type: StellarErrorType.UNKNOWN,
    message: "An unexpected Stellar error occurred.",
    guidance: typeof error?.message === "string" ? error.message : "If the problem persists, please contact support with details of the action you were performing.",
  };
}
