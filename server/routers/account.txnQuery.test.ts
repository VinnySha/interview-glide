import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, insertTestUser, createAccountCaller } from "../test-utils/fixtures";

/**
 * PERF-405: fundAccount must return the just-created transaction
 * for the specific account, not the globally oldest row.
 */
describe("fundAccount transaction fetch (PERF-405)", () => {
  /*
   * Testing strategy
   *
   * partition on number of prior transactions:
   *   first funding (no prior transactions)
   *   second funding (prior transaction exists)
   *
   * partition on returned transaction:
   *   matches the just-created deposit amount
   *   returns a stale/wrong transaction (bug)
   */

  let userId: number;
  let accountId: number;

  beforeEach(async () => {
    await resetDb();
    userId = await insertTestUser("txn-test@example.com");

    const caller = createAccountCaller(userId);
    const acct = await caller.createAccount({ accountType: "checking" });
    accountId = acct.id;
  });

  it("covers first funding, returned transaction matches deposit amount", async () => {
    const caller = createAccountCaller(userId);
    const result = await caller.fundAccount({
      accountId,
      amount: 50,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    expect(result.transaction).toBeTruthy();
    expect(result.transaction!.amount).toBe(50);
    expect(result.transaction!.accountId).toBe(accountId);
  });

  it("covers second funding, returned transaction matches latest deposit, not first", async () => {
    const caller = createAccountCaller(userId);

    await caller.fundAccount({
      accountId,
      amount: 25,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    const result = await caller.fundAccount({
      accountId,
      amount: 75,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    expect(result.transaction!.amount).toBe(75);
    expect(result.transaction!.accountId).toBe(accountId);
  });
});
