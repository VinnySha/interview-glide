import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "./account";

/**
 * PERF-405: fundAccount must return the just-created transaction
 * for the specific account, not the globally oldest row.
 */

function createCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

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
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(sessions);
    await db.delete(users);

    await db.insert(users).values({
      email: "txn-test@example.com",
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

  it("covers first funding, returned transaction matches deposit amount", async () => {
    const caller = createCaller(userId);
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
    const caller = createCaller(userId);

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
