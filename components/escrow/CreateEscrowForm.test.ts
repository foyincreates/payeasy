import test from "node:test";
import assert from "node:assert/strict";

import {
  nextEscrowStep,
  previousEscrowStep,
  toLedgerTimestamp,
  validateEscrowStep,
  type EscrowFormDraft,
} from "./createEscrowForm.helpers.ts";

function baseDraft(): EscrowFormDraft {
  return {
    totalRent: "1200",
    tokenId: "XLM",
    deadlineDate: "2026-04-01",
    roommates: [
      { id: "a", address: "GAAA", shareAmount: "700" },
      { id: "b", address: "GBBB", shareAmount: "500" },
    ],
  };
}

test("step navigation clamps within 1..4", () => {
  assert.equal(previousEscrowStep(1), 1);
  assert.equal(nextEscrowStep(4), 4);
  assert.equal(nextEscrowStep(2), 3);
  assert.equal(previousEscrowStep(3), 2);
});

test("deadline date converts to unix ledger timestamp", () => {
  assert.equal(toLedgerTimestamp("2026-04-01"), 1775001600);
  assert.equal(toLedgerTimestamp(""), null);
  assert.equal(toLedgerTimestamp("invalid-date"), null);
});

test("step 1 validation blocks empty token and non-positive rent", () => {
  const draft = baseDraft();
  draft.totalRent = "0";
  draft.tokenId = "";

  const result = validateEscrowStep(1, draft);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("Total rent")));
  assert.ok(result.errors.some((error) => error.includes("payment token")));
});

test("step 3 validation blocks over/under allocation", () => {
  const draft = baseDraft();
  draft.roommates[1].shareAmount = "450";

  const result = validateEscrowStep(3, draft);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("must equal total rent")));
});

test("step 3 validation passes with exact allocation", () => {
  const draft = baseDraft();

  const result = validateEscrowStep(3, draft);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});
