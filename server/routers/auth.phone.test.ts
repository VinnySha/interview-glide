import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * VAL-204: Phone numbers must follow E.164 format (+<country code><number>).
 * Mirrors the server Zod schema for phoneNumber.
 */
const phoneSchema = z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 format");

describe("phone number validation (VAL-204)", () => {
  /*
   * Testing strategy
   *
   * partition on format:
   *   valid E.164 with + prefix and 10-15 digits
   *   missing + prefix
   *   too few digits (< 10)
   *   too many digits (> 15)
   *   contains non-digit characters
   *
   * partition on country code:
   *   US (+1)
   *   international (+44, +91)
   */

  it("covers valid US number +1XXXXXXXXXX", () => {
    expect(phoneSchema.safeParse("+12125551234").success).toBe(true);
  });

  it("covers valid UK number +44XXXXXXXXXX", () => {
    expect(phoneSchema.safeParse("+447911123456").success).toBe(true);
  });

  it("covers valid India number +91XXXXXXXXXX", () => {
    expect(phoneSchema.safeParse("+919876543210").success).toBe(true);
  });

  it("covers missing + prefix, rejected", () => {
    expect(phoneSchema.safeParse("12125551234").success).toBe(false);
  });

  it("covers too few digits, rejected", () => {
    expect(phoneSchema.safeParse("+123456").success).toBe(false);
  });

  it("covers too many digits, rejected", () => {
    expect(phoneSchema.safeParse("+1234567890123456").success).toBe(false);
  });

  it("covers non-digit characters, rejected", () => {
    expect(phoneSchema.safeParse("+1-212-555-1234").success).toBe(false);
  });
});
