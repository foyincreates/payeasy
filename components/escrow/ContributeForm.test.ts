import test from "node:test";
import assert from "node:assert/strict";
import { validateContributionAmount } from "./contributeForm.helpers.ts";

test("validateContributionAmount passes for valid amount", () => {
  const result = validateContributionAmount("50", "100");
  assert.strictEqual(result.isValid, true);
});

test("validateContributionAmount fails for zero amount", () => {
  const result = validateContributionAmount("0", "100");
  assert.strictEqual(result.isValid, false);
  assert.match(result.error!, /greater than zero/);
});

test("validateContributionAmount fails for negative amount", () => {
  const result = validateContributionAmount("-10", "100");
  assert.strictEqual(result.isValid, false);
});

test("validateContributionAmount fails for exceeding balance", () => {
  const result = validateContributionAmount("150", "100");
  assert.strictEqual(result.isValid, false);
  assert.match(result.error!, /exceed the remaining balance/);
});

test("validateContributionAmount handles invalid number strings", () => {
  const result = validateContributionAmount("abc", "100");
  assert.strictEqual(result.isValid, false);
});
