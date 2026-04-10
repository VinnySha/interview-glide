import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resetDb, createAuthCaller, TEST_SIGNUP_INPUT } from "../test-utils/fixtures";

/**
 * SEC-304: Signup and login must invalidate prior sessions,
 * ensuring only one valid session per user at a time.
 */
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

  const email = "session-test@example.com";

  beforeEach(async () => {
    process.env.SSN_ENCRYPTION_KEY = "test-only-ssn-key";
    await resetDb();
  });

  it("covers signup creates exactly one session", async () => {
    const caller = createAuthCaller();
    const result = await caller.signup({ ...TEST_SIGNUP_INPUT, email });

    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, result.user.id));

    expect(userSessions).toHaveLength(1);
  });

  it("covers login after signup still results in exactly one session", async () => {
    const caller = createAuthCaller();
    await caller.signup({ ...TEST_SIGNUP_INPUT, email });

    await caller.login({ email, password: TEST_SIGNUP_INPUT.password });

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));

    expect(userSessions).toHaveLength(1);
  });

  it("covers second login still results in exactly one session", async () => {
    const caller = createAuthCaller();
    await caller.signup({ ...TEST_SIGNUP_INPUT, email });

    await caller.login({ email, password: TEST_SIGNUP_INPUT.password });
    await caller.login({ email, password: TEST_SIGNUP_INPUT.password });

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));

    expect(userSessions).toHaveLength(1);
  });
});
