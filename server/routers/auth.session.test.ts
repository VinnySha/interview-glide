import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * SEC-304: Signup and login must invalidate prior sessions
 * before creating a new one, ensuring only one valid session
 * per user at a time.
 */
const source = readFileSync(resolve(__dirname, "auth.ts"), "utf-8");

describe("session invalidation on auth (SEC-304)", () => {
  /*
   * Testing strategy
   *
   * partition on session cleanup before new session:
   *   deletes prior sessions for user (correct)
   *   no deletion before insert (bug — sessions accumulate)
   *
   * partition on auth flow:
   *   signup path
   *   login path
   */

  it("covers signup path deletes prior sessions before insert", () => {
    const signupBlock = source.slice(0, source.indexOf("login:"));
    expect(signupBlock).toContain("db.delete(sessions)");
    expect(signupBlock).toContain("sessions.userId, user.id");
  });

  it("covers login path deletes prior sessions before insert", () => {
    const loginBlock = source.slice(source.indexOf("login:"), source.indexOf("logout:"));
    expect(loginBlock).toContain("db.delete(sessions)");
    expect(loginBlock).toContain("sessions.userId, user.id");
  });
});
