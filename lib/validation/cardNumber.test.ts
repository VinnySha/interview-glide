import { describe, expect, it } from "vitest";
import { luhnCheck, isRecognizedCard, isValidCardNumber } from "./cardNumber";

describe("card number validation (VAL-206)", () => {
  /*
   * Testing strategy
   *
   * partition on Luhn checksum:
   *   passes Luhn
   *   fails Luhn
   *
   * partition on card issuer prefix:
   *   Visa (starts with 4)
   *   Mastercard (starts with 51-55)
   *   Amex (starts with 34 or 37)
   *   Discover (starts with 6011 or 65)
   *   unrecognized prefix
   *
   * partition on length:
   *   valid length for issuer
   *   invalid length
   */

  it("covers Visa, valid length, passes Luhn", () => {
    expect(isValidCardNumber("4111111111111111")).toBe(true);
  });

  it("covers Mastercard, valid length, passes Luhn", () => {
    expect(isValidCardNumber("5500000000000004")).toBe(true);
  });

  it("covers Amex, valid length, passes Luhn", () => {
    expect(isValidCardNumber("340000000000009")).toBe(true);
  });

  it("covers Discover, valid length, passes Luhn", () => {
    expect(isValidCardNumber("6011000000000004")).toBe(true);
  });

  it("covers unrecognized prefix, fails", () => {
    expect(isValidCardNumber("9999999999999999")).toBe(false);
  });

  it("covers valid prefix but fails Luhn", () => {
    expect(luhnCheck("4111111111111112")).toBe(false);
    expect(isValidCardNumber("4111111111111112")).toBe(false);
  });

  it("covers invalid length for issuer", () => {
    expect(isRecognizedCard("41111111")).toBe(false);
  });

  it("covers non-digit input", () => {
    expect(luhnCheck("abcd")).toBe(false);
  });
});
