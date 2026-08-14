import { describe, expect, it } from "vitest";
import { extractFaces, pickFaceIndex } from "./faces";
import { createDieGeometry } from "./geometry";
import { numberFaces } from "./numbering";
import type { DieType } from "./types";

describe("pickFaceIndex", () => {
  const types: DieType[] = ["d6", "d8", "d12", "d20"];

  for (const type of types) {
    it(`selects each ${type} face from a hit on that face`, () => {
      const geom = createDieGeometry(type, 20);
      const faces = numberFaces(type, extractFaces(geom, type), "0-9");
      geom.dispose();
      expect(faces.length).toBeGreaterThan(0);
      for (const face of faces) {
        const hit = face.center.clone().add(face.normal.clone().multiplyScalar(0.35));
        expect(pickFaceIndex(hit, faces)).toBe(face.index);
      }
    });
  }

  it("does not jump from a D20 face to a far neighbor when the hit is near the face center", () => {
    const geom = createDieGeometry("d20", 20);
    const faces = numberFaces("d20", extractFaces(geom, "d20"), "0-9");
    geom.dispose();
    const face = faces.find((f) => f.label === "7") ?? faces[6];
    const hit = face.center.clone().add(face.normal.clone().multiplyScalar(0.5));
    expect(pickFaceIndex(hit, faces)).toBe(face.index);
  });
});
