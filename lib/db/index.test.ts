import { describe, expect, it } from "vitest";
import { db, initDb } from "./index";
import { users } from "./schema";

/**
 * PERF-408: The db module must use a single connection and
 * initDb() must be safe to call without leaking resources.
 */
describe("db module connection hygiene (PERF-408)", () => {
  /*
   * Testing strategy
   *
   * partition on db export:
   *   db is a functional Drizzle instance
   *   db is undefined or broken
   *
   * partition on initDb idempotency:
   *   calling initDb() again does not throw
   *   calling initDb() again throws (leak or conflict)
   */

  it("covers db is a functional Drizzle instance", () => {
    const result = db.select().from(users).all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("covers initDb is idempotent and does not throw", () => {
    expect(() => initDb()).not.toThrow();
  });
});
