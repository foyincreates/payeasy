import test from "node:test";
import assert from "node:assert/strict";
import { toStellarAmount, fromStellarAmount } from "./format.ts";

test("toStellarAmount", async (t) => {
  await t.test("should convert simple integers", () => {
    assert.equal(toStellarAmount(1).toString(), "10000000");
    assert.equal(toStellarAmount("10").toString(), "100000000");
  });

  await t.test("should handle decimals correctly", () => {
    assert.equal(toStellarAmount("1.5").toString(), "15000000");
    assert.equal(toStellarAmount("0.0000001").toString(), "1");
  });

  await t.test("should handle zero", () => {
    assert.equal(toStellarAmount(0).toString(), "0");
    assert.equal(toStellarAmount("0").toString(), "0");
  });

  await t.test("should truncate decimals beyond 7 places", () => {
    assert.equal(toStellarAmount("1.123456789").toString(), "11234567");
  });
});

test("fromStellarAmount", async (t) => {
  await t.test("should convert simple amounts", () => {
    assert.equal(fromStellarAmount(10000000n), "1");
    assert.equal(fromStellarAmount("100000000"), "10");
  });

  await t.test("should handle decimals correctly", () => {
    assert.equal(fromStellarAmount(15000000n), "1.5");
    assert.equal(fromStellarAmount(1n), "0.0000001");
  });

  await t.test("should handle zero", () => {
    assert.equal(fromStellarAmount(0n), "0");
    assert.equal(fromStellarAmount("0"), "0");
  });

  await t.test("should remove trailing zeros in decimals", () => {
    assert.equal(fromStellarAmount(10500000n), "1.05");
  });
});
