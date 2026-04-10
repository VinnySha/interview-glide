import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, insertTestUser, createAccountCaller } from "../test-utils/fixtures";

/**
 * SEC-302: Account numbers must be generated with a CSPRNG
 * and be unpredictable across creations.
 */
describe("account number generation (SEC-302)", () => {
  /*
   * Testing strategy
   *
   * partition on account number format:
   *   10-digit zero-padded string
   *   other format (bug)
   *
   * partition on uniqueness across creations:
   *   two accounts produce different numbers
   *   two accounts produce the same number (predictable — bug)
   */

  let userId: number;

  beforeEach(async () => {
    await resetDb();
    userId = await insertTestUser("rng-test@example.com");
  });

  it("covers account number is 10-digit zero-padded string", async () => {
    const caller = createAccountCaller(userId);
    const account = await caller.createAccount({ accountType: "checking" });

    expect(account.accountNumber).toMatch(/^\d{10}$/);
  });

  it("covers two accounts produce different numbers", async () => {
    const caller = createAccountCaller(userId);
    const checking = await caller.createAccount({ accountType: "checking" });
    const savings = await caller.createAccount({ accountType: "savings" });

    expect(checking.accountNumber).not.toBe(savings.accountNumber);
  });
});
