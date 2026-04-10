import { describe, expect, it } from "vitest";
import { sanitizeUser } from "../lib/sanitizeUser";

describe("auth router user sanitization", () => {
  /*
   * Testing strategy
   *
   * partition on sensitive fields in source user:
   *   has password and ssn
   *   does not have password and ssn
   *
   * partition on response exposure:
   *   sensitive fields included
   *   sensitive fields excluded
   */

  it("covers source user has password and ssn, and response excludes sensitive fields", () => {
    const user = {
      id: 1,
      email: "tester@example.com",
      password: "hashed-password",
      firstName: "Casey",
      lastName: "Tester",
      phoneNumber: "+15555550123",
      dateOfBirth: "1990-01-01",
      ssn: "v1:iv:tag:ciphertext",
      address: "123 Test Street",
      city: "Testville",
      state: "CA",
      zipCode: "94105",
      createdAt: new Date().toISOString(),
    };

    const safeUser = sanitizeUser(user as any);

    expect((safeUser as any).password).toBeUndefined();
    expect((safeUser as any).ssn).toBeUndefined();
    expect(safeUser.email).toBe(user.email);
  });
});
