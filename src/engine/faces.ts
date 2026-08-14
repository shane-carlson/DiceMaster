import { BufferAttribute, BufferGeometry, Vector3 } from "three";
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

  if (type === "token") {
    up = new Vector3(0, 0, -1);
    if (Math.abs(n.dot(up)) > 0.92) {
      up = new Vector3(1, 0, 0);
    }
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  } else if (type === "d4teardrop" && vertices.length >= 3) {
    // Long body faces: point the numeral toward the cap (away from the sharp tip).
    let lowest = vertices[0];
    for (const v of vertices) {
      if (v.y < lowest.y) lowest = v;
    }
    up = center.clone().sub(lowest);
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  } else if (
    (type === "d10" || type === "d00" || type === "d4crystal") &&
    vertices.length >= 3
  ) {
    // Kite / crystal: point the numeral at the polar (sharp) vertex.
    let farthest = vertices[0];
    let best = -Infinity;
    for (const v of vertices) {
      const polar = Math.abs(v.y);
      const sharp = v.distanceToSquared(center);
      const score = polar * 1e3 + sharp;
      if (score > best) {
        best = score;
        farthest = v;
      }
    }
    up = farthest.clone().sub(center);
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  } else if (vertices.length === 3 || vertices.length >= 5) {
    // D8 / D12 / D20: point toward the polar vertex (base of the glyph
    // sits toward the equator) so the number reads upright at the pole.
    let top = vertices[0];
    let best = -Infinity;
    for (const v of vertices) {
      const polar = Math.abs(v.y);
      const sharp = v.distanceToSquared(center);
      const score = polar * 1e3 + sharp * 1e-4;
      if (score > best) {
        best = score;
        top = v;
      }
    }
    up = top.clone().sub(center);
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

  let faces: DieFace[] = [];
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
    const centroid = new Vector3();
    for (const v of vertices) centroid.add(v);
    centroid.divideScalar(vertices.length || 1);
    if (centroid.dot(normal) < 0) normal.negate();

    let area = 0;
    for (const tri of group) {
      area +=
        tri.b.clone().sub(tri.a).cross(tri.c.clone().sub(tri.a)).length() * 0.5;
    }

    const seed = makeFrame(type, centroid, normal, vertices);
    const center =
      type === "d4teardrop"
        ? centroid.clone()
        : visualCenter(vertices, centroid, seed.tangent, seed.bitangent);
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

  if (type === "d4crystal" && faces.length > 4) {
    const ranked = [...faces].sort(
      (a, b) => Math.abs(a.normal.y) - Math.abs(b.normal.y),
    );
    const equatorial = ranked
      .slice(0, 4)
      .sort(
        (a, b) =>
          Math.atan2(a.center.x, a.center.z) - Math.atan2(b.center.x, b.center.z),
      );
    const eqSet = new Set(equatorial);
    const caps = faces.filter((f) => !eqSet.has(f));
    faces = [...equatorial, ...caps];
  }

  if (type === "d4teardrop" && faces.length > 4) {
    let south = faces[0]?.vertices[0];
    for (const face of faces) {
      for (const v of face.vertices) {
        if (!south || v.y < south.y) south = v;
      }
    }
    const body = faces.filter((f) =>
      f.vertices.some((v) => v.distanceToSquared(south) < 1e-8),
    );
    const bodySorted = [...body].sort(
      (a, b) =>
        Math.atan2(a.center.x, a.center.z) - Math.atan2(b.center.x, b.center.z),
    );
    const bodySet = new Set(bodySorted);
    const caps = faces.filter((f) => !bodySet.has(f));
    faces = [...bodySorted, ...caps];
  }

  if (type === "token" && faces.length > 2) {
    const caps = [...faces]
      .sort((a, b) => Math.abs(b.normal.y) - Math.abs(a.normal.y))
      .slice(0, 2)
      .sort((a, b) => b.center.y - a.center.y);
    faces = caps;
  }

  faces.forEach((f, idx) => {
    f.index = idx;
  });
  return faces;
}

type Pt2 = { x: number; y: number };

function project2D(
  vertices: Vector3[],
  origin: Vector3,
  tangent: Vector3,
  bitangent: Vector3,
): Pt2[] {
  return vertices.map((v) => {
    const d = v.clone().sub(origin);
    return { x: d.dot(tangent), y: d.dot(bitangent) };
  });
}

function monotoneHull2D(pts: Pt2[]): Pt2[] {
  const sorted = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (sorted.length <= 2) return sorted;

  const cross = (o: Pt2, a: Pt2, p: Pt2) =>
    (a.x - o.x) * (p.y - o.y) - (a.y - o.y) * (p.x - o.x);

  const lower: Pt2[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Convex outline of a face in its tangent/bitangent plane, CCW around the center. */
export function faceOutline2D(face: DieFace): { x: number; y: number }[] {
  const pts = project2D(face.vertices, face.center, face.tangent, face.bitangent);
  if (pts.length <= 2) return pts;
  const hull = monotoneHull2D(pts);
  if (hull.length >= 3) return hull;
  return [...pts].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
}

/** World-space convex outline using the original vertices (not flattened
 *  onto the tangent plane — that opened holes at D10 / D% poles). */
export function faceOutline3D(face: DieFace): Vector3[] {
  if (face.vertices.length <= 2) return face.vertices.map((v) => v.clone());
  const ordered = [...face.vertices].sort((a, b) => {
    const da = a.clone().sub(face.center);
    const db = b.clone().sub(face.center);
    const aa = Math.atan2(da.dot(face.bitangent), da.dot(face.tangent));
    const ab = Math.atan2(db.dot(face.bitangent), db.dot(face.tangent));
    return aa - ab;
  });
  return ordered.map((v) => v.clone());
}

export function faceCircumradius(face: DieFace): number {
  let r = 0;
  for (const v of face.vertices) r = Math.max(r, v.distanceTo(face.center));
  return r;
}

/** Display mesh: one constant normal per logical face so quads don't show a diagonal crease. */
export function geometryFromFaces(faces: DieFace[]): BufferGeometry | null {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const face of faces) {
    const ring = faceOutline3D(face);
    if (ring.length < 3) continue;
    const n = face.normal;
    const origin = ring[0];
    for (let i = 1; i < ring.length - 1; i++) {
      const b = ring[i];
      const c = ring[i + 1];
      positions.push(origin.x, origin.y, origin.z, b.x, b.y, b.z, c.x, c.y, c.z);
      for (let k = 0; k < 3; k++) normals.push(n.x, n.y, n.z);
    }
  }
  if (positions.length < 9) return null;
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  return geom;
}

/** Face-fan mesh is only a closed solid when the rim faces are present too. */
export function canShadeFromFaces(faces: DieFace[]): boolean {
  return faces.filter((f) => f.vertices.length >= 3).length >= 4;
}

function triangleIncenter2(a: Pt2, b: Pt2, c: Pt2): Pt2 {
  const la = Math.hypot(b.x - c.x, b.y - c.y);
  const lb = Math.hypot(a.x - c.x, a.y - c.y);
  const lc = Math.hypot(a.x - b.x, a.y - b.y);
  const p = la + lb + lc;
  if (p < 1e-12) {
    return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
  }
  return {
    x: (la * a.x + lb * b.x + lc * c.x) / p,
    y: (la * a.y + lb * b.y + lc * c.y) / p,
  };
}

/** Center of the largest inscribed circle of a convex polygon. */
export function polygonIncenter2(poly: Pt2[]): Pt2 {
  if (poly.length === 0) return { x: 0, y: 0 };
  if (poly.length === 1) return { x: poly[0].x, y: poly[0].y };
  if (poly.length === 2) {
    return {
      x: (poly[0].x + poly[1].x) / 2,
      y: (poly[0].y + poly[1].y) / 2,
    };
  }

  let ring = poly;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) ring = [...poly].reverse();

  if (ring.length === 3) return triangleIncenter2(ring[0], ring[1], ring[2]);

  const n = ring.length;
  const edges = ring.map((p, i) => {
    const q = ring[(i + 1) % n];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { a: p, nx: -dy / len, ny: dx / len };
  });

  const dist = (pt: Pt2, e: (typeof edges)[0]) =>
    (pt.x - e.a.x) * e.nx + (pt.y - e.a.y) * e.ny;

  let best: Pt2 | null = null;
  let bestR = -1;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const e1 = edges[i];
        const e2 = edges[j];
        const e3 = edges[k];
        const a11 = e1.nx - e2.nx;
        const a12 = e1.ny - e2.ny;
        const a21 = e1.nx - e3.nx;
        const a22 = e1.ny - e3.ny;
        const b1 =
          e1.nx * e1.a.x +
          e1.ny * e1.a.y -
          (e2.nx * e2.a.x + e2.ny * e2.a.y);
        const b2 =
          e1.nx * e1.a.x +
          e1.ny * e1.a.y -
          (e3.nx * e3.a.x + e3.ny * e3.a.y);
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) < 1e-12) continue;
        const pt = {
          x: (b1 * a22 - a12 * b2) / det,
          y: (a11 * b2 - b1 * a21) / det,
        };
        const r = dist(pt, e1);
        if (r <= 1e-8) continue;
        if (edges.some((e) => dist(pt, e) < r - 1e-4)) continue;
        if (r > bestR) {
          bestR = r;
          best = pt;
        }
      }
    }
  }

  if (!best) {
    const c = { x: 0, y: 0 };
    for (const p of ring) {
      c.x += p.x;
      c.y += p.y;
    }
    c.x /= ring.length;
    c.y /= ring.length;
    return c;
  }
  return best;
}

function visualCenter(
  vertices: Vector3[],
  centroid: Vector3,
  tangent: Vector3,
  bitangent: Vector3,
): Vector3 {
  if (vertices.length < 3) return centroid.clone();
  const hull = monotoneHull2D(project2D(vertices, centroid, tangent, bitangent));
  if (hull.length < 3) return centroid.clone();
  const mid = polygonIncenter2(hull);
  return centroid
    .clone()
    .addScaledVector(tangent, mid.x)
    .addScaledVector(bitangent, mid.y);
}

/** Distance from the face center to each convex-hull edge. */
export function faceEdgeDistances(face: DieFace): number[] {
  const hull = convexHull2D(face);
  if (hull.length < 2) return [];
  const c = face.center;
  const dists: number[] = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const ab = b.clone().sub(a);
    const ap = c.clone().sub(a);
    const len = ab.length();
    if (len < 1e-9) continue;
    dists.push(ab.clone().cross(ap).length() / len);
  }
  return dists;
}

/** Distance from face center to the nearest boundary edge. */
export function faceInradius(face: DieFace): number {
  if (face.vertices.length < 3) {
    return Math.sqrt(Math.max(face.area, 0.01) / Math.PI);
  }
  const hull = convexHull2D(face);
  let peri = 0;
  for (let i = 0; i < hull.length; i++) {
    peri += hull[i].distanceTo(hull[(i + 1) % hull.length]);
  }
  if (peri < 1e-6) return 0.5;
  return (2 * face.area) / peri;
}

/**
 * Inradius of the remaining flat face after an edge fillet of `filletMm`.
 * A cube face insets by ~r; this is a conservative planar-circle bound.
 */
export function facePlanarInradius(face: DieFace, filletMm = 0): number {
  const r = faceInradius(face);
  if (!(r > 0)) return 0.5;
  const cut = Math.max(0, filletMm);
  if (cut < 1e-6) return r;
  return Math.max(r - cut, r * 0.14);
}

/** Scale placements toward the face center so they stay on the remaining flat. */
export function roundingReachScale(face: DieFace, filletMm = 0): number {
  const r = faceInradius(face);
  if (!(r > 0)) return 1;
  return facePlanarInradius(face, filletMm) / r;
}

/** Max glyph AABB so the mark sits inside the face with a margin. */
export function glyphFitSize(face: DieFace, filletMm = 0, fillOverride?: number): number {
  const r = facePlanarInradius(face, filletMm);
  if (!Number.isFinite(r) || r <= 0) return 4;
  const n = face.vertices.length;
  const fill =
    typeof fillOverride === "number"
      ? fillOverride
      : n <= 3
        ? 0.56
        : n === 4
          ? 0.68
          : 0.62;
  return 2 * r * fill;
}

function convexHull2D(face: DieFace): Vector3[] {
  const t = face.tangent;
  const b = face.bitangent;
  const c = face.center;
  const pts = face.vertices.map((v) => {
    const d = v.clone().sub(c);
    return { v, x: d.dot(t), y: d.dot(b) };
  });
  pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (pts.length <= 2) return face.vertices.map((v) => v.clone());

  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    p: { x: number; y: number },
  ) => (a.x - o.x) * (p.y - o.y) - (a.y - o.y) * (p.x - o.x);

  const lower: typeof pts = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper].map((p) => p.v.clone());
}

export function triangleToFaceMap(faces: DieFace[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const face of faces) {
    for (const t of face.triangleIndices) map.set(t, face.index);
  }
  return map;
}

/**
 * Which logical face a local-space hit belongs to.
 * Convex dice are centered at the origin, so the face whose outward normal
 * best matches the hit direction is the one that was clicked — including on
 * rounded shells, where plane-distance ties at vertices pick the wrong neighbor.
 */
export function pickFaceIndex(localPoint: Vector3, faces: DieFace[]): number | null {
  if (faces.length === 0) return null;
  let best = faces[0].index;
  let bestScore = -Infinity;
  for (const face of faces) {
    const score = localPoint.dot(face.normal);
    if (score > bestScore) {
      bestScore = score;
      best = face.index;
    }
  }
  return best;
}

