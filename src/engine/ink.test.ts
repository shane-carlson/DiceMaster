import { describe, expect, it } from "vitest";
import { DIE_COLORS } from "./types";
import { contrastRatio, INK_DARK, INK_LIGHT, numeralInk } from "./ink";

describe("numeral ink", () => {
  it("uses parchment on dark pigments and dark ink on light ones", () => {
    expect(numeralInk("#3d7a5c")).toBe(INK_LIGHT);
    expect(numeralInk("#3a5a9a")).toBe(INK_LIGHT);
    expect(numeralInk("#ead7b0")).toBe(INK_DARK);
    expect(numeralInk("#c4893a")).toBe(INK_DARK);
  });

  it("keeps emblems gold", () => {
    expect(numeralInk("#3d7a5c", "emblem")).toBe("#f0d78a");
  });

  it("gives every default die color a readable ink", () => {
    for (const color of DIE_COLORS) {
      const ink = numeralInk(color);
      expect(ink === INK_LIGHT || ink === INK_DARK).toBe(true);
      expect(ink).not.toBe(color);
      expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(3);
    }
  });
});
