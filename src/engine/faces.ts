import { BufferGeometry, Vector3 } from "three";
import type { DieType } from "./types";

export interface DieFace {
  index: number;
  center: Vector3;
  normal: Vector3;
  vertices: Vector3[];
  tangent: Vector3;
  bitangent: Vector3;
  area: number;
  triangleIndices: number[];
}

function quantize(n: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function uniquePoints(points: Vector3[], eps = 1e-4): Vector3[] {
  const out: Vector3[] = [];
  for (const p of points) {
    if (!out.some((u) => u.distanceToSquared(p) < eps * eps)) out.push(p.clone());
  }
  return out;
}

function makeFrame(
  type: DieType,
  center: Vector3,
  normal: Vector3,
  vertices: Vector3[],
): { tangent: Vector3; bitangent: Vector3 } {
  const n = normal.clone().normalize();
  let up: Vector3;

  const useLongAxis = type === "d10" || type === "d00" || type === "d4crystal";
  if (useLongAxis && vertices.length >= 3) {
    let farthest = vertices[0];
    let best = 0;
    for (const v of vertices) {
      const d = v.distanceToSquared(center);
      if (d > best) {
        best = d;
        farthest = v;
      }
    }
    up = farthest.clone().sub(center);
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  } else {
    up = new Vector3(0, 1, 0);
    if (Math.abs(n.dot(up)) > 0.92) {
      up = new Vector3(0, 0, -1);
    }
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  }

  if (up.lengthSq() < 1e-8) {
    up = new Vector3(1, 0, 0);
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  }
  up.normalize();
  const tangent = new Vector3().crossVectors(up, n).normalize();
  const bitangent = new Vector3().crossVectors(n, tangent).normalize();
  return { tangent, bitangent };
}

function edgeKey(a: Vector3, b: Vector3): string {
  const qa = `${quantize(a.x, 4)},${quantize(a.y, 4)},${quantize(a.z, 4)}`;
  const qb = `${quantize(b.x, 4)},${quantize(b.y, 4)},${quantize(b.z, 4)}`;
  return qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`;
}

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent[pa] = pb;
  }
}

export function extractFaces(geometry: BufferGeometry, type: DieType): DieFace[] {
  if (type === "d2") {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const y = (bb.max.y - bb.min.y) / 2;
    const topN = new Vector3(0, 1, 0);
    const botN = new Vector3(0, -1, 0);
    const topC = new Vector3(0, y, 0);
    const botC = new Vector3(0, -y, 0);
    const topFrame = makeFrame(type, topC, topN, []);
    const botFrame = makeFrame(type, botC, botN, []);
    return [
      {
        index: 0,
        center: topC,
        normal: topN,
        vertices: [],
        ...topFrame,
        area: 1,
        triangleIndices: [],
      },
      {
        index: 1,
        center: botC,
        normal: botN,
        vertices: [],
        ...botFrame,
        area: 1,
        triangleIndices: [],
      },
    ];
  }

  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const vert = (i: number) => new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));

  const tris: {
    a: Vector3;
    b: Vector3;
    c: Vector3;
    normal: Vector3;
    triIndex: number;
  }[] = [];

  for (let t = 0; t < triCount; t++) {
    const ia = index ? index.getX(t * 3) : t * 3;
    const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    const a = vert(ia);
    const b = vert(ib);
    const c = vert(ic);
    const normal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (normal.lengthSq() < 1e-12) continue;
    normal.normalize();
    tris.push({ a, b, c, normal, triIndex: t });
  }

  const edges = new Map<string, number[]>();
  tris.forEach((tri, i) => {
    for (const [p, q] of [
      [tri.a, tri.b],
      [tri.b, tri.c],
      [tri.c, tri.a],
    ] as [Vector3, Vector3][]) {
      const k = edgeKey(p, q);
      const list = edges.get(k) ?? [];
      list.push(i);
      edges.set(k, list);
    }
  });

  const uf = new UnionFind(tris.length);
  const coplanar = type === "d10" || type === "d00" ? 0.82 : 0.97;
  for (const members of edges.values()) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const ta = tris[members[i]];
        const tb = tris[members[j]];
        if (ta.normal.dot(tb.normal) >= coplanar) uf.union(members[i], members[j]);
      }
    }
  }

  const groups = new Map<number, typeof tris>();
  tris.forEach((tri, i) => {
    const root = uf.find(i);
    const list = groups.get(root) ?? [];
    list.push(tri);
    groups.set(root, list);
  });

  const faces: DieFace[] = [];
  let i = 0;
  for (const group of groups.values()) {
    const normal = new Vector3();
    const points: Vector3[] = [];
    const triIndices: number[] = [];
    for (const tri of group) {
      normal.add(tri.normal);
      points.push(tri.a, tri.b, tri.c);
      triIndices.push(tri.triIndex);
    }
    normal.normalize();
    const vertices = uniquePoints(points);
    const center = new Vector3();
    for (const v of vertices) center.add(v);
    center.divideScalar(vertices.length || 1);

    let area = 0;
    for (const tri of group) {
      area +=
        tri.b.clone().sub(tri.a).cross(tri.c.clone().sub(tri.a)).length() * 0.5;
    }

    const { tangent, bitangent } = makeFrame(type, center, normal, vertices);
    faces.push({
      index: i,
      center,
      normal,
      vertices,
      tangent,
      bitangent,
      area,
      triangleIndices: triIndices,
    });
    i += 1;
  }

  faces.sort((a, b) => {
    const dy = b.center.y - a.center.y;
    if (Math.abs(dy) > 1e-6) return dy;
    const dx = a.center.x - b.center.x;
    if (Math.abs(dx) > 1e-6) return dx;
    return a.center.z - b.center.z;
  });
  faces.forEach((f, idx) => {
    f.index = idx;
  });
  return faces;
}

export function triangleToFaceMap(faces: DieFace[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const face of faces) {
    for (const t of face.triangleIndices) map.set(t, face.index);
  }
  return map;
}
