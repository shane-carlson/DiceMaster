import { describe, expect, it } from "vitest";
import { Shape } from "three";
import { extrudeShapes, underscoreBar } from "./glyphs";
import { DEFAULT_DEPTH } from "./sizes";

describe("6/9 underscore", () => {
  const digit = { minX: -4, minY: -6, maxX: 4, maxY: 6 };

  it("tucks the bar just under the digit", () => {
    const bar = underscoreBar(digit);
    const h = digit.maxY - digit.minY;
    const w = digit.maxX - digit.minX;
    expect(bar.maxY).toBeLessThan(digit.minY);
    expect(digit.minY - bar.maxY).toBeLessThan(h * 0.1);
    expect(bar.maxX - bar.minX).toBeLessThan(w);
    expect(digit.minY - bar.minY).toBeLessThan(h * 0.2);
  });

  it("keeps the combined mark only slightly taller than the digit", () => {
    const bar = underscoreBar(digit);
    const digitH = digit.maxY - digit.minY;
    const combined = digit.maxY - bar.minY;
    expect(combined).toBeLessThan(digitH * 1.15);
    expect(combined).toBeGreaterThan(digitH);
  });
});

describe("engraved glyph wells", () => {
  it("extrudes inset marks from the face down to the default depth", () => {
    const depth = DEFAULT_DEPTH.standard;
    const s = new Shape();
    s.moveTo(-2, -2);
    s.lineTo(2, -2);
    s.lineTo(2, 2);
    s.lineTo(-2, 2);
    s.closePath();
    const geom = extrudeShapes([s], depth, "inset", true);
    expect(geom).toBeTruthy();
    geom!.computeBoundingBox();
    const bb = geom!.boundingBox!;
    expect(bb.max.z).toBeLessThan(0.05);
    expect(bb.min.z).toBeCloseTo(-depth, 2);

    const pos = geom!.getAttribute("position");
    let openingCaps = 0;
    let floorCaps = 0;
    for (let i = 0; i < pos.count; i += 3) {
      const z0 = pos.getZ(i);
      const z1 = pos.getZ(i + 1);
      const z2 = pos.getZ(i + 2);
      if (Math.abs(z0) < 0.03 && Math.abs(z1) < 0.03 && Math.abs(z2) < 0.03) openingCaps++;
      if (
        Math.abs(z0 + depth) < 0.03 &&
        Math.abs(z1 + depth) < 0.03 &&
        Math.abs(z2 + depth) < 0.03
      ) {
        floorCaps++;
      }
    }
    expect(openingCaps).toBe(0);
    expect(floorCaps).toBeGreaterThan(0);
  });
});
