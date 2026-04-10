import { describe, expect, it } from "vitest";

/**
 * VAL-209: Amount input must reject leading zeros.
 * Mirrors the pattern regex from FundingModal.
 */
const amountPattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

describe("amount input format (VAL-209)", () => {
  /*
   * Testing strategy
   *
   * partition on leading zeros:
   *   no leading zeros (e.g. "100")
   *   single zero for sub-dollar amounts (e.g. "0.50")
   *   multiple leading zeros (e.g. "00100") — rejected
   *
   * partition on decimal places:
   *   no decimal
   *   1-2 decimal places
   *   3+ decimal places — rejected
   */

  it("covers no leading zeros, whole number", () => {
    expect(amountPattern.test("100")).toBe(true);
  });

  it("covers single zero for sub-dollar amount", () => {
    expect(amountPattern.test("0.50")).toBe(true);
  });

  it("covers valid amount with 2 decimal places", () => {
    expect(amountPattern.test("19.99")).toBe(true);
  });

  it("covers multiple leading zeros, rejected", () => {
    expect(amountPattern.test("00100")).toBe(false);
  });

  it("covers leading zero before non-zero digit, rejected", () => {
    expect(amountPattern.test("01")).toBe(false);
  });

  it("covers 3+ decimal places, rejected", () => {
    expect(amountPattern.test("10.999")).toBe(false);
  });
});
