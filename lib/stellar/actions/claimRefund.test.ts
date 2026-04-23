import test from "node:test";
import assert from "node:assert/strict";

import { Keypair, StrKey } from "@stellar/stellar-sdk";

import {
  DeadlineNotExpiredError,
  assertDeadlineExpired,
  claimRefund,
} from "./claimRefund.ts";

test("assertDeadlineExpired against Stellar testnet rejects future deadlines", async () => {
  const farFutureDeadline = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;

  await assert.rejects(
    () => assertDeadlineExpired(farFutureDeadline),
    (error) => {
      assert.ok(error instanceof DeadlineNotExpiredError);
      assert.equal(error.deadlineTimestamp, farFutureDeadline);
      return true;
    }
  );
});

test("claimRefund reaches Stellar testnet and fails gracefully for a non-existent contract", async () => {
  const fakeContractId = StrKey.encodeContract(Buffer.alloc(32));
  const roommateAddress = Keypair.random().publicKey();

  await assert.rejects(
    () =>
      claimRefund(
        {
          contractId: fakeContractId,
          roommateAddress,
          deadlineTimestamp: 1,
          refundableAmount: "1000000",
        },
        {
          freighter: {
            async getAddress() {
              return { address: roommateAddress };
            },
            async signTransaction() {
              return { signedTxXdr: "SIGNED_XDR_PLACEHOLDER" };
            },
          },
        }
      ),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /Simulation failed|Transaction submission failed|not succeed|Unable to resolve a supported refund method/i
      );
      return true;
    }
  );
});
