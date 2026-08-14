import { describe, expect, it } from "vitest";
import { d4CornerPlacements, tetraOppositeVertexLabels, usesVertexNumerals } from "./d4";
import { extractFaces } from "./faces";
import { createDieGeometry } from "./geometry";
import { numberFaces } from "./numbering";

describe("tetrahedron vertex numerals", () => {
  it("is used only on the regular D4", () => {
    expect(usesVertexNumerals("d4")).toBe(true);
    expect(usesVertexNumerals("d4crystal")).toBe(false);
    expect(usesVertexNumerals("d4teardrop")).toBe(false);
    expect(usesVertexNumerals("d8")).toBe(false);
  });

  it("puts three distinct numbers on each face, covering 1–4", () => {
    const faces = numberFaces("d4", extractFaces(createDieGeometry("d4", 18), "d4"), "0-9");
    const labels = tetraOppositeVertexLabels(faces);
    expect(labels.size).toBe(4);
    const seen = new Set<string>();
    for (const face of faces) {
      const corners = d4CornerPlacements(face, labels);
      expect(corners).toHaveLength(3);
      const texts = corners.map((c) => c.label);
      expect(new Set(texts).size).toBe(3);
      expect(texts.includes(face.label)).toBe(false);
      for (const t of texts) seen.add(t);
    }
    expect([...seen].sort()).toEqual(["1", "2", "3", "4"]);
  });

  it("places each corner toward its vertex, not the face center", () => {
    const faces = numberFaces("d4", extractFaces(createDieGeometry("d4", 18), "d4"), "0-9");
    const labels = tetraOppositeVertexLabels(faces);
    for (const face of faces) {
      for (const c of d4CornerPlacements(face, labels)) {
        expect(Math.hypot(c.ox, c.oy)).toBeGreaterThan(2);
      }
    }
  });

  it("orients each numeral toward its vertex the same way the face editor does", () => {
    const faces = numberFaces("d4", extractFaces(createDieGeometry("d4", 18), "d4"), "0-9");
    const labels = tetraOppositeVertexLabels(faces);
    for (const face of faces) {
      for (const c of d4CornerPlacements(face, labels)) {
        const θ = (c.rotation * Math.PI) / 180;
        // Face editor: rotate(-θ) in Y-up (tangent, bitangent). 3D glyphs use
        // the same sign, so local +Y lands on the vertex direction.
        const upX = Math.sin(θ);
        const upY = Math.cos(θ);
        const len = Math.hypot(c.ox, c.oy);
        expect((upX * c.ox + upY * c.oy) / len).toBeCloseTo(1, 5);
      }
    }
  });
});
