import test from "node:test";
import assert from "node:assert/strict";

import {
  getLandlord,
  getTokenAddress,
  getTotal,
  getDeadline,
  getBalance,
  getTotalFunded,
  isFullyFunded,
  ContractQueryError,
  type QueryContext,
  type SorobanQueryClient,
  type SimulateTransactionResponse,
} from "./queries.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Creates a QueryContext whose client returns the given retval. */
function makeCtx(
  retval: unknown,
  overrides: { error?: string } = {}
): { ctx: QueryContext; capturedXdr: string[] } {
  const capturedXdr: string[] = [];

  const client: SorobanQueryClient = {
    async simulateTransaction(xdr): Promise<SimulateTransactionResponse> {
      capturedXdr.push(xdr);
      if (overrides.error) return { error: overrides.error };
      return { results: [{ retval }] };
    },
  };

  const ctx: QueryContext = {
    client,
    contractId: "CESCROW",
    builder: {
      buildInvocationXdr({ contractId, method, args }) {
        return `XDR:${contractId}:${method}:${JSON.stringify(args ?? [])}`;
      },
    },
  };

  return { ctx, capturedXdr };
}

// ─── getLandlord ──────────────────────────────────────────────────────────────

test("getLandlord returns address string from plain string retval", async () => {
  const { ctx } = makeCtx("GLANDLORD");
  assert.equal(await getLandlord(ctx), "GLANDLORD");
});

test("getLandlord returns address from { address: string } retval", async () => {
  const { ctx } = makeCtx({ address: "GLANDLORD" });
  assert.equal(await getLandlord(ctx), "GLANDLORD");
});

test("getLandlord returns address from nested accountId", async () => {
  const { ctx } = makeCtx({ address: { accountId: "GLANDLORD" } });
  assert.equal(await getLandlord(ctx), "GLANDLORD");
});

test("getLandlord invokes get_landlord with no args", async () => {
  const { ctx, capturedXdr } = makeCtx("GLANDLORD");
  await getLandlord(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:get_landlord:[]");
});

// ─── getTokenAddress ──────────────────────────────────────────────────────────

test("getTokenAddress returns contract address from contractId field", async () => {
  const { ctx } = makeCtx({ address: { contractId: "CTOKEN" } });
  assert.equal(await getTokenAddress(ctx), "CTOKEN");
});

test("getTokenAddress invokes get_token_address with no args", async () => {
  const { ctx, capturedXdr } = makeCtx({ address: "CTOKEN" });
  await getTokenAddress(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:get_token_address:[]");
});

// ─── getTotal ─────────────────────────────────────────────────────────────────

test("getTotal returns i128 from plain string retval", async () => {
  const { ctx } = makeCtx("5000000");
  assert.equal(await getTotal(ctx), "5000000");
});

test("getTotal returns i128 from { i128: string } retval", async () => {
  const { ctx } = makeCtx({ i128: "3500000" });
  assert.equal(await getTotal(ctx), "3500000");
});

test("getTotal returns i128 reconstructed from hi/lo parts", async () => {
  // i128 value 100 encoded as { hi: "0", lo: "100" }
  const { ctx } = makeCtx({ i128: { hi: "0", lo: "100" } });
  assert.equal(await getTotal(ctx), "100");
});

test("getTotal invokes get_amount with no args", async () => {
  const { ctx, capturedXdr } = makeCtx({ i128: "0" });
  await getTotal(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:get_amount:[]");
});

// ─── getDeadline ──────────────────────────────────────────────────────────────

test("getDeadline returns u64 from plain number retval", async () => {
  const { ctx } = makeCtx(1743292800);
  assert.equal(await getDeadline(ctx), "1743292800");
});

test("getDeadline returns u64 from { u64: string } retval", async () => {
  const { ctx } = makeCtx({ u64: "1743292800" });
  assert.equal(await getDeadline(ctx), "1743292800");
});

test("getDeadline invokes get_deadline with no args", async () => {
  const { ctx, capturedXdr } = makeCtx({ u64: "0" });
  await getDeadline(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:get_deadline:[]");
});

// ─── getBalance ───────────────────────────────────────────────────────────────

test("getBalance returns i128 for a given address", async () => {
  const { ctx } = makeCtx({ i128: "1200000" });
  assert.equal(await getBalance(ctx, "GROOMMATE"), "1200000");
});

test("getBalance passes the address as an arg to the builder", async () => {
  const { ctx, capturedXdr } = makeCtx({ i128: "0" });
  await getBalance(ctx, "GROOMMATE");
  assert.equal(
    capturedXdr[0],
    `XDR:CESCROW:get_balance:${JSON.stringify([{ address: "GROOMMATE" }])}`
  );
});

test("getBalance returns '0' when retval is the string '0'", async () => {
  const { ctx } = makeCtx("0");
  assert.equal(await getBalance(ctx, "GUNKNOWN"), "0");
});

// ─── getTotalFunded ───────────────────────────────────────────────────────────

test("getTotalFunded returns sum of contributions as string", async () => {
  const { ctx } = makeCtx({ i128: "7000000" });
  assert.equal(await getTotalFunded(ctx), "7000000");
});

test("getTotalFunded invokes get_total_funded with no args", async () => {
  const { ctx, capturedXdr } = makeCtx({ i128: "0" });
  await getTotalFunded(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:get_total_funded:[]");
});

// ─── isFullyFunded ────────────────────────────────────────────────────────────

test("isFullyFunded returns true from plain boolean retval", async () => {
  const { ctx } = makeCtx(true);
  assert.equal(await isFullyFunded(ctx), true);
});

test("isFullyFunded returns false from plain boolean retval", async () => {
  const { ctx } = makeCtx(false);
  assert.equal(await isFullyFunded(ctx), false);
});

test("isFullyFunded returns true from { bool: true } retval", async () => {
  const { ctx } = makeCtx({ bool: true });
  assert.equal(await isFullyFunded(ctx), true);
});

test("isFullyFunded invokes is_fully_funded with no args", async () => {
  const { ctx, capturedXdr } = makeCtx(false);
  await isFullyFunded(ctx);
  assert.equal(capturedXdr[0], "XDR:CESCROW:is_fully_funded:[]");
});

// ─── Error handling ───────────────────────────────────────────────────────────

test("throws ContractQueryError when simulation returns an error field", async () => {
  const { ctx } = makeCtx(null, { error: "escrow not initialized" });

  await assert.rejects(
    () => getLandlord(ctx),
    (err) => {
      assert.ok(err instanceof ContractQueryError);
      assert.match(err.message, /escrow not initialized/);
      return true;
    }
  );
});

test("throws ContractQueryError when retval cannot be parsed as Address", async () => {
  const { ctx } = makeCtx(null);

  await assert.rejects(
    () => getLandlord(ctx),
    (err) => {
      assert.ok(err instanceof ContractQueryError);
      assert.match(err.message, /Cannot parse Address/);
      return true;
    }
  );
});

test("throws ContractQueryError when retval cannot be parsed as i128", async () => {
  const { ctx } = makeCtx({ unexpected: "shape" });

  await assert.rejects(
    () => getTotal(ctx),
    (err) => {
      assert.ok(err instanceof ContractQueryError);
      assert.match(err.message, /Cannot parse i128/);
      return true;
    }
  );
});

test("throws ContractQueryError when retval cannot be parsed as bool", async () => {
  const { ctx } = makeCtx("yes");

  await assert.rejects(
    () => isFullyFunded(ctx),
    (err) => {
      assert.ok(err instanceof ContractQueryError);
      assert.match(err.message, /Cannot parse bool/);
      return true;
    }
  );
});

test("throws ContractQueryError wrapping a network-level exception", async () => {
  const client: SorobanQueryClient = {
    async simulateTransaction() {
      throw new Error("network timeout");
    },
  };

  const ctx: QueryContext = {
    client,
    contractId: "CESCROW",
    builder: { buildInvocationXdr: () => "XDR" },
  };

  await assert.rejects(
    () => getLandlord(ctx),
    (err) => {
      assert.ok(err instanceof ContractQueryError);
      assert.match(err.message, /network timeout/);
      return true;
    }
  );
});
