import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * PERF-407: getTransactions must not issue a separate DB query
 * per transaction to fetch account details (N+1 query problem).
 */
const source = readFileSync(resolve(__dirname, "account.ts"), "utf-8");
const getTxnBlock = source.slice(source.indexOf("getTransactions:"));

describe("getTransactions performance (PERF-407)", () => {
  /*
   * Testing strategy
   *
   * partition on query pattern in getTransactions:
   *   N+1 loop querying accounts per transaction (bug)
   *   single account lookup reused across all transactions (correct)
   */

  it("covers no per-transaction account query inside loop", () => {
    expect(getTxnBlock).not.toContain("for (const transaction of");
  });

  it("covers uses already-fetched account object for accountType", () => {
    expect(getTxnBlock).toContain("account.accountType");
  });
});
