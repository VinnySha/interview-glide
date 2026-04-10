import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "./account";

/**
 * PERF-404: getTransactions must return transactions in a
 * deterministic order (newest first).
 */

function createCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

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
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(sessions);
    await db.delete(users);

    await db.insert(users).values({
      email: "sort-test@example.com",
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

  it("covers multiple transactions returned newest first", async () => {
    const caller = createCaller(userId);

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
    const caller = createCaller(userId);

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
