import { describe, expect, it } from "vitest";
import { validateStateCode, US_STATE_CODES } from "./stateCodes";

describe("state code validation (VAL-203)", () => {
  /*
   * Testing strategy
   *
   * partition on code validity:
   *   valid state (e.g. CA, NY)
   *   valid territory (e.g. DC, PR)
   *   invalid 2-letter code (e.g. XX, ZZ)
   *
   * partition on case:
   *   uppercase input
   *   lowercase input (should still validate after toUpperCase)
   */

  it("covers valid state code CA", () => {
    expect(validateStateCode("CA")).toBe(true);
  });

  it("covers valid state code NY", () => {
    expect(validateStateCode("NY")).toBe(true);
  });

  it("covers valid territory DC", () => {
    expect(validateStateCode("DC")).toBe(true);
  });

  it("covers valid territory PR", () => {
    expect(validateStateCode("PR")).toBe(true);
  });

  it("covers invalid code XX, rejected", () => {
    expect(validateStateCode("XX")).toBe("Invalid US state code");
  });

  it("covers invalid code ZZ, rejected", () => {
    expect(validateStateCode("ZZ")).toBe("Invalid US state code");
  });

  it("covers lowercase input, still validates", () => {
    expect(validateStateCode("ca")).toBe(true);
  });

  it("covers set has exactly 56 entries (50 states + 6 territories)", () => {
    expect(US_STATE_CODES.size).toBe(56);
  });
});
