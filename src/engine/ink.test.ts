import { describe, expect, it } from "vitest";
import { DIE_COLORS } from "./types";
import { CARVE_FLOOR, numeralInk } from "./ink";

describe("numeral ink", () => {
  it("uses a grey well floor on every pigment", () => {
    expect(numeralInk("#3d7a5c")).toBe(CARVE_FLOOR);
    expect(numeralInk("#c4893a")).toBe(CARVE_FLOOR);
    expect(numeralInk("#ead7b0")).toBe(CARVE_FLOOR);
  });

  it("keeps emblems gold", () => {
    expect(numeralInk("#3d7a5c", "emblem")).toBe("#f0d78a");
  });

  it("gives every default die color the same carve floor", () => {
    for (const color of DIE_COLORS) {
      expect(numeralInk(color)).toBe(CARVE_FLOOR);
    }
  });
});
