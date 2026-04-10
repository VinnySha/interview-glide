import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * PERF-405: The fundAccount transaction fetch must return the
 * just-created transaction for the specific account, not the
 * globally oldest row.
 *
 * We verify the query shape at source level since the DB native
 * module cannot load in this test environment.
 */
const source = readFileSync(resolve(__dirname, "account.ts"), "utf-8");

describe("fundAccount transaction fetch (PERF-405)", () => {
  /*
   * Testing strategy
   *
   * partition on query filter:
   *   filtered by accountId (correct)
   *   unfiltered / global (bug)
   *
   * partition on sort order:
   *   descending by id (newest first)
   *   ascending by createdAt (oldest first — bug)
   */

  it("covers query filtered by accountId", () => {
    expect(source).toContain("transactions.accountId, input.accountId");
  });

  it("covers descending sort (newest first), not ascending", () => {
    expect(source).toContain("desc(transactions.id)");
    expect(source).not.toMatch(/orderBy\(transactions\.createdAt\)/);
  });
});
