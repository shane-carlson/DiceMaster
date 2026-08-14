import {
  BufferGeometry,
  CylinderGeometry,
  Vector3,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { DieType, TokenShape } from "./types";
import { createTokenGeometry } from "./token";

const PHI = (1 + Math.sqrt(5)) / 2;

function scaleToSize(geometry: BufferGeometry, sizeMm: number): BufferGeometry {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  if (!bb) return geometry;
  const sx = bb.max.x - bb.min.x;
  const sy = bb.max.y - bb.min.y;
  const sz = bb.max.z - bb.min.z;
  const maxDim = Math.max(sx, sy, sz) || 1;
  const s = sizeMm / maxDim;
  geometry.scale(s, s, s);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/** Diameter of the bounding cylinder around the Y axis (equatorial girth). */
function equatorialDiameter(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (r > maxR) maxR = r;
  }
  return maxR * 2;
}

/** Make pole-to-pole height equal equatorial diameter, then fit to sizeMm. */
function scaleHeightToEquator(geometry: BufferGeometry, sizeMm: number): BufferGeometry {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  if (!bb) return geometry;
  const height = bb.max.y - bb.min.y || 1;
  const eq = equatorialDiameter(geometry) || 1;
  const xz = height / eq;
  geometry.scale(xz, 1, xz);
  return scaleToSize(geometry, sizeMm);
}

function scaleUniformToHeight(geometry: BufferGeometry, sizeMm: number): BufferGeometry {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  if (!bb) return geometry;
  const height = bb.max.y - bb.min.y || 1;
  const s = sizeMm / height;
  geometry.scale(s, s, s);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function hull(points: Vector3[], sizeMm: number): BufferGeometry {
  return scaleToSize(new ConvexGeometry(points.map((p) => p.clone())), sizeMm);
}

function hullToHeight(points: Vector3[], sizeMm: number): BufferGeometry {
  return scaleUniformToHeight(new ConvexGeometry(points.map((p) => p.clone())), sizeMm);
}

function hullEqualHeightAndEquator(points: Vector3[], sizeMm: number): BufferGeometry {
  return scaleHeightToEquator(new ConvexGeometry(points.map((p) => p.clone())), sizeMm);
}

const MIN_ROUNDING = 0.004;
const MAX_ROUNDING = 0.7;
/** Maps the 0–0.7 slider onto a fillet radius as a fraction of body size. */
const ROUNDING_RADIUS_FACTOR = 0.42;

function unitSphereSamples(): Vector3[] {
  return icosahedronVertices().map((v) => v.clone().normalize());
}

export function filletRadiusMm(sizeMm: number, amount: number): number {
  const t = Math.min(MAX_ROUNDING, Math.max(0, amount));
  return sizeMm * t * ROUNDING_RADIUS_FACTOR;
}

function vertexCentroid(verts: Vector3[]): Vector3 {
  const c = new Vector3();
  for (const v of verts) c.add(v);
  return c.multiplyScalar(1 / Math.max(verts.length, 1));
}

interface HullTri {
  a: Vector3;
  n: Vector3;
}

function convexTriangles(geometry: BufferGeometry): HullTri[] {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const out: HullTri[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  for (let t = 0; t < triCount; t++) {
    const ia = index ? index.getX(t * 3) : t * 3;
    const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.set(pos.getX(ia), pos.getY(ia), pos.getZ(ia));
    b.set(pos.getX(ib), pos.getY(ib), pos.getZ(ib));
    c.set(pos.getX(ic), pos.getY(ic), pos.getZ(ic));
    n.copy(b).sub(a);
    const cb = c.clone().sub(a);
    n.cross(cb);
    if (n.lengthSq() < 1e-16) continue;
    n.normalize();
    out.push({ a: a.clone(), n: n.clone() });
  }
  return out;
}

function convexInradius(tris: HullTri[], center: Vector3): number {
  let min = Infinity;
  for (const tri of tris) {
    const dist = tri.a.clone().sub(center).dot(tri.n);
    const d = Math.abs(dist);
    if (d > 1e-6 && d < min) min = d;
  }
  return min;
}

function uniqueDirections(dirs: Vector3[], epsDot = 0.995): Vector3[] {
  const out: Vector3[] = [];
  for (const d of dirs) {
    const n = d.clone().normalize();
    if (!out.some((u) => u.dot(n) > epsDot)) out.push(n);
  }
  return out;
}

/**
 * How far `point` sits inside a convex hull (positive = buried).
 * Used so preview glyphs stay on the face, not under the fillet.
 */
export function convexPenetration(geometry: BufferGeometry, point: Vector3): number {
  const tris = convexTriangles(geometry);
  if (tris.length === 0) return 0;
  let buried = Infinity;
  for (const tri of tris) {
    const outside = point.clone().sub(tri.a).dot(tri.n);
    buried = Math.min(buried, -outside);
  }
  return buried;
}

/**
 * Fillet a convex die without moving its face planes: inset vertices toward
 * the insphere, then take the convex hull of spheres at those points.
 * Scaling the expanded hull back to the AABB (the previous approach) pushed
 * faces past the sharp glyph planes and buried numerals, especially on D4s.
 */
export function roundConvexGeometry(
  geometry: BufferGeometry,
  amount: number,
  sizeMm: number,
): BufferGeometry {
  const t = Math.min(MAX_ROUNDING, Math.max(0, amount));
  if (t < MIN_ROUNDING) return geometry;
  const verts = uniqueVertices(geometry);
  // Skip dense meshes (the D2 cylinder) — those are already round.
  if (verts.length < 4 || verts.length > 48) return geometry;
  const requested = filletRadiusMm(sizeMm, t);
  if (requested < 1e-4) return geometry;
  const center = vertexCentroid(verts);
  const tris = convexTriangles(geometry);
  const inradius = convexInradius(tris, center);
  if (!Number.isFinite(inradius) || inradius < 0.4) return geometry;
  const r = Math.min(requested, inradius * 0.72);
  if (r < 1e-4) return geometry;
  const s = (inradius - r) / inradius;
  const inset = verts.map((v) =>
    new Vector3(
      center.x + (v.x - center.x) * s,
      center.y + (v.y - center.y) * s,
      center.z + (v.z - center.z) * s,
    ),
  );
  const samples = uniqueDirections([
    ...unitSphereSamples(),
    ...tris.map((tri) => tri.n),
  ]);
  const points: Vector3[] = [];
  for (const v of inset) {
    for (const d of samples) {
      points.push(new Vector3(v.x + d.x * r, v.y + d.y * r, v.z + d.z * r));
    }
  }
  const rounded = new ConvexGeometry(points);
  rounded.computeVertexNormals();
  return rounded;
}

function icosahedronVertices(): Vector3[] {
  const t = PHI;
  return [
    new Vector3(-1, t, 0),
    new Vector3(1, t, 0),
    new Vector3(-1, -t, 0),
    new Vector3(1, -t, 0),
    new Vector3(0, -1, t),
    new Vector3(0, 1, t),
    new Vector3(0, -1, -t),
    new Vector3(0, 1, -t),
    new Vector3(t, 0, -1),
    new Vector3(t, 0, 1),
    new Vector3(-t, 0, -1),
    new Vector3(-t, 0, 1),
  ];
}

function dodecahedronVertices(): Vector3[] {
  const t = PHI;
  const it = 1 / t;
  const pts: Vector3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        pts.push(new Vector3(x, y, z));
      }
    }
  }
  for (const a of [-it, it]) {
    for (const b of [-t, t]) {
      pts.push(new Vector3(0, a, b));
      pts.push(new Vector3(a, b, 0));
      pts.push(new Vector3(b, 0, a));
    }
  }
  return pts;
}

/** Regular tetrahedron sitting on a face, apex up (caltrop). */
function tetrahedronVertices(): Vector3[] {
  return [
    new Vector3(0, 1, 0),
    new Vector3(Math.sqrt(8 / 9), -1 / 3, 0),
    new Vector3(-Math.sqrt(2 / 9), -1 / 3, Math.sqrt(2 / 3)),
    new Vector3(-Math.sqrt(2 / 9), -1 / 3, -Math.sqrt(2 / 3)),
  ];
}

function cubeVertices(): Vector3[] {
  const pts: Vector3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        pts.push(new Vector3(x, y, z));
      }
    }
  }
  return pts;
}

function octahedronVertices(): Vector3[] {
  return [
    new Vector3(1, 0, 0),
    new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
  ];
}

function trapezohedronVertices(sides = 5): Vector3[] {
  const pts: Vector3[] = [];
  // Polar height 2 and equatorial cylinder diameter 2. ringY is chosen so
  // each kite (pole + two upper-ring verts + the lower-ring vert between
  // them) is planar — otherwise the convex hull folds and preview faces
  // can split apart at the apexes.
  const peak = 1;
  const radius = 1;
  const ringY = planarTrapezohedronRingY(sides, peak, radius);
  pts.push(new Vector3(0, peak, 0));
  pts.push(new Vector3(0, -peak, 0));
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides;
    pts.push(new Vector3(radius * Math.cos(a), ringY, radius * Math.sin(a)));
  }
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides + Math.PI / sides;
    pts.push(new Vector3(radius * Math.cos(a), -ringY, radius * Math.sin(a)));
  }
  return pts;
}

/** Ring height that makes N, U_i, L_i, U_{i+1} coplanar. */
function planarTrapezohedronRingY(sides: number, peak: number, radius: number): number {
  const step = (2 * Math.PI) / sides;
  const N = new Vector3(0, peak, 0);
  const U0 = (y: number) => new Vector3(radius, y, 0);
  const U1 = (y: number) =>
    new Vector3(radius * Math.cos(step), y, radius * Math.sin(step));
  const L0 = (y: number) =>
    new Vector3(radius * Math.cos(step / 2), -y, radius * Math.sin(step / 2));
  const volume = (y: number) =>
    U0(y)
      .sub(N)
      .dot(new Vector3().crossVectors(L0(y).clone().sub(N), U1(y).clone().sub(N)));
  let lo = 0;
  let hi = peak * 0.5;
  const v0 = volume(lo);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (volume(mid) * v0 > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Square prism with pyramidal caps — crystal-cut D4 (lands on 4 long faces). */
function crystalPrismVertices(): Vector3[] {
  const peak = 1.85;
  const ringY = 0.72;
  const r = 0.38;
  return [
    new Vector3(0, peak, 0),
    new Vector3(0, -peak, 0),
    new Vector3(r, ringY, r),
    new Vector3(r, ringY, -r),
    new Vector3(-r, ringY, r),
    new Vector3(-r, ringY, -r),
    new Vector3(r, -ringY, r),
    new Vector3(r, -ringY, -r),
    new Vector3(-r, -ringY, r),
    new Vector3(-r, -ringY, -r),
  ];
}

/** Elongated square bipyramid: long 4-sided body (~80%) + short 4-sided cap. */
function teardropVertices(): Vector3[] {
  const bottom = 0;
  const top = 1;
  const ringY = 0.8;
  const r = 0.24;
  return [
    new Vector3(0, bottom, 0),
    new Vector3(0, top, 0),
    new Vector3(r, ringY, r),
    new Vector3(r, ringY, -r),
    new Vector3(-r, ringY, r),
    new Vector3(-r, ringY, -r),
  ];
}

export function uniqueVertices(geometry: BufferGeometry, eps = 1e-5): Vector3[] {
  const pos = geometry.getAttribute("position");
  const out: Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (!out.some((u) => u.distanceToSquared(v) < eps * eps)) {
      out.push(v);
    }
  }
  return out;
}

export function createDieGeometry(
  type: DieType,
  sizeMm: number,
  tokenShape: TokenShape = "coin",
): BufferGeometry {
  switch (type) {
    case "d2": {
      const radius = sizeMm * 0.5;
      const height = Math.max(2.2, sizeMm * 0.14);
      const geom = new CylinderGeometry(radius, radius, height, 64, 1);
      geom.computeVertexNormals();
      return geom;
    }
    case "token":
      return createTokenGeometry(tokenShape, sizeMm);
    case "d4":
      return hullToHeight(tetrahedronVertices(), sizeMm);
    case "d4crystal":
      return hullToHeight(crystalPrismVertices(), sizeMm);
    case "d4teardrop":
      return hullToHeight(teardropVertices(), sizeMm);
    case "d6":
      return hull(cubeVertices(), sizeMm);
    case "d8":
      return hullEqualHeightAndEquator(octahedronVertices(), sizeMm);
    case "d10":
    case "d00":
      return hullEqualHeightAndEquator(trapezohedronVertices(5), sizeMm);
    case "d12":
      return hull(dodecahedronVertices(), sizeMm);
    case "d20":
      return hull(icosahedronVertices(), sizeMm);
  }
}
