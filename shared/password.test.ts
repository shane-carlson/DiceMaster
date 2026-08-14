import { describe, expect, it } from "vitest";
import {
  inspectPassword,
  isPasswordAcceptable,
  passwordIssues,
  passwordScore,
} from "./password";

describe("password policy", () => {
  it("rejects short or simple secrets", () => {
    expect(isPasswordAcceptable("obsidian8")).toBe(false);
    expect(isPasswordAcceptable("Password1234")).toBe(false);
    expect(isPasswordAcceptable("password1234")).toBe(false);
    expect(passwordIssues("short").length).toBeGreaterThan(0);
  });

  it("accepts a mixed 12-character secret", () => {
    expect(isPasswordAcceptable("Obsidian#184")).toBe(true);
    expect(inspectPassword("Obsidian#184")).toEqual({
      length: true,
      lower: true,
      upper: true,
      digit: true,
      symbol: true,
      uncommon: true,
    });
    expect(passwordScore("Obsidian#184")).toBe(3);
  });

  it("scores longer mixed secrets as strong", () => {
    expect(passwordScore("ObsidianAnvil#1842")).toBe(4);
  });
});
