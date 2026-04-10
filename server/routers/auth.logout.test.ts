import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authRouter } from "./auth";

/**
 * PERF-402: Logout must delete the session regardless of ctx.user
 * and report failure honestly when no token is present.
 */

const signupInput = {
  email: "logout-test@example.com",
  password: "Abcdef1!",
  firstName: "Test",
  lastName: "User",
  phoneNumber: "+15555550123",
  dateOfBirth: "1990-01-01",
  ssn: "123456789",
  address: "123 St",
  city: "City",
  state: "CA",
  zipCode: "12345",
};

describe("logout behavior (PERF-402)", () => {
  /*
   * Testing strategy
   *
   * partition on session token in request:
   *   valid token present (session should be deleted)
   *   no token present
   *
   * partition on response:
   *   success: true when session was deleted
   *   success: false when no token found
   */

  beforeEach(async () => {
    process.env.SSN_ENCRYPTION_KEY = "test-only-ssn-key";
    await db.delete(sessions);
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(users);
  });

  it("covers valid token present, session deleted, returns success true", async () => {
    const signupCaller = authRouter.createCaller({
      user: null,
      req: { headers: { cookie: "" } },
      res: { setHeader: () => undefined },
    } as any);

    const { token } = await signupCaller.signup(signupInput);

    const user = await db.select().from(users).where(eq(users.email, signupInput.email)).get();
    const logoutCaller = authRouter.createCaller({
      user,
      req: { headers: { cookie: `session=${token}` } },
      res: { setHeader: () => undefined },
    } as any);

    const result = await logoutCaller.logout();

    expect(result.success).toBe(true);

    const remaining = await db.select().from(sessions).where(eq(sessions.token, token));
    expect(remaining).toHaveLength(0);
  });

  it("covers no token present, returns success false", async () => {
    const caller = authRouter.createCaller({
      user: null,
      req: { headers: { cookie: "" } },
      res: { setHeader: () => undefined },
    } as any);

    const result = await caller.logout();

    expect(result.success).toBe(false);
    expect(result.message).toContain("No active session");
  });
});
