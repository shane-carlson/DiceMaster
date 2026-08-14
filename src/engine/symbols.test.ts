import { describe, expect, it } from "vitest";
import { SYMBOL_GROUPS, SYMBOLS, symbolById, symbolsByCategory } from "./symbols";

describe("symbol library", () => {
  it("has unique ids", () => {
    const ids = SYMBOLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every group in the catalog", () => {
    const used = new Set(SYMBOLS.map((s) => s.category));
    for (const group of SYMBOL_GROUPS) {
      expect(used.has(group.label)).toBe(true);
    }
  });

  it("keeps known marks from the original vault", () => {
    for (const id of ["star", "skull", "dragon", "shield", "spark"]) {
      expect(symbolById(id)?.id).toBe(id);
    }
  });

  it("groups by category in catalog order", () => {
    const grouped = symbolsByCategory();
    expect(grouped.map((g) => g.category)).toEqual(SYMBOL_GROUPS.map((g) => g.label));
    expect(grouped.reduce((n, g) => n + g.symbols.length, 0)).toBe(SYMBOLS.length);
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(40);
  });
});
