import {
  ExtrudeGeometry,
  Shape,
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
  const shapePath = new ShapePath();
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(cmd.x, -cmd.y);
        break;
      case "L":
        shapePath.lineTo(cmd.x, -cmd.y);
        break;
      case "C":
        shapePath.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y);
        break;
      case "Q":
        shapePath.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y);
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

function underscoreShape(width: number, y: number): Shape {
  const s = new Shape();
  const h = Math.max(0.08, width * 0.07);
  const w = width * 0.55;
  s.moveTo(-w, y);
  s.lineTo(w, y);
  s.lineTo(w, y - h);
  s.lineTo(-w, y - h);
  s.closePath();
  return s;
}

function centerAndExtrude(shapes: Shape[], depth: number): ExtrudeGeometry | null {
  if (shapes.length === 0) return null;
  const geom = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 6,
    steps: 1,
  });
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return geom;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  geom.translate(-cx, -cy, -depth / 2);
  geom.computeVertexNormals();
  return geom;
}

export interface GlyphBuild {
  geometry: ExtrudeGeometry;
  width: number;
  height: number;
}

export async function buildGlyphGeometry(
  glyph: GlyphSettings,
  font: Font,
  logos: LogoAsset[],
  targetSize: number,
  depth: number,
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

  const probe = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
  probe.computeBoundingBox();
  const bb = probe.boundingBox;
  probe.dispose();
  if (!bb) return null;
  const w = bb.max.x - bb.min.x || 1;
  const h = bb.max.y - bb.min.y || 1;
  const scale = (targetSize / Math.max(w, h)) * glyph.scale;
  for (const shape of shapes) {
    shape.extractPoints(1);
  }
  const scaled = shapes.map((shape) => {
    const next = new Shape();
    const pts = shape.getPoints(12);
    const holes = shape.holes.map((hole) => hole.getPoints(12));
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

  if (glyph.underscore) {
    scaled.push(underscoreShape(Math.max(w, h) * scale, -h * scale * 0.55));
  }

  const geometry = centerAndExtrude(scaled, depth);
  if (!geometry) return null;
  return { geometry, width: w * scale, height: h * scale };
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
