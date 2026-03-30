// ─── Builder interfaces ───────────────────────────────────────────────────────

export interface InvokeContractParams {
  contractId: string;
  method: string;
  args: unknown[];
}

export interface SorobanTransaction {
  toXDR(): string;
}

export interface SorobanTransactionBuilder {
  addOperation(params: InvokeContractParams): SorobanTransactionBuilder;
  setTimeout(seconds: number): SorobanTransactionBuilder;
  build(): SorobanTransaction;
}

// ─── RPC interfaces ───────────────────────────────────────────────────────────

export interface SimulateTransactionResponse {
  error?: string;
  results?: Array<{ retval?: unknown; auth?: string[] }>;
  minResourceFee?: string;
  transactionData?: string;
}

export interface AssembledSorobanTransaction {
  toXDR(): string;
}

export type SendTransactionStatus =
  | "PENDING"
  | "DUPLICATE"
  | "TRY_AGAIN_LATER"
  | "ERROR";

export interface SendTransactionResponse {
  hash: string;
  status: SendTransactionStatus;
  errorResult?: unknown;
}

export interface GetTransactionResponse {
  status: "SUCCESS" | "FAILED" | "NOT_FOUND";
  returnValue?: unknown;
  resultXdr?: string;
  envelopeXdr?: string;
  resultMetaXdr?: string;
}

export interface SorobanRpcClient {
  simulateTransaction(xdr: string): Promise<SimulateTransactionResponse>;
  assembleTransaction(
    xdr: string,
    simulation: SimulateTransactionResponse
  ): AssembledSorobanTransaction;
  sendTransaction(signedXdr: string): Promise<SendTransactionResponse>;
  getTransaction(hash: string): Promise<GetTransactionResponse>;
}

// ─── Freighter signer ─────────────────────────────────────────────────────────

export interface FreighterSigner {
  signTransaction(
    xdr: string,
    options: { network: string; networkPassphrase: string }
  ): Promise<string>;
}

// ─── Public option types ──────────────────────────────────────────────────────

export interface BuildTransactionOptions {
  builder: SorobanTransactionBuilder;
  contractId: string;
  method: string;
  args?: unknown[];
  timeoutSeconds?: number;
}

export interface SubmitTransactionOptions {
  rpc: SorobanRpcClient;
  signer: FreighterSigner;
  network: string;
  networkPassphrase: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface TransactionResult {
  txHash: string;
  status: "SUCCESS" | "FAILED";
  returnValue?: unknown;
  error?: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

export class SubmissionError extends Error {
  readonly txHash?: string;

  constructor(message: string, txHash?: string) {
    super(message);
    this.name = "SubmissionError";
    this.txHash = txHash;
  }
}

export class TransactionTimeoutError extends Error {
  readonly txHash: string;

  constructor(txHash: string, retries: number) {
    super(`Transaction ${txHash} not confirmed after ${retries} attempts`);
    this.name = "TransactionTimeoutError";
    this.txHash = txHash;
  }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_MAX_RETRIES = 30;
const DEFAULT_RETRY_DELAY_MS = 2000;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Assembles a Soroban contract-invocation transaction using the provided
 * builder, operation parameters, and ledger timeout.
 */
export function buildTransaction(
  options: BuildTransactionOptions
): SorobanTransaction {
  const {
    builder,
    contractId,
    method,
    args = [],
    timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
  } = options;

  return builder
    .addOperation({ contractId, method, args })
    .setTimeout(timeoutSeconds)
    .build();
}

/**
 * Sends a built transaction to the Soroban RPC for simulation (preflight).
 * Simulation returns the resource fee and footprint needed for submission.
 * Throws {@link SimulationError} when the preflight call reports an error.
 */
export async function simulateTransaction(
  rpc: SorobanRpcClient,
  tx: SorobanTransaction
): Promise<SimulateTransactionResponse> {
  const result = await rpc.simulateTransaction(tx.toXDR());

  if (result.error) {
    throw new SimulationError(`Simulation failed: ${result.error}`);
  }

  return result;
}

/**
 * Polls `getTransaction` until the transaction reaches a terminal state
 * (SUCCESS or FAILED) or the retry budget is exhausted.
 * Throws {@link TransactionTimeoutError} when retries run out.
 */
export async function pollForResult(
  rpc: SorobanRpcClient,
  txHash: string,
  options: { maxRetries?: number; retryDelayMs?: number } = {}
): Promise<GetTransactionResponse> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await rpc.getTransaction(txHash);

    if (response.status !== "NOT_FOUND") {
      return response;
    }

    if (attempt < maxRetries - 1) {
      await sleep(retryDelayMs);
    }
  }

  throw new TransactionTimeoutError(txHash, maxRetries);
}

/**
 * End-to-end helper that:
 * 1. Builds the transaction.
 * 2. Simulates it for gas estimation (preflight).
 * 3. Assembles the final transaction with simulation data applied.
 * 4. Signs via Freighter.
 * 5. Submits to the Soroban RPC.
 * 6. Polls for the on-chain result with configurable retry logic.
 *
 * Returns a {@link TransactionResult} with the hash, status, and return value.
 * Throws {@link SimulationError}, {@link SubmissionError}, or
 * {@link TransactionTimeoutError} on failure.
 */
export async function buildAndSubmitTransaction(
  buildOptions: BuildTransactionOptions,
  submitOptions: SubmitTransactionOptions
): Promise<TransactionResult> {
  const {
    rpc,
    signer,
    network,
    networkPassphrase,
    maxRetries,
    retryDelayMs,
  } = submitOptions;

  const tx = buildTransaction(buildOptions);

  const simulation = await simulateTransaction(rpc, tx);

  const assembled = rpc.assembleTransaction(tx.toXDR(), simulation);

  const signedXdr = await signer.signTransaction(assembled.toXDR(), {
    network,
    networkPassphrase,
  });

  const sendResult = await rpc.sendTransaction(signedXdr);

  if (sendResult.status === "ERROR") {
    throw new SubmissionError(
      `Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`,
      sendResult.hash
    );
  }

  const finalResult = await pollForResult(rpc, sendResult.hash, {
    maxRetries,
    retryDelayMs,
  });

  return {
    txHash: sendResult.hash,
    status: finalResult.status === "SUCCESS" ? "SUCCESS" : "FAILED",
    returnValue: finalResult.returnValue,
    error:
      finalResult.status === "FAILED"
        ? `Transaction failed: ${finalResult.resultXdr ?? "unknown"}`
        : undefined,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
