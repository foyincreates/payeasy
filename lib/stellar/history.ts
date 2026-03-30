// ─── Raw Horizon response shapes ─────────────────────────────────────────────

export interface HorizonTransactionRecord {
  id: string;
  paging_token: string;
  hash: string;
  created_at: string;
  source_account: string;
  operation_count: number;
  fee_charged: string;
  successful: boolean;
  _links: {
    operations: { href: string };
  };
}

export interface HorizonTransactionPage {
  _embedded: { records: HorizonTransactionRecord[] };
  _links: {
    next?: { href: string };
    prev?: { href: string };
  };
}

export interface HorizonOperationRecord {
  id: string;
  type: string;
  source_account: string;
  created_at: string;
  transaction_hash: string;
  // payment / path_payment
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  // create_account
  account?: string;
  funder?: string;
  starting_balance?: string;
  // invoke_host_function (Soroban)
  function?: string;
  parameters?: unknown[];
}

export interface HorizonOperationPage {
  _embedded: { records: HorizonOperationRecord[] };
  _links: {
    next?: { href: string };
  };
}

// ─── Horizon client interface ─────────────────────────────────────────────────

export interface HorizonClient {
  fetchTransactions(
    accountId: string,
    params: {
      cursor?: string;
      limit?: number;
      order?: "asc" | "desc";
    }
  ): Promise<HorizonTransactionPage>;

  fetchOperations(
    txHash: string,
    params: { limit?: number }
  ): Promise<HorizonOperationPage>;
}

// ─── Parsed output types ──────────────────────────────────────────────────────

export interface ParsedOperation {
  id: string;
  type: string;
  /** Normalised asset string, e.g. "XLM" or "USDC:GA…" */
  asset?: string;
  amount?: string;
  from?: string;
  to?: string;
  /**
   * The other account involved in the operation relative to the queried
   * account. Derived from `from`/`to` when `accountId` is supplied to
   * `parseOperation`.
   */
  counterparty?: string;
  /** Contract function name for Soroban invoke_host_function operations. */
  function?: string;
}

export interface ParsedTransaction {
  id: string;
  /** Horizon paging token — use as cursor for the next page. */
  cursor: string;
  hash: string;
  timestamp: string;
  sourceAccount: string;
  operationCount: number;
  fee: string;
  successful: boolean;
  operations: ParsedOperation[];
}

// ─── Fetch options & result ───────────────────────────────────────────────────

export interface FetchTransactionHistoryOptions {
  client: HorizonClient;
  accountId: string;
  cursor?: string;
  limit?: number;
  order?: "asc" | "desc";
  /**
   * When true (default), fetches the operation list for every transaction.
   * Set to false to skip per-transaction operation calls and return
   * transaction-level data only.
   */
  includeOperations?: boolean;
}

export interface FetchTransactionHistoryResult {
  transactions: ParsedTransaction[];
  nextCursor?: string;
}

export interface TransactionHistoryPager {
  fetchNext(): Promise<FetchTransactionHistoryResult>;
  getCursor(): string | undefined;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const DEFAULT_ORDER = "desc" as const;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Fetches one page of transaction history for `accountId` from Horizon.
 * Optionally fetches operations for each transaction (default: true).
 */
export async function fetchTransactionHistory(
  options: FetchTransactionHistoryOptions
): Promise<FetchTransactionHistoryResult> {
  const {
    client,
    accountId,
    cursor,
    limit = DEFAULT_LIMIT,
    order = DEFAULT_ORDER,
    includeOperations = true,
  } = options;

  const page = await client.fetchTransactions(accountId, {
    cursor,
    limit,
    order,
  });

  const records = page._embedded.records;

  let transactions: ParsedTransaction[];

  if (includeOperations) {
    transactions = await Promise.all(
      records.map(async (record) => {
        const opsPage = await client.fetchOperations(record.hash, {
          limit: 50,
        });
        const operations = opsPage._embedded.records.map((op) =>
          parseOperation(op, accountId)
        );
        return parseTransaction(record, operations);
      })
    );
  } else {
    transactions = records.map((record) => parseTransaction(record, []));
  }

  const lastRecord = records[records.length - 1];

  return {
    transactions,
    nextCursor: lastRecord?.paging_token,
  };
}

/**
 * Creates a stateful pager that advances the cursor automatically between
 * calls, mirroring the `createContractEventPoller` pattern.
 */
export function createTransactionHistoryPager(
  options: FetchTransactionHistoryOptions
): TransactionHistoryPager {
  let cursor = options.cursor;

  return {
    async fetchNext(): Promise<FetchTransactionHistoryResult> {
      const result = await fetchTransactionHistory({ ...options, cursor });
      cursor = result.nextCursor;
      return result;
    },
    getCursor(): string | undefined {
      return cursor;
    },
  };
}

/**
 * Converts a raw `HorizonTransactionRecord` into a `ParsedTransaction`.
 * Exported for direct unit-testing.
 */
export function parseTransaction(
  raw: HorizonTransactionRecord,
  operations: ParsedOperation[]
): ParsedTransaction {
  return {
    id: raw.id,
    cursor: raw.paging_token,
    hash: raw.hash,
    timestamp: parseTimestamp(raw.created_at),
    sourceAccount: raw.source_account,
    operationCount: raw.operation_count,
    fee: raw.fee_charged,
    successful: raw.successful,
    operations,
  };
}

/**
 * Converts a raw `HorizonOperationRecord` into a `ParsedOperation`.
 * When `accountId` is supplied the `counterparty` field is derived.
 * Exported for direct unit-testing.
 */
export function parseOperation(
  raw: HorizonOperationRecord,
  accountId?: string
): ParsedOperation {
  const base: ParsedOperation = { id: raw.id, type: raw.type };

  switch (raw.type) {
    case "payment": {
      const asset = normalizeAsset(raw);
      const op: ParsedOperation = {
        ...base,
        asset,
        amount: raw.amount,
        from: raw.from,
        to: raw.to,
      };
      op.counterparty = deriveCounterparty(raw.from, raw.to, accountId);
      return op;
    }

    case "path_payment_strict_send":
    case "path_payment_strict_receive": {
      const asset = normalizeAsset(raw);
      const op: ParsedOperation = {
        ...base,
        asset,
        amount: raw.amount,
        from: raw.from,
        to: raw.to,
      };
      op.counterparty = deriveCounterparty(raw.from, raw.to, accountId);
      return op;
    }

    case "create_account": {
      const op: ParsedOperation = {
        ...base,
        amount: raw.starting_balance,
        from: raw.funder,
        to: raw.account,
      };
      op.counterparty = deriveCounterparty(raw.funder, raw.account, accountId);
      return op;
    }

    case "invoke_host_function": {
      return { ...base, function: raw.function };
    }

    default:
      return base;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseTimestamp(value?: string): string {
  if (!value) return new Date(0).toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function normalizeAsset(raw: HorizonOperationRecord): string {
  if (!raw.asset_type || raw.asset_type === "native") return "XLM";
  const code = raw.asset_code ?? raw.asset_type;
  return raw.asset_issuer ? `${code}:${raw.asset_issuer}` : code;
}

function deriveCounterparty(
  from: string | undefined,
  to: string | undefined,
  accountId: string | undefined
): string | undefined {
  if (!accountId) return undefined;
  if (from === accountId) return to;
  if (to === accountId) return from;
  return undefined;
}
