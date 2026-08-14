import { describe, it, expect } from "vitest";
import { parseNotation, rollNotation, type RandomFn } from "./dice.js";

// A deterministic "random" that always returns the max face value.
const maxRandom: RandomFn = (sides: number) => sides;
// A deterministic "random" that always returns 1.
const minRandom: RandomFn = () => 1;

describe("parseNotation", () => {
  it("parses a single implicit-count die", () => {
    const terms = parseNotation("d20");
    expect(terms).toHaveLength(1);
    expect(terms[0]).toMatchObject({ isDice: true, count: 1, sides: 20, sign: 1 });
  });

  it("parses counts, modifiers, and signs", () => {
    const terms = parseNotation("2d6+3-1d4");
    expect(terms).toHaveLength(3);
    expect(terms[0]).toMatchObject({ isDice: true, count: 2, sides: 6, sign: 1 });
    expect(terms[1]).toMatchObject({ isDice: false, value: 3, sign: 1 });
    expect(terms[2]).toMatchObject({ isDice: true, count: 1, sides: 4, sign: -1 });
  });

  it("ignores whitespace", () => {
    const terms = parseNotation("  4d8 - 1 ");
    expect(terms).toHaveLength(2);
    expect(terms[0]).toMatchObject({ count: 4, sides: 8 });
    expect(terms[1]).toMatchObject({ value: 1, sign: -1 });
  });

  it("rejects empty input", () => {
    expect(() => parseNotation("")).toThrow();
    expect(() => parseNotation("   ")).toThrow();
  });

  it("rejects garbage", () => {
    expect(() => parseNotation("hello")).toThrow();
    expect(() => parseNotation("2x6")).toThrow();
  });

  it("enforces safety limits", () => {
    expect(() => parseNotation("5000d6")).toThrow();
    expect(() => parseNotation("1d5000")).toThrow();
    expect(() => parseNotation("1d1")).toThrow();
  });
});

describe("rollNotation", () => {
  it("returns the max when every die shows its highest face", () => {
    const result = rollNotation("2d6+3", maxRandom);
    expect(result.total).toBe(15); // 6 + 6 + 3
    expect(result.terms[0].rolls).toEqual([6, 6]);
    expect(result.terms[0].subtotal).toBe(12);
    expect(result.terms[1].subtotal).toBe(3);
  });

  it("handles subtraction terms", () => {
    const result = rollNotation("2d6-1", maxRandom);
    expect(result.total).toBe(11); // 12 - 1
  });

  it("returns the min when every die shows 1", () => {
    const result = rollNotation("4d8-1", minRandom);
    expect(result.total).toBe(3); // 1+1+1+1 - 1
  });

  it("stays within the mathematically possible range", () => {
    for (let i = 0; i < 200; i++) {
      const { total } = rollNotation("3d6+2");
      expect(total).toBeGreaterThanOrEqual(5); // 3*1 + 2
      expect(total).toBeLessThanOrEqual(20); // 3*6 + 2
    }
  });
});
