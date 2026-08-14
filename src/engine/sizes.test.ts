import { describe, expect, it } from "vitest";
import { DEFAULT_BUMPER, defaultBumperSize } from "./sizes";

describe("defaultBumperSize", () => {
  it("uses the format chart, and standard for custom", () => {
    expect(defaultBumperSize("mini")).toBe(DEFAULT_BUMPER.mini);
    expect(defaultBumperSize("standard")).toBe(DEFAULT_BUMPER.standard);
    expect(defaultBumperSize("custom")).toBe(DEFAULT_BUMPER.standard);
  });
});
