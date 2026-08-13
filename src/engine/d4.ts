import { Vector3 } from "three";
import type { NumberedFace } from "./numbering";
import type { DieType } from "./types";

function vertexKey(v: Vector3): string {
  const q = (n: number) => Math.round(n * 1000) / 1000;
  return `${q(v.x)},${q(v.y)},${q(v.z)}`;
}

export function usesVertexNumerals(type: DieType): boolean {
  return type === "d4";
}

/** Map each tetrahedron vertex to the label of the face opposite it. */
export function tetraOppositeVertexLabels(faces: NumberedFace[]): Map<string, string> {
  const verts: Vector3[] = [];
  for (const face of faces) {
    for (const v of face.vertices) {
      if (!verts.some((u) => u.distanceToSquared(v) < 1e-6)) verts.push(v.clone());
    }
  }
  const map = new Map<string, string>();
  for (const face of faces) {
    const opposite = verts.find(
      (v) => !face.vertices.some((fv) => fv.distanceToSquared(v) < 1e-6),
    );
    if (opposite) map.set(vertexKey(opposite), face.label);
  }
  return map;
}

export interface CornerPlacement {
  label: string;
  ox: number;
  oy: number;
  rotation: number;
}

/**
 * Three numerals on a tetrahedron face, one at each vertex, rotated so
 * "up" points at that vertex (read the number at the point that is up).
 */
export function d4CornerPlacements(
  face: NumberedFace,
  labels: Map<string, string>,
  reach = 0.6,
): CornerPlacement[] {
  if (face.vertices.length < 3) return [];
  const corners = [...face.vertices].sort((a, b) => {
    const aa = Math.atan2(a.clone().sub(face.center).dot(face.bitangent), a.clone().sub(face.center).dot(face.tangent));
    const bb = Math.atan2(b.clone().sub(face.center).dot(face.bitangent), b.clone().sub(face.center).dot(face.tangent));
    return aa - bb;
  });
  return corners.map((v) => {
    const dir = v.clone().sub(face.center);
    const tx = dir.dot(face.tangent);
    const ty = dir.dot(face.bitangent);
    return {
      label: labels.get(vertexKey(v)) ?? face.label,
      ox: tx * reach,
      oy: ty * reach,
      rotation: (Math.atan2(tx, ty) * 180) / Math.PI,
    };
  });
}
