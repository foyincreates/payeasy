import test from "node:test";
import assert from "node:assert/strict";

import {
  accumulatedWeight,
  approveRelease,
  approvedRoommateCount,
  createLandlordMajorityConfig,
  hasLandlordApproval,
  isReleaseApproved,
  isThresholdMet,
  mockApproval,
  pendingSigners,
  requiredRoommateApprovals,
  roommateMajorityThreshold,
} from "./multisig.ts";

const landlord = "GLANDLORD";
const roommateA = "GROOMMATEA";
const roommateB = "GROOMMATEB";
const roommateC = "GROOMMATEC";

function makeConfig() {
  return createLandlordMajorityConfig({
    escrowAccountId: "GESCROW",
    landlordAddress: landlord,
    roommateAddresses: [roommateA, roommateB, roommateC],
    networkPassphrase: "Test SDF Network ; September 2015",
  });
}

test("roommateMajorityThreshold requires a strict majority", () => {
  assert.equal(roommateMajorityThreshold(0), 0);
  assert.equal(roommateMajorityThreshold(1), 1);
  assert.equal(roommateMajorityThreshold(2), 2);
  assert.equal(roommateMajorityThreshold(3), 2);
  assert.equal(roommateMajorityThreshold(4), 3);
});

test("createLandlordMajorityConfig encodes landlord plus majority roommate threshold", () => {
  const config = makeConfig();

  assert.equal(config.threshold, 6);
  assert.equal(config.roommateApprovalThreshold, 2);
  assert.equal(config.signers[0].address, landlord);
  assert.equal(config.signers[0].weight, 4);
  assert.deepEqual(
    config.signers.slice(1).map((signer) => signer.weight),
    [1, 1, 1]
  );
});

test("release approval requires landlord, roommate majority, and configured weight", () => {
  const config = makeConfig();

  const landlordOnly = [mockApproval(landlord, "landlord")];
  assert.equal(isThresholdMet(landlordOnly, config), false);
  assert.equal(isReleaseApproved(landlordOnly, config), false);

  const roommatesOnly = [
    mockApproval(roommateA, "a"),
    mockApproval(roommateB, "b"),
    mockApproval(roommateC, "c"),
  ];
  assert.equal(hasLandlordApproval(roommatesOnly, config), false);
  assert.equal(approvedRoommateCount(roommatesOnly, config), 3);
  assert.equal(isReleaseApproved(roommatesOnly, config), false);

  const landlordPlusOne = [
    mockApproval(landlord, "landlord"),
    mockApproval(roommateA, "a"),
  ];
  assert.equal(accumulatedWeight(landlordPlusOne, config), 5);
  assert.equal(isThresholdMet(landlordPlusOne, config), false);
  assert.equal(isReleaseApproved(landlordPlusOne, config), false);

  const landlordPlusMajority = [
    mockApproval(landlord, "landlord"),
    mockApproval(roommateA, "a"),
    mockApproval(roommateB, "b"),
  ];
  assert.equal(requiredRoommateApprovals(config), 2);
  assert.equal(accumulatedWeight(landlordPlusMajority, config), 6);
  assert.equal(isThresholdMet(landlordPlusMajority, config), true);
  assert.equal(isReleaseApproved(landlordPlusMajority, config), true);
});

test("duplicate approvals do not inflate signer weight", () => {
  const config = makeConfig();
  const approvals = [
    mockApproval(landlord, "landlord-1"),
    mockApproval(landlord, "landlord-2"),
    mockApproval(roommateA, "a"),
  ];

  assert.equal(accumulatedWeight(approvals, config), 5);
  assert.equal(isReleaseApproved(approvals, config), false);
});

test("pendingSigners excludes wallets that have already approved", () => {
  const config = makeConfig();
  const pending = pendingSigners([mockApproval(roommateA, "a")], config);

  assert.deepEqual(
    pending.map((signer) => signer.address),
    [landlord, roommateB, roommateC]
  );
});

test("approveRelease signs the shared release transaction XDR with the active signer", async () => {
  const config = makeConfig();
  const signedAt = new Date("2026-04-22T10:00:00.000Z");
  const calls: Array<{
    xdr: string;
    network?: string;
    networkPassphrase: string;
  }> = [];

  const approval = await approveRelease({
    signerAddress: roommateA,
    transactionXdr: "UNSIGNED_RELEASE_XDR",
    config,
    network: "TESTNET",
    now: signedAt,
    async signTransaction(xdr, options) {
      calls.push({ xdr, ...options });
      return { signedTxXdr: "SIGNED_BY_ROOMMATE_A" };
    },
  });

  assert.deepEqual(calls, [
    {
      xdr: "UNSIGNED_RELEASE_XDR",
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  ]);
  assert.equal(approval.signerAddress, roommateA);
  assert.equal(approval.signedTransactionXdr, "SIGNED_BY_ROOMMATE_A");
  assert.equal(approval.approvedAt, signedAt);
});

test("approveRelease rejects wallets outside the configured signer set", async () => {
  const config = makeConfig();

  await assert.rejects(
    () =>
      approveRelease({
        signerAddress: "GSTRANGER",
        transactionXdr: "UNSIGNED_RELEASE_XDR",
        config,
        async signTransaction() {
          return "SIGNED";
        },
      }),
    /not a configured release signer/
  );
});
