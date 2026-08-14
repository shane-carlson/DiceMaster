import {
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  ShapePath,
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
  const probe = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
  probe.computeBoundingBox();
  const bb = probe.boundingBox;
  probe.dispose();
  if (!bb) return null;
  return { minX: bb.min.x, minY: bb.min.y, maxX: bb.max.x, maxY: bb.max.y };
}

function scaleShapes(shapes: Shape[], scale: number): Shape[] {
  return shapes.map((shape) => {
    const next = new Shape();
    const pts = shape.getPoints(20);
    const holes = shape.holes.map((hole) => hole.getPoints(20));
    if (pts.length === 0) return shape;
    next.moveTo(pts[0].x * scale, pts[0].y * scale);
    for (let i = 1; i < pts.length; i++) {
      next.lineTo(pts[i].x * scale, pts[i].y * scale);
    }
    next.closePath();
    for (const holePts of holes) {
      if (holePts.length === 0) continue;
      const hole = new Shape();
      hole.moveTo(holePts[0].x * scale, holePts[0].y * scale);
      for (let i = 1; i < holePts.length; i++) {
        hole.lineTo(holePts[i].x * scale, holePts[i].y * scale);
      }
      hole.closePath();
      next.holes.push(hole);
    }
    return next;
  });
}

export type GlyphZAlign = "center" | "inset" | "outset";

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
  return shapes.map((shape) => ({
    outer: shift(shape.getPoints(divisions)),
    holes: shape.holes.map((hole) => shift(hole.getPoints(Math.max(8, divisions - 4)))),
  }));
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
    const g = new ShapeGeometry(shape);
    g.translate(-cx, -cy, -depth);
    data.push(...collectPositions(g));
    g.dispose();
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
): BufferGeometry | null {
  if (shapes.length === 0) return null;
  const d = Math.max(depth, 0.08);
  const geom = new ExtrudeGeometry(shapes, {
    depth: d,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
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
    const floor = wellFloor(shapes, cx, cy, d);
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
  const geometry = extrudeShapes(scaled, depth, align, openFace);
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
