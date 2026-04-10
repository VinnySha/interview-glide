import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * PERF-401: Account creation must not silently return a fake
 * fallback object with balance: 100 when the DB fetch fails.
 */
const source = readFileSync(resolve(__dirname, "account.ts"), "utf-8");

describe("account creation fallback (PERF-401)", () => {
  /*
   * Testing strategy
   *
   * partition on DB fetch failure handling:
   *   throws error on missing account (correct)
   *   returns fallback with balance: 100 (bug)
   *
   * partition on fallback balance value:
   *   no hardcoded balance: 100 in createAccount
   *   contains hardcoded balance: 100
   */

  it("covers throws error on missing account, no silent fallback", () => {
    expect(source).toContain("Failed to create account");
  });

  it("covers no hardcoded balance: 100 fallback", () => {
    expect(source).not.toMatch(/balance:\s*100/);
  });
});
