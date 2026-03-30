import test from "node:test";
import assert from "node:assert/strict";

import { assertFullyFunded, EscrowNotFundedError } from "./release.ts";

test("assertFullyFunded against Stellar testnet - throws on non-existent contract", async () => {
  // Use a completely fake contract ID (must be 56 chars starting with C)
  const fakeContractId = "CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const fakeLandlordAddress = "GBYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY";

  try {
    await assertFullyFunded(fakeContractId, fakeLandlordAddress);
    assert.fail("Should have thrown an error");
  } catch (err: any) {
    // Expected to throw because the contract is missing from the testnet,
    // which signifies we're actually making a network request (integration test).
    assert.ok(
      err.message.includes("Simulation failed") || 
      err.message.includes("Simulation request failed") ||
      err instanceof EscrowNotFundedError,
      `Unexpected error: ${err.message}`
    );
  }
});
