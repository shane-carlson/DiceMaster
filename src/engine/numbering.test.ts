import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { extractFaces } from "./faces";
import { createDieGeometry } from "./geometry";
import { numberFaces, numericLabel, oppositeSum } from "./numbering";

function numbered(type: Parameters<typeof numberFaces>[0], size = 16, style: "0-9" | "1-10" = "0-9") {
  return numberFaces(type, extractFaces(createDieGeometry(type, size), type), style);
}

function opposite(faces: ReturnType<typeof numbered>, face: (typeof faces)[0]) {
  let best: (typeof faces)[0] | undefined;
  let bestDot = Infinity;
  for (const f of faces) {
    if (f === face) continue;
    const dot = f.normal.dot(face.normal);
    if (dot < bestDot) {
      bestDot = dot;
      best = f;
    }
  }
  return best;
}

function pole(faces: ReturnType<typeof numbered>, sign: 1 | -1) {
  const verts: Vector3[] = [];
  for (const f of faces) {
    for (const v of f.vertices) {
      if (!verts.some((u) => u.distanceToSquared(v) < 1e-6)) verts.push(v.clone());
    }
  }
  let best = verts[0];
  for (const v of verts) {
    if (sign * v.y > sign * best.y) best = v;
  }
  return best;
}

function labelsAtPole(faces: ReturnType<typeof numbered>, sign: 1 | -1) {
  const p = pole(faces, sign);
  return faces
    .filter((f) => f.vertices.some((v) => v.distanceToSquared(p) < 1e-6))
    .map((f) => f.label)
    .sort();
}

describe("RPG numbering conventions", () => {
  it("uses a right-handed D6 (1-2-3 counterclockwise)", () => {
    const faces = numbered("d6");
    const n1 = faces.find((f) => f.label === "1")!.normal;
    const n2 = faces.find((f) => f.label === "2")!.normal;
    const n3 = faces.find((f) => f.label === "3")!.normal;
    expect(new Vector3().crossVectors(n1, n2).dot(n3)).toBeGreaterThan(0.5);
  });

  it("pairs every standard die so opposites sum to n+1", () => {
    const cases = [
      ["d6", 7],
      ["d8", 9],
      ["d10", 9],
      ["d00", 90],
      ["d12", 13],
      ["d20", 21],
    ] as const;
    for (const [type, sum] of cases) {
      const faces = numbered(type);
      expect(oppositeSum(type, "0-9")).toBe(sum);
      for (const face of faces) {
        const opp = opposite(faces, face);
        expect(opp).toBeTruthy();
        expect(numericLabel(face.label) + numericLabel(opp!.label)).toBe(sum);
      }
    }
  });

  it("puts odd D8 numbers around one pole and evens around the other", () => {
    const faces = numbered("d8");
    expect(labelsAtPole(faces, 1)).toEqual(["1", "3", "5", "7"]);
    expect(labelsAtPole(faces, -1)).toEqual(["2", "4", "6", "8"]);
  });

  it("puts odd D10 numbers around one pole and evens around the other", () => {
    const faces = numbered("d10");
    expect(labelsAtPole(faces, 1)).toEqual(["1", "3", "5", "7", "9"]);
    expect(labelsAtPole(faces, -1)).toEqual(["0", "2", "4", "6", "8"]);
  });

  it("pairs 1–10 D10 faces so opposites sum to 11", () => {
    const faces = numbered("d10", 16, "1-10");
    expect(oppositeSum("d10", "1-10")).toBe(11);
    for (const face of faces) {
      const opp = opposite(faces, face);
      expect(numericLabel(face.label) + numericLabel(opp!.label)).toBe(11);
    }
    expect(labelsAtPole(faces, 1)).toEqual(["1", "3", "5", "7", "9"]);
    expect(labelsAtPole(faces, -1)).toEqual(["10", "2", "4", "6", "8"].sort());
  });

  it("puts tens on D% with odds at one pole and evens at the other", () => {
    const faces = numbered("d00");
    expect(labelsAtPole(faces, 1)).toEqual(["10", "30", "50", "70", "90"]);
    expect(labelsAtPole(faces, -1)).toEqual(["00", "20", "40", "60", "80"]);
  });

  it("surrounds D12's 1 with 2–6 and places 12 opposite 1", () => {
    const faces = numbered("d12");
    const one = faces.find((f) => f.label === "1")!;
    const twelve = faces.find((f) => f.label === "12")!;
    expect(one.normal.dot(twelve.normal)).toBeLessThan(-0.85);
    const neighbors = faces.filter(
      (f) => f !== one && one.vertices.filter((v) => f.vertices.some((w) => w.distanceToSquared(v) < 1e-6)).length >= 2,
    );
    expect(neighbors.map((f) => f.label).sort()).toEqual(["2", "3", "4", "5", "6"]);
  });

  it("puts even D20 numbers at the north vertex and odds at the south", () => {
    const faces = numbered("d20");
    const north = labelsAtPole(faces, 1).map(Number);
    const south = labelsAtPole(faces, -1).map(Number);
    expect(north).toHaveLength(5);
    expect(south).toHaveLength(5);
    expect(north.every((n) => n % 2 === 0)).toBe(true);
    expect(south.every((n) => n % 2 === 1)).toBe(true);
    expect(north).toContain(20);
    expect(south).toContain(1);
  });

  it("points D8 and D10 numerals at the polar vertex of each face", () => {
    for (const type of ["d8", "d10"] as const) {
      const faces = numbered(type);
      for (const face of faces) {
        let polar = face.vertices[0];
        let best = -Infinity;
        for (const v of face.vertices) {
          if (Math.abs(v.y) > best) {
            best = Math.abs(v.y);
            polar = v;
          }
        }
        const toward = polar.clone().sub(face.center);
        toward.sub(face.normal.clone().multiplyScalar(toward.dot(face.normal)));
        expect(toward.length()).toBeGreaterThan(0.5);
        expect(face.bitangent.dot(toward.normalize())).toBeGreaterThan(0.85);
      }
    }
  });

  it("keeps D6 side numerals upright in world space", () => {
    const faces = numbered("d6");
    for (const label of ["2", "3", "4", "5"]) {
      const face = faces.find((f) => f.label === label)!;
      expect(Math.abs(face.normal.y)).toBeLessThan(0.2);
      expect(face.bitangent.dot(new Vector3(0, 1, 0))).toBeGreaterThan(0.85);
    }
  });
});
