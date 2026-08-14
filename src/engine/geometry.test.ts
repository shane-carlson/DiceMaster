import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  extractFaces,
  faceEdgeDistances,
  faceInradius,
  geometryFromFaces,
  glyphFitSize,
  polygonIncenter2,
} from "./faces";
import { createDieGeometry } from "./geometry";
import { numericLabel, numberFaces, oppositeSum } from "./numbering";
import type { DieType } from "./types";

const TYPES: DieType[] = ["d4", "d4crystal", "d6", "d8", "d10", "d00", "d12", "d20"];

const EXPECTED: Record<string, number> = {
  d4: 4,
  d4crystal: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d00: 10,
  d12: 12,
  d20: 20,
};

describe("polyhedral geometry", () => {
  for (const type of TYPES) {
    it(`${type} produces ${EXPECTED[type]} faces`, () => {
      const geom = createDieGeometry(type, 20);
      const faces = extractFaces(geom, type);
      expect(faces.length).toBe(EXPECTED[type]);
    });
  }

  it("d2 has two caps", () => {
    const geom = createDieGeometry("d2", 20);
    expect(extractFaces(geom, "d2")).toHaveLength(2);
  });

  it("d8 and d10 are as wide at the equator as they are tall", () => {
    for (const type of ["d8", "d10", "d00"] as const) {
      const geo = createDieGeometry(type, 16);
      const pos = geo.getAttribute("position");
      let minY = Infinity;
      let maxY = -Infinity;
      let maxR = 0;
      for (let i = 0; i < pos.count; i++) {
        minY = Math.min(minY, pos.getY(i));
        maxY = Math.max(maxY, pos.getY(i));
        maxR = Math.max(maxR, Math.hypot(pos.getX(i), pos.getZ(i)));
      }
      const height = maxY - minY;
      const equator = maxR * 2;
      expect(height).toBeCloseTo(16, 4);
      expect(equator).toBeCloseTo(height, 4);
    }
  });
});

describe("numbering", () => {
  it("pairs d6 faces so opposites sum to 7", () => {
    const geom = createDieGeometry("d6", 16);
    const faces = numberFaces("d6", extractFaces(geom, "d6"), "0-9");
    const sum = oppositeSum("d6", "0-9")!;
    for (const face of faces) {
      const opp = faces.find(
        (f) => f !== face && f.normal.dot(face.normal) < -0.85,
      );
      expect(opp).toBeTruthy();
      expect(numericLabel(face.label) + numericLabel(opp!.label)).toBe(sum);
    }
  });

  it("pairs d20 faces so opposites sum to 21", () => {
    const geom = createDieGeometry("d20", 20);
    const faces = numberFaces("d20", extractFaces(geom, "d20"), "0-9");
    expect(faces).toHaveLength(20);
    const sum = oppositeSum("d20", "0-9")!;
    const labels = faces.map((f) => numericLabel(f.label)).sort((a, b) => a - b);
    expect(labels[0]).toBe(1);
    expect(labels[19]).toBe(20);
    for (const face of faces) {
      const opp = faces.find((f) => f !== face && f.normal.dot(face.normal) < -0.85);
      expect(opp).toBeTruthy();
      expect(numericLabel(face.label) + numericLabel(opp!.label)).toBe(sum);
    }
  });

  it("d10 0-9 opposites sum to 9", () => {
    const geom = createDieGeometry("d10", 16);
    const faces = numberFaces("d10", extractFaces(geom, "d10"), "0-9");
    expect(faces).toHaveLength(10);
    for (const face of faces) {
      const opp = faces.find((f) => f !== face && f.normal.dot(face.normal) < -0.7);
      expect(opp).toBeTruthy();
      expect(numericLabel(face.label) + numericLabel(opp!.label)).toBe(9);
    }
  });
});

describe("glyph fit", () => {
  it("sizes D8 numerals inside the triangular inradius", () => {
    const geom = createDieGeometry("d8", 16);
    const faces = extractFaces(geom, "d8");
    expect(faces.length).toBe(8);
    for (const face of faces) {
      const r = faceInradius(face);
      const fit = glyphFitSize(face);
      expect(r).toBeGreaterThan(2);
      expect(fit).toBeLessThan(2 * r);
      expect(fit).toBeGreaterThan(r * 0.6);
    }
  });

  it("gives cube faces a larger fit than octahedron faces of the same die size", () => {
    const cube = extractFaces(createDieGeometry("d6", 16), "d6");
    const oct = extractFaces(createDieGeometry("d8", 16), "d8");
    const cubeFit = Math.min(...cube.map(glyphFitSize));
    const octFit = Math.max(...oct.map(glyphFitSize));
    expect(cubeFit).toBeGreaterThan(octFit);
    expect(Math.min(...cube.map(faceInradius))).toBeGreaterThan(7);
  });

  it("points every face normal outward", () => {
    for (const type of [...TYPES, "d2"] as const) {
      const faces = extractFaces(createDieGeometry(type, 16), type);
      for (const face of faces) {
        expect(face.center.dot(face.normal)).toBeGreaterThan(0.2);
      }
    }
  });
});

describe("face centers", () => {
  it("keeps equilateral D8 centers on the vertex centroid", () => {
    const faces = extractFaces(createDieGeometry("d8", 16), "d8");
    for (const face of faces) {
      expect(face.vertices.length).toBe(3);
      const centroid = new Vector3();
      for (const v of face.vertices) centroid.add(v);
      centroid.divideScalar(3);
      expect(face.center.distanceTo(centroid)).toBeLessThan(0.05);
      const dists = faceEdgeDistances(face);
      expect(Math.max(...dists) - Math.min(...dists)).toBeLessThan(0.05);
    }
  });

  it("places D10 numerals at the kite incenter", () => {
    const faces = extractFaces(createDieGeometry("d10", 16), "d10");
    expect(faces.length).toBe(10);
    for (const face of faces) {
      expect(face.vertices.length).toBe(4);
      const centroid = new Vector3();
      for (const v of face.vertices) centroid.add(v);
      centroid.divideScalar(4);
      expect(face.center.distanceTo(centroid)).toBeGreaterThan(0.2);
      const dists = faceEdgeDistances(face);
      expect(dists.length).toBe(4);
      expect(Math.max(...dists) - Math.min(...dists)).toBeLessThan(0.08);
    }
  });

  it("finds the incenter of a kite, not the diagonal crossing", () => {
    const kite = [
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    const c = polygonIncenter2(kite);
    const expectedY =
      (2 * Math.sqrt(2) - Math.sqrt(5)) / (Math.sqrt(2) + Math.sqrt(5));
    expect(c.x).toBeCloseTo(0, 5);
    expect(c.y).toBeCloseTo(expectedY, 5);
    expect(Math.abs(c.y)).toBeGreaterThan(0.05);
  });

  it("matches centroid and incenter on an equilateral triangle", () => {
    const h = Math.sqrt(3);
    const tri = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: h },
    ];
    const c = polygonIncenter2(tri);
    expect(c.x).toBeCloseTo(1, 6);
    expect(c.y).toBeCloseTo(h / 3, 6);
  });

  it("gives every triangle of a cube face the same normal", () => {
    const faces = extractFaces(createDieGeometry("d6", 16), "d6");
    const geom = geometryFromFaces(faces);
    expect(geom).toBeTruthy();
    const nrm = geom!.getAttribute("normal");
    const pos = geom!.getAttribute("position");
    expect(pos.count % 3).toBe(0);
    for (let t = 0; t < pos.count; t += 3) {
      const nx = nrm.getX(t);
      const ny = nrm.getY(t);
      const nz = nrm.getZ(t);
      expect(nrm.getX(t + 1)).toBeCloseTo(nx, 6);
      expect(nrm.getY(t + 1)).toBeCloseTo(ny, 6);
      expect(nrm.getZ(t + 1)).toBeCloseTo(nz, 6);
      expect(nrm.getX(t + 2)).toBeCloseTo(nx, 6);
      expect(nrm.getY(t + 2)).toBeCloseTo(ny, 6);
      expect(nrm.getZ(t + 2)).toBeCloseTo(nz, 6);
    }
  });

  it("keeps D10 and D% kite faces joined at the poles", () => {
    for (const type of ["d10", "d00"] as const) {
      const hull = createDieGeometry(type, 16);
      hull.computeBoundingBox();
      const bb = hull.boundingBox!;
      const faces = extractFaces(hull, type);
      expect(faces).toHaveLength(10);
      for (const face of faces) {
        expect(face.vertices.length).toBe(4);
      }
      const display = geometryFromFaces(faces);
      expect(display).toBeTruthy();
      const pos = display!.getAttribute("position");
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        minY = Math.min(minY, pos.getY(i));
        maxY = Math.max(maxY, pos.getY(i));
      }
      expect(maxY).toBeCloseTo(bb.max.y, 4);
      expect(minY).toBeCloseTo(bb.min.y, 4);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > maxY - 1e-3 || y < minY + 1e-3) {
          expect(pos.getX(i)).toBeCloseTo(0, 4);
          expect(pos.getZ(i)).toBeCloseTo(0, 4);
        }
      }
    }
  });
});
