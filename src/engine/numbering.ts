import { Vector3 } from "three";
import type { DieFace } from "./faces";
import type { DieType, D10Style } from "./types";
import { defaultLabels } from "./defaults";

const VERTEX_EPS_SQ = 1e-6;

function closestFace(faces: DieFace[], dir: Vector3): DieFace {
  let best = faces[0];
  let bestDot = -Infinity;
  for (const f of faces) {
    const d = f.normal.dot(dir);
    if (d > bestDot) {
      bestDot = d;
      best = f;
    }
  }
  return best;
}

function oppositeFace(faces: DieFace[], face: DieFace): DieFace | undefined {
  let best: DieFace | undefined;
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

function uniqueVertices(faces: DieFace[]): Vector3[] {
  const out: Vector3[] = [];
  for (const face of faces) {
    for (const v of face.vertices) {
      if (!out.some((u) => u.distanceToSquared(v) < VERTEX_EPS_SQ)) out.push(v.clone());
    }
  }
  return out;
}

function poleVertex(faces: DieFace[], sign: 1 | -1): Vector3 {
  const verts = uniqueVertices(faces);
  let best = verts[0] ?? new Vector3(0, sign, 0);
  for (const v of verts) {
    if (sign * v.y > sign * best.y) best = v;
  }
  return best;
}

function hasVertex(face: DieFace, pole: Vector3): boolean {
  return face.vertices.some((v) => v.distanceToSquared(pole) < VERTEX_EPS_SQ);
}

function facesAtVertex(faces: DieFace[], pole: Vector3): DieFace[] {
  return faces.filter((f) => hasVertex(f, pole));
}

/** Clockwise around `axis` when looking along the axis (right-hand). */
function sortAroundAxis(faces: DieFace[], axis: Vector3, origin: Vector3): DieFace[] {
  const n = axis.clone().normalize();
  let ref = new Vector3(1, 0, 0);
  if (Math.abs(n.dot(ref)) > 0.9) ref.set(0, 0, 1);
  const x = new Vector3().crossVectors(ref, n);
  if (x.lengthSq() < 1e-10) x.set(0, 0, 1);
  x.normalize();
  const y = new Vector3().crossVectors(n, x).normalize();
  return [...faces].sort((a, b) => {
    const da = a.center.clone().sub(origin);
    const db = b.center.clone().sub(origin);
    return Math.atan2(da.dot(y), da.dot(x)) - Math.atan2(db.dot(y), db.dot(x));
  });
}

function sharedVertexCount(a: DieFace, b: DieFace): number {
  let n = 0;
  for (const va of a.vertices) {
    if (b.vertices.some((vb) => va.distanceToSquared(vb) < VERTEX_EPS_SQ)) n += 1;
  }
  return n;
}

function edgeNeighbors(faces: DieFace[], face: DieFace): DieFace[] {
  return faces.filter((f) => f !== face && sharedVertexCount(f, face) >= 2);
}

export interface NumberedFace extends DieFace {
  label: string;
}

function numberPolarRing(
  numbered: NumberedFace[],
  faces: DieFace[],
  northLabels: string[],
  oppositeOf: (label: string) => string,
) {
  const byIndex = (face: DieFace) => numbered[face.index];
  const north = poleVertex(faces, 1);
  const ring = sortAroundAxis(facesAtVertex(faces, north), new Vector3(0, 1, 0), north);
  ring.forEach((face, i) => {
    const label = northLabels[i];
    if (!label) return;
    byIndex(face).label = label;
    const opp = oppositeFace(faces, face);
    if (opp) byIndex(opp).label = oppositeOf(label);
  });
}

export function numberFaces(
  type: DieType,
  faces: DieFace[],
  d10Style: D10Style,
): NumberedFace[] {
  const labels = defaultLabels(type, d10Style);
  const numbered: NumberedFace[] = faces.map((f) => ({ ...f, label: "" }));
  const byIndex = (face: DieFace) => numbered[face.index];

  if (type === "d6" && faces.length === 6) {
    const pY = closestFace(faces, new Vector3(0, 1, 0));
    const nY = closestFace(faces, new Vector3(0, -1, 0));
    const pZ = closestFace(faces, new Vector3(0, 0, 1));
    const nZ = closestFace(faces, new Vector3(0, 0, -1));
    const pX = closestFace(faces, new Vector3(1, 0, 0));
    const nX = closestFace(faces, new Vector3(-1, 0, 0));
    // Western right-handed: 1-2-3 meet counterclockwise (1 top, 2 front, 3 right).
    byIndex(pY).label = "1";
    byIndex(nY).label = "6";
    byIndex(pZ).label = "2";
    byIndex(nZ).label = "5";
    byIndex(pX).label = "3";
    byIndex(nX).label = "4";
  } else if (type === "d4" && faces.length === 4) {
    const verts = uniqueVertices(faces);
    const north = poleVertex(faces, 1);
    const base = verts
      .filter((v) => v.distanceToSquared(north) >= VERTEX_EPS_SQ)
      .sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z));
    const vertexLabel = new Map<string, string>();
    const key = (v: Vector3) => `${Math.round(v.x * 1e3)},${Math.round(v.y * 1e3)},${Math.round(v.z * 1e3)}`;
    vertexLabel.set(key(north), "4");
    base.forEach((v, i) => vertexLabel.set(key(v), String(i + 1)));
    for (const face of faces) {
      const opposite = verts.find(
        (v) => !face.vertices.some((fv) => fv.distanceToSquared(v) < VERTEX_EPS_SQ),
      );
      if (opposite) byIndex(face).label = vertexLabel.get(key(opposite)) ?? "1";
    }
  } else if (type === "d4crystal" || type === "d4teardrop") {
    // Numbered faces are ordered first (see extractFaces). Caps stay blank.
    for (let i = 0; i < Math.min(4, faces.length); i++) {
      byIndex(faces[i]).label = labels[i] ?? String(i + 1);
    }
  } else if (type === "d2") {
    faces.forEach((f, i) => {
      byIndex(f).label = labels[i] ?? String(i + 1);
    });
  } else if (type === "d8" && faces.length === 8) {
    numberPolarRing(numbered, faces, ["1", "3", "5", "7"], (n) => String(9 - Number(n)));
  } else if (type === "d10" && faces.length === 10) {
    if (d10Style === "1-10") {
      numberPolarRing(numbered, faces, ["1", "3", "5", "7", "9"], (n) => String(11 - Number(n)));
    } else {
      numberPolarRing(numbered, faces, ["1", "3", "5", "7", "9"], (n) => String(9 - Number(n)));
    }
  } else if (type === "d00" && faces.length === 10) {
    numberPolarRing(numbered, faces, ["10", "30", "50", "70", "90"], (n) => {
      const v = Number(n);
      const opp = 90 - v;
      return opp === 0 ? "00" : String(opp);
    });
  } else if (type === "d12" && faces.length === 12) {
    const top = closestFace(faces, new Vector3(0, 1, 0));
    const bottom = oppositeFace(faces, top)!;
    byIndex(top).label = "12";
    byIndex(bottom).label = "1";
    const around1 = sortAroundAxis(edgeNeighbors(faces, bottom), bottom.normal, bottom.center);
    around1.forEach((face, i) => {
      const low = String(i + 2);
      byIndex(face).label = low;
      const opp = oppositeFace(faces, face);
      if (opp) byIndex(opp).label = String(13 - Number(low));
    });
  } else if (type === "d20" && faces.length === 20) {
    const north = poleVertex(faces, 1);
    const cap = sortAroundAxis(facesAtVertex(faces, north), new Vector3(0, 1, 0), north);
    const capEvens = ["20", "2", "8", "14", "18"];
    cap.forEach((face, i) => {
      const even = capEvens[i];
      if (!even) return;
      byIndex(face).label = even;
      const opp = oppositeFace(faces, face);
      if (opp) byIndex(opp).label = String(21 - Number(even));
    });
    const leftover = faces.filter((f) => !byIndex(f).label);
    const waistNorth = leftover
      .filter((f) => {
        const opp = oppositeFace(faces, f);
        return !opp || f.center.y >= opp.center.y;
      })
      .sort((a, b) => {
        const aa = Math.atan2(a.center.x, a.center.z);
        const ab = Math.atan2(b.center.x, b.center.z);
        return aa - ab;
      });
    const waistEvens = ["16", "12", "10", "6", "4"];
    waistNorth.forEach((face, i) => {
      const even = waistEvens[i];
      if (!even) return;
      byIndex(face).label = even;
      const opp = oppositeFace(faces, face);
      if (opp) byIndex(opp).label = String(21 - Number(even));
    });
  }

  numbered.forEach((f, i) => {
    if (!f.label) f.label = labels[i] ?? (i < labels.length ? String(i + 1) : "");
  });
  return numbered;
}

export function oppositeSum(type: DieType, d10Style: D10Style): number | null {
  switch (type) {
    case "d6":
      return 7;
    case "d8":
      return 9;
    case "d10":
      return d10Style === "0-9" ? 9 : 11;
    case "d00":
      return 90;
    case "d12":
      return 13;
    case "d20":
      return 21;
    default:
      return null;
  }
}

export function numericLabel(label: string): number {
  if (label === "00") return 0;
  const n = Number(label);
  return Number.isFinite(n) ? n : NaN;
}
