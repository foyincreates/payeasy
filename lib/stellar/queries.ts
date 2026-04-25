// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SimulateTransactionResponse {
  error?: string;
  results?: Array<{ retval?: unknown; auth?: string[] }>;
}

export interface SorobanQueryClient {
  simulateTransaction(xdr: string): Promise<SimulateTransactionResponse>;
}

export interface BuildInvocationParams {
  contractId: string;
  method: string;
  args?: unknown[];
}

export interface ContractQueryBuilder {
  buildInvocationXdr(params: BuildInvocationParams): string;
}

export interface QueryContext {
  client: SorobanQueryClient;
  builder: ContractQueryBuilder;
  contractId: string;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class ContractQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractQueryError";
  }
}

// ─── Read-only getters ────────────────────────────────────────────────────────

/**
 * Returns the landlord `Address` stored in the escrow contract.
 * Maps to `get_landlord()` on the Rust contract.
 */
export async function getLandlord(ctx: QueryContext): Promise<string> {
  return callReadOnly(ctx, "get_landlord", [], parseAddressRetval);
}

/**
 * Returns the token contract `Address` used by the escrow.
 * Maps to `get_token_address()` on the Rust contract.
 */
export async function getTokenAddress(ctx: QueryContext): Promise<string> {
  return callReadOnly(ctx, "get_token_address", [], parseAddressRetval);
}

/**
 * Returns the total rent amount (`i128`) as a decimal string.
 * Returns `"0"` when the escrow has not been initialized.
 * Maps to `get_amount()` on the Rust contract.
 */
export async function getTotal(ctx: QueryContext): Promise<string> {
  return callReadOnly(ctx, "get_amount", [], parseI128Retval);
}

/**
 * Returns the deadline ledger timestamp (`u64`) as a decimal string.
 * Maps to `get_deadline()` on the Rust contract.
 */
export async function getDeadline(ctx: QueryContext): Promise<string> {
  return callReadOnly(ctx, "get_deadline", [], parseU64Retval);
}

/**
 * Returns the amount paid so far by `address` (`i128`) as a decimal string.
 * Returns `"0"` when the address is not a registered roommate.
 * Maps to `get_balance(from)` on the Rust contract.
 */
export async function getBalance(
  ctx: QueryContext,
  address: string
): Promise<string> {
  return callReadOnly(
    ctx,
    "get_balance",
    [{ address }],
    parseI128Retval
  );
}

/**
 * Returns the sum of all roommate contributions (`i128`) as a decimal string.
 * Maps to `get_total_funded()` on the Rust contract.
 */
export async function getTotalFunded(ctx: QueryContext): Promise<string> {
  return callReadOnly(ctx, "get_total_funded", [], parseI128Retval);
}

/**
 * Returns `true` when total contributions meet or exceed the rent goal.
 * Maps to `is_fully_funded()` on the Rust contract.
 */
export async function isFullyFunded(ctx: QueryContext): Promise<boolean> {
  return callReadOnly(ctx, "is_fully_funded", [], parseBoolRetval);
}

// ─── Generic read-only caller ─────────────────────────────────────────────────

async function callReadOnly<T>(
  ctx: QueryContext,
  method: string,
  args: unknown[],
  parse: (retval: unknown) => T
): Promise<T> {
  const xdr = ctx.builder.buildInvocationXdr({
    contractId: ctx.contractId,
    method,
    args,
  });

  let response: SimulateTransactionResponse;
  try {
    response = await ctx.client.simulateTransaction(xdr);
  } catch (err) {
    throw new ContractQueryError(
      `Simulation request failed for ${method}: ${String(err)}`
    );
  }

  if (response.error) {
    throw new ContractQueryError(
      `Contract query error in ${method}: ${response.error}`
    );
  }

  const retval = response.results?.[0]?.retval;

  try {
    return parse(retval);
  } catch (err) {
    if (err instanceof ContractQueryError) throw err;
    throw new ContractQueryError(
      `Failed to parse return value for ${method}: ${String(err)}`
    );
  }
}

// ─── ScVal parsers ────────────────────────────────────────────────────────────

function parseAddressRetval(retval: unknown): string {
  if (typeof retval === "string" && retval.length > 0) return retval;

  if (retval !== null && typeof retval === "object") {
    const obj = retval as Record<string, unknown>;

    if (typeof obj.address === "string") return obj.address;

    if (obj.address !== null && typeof obj.address === "object") {
      const addr = obj.address as Record<string, unknown>;
      if (typeof addr.accountId === "string") return addr.accountId;
      if (typeof addr.contractId === "string") return addr.contractId;
    }

    if (typeof obj.accountId === "string") return obj.accountId;
    if (typeof obj.contractId === "string") return obj.contractId;
  }

  throw new ContractQueryError(
    `Cannot parse Address from retval: ${JSON.stringify(retval)}`
  );
}

function parseI128Retval(retval: unknown): string {
  if (typeof retval === "string") return retval;
  if (typeof retval === "number") return String(retval);
  if (typeof retval === "bigint") return String(retval);

  if (retval !== null && typeof retval === "object") {
    const obj = retval as Record<string, unknown>;

    // { i128: "100" } or { i128: 100n }
    const flat = obj.i128;
    if (
      typeof flat === "string" ||
      typeof flat === "number" ||
      typeof flat === "bigint"
    ) {
      return String(flat);
    }

    // { i128: { hi: "0", lo: "100" } } — reconstruct from hi/lo u64 halves.
    // hi occupies the upper 64 bits: value = hi * 2^64 + lo.
    if (flat !== null && typeof flat === "object") {
      const parts = flat as Record<string, unknown>;
      const hi = Number(parts.hi ?? 0);
      const lo = Number(parts.lo ?? 0);
      // 2^64 = 18446744073709551616
      const TWO_POW_64 = 18446744073709551616;
      return String(hi * TWO_POW_64 + lo);
    }

    if (
      typeof obj.value === "string" ||
      typeof obj.value === "number" ||
      typeof obj.value === "bigint"
    ) {
      return String(obj.value);
    }
  }

  throw new ContractQueryError(
    `Cannot parse i128 from retval: ${JSON.stringify(retval)}`
  );
}

function parseU64Retval(retval: unknown): string {
  if (typeof retval === "string") return retval;
  if (typeof retval === "number") return String(retval);
  if (typeof retval === "bigint") return String(retval);

  if (retval !== null && typeof retval === "object") {
    const obj = retval as Record<string, unknown>;

    const flat = obj.u64;
    if (
      typeof flat === "string" ||
      typeof flat === "number" ||
      typeof flat === "bigint"
    ) {
      return String(flat);
    }

    if (
      typeof obj.value === "string" ||
      typeof obj.value === "number" ||
      typeof obj.value === "bigint"
    ) {
      return String(obj.value);
    }
  }

  throw new ContractQueryError(
    `Cannot parse u64 from retval: ${JSON.stringify(retval)}`
  );
}

function parseBoolRetval(retval: unknown): boolean {
  if (typeof retval === "boolean") return retval;

  if (retval !== null && typeof retval === "object") {
    const obj = retval as Record<string, unknown>;
    if (typeof obj.bool === "boolean") return obj.bool;
    if (typeof obj.value === "boolean") return obj.value;
  }

  throw new ContractQueryError(
    `Cannot parse bool from retval: ${JSON.stringify(retval)}`
  );
}

// ─── Contract state ───────────────────────────────────────────────────────────
// ─── Full contract state ──────────────────────────────────────────────────────

export interface ContractState {
  id: string;
  landlord: string;
  totalRent: string;
  deadline: string;
  /** Unix timestamp (seconds) of the deadline, for numeric comparison. */
  deadlineEpoch: number;
  status: "active" | "funded" | "released" | "expired";
  totalFunded: number;
  lastUpdate: string;
  roommates: {
    address: string;
    expectedShare: string;
    paidAmount: string;
    isPaid: boolean;
  }[];
}

export async function getContractState(contractId: string): Promise<ContractState> {
  const { rpcServer, networkPassphrase } = await import("./config.ts");
  const { TransactionBuilder, Account, Contract, scValToNative, rpc: rpcHelpers } = await import("@stellar/stellar-sdk");

  const buildInvocationXdr = ({ contractId, method, args = [] }: BuildInvocationParams): string => {
    const contract = new Contract(contractId);
    const source = new Account(contractId, "0");

    const tx = new TransactionBuilder(source, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...(args as import("@stellar/stellar-sdk").xdr.ScVal[])))
      .setTimeout(60)
      .build();

    return tx.toXDR();
  };

  const ctx: QueryContext = {
    client: {
      async simulateTransaction(xdrStr: string): Promise<SimulateTransactionResponse> {
        try {
          const tx = TransactionBuilder.fromXDR(xdrStr, networkPassphrase);
          const result = await rpcServer.simulateTransaction(tx);

          if (rpcHelpers.Api.isSimulationError(result)) {
            return { error: result.error };
          }

          let retval: unknown = undefined;
          if (rpcHelpers.Api.isSimulationSuccess(result) && result.result?.retval) {
            try {
              retval = scValToNative(result.result.retval);
            } catch {
              retval = result.result.retval.toString();
            }
          }

          return {
            results: retval !== undefined ? [{ retval }] : [],
          };
        } catch (err) {
          throw new ContractQueryError(`Soroban RPC simulation failed: ${String(err)}`);
        }
      },
    },
    builder: { buildInvocationXdr },
    contractId,
  };

  try {
    const [id, landlord, totalRent, deadlineStr, totalFunded, isFunded] = await Promise.all([
      Promise.resolve(contractId),
      (async () => {
        try { return await getLandlord(ctx); }
        catch (err) { throw new ContractQueryError(`Failed to query landlord address: ${err instanceof Error ? err.message : String(err)}`); }
      })(),
      (async () => {
        try { return await getTotal(ctx); }
        catch (err) { throw new ContractQueryError(`Failed to query total rent: ${err instanceof Error ? err.message : String(err)}`); }
      })(),
      (async () => {
        try { return await getDeadline(ctx); }
        catch (err) { throw new ContractQueryError(`Failed to query deadline: ${err instanceof Error ? err.message : String(err)}`); }
      })(),
      (async () => {
        try {
          const fundedStr = await getTotalFunded(ctx);
          return Number(fundedStr);
        }
        catch (err) { throw new ContractQueryError(`Failed to query total funded: ${err instanceof Error ? err.message : String(err)}`); }
      })(),
      (async () => {
        try { return await isFullyFunded(ctx); }
        catch (err) { throw new ContractQueryError(`Failed to query funding status: ${err instanceof Error ? err.message : String(err)}`); }
      })(),
    ]);

    const deadlineEpoch = parseInt(deadlineStr, 10);
    const status = isFunded ? "funded" as const : "active" as const;

    return {
      id,
      landlord,
      totalRent,
      deadline: new Date(deadlineEpoch * 1000).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      }),
      deadlineEpoch,
      status,
      totalFunded,
      lastUpdate: new Date().toISOString(),
      roommates: [],
    };
  } catch (err) {
    if (err instanceof ContractQueryError) throw err;
    throw new ContractQueryError(`Failed to fetch contract state: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getAccountBalance(publicKey: string): Promise<number> {
  const { fetchXlmBalance } = await import("./horizon.ts");
  const { getCurrentNetwork } = await import("./explorer.ts");

  try {
    const balanceStr = await fetchXlmBalance(publicKey, getCurrentNetwork());
    return Number(balanceStr);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw new Error(`Account not found: ${publicKey}`);
    }
    throw err;
  }
}

// ─── Horizon: fee stats ───────────────────────────────────────────────────────

export interface FeeStats {
  baseFeeStroops: string;
  baseFeeXlm: string;
}

const FEE_STATS_HORIZON_URLS = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
} as const;

export type FeeStatsNetwork = keyof typeof FEE_STATS_HORIZON_URLS;

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function getFeeStats(
  network: FeeStatsNetwork = "testnet",
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  options: { signal?: AbortSignal } = {}
): Promise<FeeStats> {
  const url = `${FEE_STATS_HORIZON_URLS[network]}/fee_stats`;

  const response = await fetchImpl(url, { signal: options.signal });

  if (!response.ok) {
    throw new Error(`Horizon fee_stats request failed: ${response.status}`);
  }

  const data = (await response.json()) as { last_ledger_base_fee?: unknown };
  const raw = data.last_ledger_base_fee;
  const stroops =
    typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";

  if (!/^\d+$/.test(stroops)) {
    throw new Error(
      "Invalid fee_stats response: missing or non-numeric last_ledger_base_fee"
    );
  }

  return {
    baseFeeStroops: stroops,
    baseFeeXlm: stroopsToXlm(stroops),
  };
}

function stroopsToXlm(stroops: string): string {
  const STROOPS_PER_XLM = BigInt(10_000_000);
  const value = BigInt(stroops);
  const whole = value / STROOPS_PER_XLM;
  const fraction = value % STROOPS_PER_XLM;
  const fractionStr = fraction.toString().padStart(7, "0").replace(/0+$/, "");
  return fractionStr.length > 0 ? `${whole}.${fractionStr}` : whole.toString();
}
