import { describe, expect, it } from "vitest";
import { cutterPlacement, defaultCarveDepth, resolveCarveDepth } from "./carve";
import { createDie } from "./defaults";
import { DEFAULT_DEPTH } from "./sizes";

describe("carve depth", () => {
  it("uses the size-format default on a new die", () => {
    expect(createDie("d20").engravingDepth).toBe(DEFAULT_DEPTH.standard);
    expect(createDie("d6", "mini").engravingDepth).toBe(DEFAULT_DEPTH.mini);
    expect(createDie("d8", "chonk").engravingDepth).toBe(DEFAULT_DEPTH.chonk);
    expect(createDie("d12", "giant").engravingDepth).toBe(DEFAULT_DEPTH.giant);
  });

  it("falls back to the format default when depth is missing or invalid", () => {
    const die = createDie("d6", "standard");
    expect(resolveCarveDepth({ ...die, engravingDepth: 0 })).toBe(DEFAULT_DEPTH.standard);
    expect(resolveCarveDepth({ ...die, engravingDepth: Number.NaN })).toBe(DEFAULT_DEPTH.standard);
    expect(resolveCarveDepth(die, null)).toBe(die.engravingDepth);
    expect(resolveCarveDepth(die, 1.1)).toBe(1.1);
  });

  it("places the engrave cutter floor at -depth", () => {
    const depth = defaultCarveDepth("standard");
    const { height, zOffset } = cutterPlacement(depth, "engrave");
    expect(zOffset - height / 2).toBeCloseTo(-depth, 6);
    expect(zOffset + height / 2).toBeGreaterThan(0.05);
  });

  it("places the emboss cutter top at +depth", () => {
    const depth = defaultCarveDepth("standard");
    const { height, zOffset } = cutterPlacement(depth, "emboss");
    expect(zOffset + height / 2).toBeCloseTo(depth, 6);
  });
});
