import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "./account";

/**
 * PERF-401: Account creation must return the real persisted account
 * with balance 0, not a fake fallback with balance 100.
 */

function createCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

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
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(sessions);
    await db.delete(users);

    await db.insert(users).values({
      email: "creation-test@example.com",
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

  it("covers successful creation returns balance 0, not 100", async () => {
    const caller = createCaller(userId);
    const account = await caller.createAccount({ accountType: "checking" });

    expect(account.balance).toBe(0);
  });

  it("covers returned account has real id and account number", async () => {
    const caller = createCaller(userId);
    const account = await caller.createAccount({ accountType: "savings" });

    expect(account.id).toBeGreaterThan(0);
    expect(account.accountNumber).toMatch(/^\d{10}$/);
    expect(account.status).toBe("active");
  });
});
