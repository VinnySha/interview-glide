import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptSsn } from "@/lib/security/ssn";
import { detectEmailTypo } from "@/lib/validation/email";
import { sanitizeUser } from "../lib/sanitizeUser";

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email()
          .toLowerCase()
          .refine((v) => !detectEmailTypo(v), { message: "Email TLD looks like a typo" }),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[a-z]/, "Password must contain a lowercase letter")
          .regex(/[A-Z]/, "Password must contain an uppercase letter")
          .regex(/\d/, "Password must contain a number")
          .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: z.string().regex(/^\+?\d{10,15}$/),
        dateOfBirth: z.string().refine(
          (val) => {
            const dob = new Date(val);
            if (isNaN(dob.getTime())) return false;
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
            return age >= 18;
          },
          { message: "Must be at least 18 years old" }
        ),
        ssn: z.string().regex(/^\d{9}$/),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().length(2).toUpperCase(),
        zipCode: z.string().regex(/^\d{5}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const encryptedSsn = encryptSsn(input.ssn);

      await db.insert(users).values({
        ...input,
        ssn: encryptedSsn,
        password: hashedPassword,
      });

      // Fetch the created user
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Invalidate any prior sessions for this user before issuing a new one
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: sanitizeUser(user), token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Invalidate any prior sessions for this user before issuing a new one
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: sanitizeUser(user), token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Extract token from cookie regardless of ctx.user state
    let token: string | undefined;
    if ("cookies" in ctx.req) {
      token = (ctx.req as any).cookies.session;
    } else {
      const cookieHeader = ctx.req.headers.get?.("cookie") || (ctx.req.headers as any).cookie;
      token = cookieHeader
        ?.split("; ")
        .find((c: string) => c.startsWith("session="))
        ?.split("=")[1];
    }

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    // Clear cookie
    if ("setHeader" in ctx.res) {
      ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    } else {
      (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    }

    if (!token) {
      return { success: false, message: "No active session" };
    }

    return { success: true, message: "Logged out successfully" };
  }),
});
