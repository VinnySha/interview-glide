import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * SEC-302: Account numbers must be generated with a CSPRNG,
 * not Math.random().
 */
const source = readFileSync(resolve(__dirname, "account.ts"), "utf-8");

describe("account number generation (SEC-302)", () => {
  /*
   * Testing strategy
   *
   * partition on RNG source:
   *   uses crypto.randomInt (secure)
   *   uses Math.random (insecure — bug)
   */

  it("covers uses crypto randomInt, not Math.random", () => {
    expect(source).toContain("randomInt");
    expect(source).not.toContain("Math.random");
  });
});
