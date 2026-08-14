import { BufferGeometry, CylinderGeometry, Vector3 } from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { FaceKind, TokenShape } from "./types";
import { TOKEN_SHAPES } from "./types";

/** Face diameter of a newly added maker token (mm). */
export const TOKEN_DIAMETER_MM = 25;
/** Body thickness of every maker token (mm). Size changes diameter only. */
export const TOKEN_THICKNESS_MM = 3.5;
/** Symbol/logo AABB vs inscribed face diameter. Scale 1 fills this. */
export const TOKEN_MARK_FILL = 0.9;

export function isTokenMark(kind: FaceKind): boolean {
  return kind === "symbol" || kind === "logo";
}

/** Size slider max so symbols/logos on a token stop at 90% of the inscribed face. */
export function glyphSizeSliderMax(
  type: string,
  kind: FaceKind,
  role: "primary" | "emblem",
): number {
  if (type === "token" && isTokenMark(kind)) return 1;
  return role === "primary" ? 2.2 : 1.6;
}

export function isTokenShape(value: unknown): value is TokenShape {
  return typeof value === "string" && (TOKEN_SHAPES as readonly string[]).includes(value);
}

export function resolveTokenShape(value: unknown): TokenShape {
  return isTokenShape(value) ? value : "coin";
}

type OutlinePt = { x: number; z: number };

function regularPolygon(sides: number, startAngle = 0): OutlinePt[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = startAngle + (i / sides) * Math.PI * 2;
    return { x: Math.sin(a), z: -Math.cos(a) };
  });
}

/** Heater shield: semicircle top, point at the bottom. */
function heaterShield(arcSamples = 20): OutlinePt[] {
  const cx = 0;
  const cz = 0.38;
  const r = 0.88;
  const pts: OutlinePt[] = [];
  for (let i = 0; i <= arcSamples; i++) {
    const a = Math.PI - (i / arcSamples) * Math.PI;
    pts.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a) });
  }
  pts.push({ x: 0, z: -1.18 });
  return pts;
}

/** Vesica piscis — two circular arcs, pointed almond / lens. */
function almondLens(arcSamples = 18): OutlinePt[] {
  const c = 0.5;
  const r = 1;
  const alpha = Math.acos(c / r);
  const pts: OutlinePt[] = [];
  for (let i = 0; i <= arcSamples; i++) {
    const a = -alpha + (i / arcSamples) * 2 * alpha;
    pts.push({ x: -c + r * Math.cos(a), z: r * Math.sin(a) });
  }
  for (let i = 1; i < arcSamples; i++) {
    const a = Math.PI - alpha + (i / arcSamples) * 2 * alpha;
    pts.push({ x: c + r * Math.cos(a), z: r * Math.sin(a) });
  }
  return pts;
}

function diamondLozenge(): OutlinePt[] {
  return [
    { x: 0, z: -1 },
    { x: 0.62, z: 0 },
    { x: 0, z: 1 },
    { x: -0.62, z: 0 },
  ];
}

function tokenOutline(shape: TokenShape): OutlinePt[] {
  switch (shape) {
    case "hexagon":
      return regularPolygon(6);
    case "octagon":
      return regularPolygon(8);
    case "triangle":
      return regularPolygon(3);
    case "diamond":
      return diamondLozenge();
    case "shield":
      return heaterShield();
    case "almond":
      return almondLens();
    case "coin":
      return regularPolygon(48);
  }
}

function prismFromOutline(
  outline: OutlinePt[],
  diameterMm: number,
  thicknessMm: number,
): BufferGeometry {
  const maxR = Math.max(...outline.map((p) => Math.hypot(p.x, p.z)), 1e-6);
  const s = diameterMm / 2 / maxR;
  const h = thicknessMm / 2;
  const pts: Vector3[] = [];
  for (const p of outline) {
    pts.push(new Vector3(p.x * s, h, p.z * s), new Vector3(p.x * s, -h, p.z * s));
  }
  const geom = new ConvexGeometry(pts);
  geom.computeVertexNormals();
  return geom;
}

export function createTokenGeometry(
  shape: TokenShape,
  diameterMm: number,
  thicknessMm = TOKEN_THICKNESS_MM,
): BufferGeometry {
  const diameter = Math.max(diameterMm, 1);
  const thickness = Math.max(thicknessMm, 0.4);
  if (shape === "coin") {
    const geom = new CylinderGeometry(diameter / 2, diameter / 2, thickness, 64, 1);
    geom.computeVertexNormals();
    return geom;
  }
  return prismFromOutline(tokenOutline(shape), diameter, thickness);
}

export function tokenBounds(geometry: BufferGeometry): { diameter: number; thickness: number } {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const pos = geometry.getAttribute("position");
  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    maxR = Math.max(maxR, Math.hypot(pos.getX(i), pos.getZ(i)));
  }
  return {
    diameter: maxR * 2,
    thickness: bb.max.y - bb.min.y,
  };
}
