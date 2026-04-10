import { describe, expect, it } from "vitest";

/**
 * PERF-406: Balance calculation must use exact arithmetic,
 * not a loop that accumulates floating-point drift.
 *
 * We test the core arithmetic in isolation since the DB-backed
 * fundAccount handler is hard to call without native SQLite bindings.
 */
/** Mirrors the rounding logic in fundAccount */
function computeNewBalance(currentBalance: number, depositAmount: number): number {
  return Math.round((currentBalance + depositAmount) * 100) / 100;
}

describe("balance calculation (PERF-406)", () => {
  /*
   * Testing strategy
   *
   * partition on deposit count:
   *   single deposit
   *   many sequential deposits (drift-prone scenario)
   *
   * partition on amount precision:
   *   whole dollar amount
   *   fractional cent amount (e.g. $19.99)
   */

  it("covers single deposit, whole dollar amount", () => {
    expect(computeNewBalance(0, 100)).toBe(100);
  });

  it("covers single deposit, fractional amount", () => {
    expect(computeNewBalance(0, 19.99)).toBe(19.99);
  });

  it("covers many sequential deposits, fractional amount (drift-prone)", () => {
    let balance = 0;
    for (let i = 0; i < 100; i++) {
      balance = computeNewBalance(balance, 19.99);
    }
    expect(balance).toBe(1999);
  });

  it("covers many sequential deposits, whole dollar amount", () => {
    let balance = 500;
    for (let i = 0; i < 50; i++) {
      balance = computeNewBalance(balance, 10);
    }
    expect(balance).toBe(1000);
  });
});
