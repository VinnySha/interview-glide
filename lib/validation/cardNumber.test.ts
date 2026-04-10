import { describe, expect, it } from "vitest";
import { luhnCheck, isRecognizedCard, isValidCardNumber, detectCardType } from "./cardNumber";

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
   *   Mastercard classic (starts with 51-55)
   *   Mastercard 2-series (starts with 2221-2720)
   *   Amex (starts with 34 or 37)
   *   Discover (starts with 6011 or 65)
   *   JCB (starts with 352-358)
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

describe("card type detection (VAL-210)", () => {
  /*
   * Testing strategy
   *
   * partition on issuer:
   *   Visa, Mastercard classic, Mastercard 2-series,
   *   Amex, Discover, JCB, unrecognized
   */

  it("covers Visa detection", () => {
    expect(detectCardType("4111111111111111")).toBe("visa");
  });

  it("covers Mastercard classic (51-55) detection", () => {
    expect(detectCardType("5500000000000004")).toBe("mastercard");
  });

  it("covers Mastercard 2-series (2221-2720) detection", () => {
    expect(detectCardType("2223000048400011")).toBe("mastercard");
  });

  it("covers Amex detection", () => {
    expect(detectCardType("340000000000009")).toBe("amex");
  });

  it("covers Discover detection", () => {
    expect(detectCardType("6011000000000004")).toBe("discover");
  });

  it("covers JCB detection", () => {
    expect(detectCardType("3530111333300000")).toBe("jcb");
  });

  it("covers unrecognized prefix returns null", () => {
    expect(detectCardType("9999999999999999")).toBeNull();
  });
});
