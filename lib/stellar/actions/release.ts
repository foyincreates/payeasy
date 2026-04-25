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
  rpc,
  TransactionBuilder,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import freighterApi from "@stellar/freighter-api";
const { getAddress, signTransaction } = freighterApi;

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
  const server = new rpc.Server(rpcUrl);

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

  if (rpc.Api.isSimulationError(simResult)) {
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

// ─── Phase 1: build + simulate ────────────────────────────────────────────────

/**
 * Validates funding status, builds the release transaction, runs a simulation
 * to obtain resource estimates, and returns the prepared transaction XDR.
 * Call this before showing the TransactionReview modal.
 */
export async function buildReleaseXdr(params: ReleaseParams): Promise<string> {
  const { contractId, landlordAddress } = params;

  await assertFullyFunded(contractId, landlordAddress);

  const { isConnected } = await freighterApi.isConnected();
  if (!isConnected) {
    throw new FreighterNotAvailableError();
  }

  const server = new rpc.Server(RPC_URL);
  const account = await server.getAccount(landlordAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("release"))
    .setTimeout(300)
    .build();

  let simResult;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Simulation request failed: ${msg}`);
  }

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  return rpc.assembleTransaction(tx, simResult).build().toXDR();
}

// ─── Phase 2: sign + submit ───────────────────────────────────────────────────

/**
 * Signs the prepared XDR via Freighter, submits it to Horizon, and polls
 * for on-chain confirmation. Call this after the user approves in the
 * TransactionReview modal.
 */
export async function signAndSubmitRelease(
  preparedXdr: string,
  landlordAddress: string
): Promise<ReleaseResult> {
  const { address: connectedKey } = await getAddress();
  if (connectedKey !== landlordAddress) {
    throw new Error(
      `Connected wallet (${connectedKey.slice(0, 6)}…) does not match ` +
        `expected landlord (${landlordAddress.slice(0, 6)}…). ` +
        `Switch accounts in Freighter.`
    );
  }

  let signedTxXdr: string;
  try {
    const signResponse = await signTransaction(preparedXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    signedTxXdr = (signResponse as { signedTxXdr?: string; txXdr?: string } & string).signedTxXdr
      ?? (signResponse as { signedTxXdr?: string; txXdr?: string } & string).txXdr
      ?? (signResponse as unknown as string);
    if (typeof signedTxXdr !== "string") {
      throw new Error(`Unexpected Freighter response type: ${typeof signedTxXdr}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to sign transaction with Freighter: ${msg}`);
  }

  const server = new rpc.Server(RPC_URL);
  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(sendResult.errorResult || sendResult)}`
    );
  }

  const txHash = sendResult.hash;
  let getResult = await server.getTransaction(txHash);

  const MAX_RETRIES = 20;
  let retries = 0;

  while (
    getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    retries < MAX_RETRIES
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(txHash);
    retries++;
  }

  if (getResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Transaction did not succeed. Status: ${getResult.status}`
    );
  }

  return {
    txHash,
    confirmedAt: new Date(),
  };
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Full release flow: build XDR, sign via Freighter, submit and confirm.
 * Use buildReleaseXdr + signAndSubmitRelease directly when you need to
 * show a TransactionReview modal between the two phases.
 */
export async function releaseEscrow(
  params: ReleaseParams
): Promise<ReleaseResult> {
  const xdr = await buildReleaseXdr(params);
  return signAndSubmitRelease(xdr, params.landlordAddress);
}
