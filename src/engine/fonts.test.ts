import { describe, expect, it } from "vitest";
import { BUILTIN_FONTS, fontsByGroup } from "./fonts";

describe("builtin fonts", () => {
  it("ships at least 27 typefaces with unique ids", () => {
    expect(BUILTIN_FONTS.length).toBeGreaterThanOrEqual(27);
    expect(new Set(BUILTIN_FONTS.map((f) => f.id)).size).toBe(BUILTIN_FONTS.length);
    expect(new Set(BUILTIN_FONTS.map((f) => f.file)).size).toBe(BUILTIN_FONTS.length);
  });

  it("includes sci-fi and gamer families", () => {
    const groups = Object.fromEntries(fontsByGroup().map((g) => [g.id, g.fonts.length]));
    expect(groups.scifi).toBeGreaterThanOrEqual(8);
    expect(groups.gamer).toBeGreaterThanOrEqual(8);
    expect(groups.fantasy).toBeGreaterThanOrEqual(5);
    expect(groups.print).toBeGreaterThanOrEqual(4);
  });

  it("points every catalog entry at a /fonts TTF", () => {
    for (const font of BUILTIN_FONTS) {
      expect(font.file).toMatch(/^\/fonts\/.+\.ttf$/);
    }
  });
});
