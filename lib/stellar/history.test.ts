import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchTransactionHistory,
  createTransactionHistoryPager,
  parseTransaction,
  parseOperation,
  type HorizonClient,
  type HorizonTransactionPage,
  type HorizonOperationPage,
  type HorizonTransactionRecord,
  type HorizonOperationRecord,
} from "./history.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTxRecord(
  overrides: Partial<HorizonTransactionRecord> = {}
): HorizonTransactionRecord {
  return {
    id: "tx-1",
    paging_token: "paging-1",
    hash: "HASH1",
    created_at: "2026-03-29T10:00:00Z",
    source_account: "GSOURCE",
    operation_count: 1,
    fee_charged: "100",
    successful: true,
    _links: {
      operations: { href: "https://horizon.testnet.stellar.org/transactions/HASH1/operations" },
    },
    ...overrides,
  };
}

function makeOpRecord(
  overrides: Partial<HorizonOperationRecord> = {}
): HorizonOperationRecord {
  return {
    id: "op-1",
    type: "payment",
    source_account: "GSOURCE",
    created_at: "2026-03-29T10:00:00Z",
    transaction_hash: "HASH1",
    from: "GSOURCE",
    to: "GDEST",
    amount: "100.0000000",
    asset_type: "native",
    ...overrides,
  };
}

function makeClient(
  pages: HorizonTransactionPage[],
  opsPage: HorizonOperationPage = { _embedded: { records: [] }, _links: {} }
): { client: HorizonClient; txCalls: string[]; opCalls: string[] } {
  const txCalls: string[] = [];
  const opCalls: string[] = [];
  let pageIndex = 0;

  const client: HorizonClient = {
    async fetchTransactions(accountId, _params) {
      txCalls.push(accountId);
      return pages[pageIndex++] ?? { _embedded: { records: [] }, _links: {} };
    },
    async fetchOperations(txHash, _params) {
      opCalls.push(txHash);
      return opsPage;
    },
  };

  return { client, txCalls, opCalls };
}

// ─── parseOperation ───────────────────────────────────────────────────────────

test("parseOperation parses a native XLM payment", () => {
  const op = parseOperation(
    makeOpRecord({
      id: "op-pay",
      type: "payment",
      from: "GSENDER",
      to: "GRECEIVER",
      amount: "50.0000000",
      asset_type: "native",
    }),
    "GSENDER"
  );

  assert.equal(op.type, "payment");
  assert.equal(op.asset, "XLM");
  assert.equal(op.amount, "50.0000000");
  assert.equal(op.from, "GSENDER");
  assert.equal(op.to, "GRECEIVER");
  assert.equal(op.counterparty, "GRECEIVER");
});

test("parseOperation sets counterparty to sender when accountId is receiver", () => {
  const op = parseOperation(
    makeOpRecord({
      type: "payment",
      from: "GSENDER",
      to: "GRECEIVER",
      amount: "10.0000000",
      asset_type: "native",
    }),
    "GRECEIVER"
  );

  assert.equal(op.counterparty, "GSENDER");
});

test("parseOperation omits counterparty when accountId is not provided", () => {
  const op = parseOperation(
    makeOpRecord({ type: "payment", from: "GSENDER", to: "GRECEIVER" })
  );

  assert.equal(op.counterparty, undefined);
});

test("parseOperation normalises non-native asset as CODE:ISSUER", () => {
  const op = parseOperation(
    makeOpRecord({
      type: "payment",
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: "GISSUER",
      amount: "200.0000000",
    })
  );

  assert.equal(op.asset, "USDC:GISSUER");
});

test("parseOperation parses create_account operation", () => {
  const op = parseOperation(
    {
      id: "op-ca",
      type: "create_account",
      source_account: "GFUNDER",
      created_at: "2026-03-29T10:00:00Z",
      transaction_hash: "HASH1",
      funder: "GFUNDER",
      account: "GNEWACCT",
      starting_balance: "1.0000000",
    },
    "GFUNDER"
  );

  assert.equal(op.type, "create_account");
  assert.equal(op.amount, "1.0000000");
  assert.equal(op.from, "GFUNDER");
  assert.equal(op.to, "GNEWACCT");
  assert.equal(op.counterparty, "GNEWACCT");
});

test("parseOperation parses invoke_host_function with contract function name", () => {
  const op = parseOperation({
    id: "op-soroban",
    type: "invoke_host_function",
    source_account: "GCALLER",
    created_at: "2026-03-29T10:00:00Z",
    transaction_hash: "HASH1",
    function: "HostFunctionTypeInvokeContract",
    parameters: [{ type: "Address", value: "GCONTRACT" }],
  });

  assert.equal(op.type, "invoke_host_function");
  assert.equal(op.function, "HostFunctionTypeInvokeContract");
});

test("parseOperation returns base fields for unknown operation type", () => {
  const op = parseOperation(
    makeOpRecord({ id: "op-unknown", type: "set_options" })
  );

  assert.equal(op.id, "op-unknown");
  assert.equal(op.type, "set_options");
  assert.equal(op.amount, undefined);
});

// ─── parseTransaction ─────────────────────────────────────────────────────────

test("parseTransaction maps Horizon record to ParsedTransaction", () => {
  const ops = [
    parseOperation(makeOpRecord({ id: "op-1" })),
    parseOperation(makeOpRecord({ id: "op-2", type: "set_options" })),
  ];

  const tx = parseTransaction(
    makeTxRecord({
      id: "tx-abc",
      paging_token: "pt-abc",
      hash: "HASHABC",
      created_at: "2026-03-29T10:00:00Z",
      source_account: "GSRC",
      operation_count: 2,
      fee_charged: "200",
      successful: true,
    }),
    ops
  );

  assert.equal(tx.id, "tx-abc");
  assert.equal(tx.cursor, "pt-abc");
  assert.equal(tx.hash, "HASHABC");
  assert.equal(tx.timestamp, "2026-03-29T10:00:00.000Z");
  assert.equal(tx.sourceAccount, "GSRC");
  assert.equal(tx.operationCount, 2);
  assert.equal(tx.fee, "200");
  assert.equal(tx.successful, true);
  assert.equal(tx.operations.length, 2);
});

test("parseTransaction falls back to epoch on invalid created_at", () => {
  const tx = parseTransaction(
    makeTxRecord({ created_at: "not-a-date" }),
    []
  );

  assert.equal(tx.timestamp, new Date(0).toISOString());
});

// ─── fetchTransactionHistory ──────────────────────────────────────────────────

test("fetchTransactionHistory returns parsed transactions with operations", async () => {
  const opsPage: HorizonOperationPage = {
    _embedded: {
      records: [
        makeOpRecord({
          id: "op-a",
          from: "GSOURCE",
          to: "GDEST",
          amount: "42.0000000",
        }),
      ],
    },
    _links: {},
  };

  const txPage: HorizonTransactionPage = {
    _embedded: { records: [makeTxRecord({ hash: "HASH1", paging_token: "pt-1" })] },
    _links: {},
  };

  const { client, txCalls, opCalls } = makeClient([txPage], opsPage);

  const result = await fetchTransactionHistory({
    client,
    accountId: "GSOURCE",
  });

  assert.equal(txCalls[0], "GSOURCE");
  assert.equal(opCalls[0], "HASH1");
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].hash, "HASH1");
  assert.equal(result.transactions[0].operations.length, 1);
  assert.equal(result.transactions[0].operations[0].amount, "42.0000000");
  assert.equal(result.nextCursor, "pt-1");
});

test("fetchTransactionHistory skips operation fetching when includeOperations is false", async () => {
  const txPage: HorizonTransactionPage = {
    _embedded: { records: [makeTxRecord()] },
    _links: {},
  };

  const { client, opCalls } = makeClient([txPage]);

  await fetchTransactionHistory({
    client,
    accountId: "GSOURCE",
    includeOperations: false,
  });

  assert.equal(opCalls.length, 0);
});

test("fetchTransactionHistory passes cursor, limit, and order to client", async () => {
  let capturedParams: Record<string, unknown> = {};

  const client: HorizonClient = {
    async fetchTransactions(_accountId, params) {
      capturedParams = params as Record<string, unknown>;
      return { _embedded: { records: [] }, _links: {} };
    },
    async fetchOperations() {
      return { _embedded: { records: [] }, _links: {} };
    },
  };

  await fetchTransactionHistory({
    client,
    accountId: "GACCT",
    cursor: "cursor-99",
    limit: 10,
    order: "asc",
  });

  assert.equal(capturedParams.cursor, "cursor-99");
  assert.equal(capturedParams.limit, 10);
  assert.equal(capturedParams.order, "asc");
});

test("fetchTransactionHistory returns undefined nextCursor on empty page", async () => {
  const { client } = makeClient([
    { _embedded: { records: [] }, _links: {} },
  ]);

  const result = await fetchTransactionHistory({
    client,
    accountId: "GACCT",
  });

  assert.equal(result.nextCursor, undefined);
  assert.equal(result.transactions.length, 0);
});

// ─── Paginated response ───────────────────────────────────────────────────────

test("fetchTransactionHistory handles multiple transactions in one page", async () => {
  const txPage: HorizonTransactionPage = {
    _embedded: {
      records: [
        makeTxRecord({ hash: "H1", paging_token: "pt-1" }),
        makeTxRecord({ hash: "H2", paging_token: "pt-2" }),
        makeTxRecord({ hash: "H3", paging_token: "pt-3" }),
      ],
    },
    _links: { next: { href: "https://horizon/accounts/G/transactions?cursor=pt-3" } },
  };

  const { client, opCalls } = makeClient([txPage]);

  const result = await fetchTransactionHistory({
    client,
    accountId: "GSOURCE",
  });

  assert.equal(result.transactions.length, 3);
  assert.equal(result.nextCursor, "pt-3");
  assert.equal(opCalls.length, 3);
});

// ─── createTransactionHistoryPager ───────────────────────────────────────────

test("createTransactionHistoryPager advances cursor between pages", async () => {
  const page1: HorizonTransactionPage = {
    _embedded: { records: [makeTxRecord({ hash: "H1", paging_token: "pt-1" })] },
    _links: {},
  };
  const page2: HorizonTransactionPage = {
    _embedded: { records: [makeTxRecord({ hash: "H2", paging_token: "pt-2" })] },
    _links: {},
  };

  const { client } = makeClient([page1, page2]);
  const observedCursors: Array<string | undefined> = [];

  const wrappedClient: HorizonClient = {
    async fetchTransactions(accountId, params) {
      observedCursors.push(params.cursor);
      return client.fetchTransactions(accountId, params);
    },
    fetchOperations: client.fetchOperations,
  };

  const pager = createTransactionHistoryPager({
    client: wrappedClient,
    accountId: "GACCT",
  });

  const first = await pager.fetchNext();
  const second = await pager.fetchNext();

  assert.equal(first.nextCursor, "pt-1");
  assert.equal(second.nextCursor, "pt-2");
  assert.deepEqual(observedCursors, [undefined, "pt-1"]);
  assert.equal(pager.getCursor(), "pt-2");
});

test("createTransactionHistoryPager exposes current cursor via getCursor", async () => {
  const { client } = makeClient([
    { _embedded: { records: [makeTxRecord({ paging_token: "pt-42" })] }, _links: {} },
  ]);

  const pager = createTransactionHistoryPager({ client, accountId: "GACCT" });

  assert.equal(pager.getCursor(), undefined);
  await pager.fetchNext();
  assert.equal(pager.getCursor(), "pt-42");
});
