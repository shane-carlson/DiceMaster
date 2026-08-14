import { describe, expect, it } from "vitest";
import { Path, Shape } from "three";
import { extrudeShapes, letterDecalGeometry, underscoreBar } from "./glyphs";
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
    const geom = extrudeShapes([s], depth, "inset");
    expect(geom).toBeTruthy();
    geom!.computeBoundingBox();
    const bb = geom!.boundingBox!;
    expect(bb.max.z).toBeCloseTo(0, 2);
    expect(bb.min.z).toBeCloseTo(-depth, 2);
  });

  it("builds a closed solid with lid caps", () => {
    const s = new Shape();
    s.moveTo(-2, -3);
    s.lineTo(2, -3);
    s.lineTo(2, 3);
    s.lineTo(-2, 3);
    s.closePath();
    const depth = 2;
    const geom = extrudeShapes([s], depth, "center");
    expect(geom).toBeTruthy();
    geom!.computeBoundingBox();
    const bb = geom!.boundingBox!;
    expect(bb.max.z - bb.min.z).toBeCloseTo(depth, 5);
    const tris = geom!.getAttribute("position")!.count / 3;
    expect(tris).toBeGreaterThanOrEqual(12);
  });
});

describe("preview letter decals", () => {
  it("is a single plane with no walls", () => {
    const s = new Shape();
    s.moveTo(-2, -3);
    s.lineTo(2, -3);
    s.lineTo(2, 3);
    s.lineTo(-2, 3);
    s.closePath();
    const geom = letterDecalGeometry([s], 0.12)!;
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    expect(bb.max.z).toBeCloseTo(0.12, 5);
    expect(bb.min.z).toBeCloseTo(0.12, 5);
    expect(bb.max.x - bb.min.x).toBeCloseTo(4, 1);
  });

  it("uses an inverted hole as the letter outline", () => {
    const s = new Shape();
    s.moveTo(-0.4, -0.4);
    s.lineTo(0.4, -0.4);
    s.lineTo(0.4, 0.4);
    s.lineTo(-0.4, 0.4);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-3, -5);
    hole.lineTo(3, -5);
    hole.lineTo(3, 5);
    hole.lineTo(-3, 5);
    hole.closePath();
    s.holes.push(hole);
    const geom = letterDecalGeometry([s], 0.12)!;
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeGreaterThan(5);
    expect(bb.max.y - bb.min.y).toBeGreaterThan(8);
  });
});
