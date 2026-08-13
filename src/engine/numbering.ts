import { Vector3 } from "three";
import type { DieFace } from "./faces";
import type { DieType, D10Style } from "./types";
import { defaultLabels } from "./defaults";

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

function pairOpposites(faces: DieFace[]): [DieFace, DieFace][] {
  const remaining = [...faces];
  const pairs: [DieFace, DieFace][] = [];
  while (remaining.length >= 2) {
    const a = remaining.shift()!;
    let bestI = 0;
    let bestDot = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dot = a.normal.dot(remaining[i].normal);
      if (dot < bestDot) {
        bestDot = dot;
        bestI = i;
      }
    }
    const b = remaining.splice(bestI, 1)[0];
    pairs.push([a, b]);
  }
  return pairs;
}

export interface NumberedFace extends DieFace {
  label: string;
}

export function numberFaces(
  type: DieType,
  faces: DieFace[],
  d10Style: D10Style,
): NumberedFace[] {
  const labels = defaultLabels(type, d10Style);
  const numbered: NumberedFace[] = faces.map((f) => ({ ...f, label: "" }));
  const byIndex = (face: DieFace) => numbered[face.index];

  const assignPair = (a: DieFace, b: DieFace, low: string, high: string) => {
    byIndex(a).label = low;
    byIndex(b).label = high;
  };

  if (type === "d6" && faces.length === 6) {
    const pY = closestFace(faces, new Vector3(0, 1, 0));
    const nY = closestFace(faces, new Vector3(0, -1, 0));
    const pZ = closestFace(faces, new Vector3(0, 0, 1));
    const nZ = closestFace(faces, new Vector3(0, 0, -1));
    const pX = closestFace(faces, new Vector3(1, 0, 0));
    const nX = closestFace(faces, new Vector3(-1, 0, 0));
    assignPair(pY, nY, "1", "6");
    assignPair(pZ, nZ, "2", "5");
    assignPair(pX, nX, "3", "4");
  } else if (type === "d4" || type === "d4crystal" || type === "d2") {
    faces.forEach((f, i) => {
      byIndex(f).label = labels[i] ?? String(i + 1);
    });
  } else {
    const pairs = pairOpposites(faces);
    const n = labels.length;
    pairs.forEach((pair, i) => {
      const low = labels[i] ?? String(i + 1);
      const high = labels[n - 1 - i] ?? String(n - i);
      const [a, b] = pair[0].center.y >= pair[1].center.y ? pair : [pair[1], pair[0]];
      assignPair(a, b, low, high);
    });
  }

  numbered.forEach((f, i) => {
    if (!f.label) f.label = labels[i] ?? String(i + 1);
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
