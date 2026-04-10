import { describe, expect, it } from "vitest";

/**
 * PERF-403: Sessions near expiry should be rejected, not accepted
 * until the exact millisecond. We test the buffer logic in isolation.
 */
const SESSION_EXPIRY_BUFFER_MS = 60_000;

function isSessionValid(expiresAtIso: string): boolean {
  const expiresIn = new Date(expiresAtIso).getTime() - Date.now();
  return expiresIn > SESSION_EXPIRY_BUFFER_MS;
}

describe("session expiry buffer (PERF-403)", () => {
  /*
   * Testing strategy
   *
   * partition on time until expiry:
   *   well before expiry (> buffer)
   *   within buffer window (<= 60s)
   *   already expired (past)
   */

  it("covers well before expiry, session valid", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSessionValid(future)).toBe(true);
  });

  it("covers within 60s buffer window, session rejected", () => {
    const nearExpiry = new Date(Date.now() + 30_000).toISOString();
    expect(isSessionValid(nearExpiry)).toBe(false);
  });

  it("covers already expired, session rejected", () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(isSessionValid(past)).toBe(false);
  });
});
