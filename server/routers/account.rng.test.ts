import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "./account";

/**
 * SEC-302: Account numbers must be generated with a CSPRNG
 * and be unpredictable across creations.
 */

function createCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

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
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(sessions);
    await db.delete(users);

    await db.insert(users).values({
      email: "rng-test@example.com",
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
  });

  it("covers account number is 10-digit zero-padded string", async () => {
    const caller = createCaller(userId);
    const account = await caller.createAccount({ accountType: "checking" });

    expect(account.accountNumber).toMatch(/^\d{10}$/);
  });

  it("covers two accounts produce different numbers", async () => {
    const caller = createCaller(userId);
    const checking = await caller.createAccount({ accountType: "checking" });
    const savings = await caller.createAccount({ accountType: "savings" });

    expect(checking.accountNumber).not.toBe(savings.accountNumber);
  });
});
