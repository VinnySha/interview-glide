import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * PERF-408: Regression test ensuring lib/db/index.ts does not open
 * extra Database connections that are never closed.
 */
const source = readFileSync(resolve(__dirname, "index.ts"), "utf-8");

describe("db module connection hygiene (PERF-408)", () => {
  /*
   * Testing strategy
   *
   * partition on connection instantiation count:
   *   exactly one `new Database(` call (the one used by Drizzle)
   *   more than one `new Database(` call (leak)
   *
   * partition on leaked reference arrays:
   *   no dangling connection arrays
   *   has dangling connection arrays
   */

  it("covers exactly one Database instantiation (no leaked extra connections)", () => {
    const matches = source.match(/new Database\(/g);
    expect(matches).toHaveLength(1);
  });

  it("covers no dangling connection arrays", () => {
    expect(source).not.toContain("connections");
  });
});
