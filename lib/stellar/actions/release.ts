/**
 * lib/stellar/actions/release.ts
 *
 * Frontend action for calling the `release` Soroban contract method.
 * Checks if the escrow is fully funded, builds + signs the transaction via Freighter,
 * submits to the network, and returns a structured confirmation.
 */

import {
  Account,
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { getPublicKey, signTransaction } from "@stellar/freighter-api";

// ─── Constants ────────────────────────────────────────────────────────────────

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReleaseParams {
  /** Deployed contract address (C...) */
  contractId: string;
  /** Landlord's Stellar public key */
  landlordAddress: string;
}

export interface ReleaseResult {
  txHash: string;
  confirmedAt: Date;
}

export class EscrowNotFundedError extends Error {
  constructor() {
    super("Escrow is not fully funded yet.");
    this.name = "EscrowNotFundedError";
  }
}

export class FreighterNotAvailableError extends Error {
  constructor() {
    super("Freighter wallet extension not found. Please install it.");
    this.name = "FreighterNotAvailableError";
  }
}

// ─── Pre-flight guard ─────────────────────────────────────────────────────────

/**
 * Throws EscrowNotFundedError if the contract's `is_fully_funded` returns false.
 */
export async function assertFullyFunded(
  contractId: string,
  landlordAddress: string,
  rpcUrl = RPC_URL
): Promise<void> {
  const server = new SorobanRpc.Server(rpcUrl);

  const account = await server.getAccount(landlordAddress).catch(() => new Account(landlordAddress, "0"));
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("is_fully_funded"))
    .setTimeout(300)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Funding check simulation failed: ${simResult.error}`);
  }

  if (simResult.result?.retval) {
    const isFunded = scValToNative(simResult.result.retval);
    if (!isFunded) {
      throw new EscrowNotFundedError();
    }
  } else {
    throw new Error("Could not determine funding status from simulation");
  }
}

// ─── Core action ─────────────────────────────────────────────────────────────

/**
 * Full release flow:
 *  1. Assert escrow is fully funded
 *  2. Resolve Freighter public key
 *  3. Build Soroban invoke transaction (calling `release`)
 *  4. Simulate to get resource estimates and footprint
 *  5. Sign via Freighter
 *  6. Submit and await confirmation
 *  7. Return parsed result
 */
export async function releaseEscrow(
  params: ReleaseParams
): Promise<ReleaseResult> {
  const { contractId, landlordAddress } = params;

  // ── 1. Funding check ─────────────────────────────────────────────────────
  await assertFullyFunded(contractId, landlordAddress);

  // ── 2. Freighter guard ───────────────────────────────────────────────────
  if (typeof window === "undefined" || !(window as any).freighter) {
    throw new FreighterNotAvailableError();
  }

  const connectedKey = await getPublicKey();
  if (connectedKey !== landlordAddress) {
    throw new Error(
      `Connected wallet (${connectedKey.slice(0, 6)}…) does not match ` +
        `expected landlord (${landlordAddress.slice(0, 6)}…). ` +
        `Switch accounts in Freighter.`
    );
  }

  // ── 3. Build transaction ─────────────────────────────────────────────────
  const server = new SorobanRpc.Server(RPC_URL);
  const account = await server.getAccount(landlordAddress);

  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("release"))
    .setTimeout(300)
    .build();

  // ── 4. Simulate (get resource fees + footprint) ──────────────────────────
  let simResult;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch (error: any) {
    throw new Error(`Simulation request failed: ${error.message}`);
  }

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // ── 5. Sign via Freighter ────────────────────────────────────────────────
  let signedTxXdr: string;
  try {
    const signResponse = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    signedTxXdr = (signResponse as any).signedTxXdr || (signResponse as any).txXdr || signResponse;
    if (typeof signedTxXdr !== "string") {
      throw new Error(`Unexpected Freighter response type: ${typeof signedTxXdr}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to sign transaction with Freighter: ${error.message || error}`);
  }

  // ── 6. Submit ────────────────────────────────────────────────────────────
  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(sendResult.errorResult || sendResult)}`
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
  return {
    txHash,
    confirmedAt: new Date(),
  };
}
