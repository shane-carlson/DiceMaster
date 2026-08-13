import { describe, expect, it } from "vitest";
import { extractFaces } from "./faces";
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
