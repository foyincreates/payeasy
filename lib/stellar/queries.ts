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
