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

  it("keeps a counter open when it is a separate shape", () => {
    const outer = new Shape();
    outer.moveTo(-4, -6);
    outer.lineTo(4, -6);
    outer.lineTo(4, 6);
    outer.lineTo(-4, 6);
    outer.closePath();
    const inner = new Shape();
    inner.moveTo(-1.5, -2);
    inner.lineTo(1.5, -2);
    inner.lineTo(1.5, 2);
    inner.lineTo(-1.5, 2);
    inner.closePath();
    const geom = letterDecalGeometry([outer, inner], 0.12)!;
    const pos = geom.getAttribute("position");
    const covers = (x: number, y: number) => {
      for (let i = 0; i < pos.count; i += 3) {
        const ax = pos.getX(i);
        const ay = pos.getY(i);
        const bx = pos.getX(i + 1);
        const by = pos.getY(i + 1);
        const cx = pos.getX(i + 2);
        const cy = pos.getY(i + 2);
        const v0x = cx - ax;
        const v0y = cy - ay;
        const v1x = bx - ax;
        const v1y = by - ay;
        const v2x = x - ax;
        const v2y = y - ay;
        const dot00 = v0x * v0x + v0y * v0y;
        const dot01 = v0x * v1x + v0y * v1y;
        const dot02 = v0x * v2x + v0y * v2y;
        const dot11 = v1x * v1x + v1y * v1y;
        const dot12 = v1x * v2x + v1y * v2y;
        const inv = 1 / (dot00 * dot11 - dot01 * dot01);
        const u = (dot11 * dot02 - dot01 * dot12) * inv;
        const v = (dot00 * dot12 - dot01 * dot02) * inv;
        if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) return true;
      }
      return false;
    };
    expect(covers(0, 0)).toBe(false);
    expect(covers(3, 0)).toBe(true);
  });
});
