import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTransaction,
  simulateTransaction,
  pollForResult,
  buildAndSubmitTransaction,
  SimulationError,
  SubmissionError,
  TransactionTimeoutError,
  type SorobanTransactionBuilder,
  type SorobanTransaction,
  type SorobanRpcClient,
  type FreighterSigner,
  type SimulateTransactionResponse,
  type GetTransactionResponse,
  type SendTransactionResponse,
} from "./transaction.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeBuilder(xdr = "UNSIGNED_XDR"): {
  builder: SorobanTransactionBuilder;
  ops: Array<{ contractId: string; method: string; args: unknown[] }>;
  timeouts: number[];
} {
  const ops: Array<{ contractId: string; method: string; args: unknown[] }> =
    [];
  const timeouts: number[] = [];

  const builder: SorobanTransactionBuilder = {
    addOperation(params) {
      ops.push(params);
      return this;
    },
    setTimeout(seconds) {
      timeouts.push(seconds);
      return this;
    },
    build(): SorobanTransaction {
      return { toXDR: () => xdr };
    },
  };

  return { builder, ops, timeouts };
}

function makeRpc(overrides: Partial<SorobanRpcClient> = {}): SorobanRpcClient {
  return {
    simulateTransaction: async () => ({
      minResourceFee: "500",
      transactionData: "FOOTPRINT_XDR",
    }),
    assembleTransaction: (_xdr, _sim) => ({
      toXDR: () => "ASSEMBLED_XDR",
    }),
    sendTransaction: async () => ({
      hash: "TX_HASH",
      status: "PENDING",
    }),
    getTransaction: async () => ({
      status: "SUCCESS",
      returnValue: { symbol: "ok" },
    }),
    ...overrides,
  };
}

function makeSigner(signedXdr = "SIGNED_XDR"): {
  signer: FreighterSigner;
  calls: Array<{ xdr: string; network: string; networkPassphrase: string }>;
} {
  const calls: Array<{
    xdr: string;
    network: string;
    networkPassphrase: string;
  }> = [];

  const signer: FreighterSigner = {
    async signTransaction(xdr, opts) {
      calls.push({ xdr, ...opts });
      return signedXdr;
    },
  };

  return { signer, calls };
}

// ─── buildTransaction ─────────────────────────────────────────────────────────

test("buildTransaction passes contract, method, and args to the builder", () => {
  const { builder, ops, timeouts } = makeBuilder("RAW_XDR");

  const tx = buildTransaction({
    builder,
    contractId: "CABC",
    method: "contribute",
    args: [{ address: "GROOMMTE" }, { i128: "1000000" }],
  });

  assert.equal(tx.toXDR(), "RAW_XDR");
  assert.equal(ops.length, 1);
  assert.equal(ops[0].contractId, "CABC");
  assert.equal(ops[0].method, "contribute");
  assert.deepEqual(ops[0].args, [
    { address: "GROOMMTE" },
    { i128: "1000000" },
  ]);
});

test("buildTransaction uses default 30-second timeout when none is provided", () => {
  const { builder, timeouts } = makeBuilder();

  buildTransaction({ builder, contractId: "C1", method: "init", args: [] });

  assert.equal(timeouts[0], 30);
});

test("buildTransaction uses provided timeoutSeconds", () => {
  const { builder, timeouts } = makeBuilder();

  buildTransaction({
    builder,
    contractId: "C1",
    method: "init",
    timeoutSeconds: 60,
  });

  assert.equal(timeouts[0], 60);
});

test("buildTransaction defaults args to empty array when omitted", () => {
  const { builder, ops } = makeBuilder();

  buildTransaction({ builder, contractId: "C1", method: "init" });

  assert.deepEqual(ops[0].args, []);
});

// ─── simulateTransaction ──────────────────────────────────────────────────────

test("simulateTransaction returns the simulation result on success", async () => {
  const rpc = makeRpc({
    simulateTransaction: async () => ({
      minResourceFee: "1000",
      transactionData: "FOOTPRINT",
      results: [{ retval: { symbol: "ok" } }],
    }),
  });

  const tx: SorobanTransaction = { toXDR: () => "TX_XDR" };
  const result = await simulateTransaction(rpc, tx);

  assert.equal(result.minResourceFee, "1000");
  assert.equal(result.transactionData, "FOOTPRINT");
});

test("simulateTransaction throws SimulationError when RPC reports an error", async () => {
  const rpc = makeRpc({
    simulateTransaction: async (): Promise<SimulateTransactionResponse> => ({
      error: "contract trap: out of gas",
    }),
  });

  const tx: SorobanTransaction = { toXDR: () => "TX_XDR" };

  await assert.rejects(
    () => simulateTransaction(rpc, tx),
    (err) => {
      assert.ok(err instanceof SimulationError);
      assert.match(err.message, /out of gas/);
      return true;
    }
  );
});

test("simulateTransaction forwards the tx XDR to the RPC", async () => {
  const received: string[] = [];

  const rpc = makeRpc({
    simulateTransaction: async (xdr) => {
      received.push(xdr);
      return { minResourceFee: "500" };
    },
  });

  const tx: SorobanTransaction = { toXDR: () => "MY_TX_XDR" };
  await simulateTransaction(rpc, tx);

  assert.deepEqual(received, ["MY_TX_XDR"]);
});

// ─── pollForResult ────────────────────────────────────────────────────────────

test("pollForResult returns immediately on SUCCESS", async () => {
  const rpc = makeRpc({
    getTransaction: async (): Promise<GetTransactionResponse> => ({
      status: "SUCCESS",
      returnValue: { i128: "42" },
    }),
  });

  const result = await pollForResult(rpc, "TX_HASH");

  assert.equal(result.status, "SUCCESS");
  assert.deepEqual(result.returnValue, { i128: "42" });
});

test("pollForResult returns FAILED status without throwing", async () => {
  const rpc = makeRpc({
    getTransaction: async (): Promise<GetTransactionResponse> => ({
      status: "FAILED",
      resultXdr: "RESULT_XDR",
    }),
  });

  const result = await pollForResult(rpc, "TX_HASH");
  assert.equal(result.status, "FAILED");
});

test("pollForResult retries on NOT_FOUND before resolving SUCCESS", async () => {
  let calls = 0;

  const rpc = makeRpc({
    getTransaction: async (): Promise<GetTransactionResponse> => {
      calls++;
      if (calls < 3) return { status: "NOT_FOUND" };
      return { status: "SUCCESS", returnValue: { symbol: "done" } };
    },
  });

  const result = await pollForResult(rpc, "TX_HASH", { retryDelayMs: 0 });

  assert.equal(result.status, "SUCCESS");
  assert.equal(calls, 3);
});

test("pollForResult throws TransactionTimeoutError when retries are exhausted", async () => {
  const rpc = makeRpc({
    getTransaction: async (): Promise<GetTransactionResponse> => ({
      status: "NOT_FOUND",
    }),
  });

  await assert.rejects(
    () =>
      pollForResult(rpc, "PENDING_HASH", {
        maxRetries: 3,
        retryDelayMs: 0,
      }),
    (err) => {
      assert.ok(err instanceof TransactionTimeoutError);
      assert.equal(err.txHash, "PENDING_HASH");
      assert.match(err.message, /3 attempts/);
      return true;
    }
  );
});

// ─── buildAndSubmitTransaction ────────────────────────────────────────────────

test("buildAndSubmitTransaction runs the full pipeline and returns SUCCESS", async () => {
  const { builder, ops } = makeBuilder("UNSIGNED_XDR");
  const { signer, calls: signerCalls } = makeSigner("SIGNED_XDR");

  let assembledFromXdr = "";
  let sentXdr = "";

  const rpc = makeRpc({
    assembleTransaction: (xdr, _sim) => {
      assembledFromXdr = xdr;
      return { toXDR: () => "ASSEMBLED_XDR" };
    },
    sendTransaction: async (xdr): Promise<SendTransactionResponse> => {
      sentXdr = xdr;
      return { hash: "FINAL_HASH", status: "PENDING" };
    },
    getTransaction: async (): Promise<GetTransactionResponse> => ({
      status: "SUCCESS",
      returnValue: { symbol: "released" },
    }),
  });

  const result = await buildAndSubmitTransaction(
    {
      builder,
      contractId: "CESCROW",
      method: "release",
      args: [{ address: "GLANDLORD" }],
    },
    {
      rpc,
      signer,
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    }
  );

  assert.equal(result.txHash, "FINAL_HASH");
  assert.equal(result.status, "SUCCESS");
  assert.deepEqual(result.returnValue, { symbol: "released" });
  assert.equal(result.error, undefined);

  assert.equal(ops[0].contractId, "CESCROW");
  assert.equal(ops[0].method, "release");

  assert.equal(assembledFromXdr, "UNSIGNED_XDR");

  assert.equal(signerCalls[0].xdr, "ASSEMBLED_XDR");
  assert.equal(signerCalls[0].network, "TESTNET");
  assert.equal(
    signerCalls[0].networkPassphrase,
    "Test SDF Network ; September 2015"
  );

  assert.equal(sentXdr, "SIGNED_XDR");
});

test("buildAndSubmitTransaction surfaces a FAILED terminal status", async () => {
  const { builder } = makeBuilder();
  const { signer } = makeSigner();

  const rpc = makeRpc({
    getTransaction: async (): Promise<GetTransactionResponse> => ({
      status: "FAILED",
      resultXdr: "BAD_RESULT_XDR",
    }),
  });

  const result = await buildAndSubmitTransaction(
    { builder, contractId: "C1", method: "init" },
    {
      rpc,
      signer,
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    }
  );

  assert.equal(result.status, "FAILED");
  assert.match(result.error ?? "", /BAD_RESULT_XDR/);
});

test("buildAndSubmitTransaction throws SubmissionError on ERROR send status", async () => {
  const { builder } = makeBuilder();
  const { signer } = makeSigner();

  const rpc = makeRpc({
    sendTransaction: async (): Promise<SendTransactionResponse> => ({
      hash: "ERR_HASH",
      status: "ERROR",
      errorResult: { code: "tx_bad_seq" },
    }),
  });

  await assert.rejects(
    () =>
      buildAndSubmitTransaction(
        { builder, contractId: "C1", method: "init" },
        {
          rpc,
          signer,
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }
      ),
    (err) => {
      assert.ok(err instanceof SubmissionError);
      assert.match(err.message, /tx_bad_seq/);
      return true;
    }
  );
});

test("buildAndSubmitTransaction propagates SimulationError from preflight", async () => {
  const { builder } = makeBuilder();
  const { signer } = makeSigner();

  const rpc = makeRpc({
    simulateTransaction: async (): Promise<SimulateTransactionResponse> => ({
      error: "wasm trap",
    }),
  });

  await assert.rejects(
    () =>
      buildAndSubmitTransaction(
        { builder, contractId: "C1", method: "init" },
        {
          rpc,
          signer,
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }
      ),
    SimulationError
  );
});
