/**
 * Frontend action for calling the escrow refund method after deadline expiry.
 *
 * This action:
 *  1. Resolves the on-chain deadline from the contract unless the caller
 *     provides a trusted cached deadline.
 *  2. Checks that the latest ledger close time is past the deadline.
 *  3. Reads the roommate's refundable balance before submission so the UI can
 *     show the refunded amount even if the contract method returns void.
 *  4. Builds, signs, submits, and confirms the Soroban transaction.
 */

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_TIMEOUT_SECONDS = 300;
const MAX_CONFIRMATION_RETRIES = 20;
const CONFIRMATION_DELAY_MS = 1500;
const REFUND_METHOD_CANDIDATES = ["claim_refund", "reclaim_deposit"] as const;

export interface ClaimRefundParams {
  /** Deployed contract address (C...) */
  contractId: string;
  /** Roommate's Stellar public key */
  roommateAddress: string;
  /**
   * Optional trusted deadline timestamp already fetched from the contract.
   * When omitted, the action reads `get_deadline()` from the contract directly.
   */
  deadlineTimestamp?: number;
  /**
   * Optional trusted refundable balance already fetched from the contract.
   * When omitted, the action reads `get_balance(roommate)` from the contract directly.
   */
  refundableAmount?: string;
}

export interface ClaimRefundResult {
  txHash: string;
  refundedAmount: string;
  roommateAddress: string;
  confirmedAt: Date;
  refundedAtLedger: number;
  method: RefundMethodName;
}

export class DeadlineNotExpiredError extends Error {
  readonly deadlineTimestamp: number;

  constructor(deadlineTimestamp: number) {
    super(
      `Deadline has not passed yet. Refund available after ${new Date(
        deadlineTimestamp * 1000
      ).toISOString()}`
    );
    this.name = "DeadlineNotExpiredError";
    this.deadlineTimestamp = deadlineTimestamp;
  }
}

export class FreighterNotAvailableError extends Error {
  constructor() {
    super("Freighter wallet extension not found. Please install it.");
    this.name = "FreighterNotAvailableError";
  }
}

export class NoRefundAvailableError extends Error {
  constructor(roommateAddress: string) {
    super(`No refundable balance found for roommate ${roommateAddress}.`);
    this.name = "NoRefundAvailableError";
  }
}

export class RefundMethodResolutionError extends Error {
  constructor() {
    super("Unable to resolve a supported refund method on the escrow contract.");
    this.name = "RefundMethodResolutionError";
  }
}

export type RefundMethodName = (typeof REFUND_METHOD_CANDIDATES)[number];

export interface FreighterAddressResponse {
  address: string;
  error?: unknown;
}

export interface FreighterSignResponse {
  signedTxXdr?: string;
  txXdr?: string;
  error?: unknown;
}

export interface FreighterClient {
  getAddress: () => Promise<FreighterAddressResponse>;
  signTransaction: (
    transactionXdr: string,
    options?: { networkPassphrase?: string; address?: string }
  ) => Promise<FreighterSignResponse>;
}

export interface ClaimRefundDependencies {
  server?: rpc.Server;
  freighter?: FreighterClient;
  networkPassphrase?: string;
  rpcUrl?: string;
  sleep?: (ms: number) => Promise<void>;
  refundMethodCandidates?: readonly RefundMethodName[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadFreighterClient(): Promise<FreighterClient> {
  if (typeof window === "undefined" || !(window as Window & { freighter?: unknown }).freighter) {
    throw new FreighterNotAvailableError();
  }

  const freighterModule = await import("@stellar/freighter-api");
  const freighter = "default" in freighterModule ? freighterModule.default : freighterModule;

  return {
    getAddress: freighter.getAddress,
    signTransaction: freighter.signTransaction,
  };
}

function getServer(deps: ClaimRefundDependencies): rpc.Server {
  return deps.server ?? new rpc.Server(deps.rpcUrl ?? RPC_URL);
}

function getNetworkPassphrase(deps: ClaimRefundDependencies): string {
  return deps.networkPassphrase ?? NETWORK_PASSPHRASE;
}

async function getSourceAccount(
  server: rpc.Server,
  address: string
): Promise<Account> {
  return server
    .getAccount(address)
    .catch(() => new Account(address, "0"));
}

function getSimulationReturnValue(
  simulation: rpc.Api.SimulateTransactionResponse
): unknown {
  const simulationShape = simulation as {
    result?: { retval?: unknown };
    results?: Array<{ retval?: unknown }>;
  };
  const resultRetval = simulationShape.result?.retval;
  const resultsRetval = simulationShape.results?.[0]?.retval;

  return resultRetval ?? resultsRetval;
}

function parseIntegerString(value: unknown, label: string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeValue = value as Record<string, unknown>;

    for (const key of ["i128", "u64", "value"]) {
      const nested = maybeValue[key];
      if (typeof nested === "bigint") return nested.toString();
      if (typeof nested === "number" && Number.isFinite(nested)) {
        return Math.trunc(nested).toString();
      }
      if (typeof nested === "string" && nested.length > 0) {
        return nested;
      }
    }
  }

  throw new Error(`Unable to parse ${label} from contract response.`);
}

async function simulateReadOnly(
  server: rpc.Server,
  contractId: string,
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = [],
  networkPassphrase: string = NETWORK_PASSPHRASE
): Promise<unknown> {
  const sourceAccount = await getSourceAccount(server, sourceAddress);
  const contract = new Contract(contractId);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(DEFAULT_TIMEOUT_SECONDS)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed for ${method}: ${simulation.error}`);
  }

  return getSimulationReturnValue(simulation);
}

export async function getContractDeadline(
  contractId: string,
  roommateAddress: string,
  deps: ClaimRefundDependencies = {}
): Promise<number> {
  const retval = await simulateReadOnly(
    getServer(deps),
    contractId,
    roommateAddress,
    "get_deadline",
    [],
    getNetworkPassphrase(deps)
  );

  return Number.parseInt(parseIntegerString(scValToNative(retval as never), "deadline"), 10);
}

export async function getRefundableBalance(
  contractId: string,
  roommateAddress: string,
  deps: ClaimRefundDependencies = {}
): Promise<string> {
  const retval = await simulateReadOnly(
    getServer(deps),
    contractId,
    roommateAddress,
    "get_balance",
    [Address.fromString(roommateAddress).toScVal()],
    getNetworkPassphrase(deps)
  );

  return parseIntegerString(scValToNative(retval as never), "refundable balance");
}

export async function assertDeadlineExpired(
  deadlineTimestamp: number,
  deps: ClaimRefundDependencies = {}
): Promise<void> {
  const latestLedger = await getServer(deps).getLatestLedger();
  const ledgerTimestampSource = latestLedger as {
    closeTime?: string | number;
    latestLedgerCloseTime?: string | number;
  };
  const nowSeconds = Number.parseInt(
    String(
      ledgerTimestampSource.closeTime ?? ledgerTimestampSource.latestLedgerCloseTime
    ),
    10
  );

  if (nowSeconds < deadlineTimestamp) {
    throw new DeadlineNotExpiredError(deadlineTimestamp);
  }
}

async function resolveRefundMethod(
  contractId: string,
  roommateAddress: string,
  deps: ClaimRefundDependencies
): Promise<RefundMethodName> {
  const candidates = deps.refundMethodCandidates ?? REFUND_METHOD_CANDIDATES;
  const server = getServer(deps);
  const networkPassphrase = getNetworkPassphrase(deps);
  const roommateArg = Address.fromString(roommateAddress).toScVal();

  for (const method of candidates) {
    try {
      await simulateReadOnly(
        server,
        contractId,
        roommateAddress,
        method,
        [roommateArg],
        networkPassphrase
      );
      return method;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes("function does not exist") ||
        message.includes("unknown function") ||
        message.includes("method not found") ||
        message.includes("MissingValue")
      ) {
        continue;
      }

      return method;
    }
  }

  throw new RefundMethodResolutionError();
}

function normalizeSignedTransactionXdr(result: FreighterSignResponse): string {
  const signedXdr = result.signedTxXdr ?? result.txXdr;

  if (typeof signedXdr !== "string" || signedXdr.length === 0) {
    throw new Error(
      result.error
        ? `Failed to sign transaction with Freighter: ${String(result.error)}`
        : "Freighter did not return a signed transaction XDR."
    );
  }

  return signedXdr;
}

export async function claimRefund(
  params: ClaimRefundParams,
  deps: ClaimRefundDependencies = {}
): Promise<ClaimRefundResult> {
  const server = getServer(deps);
  const networkPassphrase = getNetworkPassphrase(deps);
  const freighter = deps.freighter ?? (await loadFreighterClient());
  const {
    contractId,
    roommateAddress,
    deadlineTimestamp: providedDeadline,
    refundableAmount: providedRefundableAmount,
  } = params;

  const deadlineTimestamp =
    providedDeadline ??
    (await getContractDeadline(contractId, roommateAddress, {
      ...deps,
      server,
      networkPassphrase,
    }));

  await assertDeadlineExpired(deadlineTimestamp, {
    ...deps,
    server,
    networkPassphrase,
  });

  const refundableAmount =
    providedRefundableAmount ??
    (await getRefundableBalance(contractId, roommateAddress, {
      ...deps,
      server,
      networkPassphrase,
    }));

  if (BigInt(refundableAmount) <= BigInt(0)) {
    throw new NoRefundAvailableError(roommateAddress);
  }

  const connectedAddressResult = await freighter.getAddress();
  if (connectedAddressResult.error) {
    throw new Error(
      `Failed to read connected wallet from Freighter: ${String(
        connectedAddressResult.error
      )}`
    );
  }

  const connectedAddress = connectedAddressResult.address;
  if (connectedAddress !== roommateAddress) {
    throw new Error(
      `Connected wallet (${connectedAddress.slice(0, 6)}...) does not match expected roommate (${roommateAddress.slice(0, 6)}...).`
    );
  }

  const sourceAccount = await getSourceAccount(server, roommateAddress);
  const contract = new Contract(contractId);
  const refundMethod = await resolveRefundMethod(contractId, roommateAddress, {
    ...deps,
    server,
    networkPassphrase,
  });

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      contract.call(refundMethod, Address.fromString(roommateAddress).toScVal())
    )
    .setTimeout(DEFAULT_TIMEOUT_SECONDS)
    .build();

  const simulation = await server.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }

  const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();
  const signedResponse = await freighter.signTransaction(preparedTransaction.toXDR(), {
    address: roommateAddress,
    networkPassphrase,
  });
  const signedTxXdr = normalizeSignedTransactionXdr(signedResponse);

  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase)
  );

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(
        sendResult.errorResult ?? sendResult
      )}`
    );
  }

  const wait = deps.sleep ?? sleep;
  let transactionResult = await server.getTransaction(sendResult.hash);
  let retries = 0;

  while (
    transactionResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    retries < MAX_CONFIRMATION_RETRIES
  ) {
    await wait(CONFIRMATION_DELAY_MS);
    transactionResult = await server.getTransaction(sendResult.hash);
    retries += 1;
  }

  if (transactionResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Transaction did not succeed. Status: ${transactionResult.status}`
    );
  }

  const onChainReturnValue = transactionResult.returnValue
    ? parseIntegerString(
        scValToNative(transactionResult.returnValue),
        "refunded amount"
      )
    : refundableAmount;

  return {
    txHash: sendResult.hash,
    refundedAmount: onChainReturnValue,
    roommateAddress,
    confirmedAt: new Date(transactionResult.createdAt * 1000),
    refundedAtLedger: transactionResult.ledger,
    method: refundMethod,
  };
}

export function stroopsToXlm(stroops: string): string {
  const amount = BigInt(stroops);
  const divisor = BigInt(10_000_000);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  return `${whole}.${fraction.toString().padStart(7, "0")}`;
}
