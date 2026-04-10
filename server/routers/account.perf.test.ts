import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, insertTestUser, createAccountCaller } from "../test-utils/fixtures";

/**
 * PERF-407: getTransactions must return all transactions with
 * accountType populated, without issuing per-transaction DB queries.
 */
describe("getTransactions enrichment (PERF-407)", () => {
  /*
   * Testing strategy
   *
   * partition on transaction count:
   *   no transactions
   *   multiple transactions
   *
   * partition on enriched accountType:
   *   every returned transaction includes accountType
   *   accountType missing on some transactions (bug)
   */

  let userId: number;
  let accountId: number;

  beforeEach(async () => {
    await resetDb();
    userId = await insertTestUser("perf-test@example.com");

    const caller = createAccountCaller(userId);
    const acct = await caller.createAccount({ accountType: "checking" });
    accountId = acct.id;
  });

  it("covers no transactions returns empty array", async () => {
    const caller = createAccountCaller(userId);
    const txns = await caller.getTransactions({ accountId });

    expect(txns).toHaveLength(0);
  });

  it("covers multiple transactions all include accountType", async () => {
    const caller = createAccountCaller(userId);

    await caller.fundAccount({
      accountId,
      amount: 10,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });
    await caller.fundAccount({
      accountId,
      amount: 20,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });

    const txns = await caller.getTransactions({ accountId });

    expect(txns).toHaveLength(2);
    for (const txn of txns) {
      expect(txn.accountType).toBe("checking");
    }
  });
});
