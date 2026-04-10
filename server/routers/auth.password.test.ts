import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * VAL-208: Password complexity rules enforced by the signup Zod schema.
 * Mirrors the schema in auth.ts so tests stay isolated from the DB.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/\d/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

describe("password complexity validation (VAL-208)", () => {
  /*
   * Testing strategy
   *
   * partition on length:
   *   < 8 characters
   *   >= 8 characters
   *
   * partition on character classes present:
   *   missing lowercase
   *   missing uppercase
   *   missing digit
   *   missing special character
   *   all classes present
   */

  it("covers < 8 characters", () => {
    expect(passwordSchema.safeParse("Ab1!").success).toBe(false);
  });

  it("covers >= 8 chars, missing uppercase", () => {
    expect(passwordSchema.safeParse("abcdefg1!").success).toBe(false);
  });

  it("covers >= 8 chars, missing lowercase", () => {
    expect(passwordSchema.safeParse("ABCDEFG1!").success).toBe(false);
  });

  it("covers >= 8 chars, missing digit", () => {
    expect(passwordSchema.safeParse("Abcdefgh!").success).toBe(false);
  });

  it("covers >= 8 chars, missing special character", () => {
    expect(passwordSchema.safeParse("Abcdefg1").success).toBe(false);
  });

  it("covers >= 8 chars, all classes present", () => {
    expect(passwordSchema.safeParse("Abcdef1!").success).toBe(true);
  });
});
