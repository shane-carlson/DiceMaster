import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createDie } from "./defaults";
import { createDieGeometry } from "./geometry";
import { TOKEN_THICKNESS_MM } from "./token";
import {
  orientForScaffoldSupports,
  printFootprint,
  PRINT_TILT_RAD,
  sitOnBuildPlate,
  toSlicerZUp,
} from "./printLayout";
import { packFootprints, slotsHaveClearance, STANDARD_RESIN_PLATE } from "./packPlate";
import type { DieType } from "./types";

function maxAbsNy(geom: ReturnType<typeof createDieGeometry>): number {
  const pos = geom.getAttribute("position");
  const index = geom.getIndex();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  let max = 0;
  const tris = index ? index.count / 3 : pos.count / 3;
  for (let t = 0; t < tris; t++) {
    const ia = index ? index.getX(t * 3) : t * 3;
    const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.set(pos.getX(ia), pos.getY(ia), pos.getZ(ia));
    b.set(pos.getX(ib), pos.getY(ib), pos.getZ(ib));
    c.set(pos.getX(ic), pos.getY(ic), pos.getZ(ic));
    n.copy(b).sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-16) continue;
    n.normalize();
    max = Math.max(max, Math.abs(n.y));
  }
  return max;
}

describe("resin print orientation", () => {
  const polyhedra: DieType[] = ["d4", "d6", "d8", "d10", "d00", "d12", "d20", "d4crystal", "d4teardrop"];

  for (const type of polyhedra) {
    it(`stands ${type} on a vertex and tilts faces off the plate`, () => {
      const geom = createDieGeometry(type, 20);
      orientForScaffoldSupports(geom, type);
      geom.computeBoundingBox();
      const bb = geom.boundingBox!;
      expect(bb.min.y).toBeCloseTo(0, 4);
      expect(maxAbsNy(geom)).toBeLessThan(0.98);
      expect(maxAbsNy(geom)).toBeLessThan(Math.cos(PRINT_TILT_RAD * 0.25));
    });
  }

  it("stands tokens and coins on a rim, taller than they are thick", () => {
    for (const type of ["token", "d2"] as const) {
      const geom = createDieGeometry(type, 25);
      orientForScaffoldSupports(geom, type);
      const fp = printFootprint(geom);
      expect(fp.height).toBeGreaterThan(TOKEN_THICKNESS_MM * 3);
      expect(Math.min(fp.width, fp.depth)).toBeLessThan(fp.height * 0.7);
      geom.computeBoundingBox();
      expect(geom.boundingBox!.min.y).toBeCloseTo(0, 4);
    }
  });

  it("tilts a D4 so the opposite face is not horizontal", () => {
    const flat = createDieGeometry("d4", 18);
    sitOnBuildPlate(flat);
    expect(maxAbsNy(flat)).toBeGreaterThan(0.99);

    const tilted = createDieGeometry("d4", 18);
    orientForScaffoldSupports(tilted, "d4");
    expect(maxAbsNy(tilted)).toBeLessThan(0.98);
  });

  it("puts slicer STLs in the +XYZ octant with Z up", () => {
    const geom = createDieGeometry("d6", 16);
    orientForScaffoldSupports(geom, "d6");
    toSlicerZUp(geom);
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    expect(bb.min.x).toBeCloseTo(0, 4);
    expect(bb.min.y).toBeCloseTo(0, 4);
    expect(bb.min.z).toBeCloseTo(0, 4);
    expect(bb.max.z).toBeGreaterThan(bb.max.y * 0.5);
  });
});

describe("oriented plate packing", () => {
  it("fits a standard seven-piece set on a 140×90 mm plate after vertex-down", () => {
    const types: DieType[] = ["d4", "d6", "d8", "d10", "d00", "d12", "d20"];
    const items = types.map((type) => {
      const die = createDie(type, "standard");
      const geom = createDieGeometry(type, die.sizeMm);
      orientForScaffoldSupports(geom, type);
      const fp = printFootprint(geom);
      return { id: die.id, width: fp.width, depth: fp.depth };
    });
    const packed = packFootprints(items);
    expect(packed.slots).toHaveLength(7);
    expect(packed.fitsPlate).toBe(true);
    expect(packed.width).toBeLessThanOrEqual(STANDARD_RESIN_PLATE.width);
    expect(packed.depth).toBeLessThanOrEqual(STANDARD_RESIN_PLATE.depth);
    expect(slotsHaveClearance(packed.slots, STANDARD_RESIN_PLATE.gap)).toBe(true);
  });
});
