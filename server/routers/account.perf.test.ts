import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "./account";

/**
 * PERF-407: getTransactions must return all transactions with
 * accountType populated, without issuing per-transaction DB queries.
 */

function createCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

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
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(sessions);
    await db.delete(users);

    await db.insert(users).values({
      email: "perf-test@example.com",
      password: "hashed",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "1234567890",
      dateOfBirth: "1990-01-01",
      ssn: "encrypted",
      address: "123 St",
      city: "City",
      state: "CA",
      zipCode: "12345",
    });
    const user = await db.select().from(users).get();
    userId = user!.id;

    const caller = createCaller(userId);
    const acct = await caller.createAccount({ accountType: "checking" });
    accountId = acct.id;
  });

  it("covers no transactions returns empty array", async () => {
    const caller = createCaller(userId);
    const txns = await caller.getTransactions({ accountId });

    expect(txns).toHaveLength(0);
  });

  it("covers multiple transactions all include accountType", async () => {
    const caller = createCaller(userId);

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
