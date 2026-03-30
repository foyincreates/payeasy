import { describe, it as test } from "node:test";
import assert from "node:assert";
import { translateStellarError, StellarErrorType } from "./errors.ts";

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toContain: (expected) => assert.ok(actual?.includes(expected) || actual?.message?.includes(expected)),
});

describe("translateStellarError", () => {
  test("maps Soroban contract error code 1 to InvalidAmount", () => {
    const error = { code: 1 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.INVALID_AMOUNT);
  });

  test("maps Soroban contract error code 2 to InsufficientFunding", () => {
    const error = { code: 2 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.INSUFFICIENT_FUNDING);
  });

  test("maps Soroban contract error code 3 to Unauthorized", () => {
    const error = { code: 3 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.UNAUTHORIZED);
  });

  test("maps Soroban contract error code 4 to DeadlineNotReached", () => {
    const error = { code: 4 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.DEADLINE_NOT_REACHED);
  });

  test("maps Soroban contract error code 5 to ShareSumExceedsRent", () => {
    const error = { code: 5 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.SHARE_SUM_EXCEEDS_RENT);
  });

  test("maps Soroban contract error code 6 to NothingToRefund", () => {
    const error = { code: 6 };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.NOTHING_TO_REFUND);
  });

  test("maps RPC timeout error message", () => {
    const error = { message: "Request Timeout" };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.RPC_NETWORK_TIMEOUT);
  });

  test("maps RPC connection error (node unavailable)", () => {
    const error = { message: "Failed to fetch node status" };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.RPC_NODE_UNAVAILABLE);
  });

  test("maps Freighter rejection message", () => {
    const error = "User declined transaction";
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.FREIGHTER_REJECTED);
  });

  test("maps Freighter locked wallet message", () => {
    const error = { message: "Account is locked" };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.FREIGHTER_LOCKED);
  });

  test("handles unknown errors gracefully", () => {
    const error = { something: "went wrong" };
    const result = translateStellarError(error);
    expect(result.type).toBe(StellarErrorType.UNKNOWN);
    expect(result.message).toBe("An unexpected Stellar error occurred.");
  });

  test("handles null error", () => {
    const result = translateStellarError(null);
    expect(result.type).toBe(StellarErrorType.UNKNOWN);
  });
});
