import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotification,
  pollOnce,
  type EscrowNotification,
} from "./useEscrowEvents.ts";

import {
  createContractEventPoller,
  parseContractEvent,
  type RpcGetEventsRequest,
  type RpcGetEventsResponse,
  type SorobanRpcServer,
} from "../lib/stellar/events.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONTRIBUTION_EVENT = {
  id: "evt-1",
  pagingToken: "pt-1",
  contractId: "CESCROW",
  txHash: "TX1",
  ledger: 100,
  ledgerClosedAt: "2026-03-29T10:00:00Z",
  topic: [{ symbol: "Contribution" }, { address: "GROOMMATE" }],
  value: { i128: "2500000" },
};

const RELEASED_EVENT = {
  id: "evt-2",
  pagingToken: "pt-2",
  contractId: "CESCROW",
  txHash: "TX2",
  ledger: 101,
  ledgerClosedAt: "2026-03-29T11:00:00Z",
  topic: [{ symbol: "AgreementReleased" }],
  value: {
    map: [
      { key: { symbol: "landlord" }, val: { address: "GLANDLORD" } },
      { key: { symbol: "amount" }, val: { i128: "10000000" } },
    ],
  },
};

function makeServer(
  pages: RpcGetEventsResponse[]
): SorobanRpcServer {
  let pageIndex = 0;
  return {
    async getEvents(
      _request: RpcGetEventsRequest
    ): Promise<RpcGetEventsResponse> {
      return pages[pageIndex++] ?? { events: [] };
    },
  };
}

// ─── buildNotification ────────────────────────────────────────────────────────

test("buildNotification returns 'contribution' notification for Contribution event", () => {

  const event = parseContractEvent(CONTRIBUTION_EVENT);
  assert.ok(event);

  const n = buildNotification(event);

  assert.equal(n.type, "contribution");
  assert.equal(n.title, "New Contribution");
  assert.match(n.message, /GROOM/);
  assert.match(n.message, /2500000/);
  assert.equal(n.id, "evt-1");
  assert.equal(n.event, event);
});

test("buildNotification returns 'released' notification for AgreementReleased event", () => {

  const event = parseContractEvent(RELEASED_EVENT);
  assert.ok(event);

  const n = buildNotification(event);

  assert.equal(n.type, "released");
  assert.equal(n.title, "Rent Released");
  assert.match(n.message, /GLAND/);
  assert.match(n.message, /10000000/);
  assert.equal(n.id, "evt-2");
});

test("buildNotification truncates long addresses with ellipsis", () => {

  const event = parseContractEvent({
    ...CONTRIBUTION_EVENT,
    topic: [{ symbol: "Contribution" }, { address: "GABCDEFGHIJ1234567890" }],
  });
  assert.ok(event);

  const n = buildNotification(event);
  assert.match(n.message, /GABCDE\u2026/);
});

test("buildNotification falls back to txHash-ledger id when event id is empty", () => {

  const event = parseContractEvent({ ...CONTRIBUTION_EVENT, id: "" });
  assert.ok(event);

  const n = buildNotification(event);
  assert.match(n.id, /TX1/);
});

test("buildNotification uses placeholder when AgreementReleased has no landlord", () => {

  const event = parseContractEvent({
    ...RELEASED_EVENT,
    value: { i128: "5000000" },
    topic: [{ symbol: "AgreementReleased" }],
  });
  assert.ok(event);

  const n = buildNotification(event);
  assert.match(n.message, /landlord/);
});

// ─── pollOnce ─────────────────────────────────────────────────────────────────

test("pollOnce returns events and notifications from a single poll", async () => {
  const server = makeServer([
    { events: [CONTRIBUTION_EVENT], latestLedger: 100 },
  ]);

  const poller = createContractEventPoller({ server, contractId: "CESCROW" });
  const { events, notifications } = await pollOnce(poller);

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "Contribution");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "contribution");
});

test("pollOnce returns empty arrays when no new events are found", async () => {
  const server = makeServer([{ events: [], latestLedger: 100 }]);

  const poller = createContractEventPoller({ server, contractId: "CESCROW" });
  const { events, notifications } = await pollOnce(poller);

  assert.equal(events.length, 0);
  assert.equal(notifications.length, 0);
});

test("pollOnce returns one notification per event in the page", async () => {
  const server = makeServer([
    {
      events: [CONTRIBUTION_EVENT, RELEASED_EVENT],
      latestLedger: 101,
    },
  ]);

  const poller = createContractEventPoller({ server, contractId: "CESCROW" });
  const { events, notifications } = await pollOnce(poller);

  assert.equal(events.length, 2);
  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].type, "contribution");
  assert.equal(notifications[1].type, "released");
});

// ─── Mocked paginated polling ─────────────────────────────────────────────────

test("successive pollOnce calls advance the cursor and pick up new events", async () => {
  const pages: RpcGetEventsResponse[] = [
    {
      events: [CONTRIBUTION_EVENT],
      latestLedger: 100,
    },
    {
      events: [RELEASED_EVENT],
      latestLedger: 101,
    },
  ];

  let pageIndex = 0;
  const server: SorobanRpcServer = {
    async getEvents(): Promise<RpcGetEventsResponse> {
      return pages[pageIndex++] ?? { events: [] };
    },
  };

  const poller = createContractEventPoller({ server, contractId: "CESCROW" });

  const first = await pollOnce(poller);
  const second = await pollOnce(poller);

  assert.equal(first.events.length, 1);
  assert.equal(first.notifications[0].type, "contribution");

  assert.equal(second.events.length, 1);
  assert.equal(second.notifications[0].type, "released");
});

test("pollOnce filters events to the specified contractId", async () => {
  const server: SorobanRpcServer = {
    async getEvents(): Promise<RpcGetEventsResponse> {
      return {
        events: [
          CONTRIBUTION_EVENT,
          { ...CONTRIBUTION_EVENT, id: "evt-other", contractId: "COTHER" },
        ],
      };
    },
  };

  const poller = createContractEventPoller({
    server,
    contractId: "CESCROW",
  });

  const { events } = await pollOnce(poller);

  assert.equal(events.length, 1);
  assert.equal(events[0].contractId, "CESCROW");
});

// ─── Notification shape invariants ───────────────────────────────────────────

test("every notification has a non-empty id, title, message, and timestamp", async () => {


  const rawEvents = [CONTRIBUTION_EVENT, RELEASED_EVENT];

  for (const raw of rawEvents) {
    const event = parseContractEvent(raw);
    assert.ok(event, `expected event to parse: ${raw.id}`);

    const n: EscrowNotification = buildNotification(event);
    assert.ok(n.id.length > 0, "id must be non-empty");
    assert.ok(n.title.length > 0, "title must be non-empty");
    assert.ok(n.message.length > 0, "message must be non-empty");
    assert.ok(n.timestamp.length > 0, "timestamp must be non-empty");
  }
});
