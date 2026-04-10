import { users } from "@/lib/db/schema";

/**
 * Remove sensitive fields before returning user data to clients.
 *
 * @param user full user record from the database.
 * @returns user object safe for API responses.
 */
export function sanitizeUser(user: typeof users.$inferSelect) {
  const { password: _password, ssn: _ssn, ...safeUser } = user;
  return safeUser;
}
