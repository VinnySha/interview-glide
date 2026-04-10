import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * VAL-202: Date of birth validation mirroring the signup Zod schema.
 * Ensures users must be at least 18 years old.
 */
const dobSchema = z.string().refine(
  (val) => {
    const dob = new Date(val);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  },
  { message: "Must be at least 18 years old" }
);

describe("date of birth validation (VAL-202)", () => {
  /*
   * Testing strategy
   *
   * partition on age relative to 18:
   *   well under 18 (future year / very recent)
   *   exactly 17 (boundary, under)
   *   exactly 18 today (boundary, valid)
   *   well over 18
   *
   * partition on input format:
   *   valid date string
   *   invalid date string
   */

  it("covers future year, well under 18", () => {
    expect(dobSchema.safeParse("2025-01-01").success).toBe(false);
  });

  it("covers exactly 17, boundary under", () => {
    const today = new Date();
    const seventeenYearsAgo = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    expect(dobSchema.safeParse(seventeenYearsAgo.toISOString().slice(0, 10)).success).toBe(false);
  });

  it("covers exactly 18 today, boundary valid", () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    expect(dobSchema.safeParse(eighteenYearsAgo.toISOString().slice(0, 10)).success).toBe(true);
  });

  it("covers well over 18", () => {
    expect(dobSchema.safeParse("1990-01-01").success).toBe(true);
  });

  it("covers invalid date string", () => {
    expect(dobSchema.safeParse("not-a-date").success).toBe(false);
  });
});
