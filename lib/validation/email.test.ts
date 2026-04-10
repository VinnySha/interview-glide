import { describe, expect, it } from "vitest";
import { validateEmail, detectEmailTypo, emailWillBeLowercased } from "./email";

describe("email validation (VAL-201)", () => {
  /*
   * Testing strategy
   *
   * partition on format:
   *   valid email (user@domain.tld)
   *   missing @ sign
   *   missing TLD
   *
   * partition on TLD:
   *   known common TLD (.com, .org)
   *   edit distance 1 from a known TLD (typo)
   *   unknown TLD but not close to any known one
   *
   * partition on case:
   *   all lowercase
   *   contains uppercase (will be lowercased)
   */

  it("covers valid email with known TLD", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("covers missing @ sign, rejected", () => {
    expect(validateEmail("userexample.com")).toBe("Invalid email address");
  });

  it("covers missing TLD, rejected", () => {
    expect(validateEmail("user@example")).toBe("Invalid email address");
  });

  it("covers .con typo (edit distance 1 from .com), rejected with suggestion", () => {
    const result = validateEmail("user@example.con");
    expect(result).toContain(".com");
    expect(result).toContain(".con");
  });

  it("covers .orr typo (edit distance 1 from .org), rejected with suggestion", () => {
    const result = validateEmail("user@example.orr");
    expect(result).toContain(".org");
  });

  it("covers unknown TLD not close to any known one, accepted", () => {
    expect(validateEmail("user@example.museum")).toBe(true);
  });

  it("covers valid .org TLD, accepted", () => {
    expect(validateEmail("user@example.org")).toBe(true);
  });
});

describe("detectEmailTypo", () => {
  it("covers known TLD returns null", () => {
    expect(detectEmailTypo("user@example.com")).toBeNull();
  });

  it("covers typo TLD returns suggestion", () => {
    expect(detectEmailTypo("user@example.con")).toContain(".com");
  });

  it("covers unrelated unknown TLD returns null", () => {
    expect(detectEmailTypo("user@example.museum")).toBeNull();
  });
});

describe("emailWillBeLowercased", () => {
  it("covers all lowercase, returns false", () => {
    expect(emailWillBeLowercased("user@example.com")).toBe(false);
  });

  it("covers contains uppercase, returns true", () => {
    expect(emailWillBeLowercased("TEST@Example.com")).toBe(true);
  });
});
