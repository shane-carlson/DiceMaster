import {
  BufferGeometry,
  CylinderGeometry,
  Vector3,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { DieType } from "./types";

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

export function createDieGeometry(type: DieType, sizeMm: number): BufferGeometry {
  switch (type) {
    case "d2": {
      const radius = sizeMm * 0.5;
      const height = Math.max(2.2, sizeMm * 0.14);
      const geom = new CylinderGeometry(radius, radius, height, 64, 1);
      geom.computeVertexNormals();
      return geom;
    }
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
