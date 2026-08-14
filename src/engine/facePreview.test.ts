import { describe, expect, it } from "vitest";
import { faceViewPose } from "./cameraFocus";
import { extractFaces } from "./faces";
import { previewFacesForSet } from "./facePreview";
import { createDie } from "./defaults";
import { createDieGeometry } from "./geometry";
import type { DieType } from "./types";

function isConvex(poly: { x: number; y: number }[]): boolean {
  if (poly.length < 3) return true;
  let sign = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const c = poly[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-8) continue;
    const s = Math.sign(cross);
    if (sign !== 0 && s !== sign) return false;
    sign = s;
  }
  return true;
}

describe("face editor outlines", () => {
  const types: DieType[] = ["d4", "d4crystal", "d4teardrop", "d6", "d8", "d10", "d00", "d12", "d20"];

  for (const type of types) {
    it(`${type} previews as a convex polygon`, () => {
      const die = createDie(type, "standard");
      const faces = previewFacesForSet([die]);
      expect(faces.length).toBeGreaterThan(0);
      for (const face of faces) {
        expect(isConvex(face.polygon)).toBe(true);
      }
    });
  }

  it("draws D12 faces as pentagons", () => {
    const die = createDie("d12", "standard");
    for (const face of previewFacesForSet([die])) {
      expect(face.polygon.length).toBe(5);
    }
  });

  it("draws D10 faces as kites", () => {
    const die = createDie("d10", "standard");
    for (const face of previewFacesForSet([die])) {
      expect(face.polygon.length).toBe(4);
    }
  });

  it("shows only the four landing faces of a crystal D4", () => {
    const die = createDie("d4crystal", "standard");
    const faces = previewFacesForSet([die]);
    expect(faces).toHaveLength(4);
    for (const face of faces) {
      expect(face.polygon.length).toBe(4);
    }
  });

  it("shows only the four long body faces of a teardrop D4", () => {
    const die = createDie("d4teardrop", "standard");
    const faces = previewFacesForSet([die]);
    expect(faces).toHaveLength(4);
    for (const face of faces) {
      expect(face.polygon.length).toBe(3);
    }
  });
});

describe("face camera pose", () => {
  it("looks along the face normal with up matching the numeral", () => {
    const faces = extractFaces(createDieGeometry("d8", 16), "d8");
    const pose = faceViewPose([10, 0, 0], faces[0], 16);
    const view = pose.target.clone().sub(pose.position).normalize();
    expect(view.dot(faces[0].normal)).toBeLessThan(-0.98);
    expect(Math.abs(pose.up.dot(faces[0].bitangent))).toBeGreaterThan(0.98);
    expect(Math.abs(pose.up.dot(faces[0].normal))).toBeLessThan(0.05);
  });

  it("rolls the camera so a rotated numeral sits upright", () => {
    const faces = extractFaces(createDieGeometry("d6", 16), "d6");
    const face = faces[0];
    const pose = faceViewPose([0, 0, 0], face, 16, 90);
    expect(pose.up.dot(face.tangent)).toBeGreaterThan(0.98);
    expect(Math.abs(pose.up.dot(face.bitangent))).toBeLessThan(0.05);
  });
});
