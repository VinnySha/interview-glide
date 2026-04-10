import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * VAL-207: Routing number must be required for bank transfers.
 * Mirrors the fundAccount Zod schema from account.ts.
 */
const fundAccountSchema = z
  .object({
    accountId: z.number(),
    amount: z.number().positive(),
    fundingSource: z.object({
      type: z.enum(["card", "bank"]),
      accountNumber: z.string(),
      routingNumber: z.string().optional(),
    }),
  })
  .refine(
    (data) =>
      data.fundingSource.type !== "bank" || !!data.fundingSource.routingNumber,
    { message: "Routing number is required for bank transfers", path: ["fundingSource", "routingNumber"] }
  );

const base = { accountId: 1, amount: 100 };

describe("routing number requirement (VAL-207)", () => {
  /*
   * Testing strategy
   *
   * partition on funding type:
   *   card
   *   bank
   *
   * partition on routingNumber presence:
   *   provided
   *   missing / undefined
   */

  it("covers bank transfer without routing number, rejected", () => {
    const result = fundAccountSchema.safeParse({
      ...base,
      fundingSource: { type: "bank", accountNumber: "123456789" },
    });
    expect(result.success).toBe(false);
  });

  it("covers bank transfer with routing number, accepted", () => {
    const result = fundAccountSchema.safeParse({
      ...base,
      fundingSource: { type: "bank", accountNumber: "123456789", routingNumber: "021000021" },
    });
    expect(result.success).toBe(true);
  });

  it("covers card transfer without routing number, accepted", () => {
    const result = fundAccountSchema.safeParse({
      ...base,
      fundingSource: { type: "card", accountNumber: "4111111111111111" },
    });
    expect(result.success).toBe(true);
  });
});
