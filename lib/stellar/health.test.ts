import test from "node:test";
import assert from "node:assert/strict";
import { isConnectionStale } from "./health.ts";

test("isConnectionStale returns true when current ledger matches last ledger", () => {
  assert.strictEqual(isConnectionStale(100, 100), true);
});

test("isConnectionStale returns true when current ledger is behind last ledger", () => {
  assert.strictEqual(isConnectionStale(100, 99), true);
});

test("isConnectionStale returns false when current ledger has advanced", () => {
  assert.strictEqual(isConnectionStale(100, 101), false);
});

test("isConnectionStale returns false when last ledger is 0 (initial state)", () => {
  assert.strictEqual(isConnectionStale(0, 100), false);
});
