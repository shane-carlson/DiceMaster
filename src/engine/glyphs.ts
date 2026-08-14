import {
  BufferAttribute,
  BufferGeometry,
  Path,
  Shape,
  ShapePath,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import type { Font } from "opentype.js";
import { symbolById } from "./symbols";
import type { GlyphSettings, LogoAsset } from "./types";

export function shapesFromFont(font: Font, text: string, size: number): Shape[] {
  if (!text) return [];
  const path = font.getPath(text, 0, 0, size);
  const bb = path.getBoundingBox();
  const ox = Number.isFinite((bb.x1 + bb.x2) / 2) ? (bb.x1 + bb.x2) / 2 : 0;
  const oy = Number.isFinite((bb.y1 + bb.y2) / 2) ? (bb.y1 + bb.y2) / 2 : 0;
  const sx = (x: number) => x - ox;
  const sy = (y: number) => -(y - oy);
  const shapePath = new ShapePath();
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(sx(cmd.x), sy(cmd.y));
        break;
      case "L":
        shapePath.lineTo(sx(cmd.x), sy(cmd.y));
        break;
      case "C":
        shapePath.bezierCurveTo(
          sx(cmd.x1),
          sy(cmd.y1),
          sx(cmd.x2),
          sy(cmd.y2),
          sx(cmd.x),
          sy(cmd.y),
        );
        break;
      case "Q":
        shapePath.quadraticCurveTo(sx(cmd.x1), sy(cmd.y1), sx(cmd.x), sy(cmd.y));
        break;
      case "Z":
        if (shapePath.currentPath) shapePath.currentPath.closePath();
        break;
      default:
        break;
    }
  }
  return shapePath.toShapes(true);
}

export function shapesFromSvgPath(d: string, viewBox = 100): Shape[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}"><path d="${d}" fill="black"/></svg>`;
  const loader = new SVGLoader();
  const data = loader.parse(svg);
  const shapes: Shape[] = [];
  for (const p of data.paths) {
    shapes.push(...SVGLoader.createShapes(p));
  }
  for (const shape of shapes) {
    const pts = shape.getPoints();
    shape.curves = [];
    if (pts.length === 0) continue;
    const first = pts[0];
    shape.moveTo(first.x, viewBox - first.y);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i].x, viewBox - pts[i].y);
    }
    shape.closePath();
  }
  return shapes.filter((s) => s.getPoints().length > 2);
}

function shapesFromSvgMarkup(markup: string): Shape[] {
  const wrapped = markup.includes("<svg")
    ? markup
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${markup}</svg>`;
  const loader = new SVGLoader();
  const data = loader.parse(wrapped);
  const shapes: Shape[] = [];
  for (const p of data.paths) {
    shapes.push(...SVGLoader.createShapes(p));
  }
  return shapes;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function shapesFromPngDataUrl(dataUrl: string, resolution = 64): Shape[] {
  if (typeof document === "undefined") return [];
  const img = new Image();
  img.src = dataUrl;
  // Synchronous path only works when cached; callers should prefer async helper.
  if (!img.complete || img.naturalWidth === 0) return [];
  return rasterToShapes(img, resolution);
}

export function rasterToShapes(
  img: CanvasImageSource & { width?: number; naturalWidth?: number },
  resolution = 72,
): Shape[] {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, resolution, resolution);
  ctx.drawImage(img, 0, 0, resolution, resolution);
  const { data } = ctx.getImageData(0, 0, resolution, resolution);
  const shapes: Shape[] = [];
  const cell = 1;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const i = (y * resolution + x) * 4;
      const a = data[i + 3];
      const lum = luminance(data[i], data[i + 1], data[i + 2]);
      const ink = a > 24 && lum < 140;
      if (!ink) continue;
      const px = x - resolution / 2;
      const py = resolution / 2 - y;
      const s = new Shape();
      s.moveTo(px, py);
      s.lineTo(px + cell, py);
      s.lineTo(px + cell, py - cell);
      s.lineTo(px, py - cell);
      s.closePath();
      shapes.push(s);
    }
  }
  return shapes;
}

export async function pngDataUrlToShapes(
  dataUrl: string,
  resolution = 72,
): Promise<Shape[]> {
  const img = await loadImage(dataUrl);
  return rasterToShapes(img, resolution);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export interface Rect2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Tight 6/9 discriminator, tucked under the digit instead of below the face. */
export function underscoreBar(digit: Rect2): Rect2 {
  const w = Math.max(digit.maxX - digit.minX, 1e-6);
  const h = Math.max(digit.maxY - digit.minY, 1e-6);
  const cx = (digit.minX + digit.maxX) / 2;
  const barH = h * 0.06;
  const gap = h * 0.05;
  const halfW = w * 0.38;
  const top = digit.minY - gap;
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    maxY: top,
    minY: top - barH,
  };
}

function rectShape(r: Rect2): Shape {
  const s = new Shape();
  s.moveTo(r.minX, r.maxY);
  s.lineTo(r.maxX, r.maxY);
  s.lineTo(r.maxX, r.minY);
  s.lineTo(r.minX, r.minY);
  s.closePath();
  return s;
}

function shapesBBox(shapes: Shape[]): Rect2 | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    const rings = shapeRings(shape, 12);
    if (!rings) continue;
    const visit = (pts: Vector2[]) => {
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    };
    visit(rings.outer);
    for (const hole of rings.holes) visit(hole);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

function uniqueRing(points: Vector2[], eps = 1e-5): Vector2[] {
  const ring: Vector2[] = [];
  const e2 = eps * eps;
  for (const p of points) {
    const prev = ring[ring.length - 1];
    if (prev && prev.distanceToSquared(p) < e2) continue;
    ring.push(p.clone());
  }
  if (ring.length > 1 && ring[0].distanceToSquared(ring[ring.length - 1]) < e2) {
    ring.pop();
  }
  return ring;
}

function ringToPath(target: Path, points: Vector2[]) {
  target.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    target.lineTo(points[i].x, points[i].y);
  }
  target.closePath();
}

export function shapeRings(
  shape: Shape,
  divisions = 16,
): { outer: Vector2[]; holes: Vector2[][] } | null {
  const extracted = shape.extractPoints(divisions);
  const outer = uniqueRing(extracted.shape);
  if (outer.length < 3) return null;
  if (ShapeUtils.isClockWise(outer)) outer.reverse();
  const holes: Vector2[][] = [];
  for (const holePts of extracted.holes) {
    const hole = uniqueRing(holePts);
    if (hole.length < 3) continue;
    if (!ShapeUtils.isClockWise(hole)) hole.reverse();
    holes.push(hole);
  }
  return { outer, holes };
}

/**
 * Drop duplicate close-points and force CCW solids / CW holes.
 * Duplicate contour vertices make earcut return no lids, which yields an open
 * tube that CSG cannot punch through a die face.
 */
export function sanitizeShape(shape: Shape, divisions = 16): Shape | null {
  const rings = shapeRings(shape, divisions);
  if (!rings) return null;
  const next = new Shape();
  ringToPath(next, rings.outer);
  for (const hole of rings.holes) {
    const path = new Path();
    ringToPath(path, hole);
    next.holes.push(path);
  }
  return next;
}

function scaleShapes(shapes: Shape[], scale: number): Shape[] {
  return shapes
    .map((shape) => {
      const rings = shapeRings(shape, 20);
      if (!rings) return null;
      const next = new Shape();
      ringToPath(
        next,
        rings.outer.map((p) => new Vector2(p.x * scale, p.y * scale)),
      );
      for (const hole of rings.holes) {
        const path = new Path();
        ringToPath(
          path,
          hole.map((p) => new Vector2(p.x * scale, p.y * scale)),
        );
        next.holes.push(path);
      }
      return next;
    })
    .filter((shape): shape is Shape => !!shape);
}

function pushTri(
  verts: number[],
  a: Vector2,
  b: Vector2,
  c: Vector2,
  z: number,
) {
  verts.push(a.x, a.y, z, b.x, b.y, z, c.x, c.y, z);
}

function pushWallRing(verts: number[], ring: Vector2[], z0: number, z1: number) {
  let i = ring.length;
  while (--i >= 0) {
    const j = i;
    const k = i - 1 < 0 ? ring.length - 1 : i - 1;
    const a = ring[j];
    const b = ring[k];
    verts.push(a.x, a.y, z0, b.x, b.y, z0, a.x, a.y, z1);
    verts.push(b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z1);
  }
}

function extrudeRings(outer: Vector2[], holes: Vector2[][], depth: number): number[] {
  const verts: number[] = [];
  const faces = ShapeUtils.triangulateShape(outer, holes);
  const all = outer.concat(...holes);
  for (const face of faces) {
    const a = all[face[0]];
    const b = all[face[1]];
    const c = all[face[2]];
    if (!a || !b || !c) continue;
    pushTri(verts, c, b, a, 0);
    pushTri(verts, a, b, c, depth);
  }
  pushWallRing(verts, outer, 0, depth);
  for (const hole of holes) pushWallRing(verts, hole, 0, depth);
  return verts;
}

function ringArea(pts: Vector2[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    area += p.x * q.y - q.x * p.y;
  }
  return area / 2;
}

function pointInRing(x: number, y: number, ring: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function collectRings(shapes: Shape[], divisions: number): Vector2[][] {
  const rings: Vector2[][] = [];
  for (const shape of shapes) {
    const extracted = shape.extractPoints(divisions);
    const outer = uniqueRing(extracted.shape);
    if (outer.length >= 3) rings.push(outer);
    for (const holePts of extracted.holes) {
      const hole = uniqueRing(holePts);
      if (hole.length >= 3) rings.push(hole);
    }
  }
  return rings;
}

/** Nest smaller contours inside larger ones so counters (4, 6, 8, 9, 0) stay open. */
export function nestFillRings(rings: Vector2[][]): { outer: Vector2[]; holes: Vector2[][] }[] {
  const items = rings
    .filter((pts) => pts.length >= 3)
    .map((pts) => ({ pts, area: Math.abs(ringArea(pts)) }))
    .sort((a, b) => b.area - a.area);
  const groups: { outer: Vector2[]; holes: Vector2[][] }[] = [];
  for (const item of items) {
    const sample = item.pts[0];
    let parent: { outer: Vector2[]; holes: Vector2[][] } | null = null;
    for (const group of groups) {
      if (pointInRing(sample.x, sample.y, group.outer)) parent = group;
    }
    if (parent) parent.holes.push(item.pts);
    else groups.push({ outer: item.pts, holes: [] });
  }
  for (const group of groups) {
    if (ShapeUtils.isClockWise(group.outer)) group.outer.reverse();
    for (const hole of group.holes) {
      if (!ShapeUtils.isClockWise(hole)) hole.reverse();
    }
  }
  return groups;
}

/**
 * Font Path.toShapes sometimes stores the outline as a hole. Use the largest
 * ring as the outer fill and keep only smaller rings as counters.
 */
export function fillRings(
  shape: Shape,
  divisions = 16,
): { outer: Vector2[]; holes: Vector2[][] } | null {
  const nested = nestFillRings(collectRings([shape], divisions));
  return nested[0] ?? null;
}

/** Single-sided letter fill sitting at z, with no walls or coplanar back cap. */
export function letterDecalGeometry(
  shapes: Shape[],
  z = 0.12,
  curveSegments = 8,
): BufferGeometry | null {
  if (shapes.length === 0) return null;
  const divisions = Math.max(12, curveSegments);
  const prepared = nestFillRings(collectRings(shapes, divisions));
  if (prepared.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const visit = (p: Vector2) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };
  for (const ring of prepared) {
    ring.outer.forEach(visit);
    for (const hole of ring.holes) hole.forEach(visit);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const verts: number[] = [];
  for (const ring of prepared) {
    const faces = ShapeUtils.triangulateShape(ring.outer, ring.holes);
    const all = ring.outer.concat(...ring.holes);
    for (const face of faces) {
      const a = all[face[0]];
      const b = all[face[1]];
      const c = all[face[2]];
      if (!a || !b || !c) continue;
      verts.push(a.x - cx, a.y - cy, z, b.x - cx, b.y - cy, z, c.x - cx, c.y - cy, z);
    }
  }
  if (verts.length < 9) return null;
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  geom.computeVertexNormals();
  return geom;
}

export type GlyphZAlign = "center" | "inset" | "outset" | "decal";

export interface GlyphShapeContours {
  outer: { x: number; y: number }[];
  holes: { x: number; y: number }[][];
}

/** Drop triangles that lie entirely on a z-plane (the opening cap of a well). */
export function stripCapAtZ(geom: BufferGeometry, zTarget: number, epsilon = 0.03): void {
  const pos = geom.getAttribute("position");
  if (!pos) return;
  const kept: number[] = [];
  const visit = (i0: number, i1: number, i2: number) => {
    const z0 = pos.getZ(i0);
    const z1 = pos.getZ(i1);
    const z2 = pos.getZ(i2);
    if (
      Math.abs(z0 - zTarget) < epsilon &&
      Math.abs(z1 - zTarget) < epsilon &&
      Math.abs(z2 - zTarget) < epsilon
    ) {
      return;
    }
    kept.push(
      pos.getX(i0),
      pos.getY(i0),
      z0,
      pos.getX(i1),
      pos.getY(i1),
      z1,
      pos.getX(i2),
      pos.getY(i2),
      z2,
    );
  };
  const idx = geom.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) visit(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  } else {
    for (let i = 0; i < pos.count; i += 3) visit(i, i + 1, i + 2);
  }
  if (kept.length < 9) return;
  geom.setIndex(null);
  geom.setAttribute("position", new BufferAttribute(new Float32Array(kept), 3));
  geom.computeVertexNormals();
}

export function contoursFromShapes(
  shapes: Shape[],
  dx: number,
  dy: number,
  divisions = 16,
): GlyphShapeContours[] {
  const shift = (pts: Vector2[]) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  const out: GlyphShapeContours[] = [];
  for (const shape of shapes) {
    const rings = shapeRings(shape, divisions);
    if (!rings) continue;
    out.push({
      outer: shift(rings.outer),
      holes: rings.holes.map(shift),
    });
  }
  return out;
}

function collectPositions(geom: BufferGeometry): number[] {
  const pos = geom.getAttribute("position");
  const out: number[] = [];
  if (!pos) return out;
  const push = (i: number) => out.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  const idx = geom.index;
  if (idx) {
    for (let i = 0; i < idx.count; i++) push(idx.getX(i));
  } else {
    for (let i = 0; i < pos.count; i++) push(i);
  }
  return out;
}

function wellFloor(shapes: Shape[], cx: number, cy: number, depth: number): BufferGeometry {
  const data: number[] = [];
  for (const shape of shapes) {
    const rings = shapeRings(shape, 12);
    if (!rings) continue;
    const faces = ShapeUtils.triangulateShape(rings.outer, rings.holes);
    const all = rings.outer.concat(...rings.holes);
    for (const face of faces) {
      const a = all[face[0]];
      const b = all[face[1]];
      const c = all[face[2]];
      if (!a || !b || !c) continue;
      data.push(
        a.x - cx,
        a.y - cy,
        -depth,
        b.x - cx,
        b.y - cy,
        -depth,
        c.x - cx,
        c.y - cy,
        -depth,
      );
    }
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(data), 3));
  return geom;
}

export function extrudeShapes(
  shapes: Shape[],
  depth: number,
  align: GlyphZAlign = "center",
  openFace = false,
  curveSegments = 8,
): BufferGeometry | null {
  if (shapes.length === 0) return null;
  const d = Math.max(depth, 0.08);
  const divisions = Math.max(12, curveSegments);
  const verts: number[] = [];
  const cleaned: Shape[] = [];
  for (const shape of shapes) {
    const rings = shapeRings(shape, divisions);
    if (!rings) continue;
    const extruded = extrudeRings(rings.outer, rings.holes, d);
    if (extruded.length < 9) continue;
    verts.push(...extruded);
    const asShape = sanitizeShape(shape, divisions);
    if (asShape) cleaned.push(asShape);
  }
  if (verts.length < 9) return null;
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return geom;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  if (align === "inset") geom.translate(-cx, -cy, -d);
  else if (align === "outset") geom.translate(-cx, -cy, 0);
  else geom.translate(-cx, -cy, -d / 2);
  if (openFace) {
    stripCapAtZ(geom, 0);
    stripCapAtZ(geom, -d);
    const floor = wellFloor(cleaned.length ? cleaned : shapes, cx, cy, d);
    const merged = collectPositions(geom).concat(collectPositions(floor));
    floor.dispose();
    if (merged.length >= 9) {
      geom.setIndex(null);
      geom.setAttribute("position", new BufferAttribute(new Float32Array(merged), 3));
    }
  }
  geom.computeVertexNormals();
  return geom;
}

export interface GlyphBuild {
  geometry: BufferGeometry;
  width: number;
  height: number;
  contours: GlyphShapeContours[];
}

export async function buildGlyphGeometry(
  glyph: GlyphSettings,
  font: Font,
  logos: LogoAsset[],
  targetSize: number,
  depth: number,
  align: GlyphZAlign = "center",
  openFace = false,
  curveSegments = 8,
): Promise<GlyphBuild | null> {
  if (glyph.kind === "blank") return null;
  let shapes: Shape[] = [];

  if (glyph.kind === "symbol" && glyph.symbolId) {
    const def = symbolById(glyph.symbolId);
    if (def) shapes = shapesFromSvgPath(def.path, def.viewBox);
  } else if (glyph.kind === "logo" && glyph.logoId) {
    const logo = logos.find((l) => l.id === glyph.logoId);
    if (logo?.kind === "svg") shapes = shapesFromSvgMarkup(logo.data);
    else if (logo?.kind === "png") shapes = await pngDataUrlToShapes(logo.data);
  } else if (glyph.text) {
    shapes = shapesFromFont(font, glyph.text, 100);
  }

  if (shapes.length === 0) return null;

  const extents = shapes.map((shape) => {
    const pts = shape.getPoints(8);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return Math.max(maxX - minX, maxY - minY, 0);
  });
  const median = [...extents].sort((a, b) => a - b)[Math.floor(extents.length / 2)] || 1;
  shapes = shapes.filter((_, i) => extents[i] < median * 8 && extents[i] > median * 0.01);
  if (shapes.length === 0) return null;

  if (glyph.underscore) {
    const digit = shapesBBox(shapes);
    if (digit) shapes.push(rectShape(underscoreBar(digit)));
  }

  const bb = shapesBBox(shapes);
  if (!bb) return null;
  const w = bb.maxX - bb.minX || 1;
  const h = bb.maxY - bb.minY || 1;
  const scale = (targetSize / Math.max(w, h)) * glyph.scale;
  const scaled = scaleShapes(shapes, scale);
  const scaledBb = shapesBBox(scaled);
  if (!scaledBb) return null;
  const cx = (scaledBb.minX + scaledBb.maxX) / 2;
  const cy = (scaledBb.minY + scaledBb.maxY) / 2;
  const contours = contoursFromShapes(scaled, -cx, -cy);
  const geometry =
    align === "decal"
      ? letterDecalGeometry(scaled, Math.max(depth, 0.08), curveSegments)
      : extrudeShapes(scaled, depth, align, openFace, curveSegments);
  if (!geometry) return null;
  return { geometry, width: w * scale, height: h * scale, contours };
}

export const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, 1],
    [1, -1],
  ],
  3: [
    [-1, 1],
    [0, 0],
    [1, -1],
  ],
  4: [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ],
  5: [
    [-1, 1],
    [1, 1],
    [0, 0],
    [-1, -1],
    [1, -1],
  ],
  6: [
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [1, 1],
    [1, 0],
    [1, -1],
  ],
};

export function pipPositions(value: number, span: number): Vector2[] {
  const layout = PIP_LAYOUTS[value];
  if (!layout) return [];
  return layout.map(([x, y]) => new Vector2(x * span, y * span));
}

export function circleContour(radius: number, segments = 20): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return pts;
}

export function faceBasisMatrix(
  tangent: Vector3,
  bitangent: Vector3,
  normal: Vector3,
): number[] {
  return [
    tangent.x,
    bitangent.x,
    normal.x,
    tangent.y,
    bitangent.y,
    normal.y,
    tangent.z,
    bitangent.z,
    normal.z,
  ];
}
