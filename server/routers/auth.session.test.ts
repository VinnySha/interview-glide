import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authRouter } from "./auth";

/**
 * SEC-304: Signup and login must invalidate prior sessions,
 * ensuring only one valid session per user at a time.
 */

function createCaller() {
  return authRouter.createCaller({
    user: null,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

const signupInput = {
  email: "session-test@example.com",
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

describe("session invalidation on auth (SEC-304)", () => {
  /*
   * Testing strategy
   *
   * partition on auth event:
   *   signup
   *   login (after signup)
   *   second login (after first login)
   *
   * partition on session count after event:
   *   exactly one session for user (correct)
   *   multiple sessions for user (bug)
   */

  beforeEach(async () => {
    process.env.SSN_ENCRYPTION_KEY = "test-only-ssn-key";
    await db.delete(sessions);
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(users);
  });

  it("covers signup creates exactly one session", async () => {
    const caller = createCaller();
    const result = await caller.signup(signupInput);

    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, result.user.id));

    expect(userSessions).toHaveLength(1);
  });

  it("covers login after signup still results in exactly one session", async () => {
    const caller = createCaller();
    await caller.signup(signupInput);

    await caller.login({
      email: signupInput.email,
      password: signupInput.password,
    });

    const user = await db.select().from(users).where(eq(users.email, signupInput.email)).get();
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));

    expect(userSessions).toHaveLength(1);
  });

  it("covers second login still results in exactly one session", async () => {
    const caller = createCaller();
    await caller.signup(signupInput);

    await caller.login({
      email: signupInput.email,
      password: signupInput.password,
    });
    await caller.login({
      email: signupInput.email,
      password: signupInput.password,
    });

    const user = await db.select().from(users).where(eq(users.email, signupInput.email)).get();
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));

    expect(userSessions).toHaveLength(1);
  });
});
