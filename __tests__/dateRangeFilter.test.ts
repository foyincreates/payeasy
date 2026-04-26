import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Inline copy of the pure filtering logic from TransactionList ────────────
// We test the filtering logic in isolation to avoid React/DOM dependencies.

interface Transaction {
  id: string;
  type: "contribute" | "release" | "refund";
  amount: string;
  status: "success" | "pending" | "failed";
  timestamp: string;
  txHash: string;
}

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function filterByDateRange(
  transactions: Transaction[],
  dateFrom: string,
  dateTo: string,
): Transaction[] {
  return transactions.filter((tx) => {
    let match = true;
    const txDate = new Date(tx.timestamp);

    if (dateFrom) {
      match = match && txDate >= toLocalDate(dateFrom);
    }
    if (dateTo) {
      const toDate = toLocalDate(dateTo);
      toDate.setHours(23, 59, 59, 999);
      match = match && txDate <= toDate;
    }
    return match;
  });
}

// ── Mock data: 5 transactions spread across different months ────────────────

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    type: "contribute",
    amount: "450.00 XLM",
    status: "success",
    timestamp: "2026-01-15T10:00:00.000Z",
    txHash: "hash1",
  },
  {
    id: "tx-2",
    type: "release",
    amount: "1,250.00 XLM",
    status: "success",
    timestamp: "2026-02-10T14:30:00.000Z",
    txHash: "hash2",
  },
  {
    id: "tx-3",
    type: "contribute",
    amount: "300.00 XLM",
    status: "success",
    timestamp: "2026-03-22T08:45:00.000Z",
    txHash: "hash3",
  },
  {
    id: "tx-4",
    type: "refund",
    amount: "150.00 XLM",
    status: "success",
    timestamp: "2026-04-05T20:00:00.000Z",
    txHash: "hash4",
  },
  {
    id: "tx-5",
    type: "contribute",
    amount: "500.00 XLM",
    status: "failed",
    timestamp: "2026-05-01T12:00:00.000Z",
    txHash: "hash5",
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe("DateRangeFilter — filtering logic", () => {
  it("returns all transactions when no dates are set", () => {
    const result = filterByDateRange(MOCK_TRANSACTIONS, "", "");
    assert.equal(result.length, 5, "All 5 transactions should be returned");
  });

  it("filters by 'from' date only — excludes earlier transactions", () => {
    // From March 1 → should include tx-3 (Mar), tx-4 (Apr), tx-5 (May)
    const result = filterByDateRange(MOCK_TRANSACTIONS, "2026-03-01", "");
    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((t) => t.id),
      ["tx-3", "tx-4", "tx-5"],
    );
  });

  it("filters by 'to' date only — excludes later transactions", () => {
    // To Feb 28 → should include tx-1 (Jan) and tx-2 (Feb)
    const result = filterByDateRange(MOCK_TRANSACTIONS, "", "2026-02-28");
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((t) => t.id),
      ["tx-1", "tx-2"],
    );
  });

  it("filters by both 'from' and 'to' — returns correct subset", () => {
    // Feb 1 → Mar 31 → should include tx-2 (Feb) and tx-3 (Mar)
    const result = filterByDateRange(MOCK_TRANSACTIONS, "2026-02-01", "2026-03-31");
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((t) => t.id),
      ["tx-2", "tx-3"],
    );
  });

  it("includes transactions that fall on the exact 'from' date", () => {
    // From the exact date of tx-1
    const result = filterByDateRange(MOCK_TRANSACTIONS, "2026-01-15", "2026-01-15");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "tx-1");
  });

  it("includes transactions that fall on the exact 'to' date (end of day)", () => {
    // To date is the same day as tx-4 — should still include it
    const result = filterByDateRange(MOCK_TRANSACTIONS, "2026-04-05", "2026-04-05");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "tx-4");
  });

  it("returns empty array when no transactions match the range", () => {
    // A gap where no transactions exist
    const result = filterByDateRange(MOCK_TRANSACTIONS, "2026-06-01", "2026-06-30");
    assert.equal(result.length, 0);
  });
});
