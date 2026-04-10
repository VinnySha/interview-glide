import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * VAL-205: Funding amount must be strictly positive.
 * Mirrors the server Zod schema for the amount field.
 */
const amountSchema = z.number().positive();

describe("funding amount validation (VAL-205)", () => {
  /*
   * Testing strategy
   *
   * partition on amount value:
   *   zero (boundary, rejected)
   *   negative (rejected)
   *   small positive like $0.01 (boundary, accepted)
   *   normal positive (accepted)
   */

  it("covers zero amount, rejected", () => {
    expect(amountSchema.safeParse(0).success).toBe(false);
  });

  it("covers negative amount, rejected", () => {
    expect(amountSchema.safeParse(-10).success).toBe(false);
  });

  it("covers $0.01 boundary, accepted", () => {
    expect(amountSchema.safeParse(0.01).success).toBe(true);
  });

  it("covers normal positive amount, accepted", () => {
    expect(amountSchema.safeParse(100).success).toBe(true);
  });
});
