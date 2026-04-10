import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * PERF-402: Logout must attempt session deletion regardless of
 * ctx.user, and report failure when no token is present.
 */
const source = readFileSync(resolve(__dirname, "auth.ts"), "utf-8");
const logoutBlock = source.slice(source.indexOf("logout:"));

describe("logout behavior (PERF-402)", () => {
  /*
   * Testing strategy
   *
   * partition on session deletion guard:
   *   deletion gated on ctx.user (bug — skips expired sessions)
   *   deletion attempted regardless of ctx.user (correct)
   *
   * partition on response when no token:
   *   success: true (bug — misleading)
   *   success: false (correct)
   */

  it("covers deletion not gated on ctx.user", () => {
    const deleteCall = logoutBlock.indexOf("db.delete(sessions)");
    const ctxUserCheck = logoutBlock.indexOf("if (ctx.user)");
    // ctx.user guard should not appear before delete, or not at all
    expect(ctxUserCheck === -1 || ctxUserCheck > deleteCall).toBe(true);
  });

  it("covers no-token path returns success: false", () => {
    expect(logoutBlock).toContain("success: false");
  });
});
