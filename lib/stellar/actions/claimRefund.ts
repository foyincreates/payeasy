/**
 * lib/stellar/actions/claimRefund.ts
 *
 * Frontend action for calling the `claim_refund` Soroban contract function.
 * Checks deadline expiry, builds + signs the transaction via Freighter,
 * submits to the network, and returns a structured confirmation.
 */

import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  BASE_FEE,
  Address,
} from "@stellar/stellar-sdk";
import { getPublicKey, signTransaction } from "@stellar/freighter-api";

// ─── Constants ────────────────────────────────────────────────────────────────

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimRefundParams {
  /** Deployed contract address (C...) */
  contractId: string;
  /** Roommate's Stellar public key — must match escrow record */
  roommateAddress: string;
  /** Unix timestamp (seconds) of the escrow deadline */
  deadlineTimestamp: number;
}

export interface ClaimRefundResult {
  txHash: string;
  refundedAmount: string; // in stroops as string
  roommateAddress: string;
  confirmedAt: Date;
}

export class DeadlineNotExpiredError extends Error {
  constructor(deadlineTimestamp: number) {
    const deadline = new Date(deadlineTimestamp * 1000).toISOString();
    super(`Deadline has not passed yet. Refund available after: ${deadline}`);
    this.name = "DeadlineNotExpiredError";
  }
}

export class FreighterNotAvailableError extends Error {
  constructor() {
    super("Freighter wallet extension not found. Please install it.");
    this.name = "FreighterNotAvailableError";
  }
}

// ─── Deadline guard ───────────────────────────────────────────────────────────

/**
 * Throws DeadlineNotExpiredError if the current time is before the deadline.
 * Uses the ledger's close time for on-chain accuracy if rpcUrl is provided,
 * otherwise falls back to local clock (fine for UI pre-checks).
 */
export async function assertDeadlineExpired(
  deadlineTimestamp: number,
  rpcUrl = RPC_URL
): Promise<void> {
  let nowSeconds: number;

  try {
    const server = new SorobanRpc.Server(rpcUrl);
    const latestLedger = await server.getLatestLedger();
    // Stellar ledgers close ~every 5 s; closeTime is a unix timestamp
    nowSeconds = (latestLedger as any).closeTime ?? Math.floor(Date.now() / 1000);
  } catch {
    // Fallback to local clock if RPC is unreachable
    nowSeconds = Math.floor(Date.now() / 1000);
  }

  if (nowSeconds < deadlineTimestamp) {
    throw new DeadlineNotExpiredError(deadlineTimestamp);
  }
}

// ─── Core action ─────────────────────────────────────────────────────────────

/**
 * Full claim-refund flow:
 *  1. Assert deadline has passed
 *  2. Resolve Freighter public key (or use provided roommateAddress)
 *  3. Build Soroban invoke transaction
 *  4. Simulate to get resource estimates
 *  5. Sign via Freighter
 *  6. Submit and await confirmation
 *  7. Return parsed result
 */
export async function claimRefund(
  params: ClaimRefundParams
): Promise<ClaimRefundResult> {
  const { contractId, roommateAddress, deadlineTimestamp } = params;

  // ── 1. Deadline check ────────────────────────────────────────────────────
  await assertDeadlineExpired(deadlineTimestamp);

  // ── 2. Freighter guard ───────────────────────────────────────────────────
  if (typeof window === "undefined" || !(window as any).freighter) {
    throw new FreighterNotAvailableError();
  }

  // Validate the connected wallet matches the expected roommate
  const connectedKey = await getPublicKey();
  if (connectedKey !== roommateAddress) {
    throw new Error(
      `Connected wallet (${connectedKey.slice(0, 6)}…) does not match ` +
        `expected roommate (${roommateAddress.slice(0, 6)}…). ` +
        `Switch accounts in Freighter.`
    );
  }

  // ── 3. Build transaction ─────────────────────────────────────────────────
  const server = new SorobanRpc.Server(RPC_URL);
  const account = await server.getAccount(roommateAddress);

  const contract = new Contract(contractId);
  const roommateScVal = new Address(roommateAddress).toScVal();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("claim_refund", roommateScVal))
    .setTimeout(300)
    .build();

  // ── 4. Simulate (get resource fees + footprint) ──────────────────────────
  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // ── 5. Sign via Freighter ────────────────────────────────────────────────
  const { signedTxXdr } = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // ── 6. Submit ────────────────────────────────────────────────────────────
  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`
    );
  }

  // Poll for confirmation
  const txHash = sendResult.hash;
  let getResult = await server.getTransaction(txHash);

  const MAX_RETRIES = 20;
  let retries = 0;

  while (
    getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    retries < MAX_RETRIES
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(txHash);
    retries++;
  }

  if (getResult.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Transaction did not succeed. Status: ${getResult.status}`
    );
  }

  // ── 7. Parse return value ────────────────────────────────────────────────
  // Contract returns the refunded amount as i128
  const returnVal = getResult.returnValue;
  const refundedAmount: bigint = returnVal
    ? (scValToNative(returnVal) as bigint)
    : 0n;

  return {
    txHash,
    refundedAmount: refundedAmount.toString(),
    roommateAddress,
    confirmedAt: new Date(),
  };
}

// ─── Utility: human-readable amount ──────────────────────────────────────────

/** Convert stroops string → XLM string (7 decimal places) */
export function stroopsToXlm(stroops: string): string {
  const n = BigInt(stroops);
  const whole = n / 10_000_000n;
  const frac = n % 10_000_000n;
  return `${whole}.${frac.toString().padStart(7, "0")}`;
}