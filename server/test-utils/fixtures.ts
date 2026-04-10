import { db } from "@/lib/db";
import { users, accounts, transactions, sessions } from "@/lib/db/schema";
import { accountRouter } from "../routers/account";
import { authRouter } from "../routers/auth";

/** Clear all tables in FK-safe order. */
export async function resetDb() {
  await db.delete(transactions);
  await db.delete(accounts);
  await db.delete(sessions);
  await db.delete(users);
}

/** Insert a minimal test user and return their ID. */
export async function insertTestUser(email: string): Promise<number> {
  await db.insert(users).values({
    email,
    password: "hashed",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "1234567890",
    dateOfBirth: "1990-01-01",
    ssn: "encrypted",
    address: "123 St",
    city: "City",
    state: "CA",
    zipCode: "12345",
  });
  const user = await db.select().from(users).get();
  return user!.id;
}

/** Create a tRPC caller for account routes (requires authenticated user). */
export function createAccountCaller(userId: number) {
  return accountRouter.createCaller({
    user: { id: userId } as any,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

/** Create a tRPC caller for auth routes (unauthenticated). */
export function createAuthCaller() {
  return authRouter.createCaller({
    user: null,
    req: { headers: { cookie: "" } },
    res: { setHeader: () => undefined },
  } as any);
}

/** Standard signup input for auth tests. */
export const TEST_SIGNUP_INPUT = {
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
