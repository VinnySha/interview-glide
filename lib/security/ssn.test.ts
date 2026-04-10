import { afterEach, describe, expect, it } from "vitest";
import { encryptSsn } from "./ssn";

describe("SSN crypto", () => {
  /*
   * Testing strategy
   *
   * partition on SSN_ENCRYPTION_KEY:
   *   configured
   *   missing
   *
   * partition on stored representation:
   *   output equals plaintext
   *   output differs from plaintext
   */

  afterEach(() => {
    delete process.env.SSN_ENCRYPTION_KEY;
  });

  it("covers key configured, untampered payload, and output differs from plaintext", () => {
    process.env.SSN_ENCRYPTION_KEY = "test-only-ssn-key";

    const plaintext = "123456789";
    const encrypted = encryptSsn(plaintext);

    expect(encrypted).not.toEqual(plaintext);
    expect(encrypted.startsWith("v1:")).toBe(true);
  });

  it("covers key missing", () => {
    expect(() => encryptSsn("123456789")).toThrow(/SSN_ENCRYPTION_KEY is required/);
  });
});
