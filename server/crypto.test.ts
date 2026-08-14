import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./crypto";

describe("password hashing", () => {
  it("accepts the original password and rejects another", () => {
    process.env.SCRYPT_N = "1024";
    const stored = hashPassword("obsidian8");
    expect(verifyPassword("obsidian8", stored)).toBe(true);
    expect(verifyPassword("obsidian9", stored)).toBe(false);
  });
});
