import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, insertTestUser, createAccountCaller } from "../test-utils/fixtures";

/**
 * PERF-404: getTransactions must return transactions in a
 * deterministic order (newest first).
 */
describe("transaction sorting (PERF-404)", () => {
  /*
   * Testing strategy
   *
   * partition on transaction count:
   *   single transaction (trivially sorted)
   *   multiple transactions
   *
   * partition on returned order:
   *   newest first (descending by id)
   *   arbitrary / oldest first (bug)
   */

  let userId: number;
  let accountId: number;

  beforeEach(async () => {
    await resetDb();
    userId = await insertTestUser("sort-test@example.com");

    const caller = createAccountCaller(userId);
    const acct = await caller.createAccount({ accountType: "checking" });
    accountId = acct.id;
  });

  it("covers multiple transactions returned newest first", async () => {
    const caller = createAccountCaller(userId);

    await caller.fundAccount({
      accountId,
      amount: 10,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });
    await caller.fundAccount({
      accountId,
      amount: 50,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });
    await caller.fundAccount({
      accountId,
      amount: 25,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    const txns = await caller.getTransactions({ accountId });

    expect(txns).toHaveLength(3);
    expect(txns[0].amount).toBe(25);
    expect(txns[1].amount).toBe(50);
    expect(txns[2].amount).toBe(10);
  });

  it("covers single transaction is returned", async () => {
    const caller = createAccountCaller(userId);

    await caller.fundAccount({
      accountId,
      amount: 99,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    const txns = await caller.getTransactions({ accountId });

    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(99);
  });
});
