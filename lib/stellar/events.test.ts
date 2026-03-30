import test from "node:test";
import assert from "node:assert/strict";

import {
  createContractEventPoller,
  fetchContractEvents,
  parseContractEvent,
  type RpcGetEventsRequest,
  type RpcGetEventsResponse,
  type SorobanRpcServer,
} from "./events.ts";

test("parseContractEvent parses Contribution from topic + scalar value", () => {
  const parsed = parseContractEvent({
    id: "1",
    pagingToken: "1",
    contractId: "C_CONTRACT",
    txHash: "TX_1",
    ledger: 123,
    ledgerClosedAt: "2026-03-29T00:00:00.000Z",
    topic: [{ symbol: "Contribution" }, { address: "GROOMMATE" }],
    value: { i128: "3500000" },
  });

  assert.ok(parsed);
  assert.equal(parsed.type, "Contribution");
  assert.equal(parsed.contributor, "GROOMMATE");
  assert.equal(parsed.amount, "3500000");
  assert.equal(parsed.timestamp, "2026-03-29T00:00:00.000Z");
});

test("parseContractEvent parses AgreementReleased from map payload", () => {
  const parsed = parseContractEvent({
    id: "2",
    pagingToken: "2",
    contractId: "C_CONTRACT",
    txHash: "TX_2",
    ledger: 124,
    ledgerClosedAt: "2026-03-29T01:00:00.000Z",
    topic: [{ symbol: "AgreementReleased" }],
    value: {
      map: [
        { key: { symbol: "landlord" }, val: { address: "GLANDLORD" } },
        { key: { symbol: "amount" }, val: { i128: "10000000" } },
      ],
    },
  });

  assert.ok(parsed);
  assert.equal(parsed.type, "AgreementReleased");
  assert.equal(parsed.amount, "10000000");
  assert.equal(parsed.landlord, "GLANDLORD");
});

test("fetchContractEvents calls getEvents and filters by type/contract", async () => {
  let capturedRequest: RpcGetEventsRequest | null = null;

  const server: SorobanRpcServer = {
    async getEvents(request: RpcGetEventsRequest): Promise<RpcGetEventsResponse> {
      capturedRequest = request;
      return {
        latestLedger: 999,
        events: [
          {
            id: "1",
            pagingToken: "cursor-1",
            contractId: "C_MATCH",
            txHash: "TX_MATCH_1",
            ledger: 100,
            ledgerClosedAt: "2026-03-29T00:00:00.000Z",
            topic: [{ symbol: "Contribution" }, { address: "G1" }],
            value: { i128: "400" },
          },
          {
            id: "2",
            pagingToken: "cursor-2",
            contractId: "C_OTHER",
            txHash: "TX_OTHER",
            ledger: 101,
            ledgerClosedAt: "2026-03-29T00:01:00.000Z",
            topic: [{ symbol: "Contribution" }, { address: "G2" }],
            value: { i128: "500" },
          },
          {
            id: "3",
            pagingToken: "cursor-3",
            contractId: "C_MATCH",
            txHash: "TX_MATCH_2",
            ledger: 102,
            ledgerClosedAt: "2026-03-29T00:02:00.000Z",
            topic: [{ symbol: "AgreementReleased" }],
            value: { i128: "900" },
          },
        ],
      };
    },
  };

  const result = await fetchContractEvents({
    server,
    contractId: "C_MATCH",
    eventTypes: ["Contribution"],
    cursor: "cursor-0",
    startLedger: 90,
    limit: 20,
  });

  assert.ok(capturedRequest);
  assert.equal(capturedRequest.startLedger, 90);
  assert.equal(capturedRequest.pagination?.cursor, "cursor-0");
  assert.equal(capturedRequest.pagination?.limit, 20);
  assert.deepEqual(capturedRequest.filters, [
    {
      type: "contract",
      contractIds: ["C_MATCH"],
    },
  ]);

  assert.equal(result.latestLedger, 999);
  assert.equal(result.nextCursor, "cursor-3");
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].type, "Contribution");
  assert.equal(result.events[0].contractId, "C_MATCH");
});

test("createContractEventPoller advances cursor between poll calls", async () => {
  const observedCursors: Array<string | undefined> = [];

  const server: SorobanRpcServer = {
    async getEvents(request: RpcGetEventsRequest): Promise<RpcGetEventsResponse> {
      observedCursors.push(request.pagination?.cursor);

      if (!request.pagination?.cursor) {
        return {
          events: [
            {
              id: "1",
              pagingToken: "cursor-1",
              contractId: "C_MATCH",
              txHash: "TX_MATCH_1",
              ledger: 100,
              ledgerClosedAt: "2026-03-29T00:00:00.000Z",
              topic: [{ symbol: "Contribution" }, { address: "G1" }],
              value: { i128: "10" },
            },
          ],
        };
      }

      return {
        events: [
          {
            id: "2",
            pagingToken: "cursor-2",
            contractId: "C_MATCH",
            txHash: "TX_MATCH_2",
            ledger: 101,
            ledgerClosedAt: "2026-03-29T00:01:00.000Z",
            topic: [{ symbol: "Contribution" }, { address: "G2" }],
            value: { i128: "20" },
          },
        ],
      };
    },
  };

  const poller = createContractEventPoller({
    server,
    contractId: "C_MATCH",
  });

  const first = await poller.poll();
  const second = await poller.poll();

  assert.equal(first.nextCursor, "cursor-1");
  assert.equal(second.nextCursor, "cursor-2");
  assert.deepEqual(observedCursors, [undefined, "cursor-1"]);
  assert.equal(poller.getCursor(), "cursor-2");
});
