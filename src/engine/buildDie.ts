import {
  BufferGeometry,
  CylinderGeometry,
  Matrix4,
  Mesh,
  SphereGeometry,
} from "three";
import {
  ADDITION,
  Brush,
  Evaluator,
  INTERSECTION,
  SUBTRACTION,
} from "three-bvh-csg";
import type { Font } from "opentype.js";
import { extractFaces, type DieFace } from "./faces";
import { createDieGeometry, uniqueVertices } from "./geometry";
import { buildGlyphGeometry, pipPositions } from "./glyphs";
import { numberFaces, type NumberedFace } from "./numbering";
import type { DieInstance, GlyphSettings, LogoAsset } from "./types";

const FACE_GLYPH_SPAN: Record<DieInstance["type"], number> = {
  d2: 0.5,
  d4: 0.36,
  d4crystal: 0.3,
  d6: 0.52,
  d8: 0.38,
  d10: 0.34,
  d00: 0.3,
  d12: 0.36,
  d20: 0.34,
};

export interface PlacedGlyph {
  geometry: BufferGeometry;
  matrix: Matrix4;
  faceIndex: number;
  role: "primary" | "emblem" | "pip";
  depth: number;
}

export interface DieBuild {
  body: BufferGeometry;
  pickGeometry: BufferGeometry;
  faces: NumberedFace[];
  glyphs: PlacedGlyph[];
  sizeMm: number;
  engraveMode: DieInstance["engraveMode"];
  carved: boolean;
}

function faceMatrix(face: DieFace, zOffset: number, rotationDeg: number, ox: number, oy: number): Matrix4 {
  const m = new Matrix4();
  m.makeBasis(face.tangent, face.bitangent, face.normal);
  const pos = face.center
    .clone()
    .add(face.normal.clone().multiplyScalar(zOffset))
    .add(face.tangent.clone().multiplyScalar(ox))
    .add(face.bitangent.clone().multiplyScalar(oy));
  m.setPosition(pos);
  if (rotationDeg) {
    const rot = new Matrix4().makeRotationAxis(face.normal, (rotationDeg * Math.PI) / 180);
    const t1 = new Matrix4().makeTranslation(-pos.x, -pos.y, -pos.z);
    const t2 = new Matrix4().makeTranslation(pos.x, pos.y, pos.z);
    m.premultiply(t1).premultiply(rot).premultiply(t2);
  }
  return m;
}

function applyRounding(body: BufferGeometry, amount: number): BufferGeometry {
  if (amount <= 0.001) return body;
  body.computeBoundingSphere();
  const r = (body.boundingSphere?.radius ?? 10) * (1 - amount * 0.14);
  const sphere = new SphereGeometry(r, 24, 16);
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  const a = new Brush(body);
  const b = new Brush(sphere);
  a.updateMatrixWorld();
  b.updateMatrixWorld();
  const result = evaluator.evaluate(a, b, INTERSECTION);
  const geom = result.geometry.clone();
  geom.computeVertexNormals();
  return geom;
}

function applyBumpers(body: BufferGeometry, size: number): BufferGeometry {
  const verts = uniqueVertices(body);
  if (verts.length === 0) return body;
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  let current = new Brush(body);
  current.updateMatrixWorld();
  for (const v of verts) {
    const sg = new SphereGeometry(size, 12, 10);
    sg.translate(v.x, v.y, v.z);
    const brush = new Brush(sg);
    brush.updateMatrixWorld();
    current = evaluator.evaluate(current, brush, ADDITION);
  }
  const geom = current.geometry.clone();
  geom.computeVertexNormals();
  return geom;
}

async function placedFromGlyph(
  glyph: GlyphSettings,
  face: NumberedFace,
  die: DieInstance,
  font: Font,
  logos: LogoAsset[],
  globalScale: number,
  role: PlacedGlyph["role"],
): Promise<PlacedGlyph | null> {
  const depth = glyph.depth ?? die.engravingDepth;
  const span = die.sizeMm * FACE_GLYPH_SPAN[die.type] * die.fontScale * globalScale;
  const built = await buildGlyphGeometry(glyph, font, logos, span, Math.max(depth * 2.6, 1));
  if (!built) return null;
  const ox = glyph.offsetX * span * 0.55;
  const oy = glyph.offsetY * span * 0.55;
  // Emboss sits outward. Engrave cutters are shifted inward so most of the
  // volume is inside the die (preview overlays no longer read as raised type).
  const zOff = die.engraveMode === "emboss" ? depth * 0.55 : -depth * 0.45;
  const matrix = faceMatrix(face, zOff, glyph.rotation, ox, oy);
  return { geometry: built.geometry, matrix, faceIndex: face.index, role, depth };
}

function pipGlyphs(face: NumberedFace, die: DieInstance): PlacedGlyph[] {
  const value = Number(face.label);
  if (!Number.isFinite(value) || value < 1 || value > 6) return [];
  const span = die.sizeMm * 0.16;
  const radius = die.sizeMm * 0.055 * die.fontScale;
  const depth = die.engravingDepth * 2.2;
  const pts = pipPositions(value, span);
  return pts.map((p) => {
    const geom = new CylinderGeometry(radius, radius, depth, 20);
    geom.rotateX(Math.PI / 2);
    const zOff = die.engraveMode === "emboss" ? die.engravingDepth * 0.4 : -die.engravingDepth * 0.45;
    const matrix = faceMatrix(face, zOff, 0, p.x, p.y);
    return {
      geometry: geom,
      matrix,
      faceIndex: face.index,
      role: "pip" as const,
      depth: die.engravingDepth,
    };
  });
}

export async function buildDie(
  die: DieInstance,
  font: Font,
  logos: LogoAsset[],
  globalScale: number,
  quality: "preview" | "print" = "preview",
): Promise<DieBuild> {
  const sharp = createDieGeometry(die.type, die.sizeMm);
  const rawFaces = extractFaces(sharp, die.type);
  const faces = numberFaces(die.type, rawFaces, die.d10Style);
  let body = sharp;
  if (quality === "print") {
    try {
      body = applyRounding(body, die.cornerRounding);
      if (die.bumpers) {
        body = applyBumpers(body, die.bumperSize);
      }
    } catch {
      body = sharp;
    }
  }
  const glyphs: PlacedGlyph[] = [];

  for (const face of faces) {
    const settings = die.faces[face.index];
    if (!settings) continue;

    const usePips =
      die.numberStyle === "pips" &&
      die.type === "d6" &&
      settings.primary.kind === "number";

    if (usePips) {
      glyphs.push(...pipGlyphs(face, die));
    } else {
      const primary = await placedFromGlyph(
        settings.primary,
        face,
        die,
        font,
        logos,
        globalScale,
        "primary",
      );
      if (primary) glyphs.push(primary);
    }

    if (settings.emblem) {
      const emblem = await placedFromGlyph(
        settings.emblem,
        face,
        die,
        font,
        logos,
        globalScale * 0.55,
        "emblem",
      );
      if (emblem) glyphs.push(emblem);
    }
  }

  return {
    body,
    pickGeometry: body,
    faces,
    glyphs,
    sizeMm: die.sizeMm,
    engraveMode: die.engraveMode,
    carved: false,
  };
}

export function bakeEngraving(build: DieBuild, mode: DieInstance["engraveMode"]): BufferGeometry {
  if (build.glyphs.length === 0) return build.body.clone();
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  const op = mode === "emboss" ? ADDITION : SUBTRACTION;

  const makeCutter = (glyph: PlacedGlyph) => {
    const cutter = new Brush(glyph.geometry.clone());
    cutter.applyMatrix4(glyph.matrix);
    cutter.updateMatrixWorld();
    return cutter;
  };

  const body = new Brush(build.body.clone());
  body.updateMatrixWorld();

  try {
    let tool = makeCutter(build.glyphs[0]);
    for (let i = 1; i < build.glyphs.length; i++) {
      tool = evaluator.evaluate(tool, makeCutter(build.glyphs[i]), ADDITION);
    }
    const result = evaluator.evaluate(body, tool, op);
    const geom = result.geometry.clone();
    geom.computeVertexNormals();
    return geom;
  } catch {
    let current = body;
    for (const glyph of build.glyphs) {
      current = evaluator.evaluate(current, makeCutter(glyph), op);
    }
    const geom = current.geometry.clone();
    geom.computeVertexNormals();
    return geom;
  }
}

export function glyphWorldMesh(glyph: PlacedGlyph): Mesh {
  const mesh = new Mesh(glyph.geometry);
  mesh.applyMatrix4(glyph.matrix);
  return mesh;
}
