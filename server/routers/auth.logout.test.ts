import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authRouter } from "./auth";
import { resetDb, createAuthCaller, TEST_SIGNUP_INPUT } from "../test-utils/fixtures";

/**
 * PERF-402: Logout must delete the session regardless of ctx.user
 * and report failure honestly when no token is present.
 */
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

  const email = "logout-test@example.com";

  beforeEach(async () => {
    process.env.SSN_ENCRYPTION_KEY = "test-only-ssn-key";
    await resetDb();
  });

  it("covers valid token present, session deleted, returns success true", async () => {
    const signupCaller = createAuthCaller();
    const { token } = await signupCaller.signup({ ...TEST_SIGNUP_INPUT, email });

    const user = await db.select().from(users).where(eq(users.email, email)).get();
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
    const caller = createAuthCaller();
    const result = await caller.logout();

    expect(result.success).toBe(false);
    expect(result.message).toContain("No active session");
  });
});
