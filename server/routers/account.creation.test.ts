import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, insertTestUser, createAccountCaller } from "../test-utils/fixtures";

/**
 * PERF-401: Account creation must return the real persisted account
 * with balance 0, not a fake fallback with balance 100.
 */
describe("account creation (PERF-401)", () => {
  /*
   * Testing strategy
   *
   * partition on creation result:
   *   successful creation returns balance 0
   *   successful creation returns status "active"
   *
   * partition on returned data authenticity:
   *   account has a real id (> 0)
   *   account has a real account number (10 digits)
   */

  let userId: number;

  beforeEach(async () => {
    await resetDb();
    userId = await insertTestUser("creation-test@example.com");
  });

  it("covers successful creation returns balance 0, not 100", async () => {
    const caller = createAccountCaller(userId);
    const account = await caller.createAccount({ accountType: "checking" });

    expect(account.balance).toBe(0);
  });

  it("covers returned account has real id and account number", async () => {
    const caller = createAccountCaller(userId);
    const account = await caller.createAccount({ accountType: "savings" });

    expect(account.id).toBeGreaterThan(0);
    expect(account.accountNumber).toMatch(/^\d{10}$/);
    expect(account.status).toBe("active");
  });
});
