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
  SUBTRACTION,
} from "three-bvh-csg";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import { extractFaces, glyphFitSize, type DieFace } from "./faces";
import { createDieGeometry, uniqueVertices } from "./geometry";
import { buildGlyphGeometry, pipPositions, type GlyphShapeContours } from "./glyphs";
import { cutterPlacement, resolveCarveDepth } from "./carve";
import { numberFaces, type NumberedFace } from "./numbering";
import { d4CornerPlacements, tetraOppositeVertexLabels, usesVertexNumerals } from "./d4";
import type { DieInstance, GlyphSettings, LogoAsset } from "./types";

export interface PlacedGlyph {
  geometry: BufferGeometry;
  matrix: Matrix4;
  wellMatrix: Matrix4;
  cutter: BufferGeometry;
  cutterMatrix: Matrix4;
  faceIndex: number;
  role: "primary" | "emblem" | "pip";
  depth: number;
  ox: number;
  oy: number;
  rotation: number;
  shapes: GlyphShapeContours[];
  /** True when the preview mesh occupies [-depth, 0] along the outward normal. */
  inset: boolean;
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

export function faceMatrix(face: DieFace, zOffset: number, rotationDeg: number, ox: number, oy: number): Matrix4 {
  const m = new Matrix4();
  m.makeBasis(face.tangent, face.bitangent, face.normal);
  const pos = face.center
    .clone()
    .add(face.normal.clone().multiplyScalar(zOffset))
    .add(face.tangent.clone().multiplyScalar(ox))
    .add(face.bitangent.clone().multiplyScalar(oy));
  m.setPosition(pos);
  if (rotationDeg) {
    // Negative so +rotation is CCW when looking at the face from outside,
    // matching the face-editor SVG `rotate(-θ)` in Y-up face coordinates.
    const rot = new Matrix4().makeRotationAxis(face.normal, (-rotationDeg * Math.PI) / 180);
    const t1 = new Matrix4().makeTranslation(-pos.x, -pos.y, -pos.z);
    const t2 = new Matrix4().makeTranslation(pos.x, pos.y, pos.z);
    m.premultiply(t1).premultiply(rot).premultiply(t2);
  }
  return m;
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Convex hulls have no UVs; ExtrudeGeometry does. CSG requires the same attrs. */
function csgEvaluator(): Evaluator {
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  evaluator.attributes = ["position", "normal"];
  return evaluator;
}

function prepareCsgGeometry(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  if (geometry.getAttribute("uv")) geometry.deleteAttribute("uv");
  return geometry;
}

function applyBumpers(body: BufferGeometry, size: number): BufferGeometry {
  const verts = uniqueVertices(body);
  if (verts.length === 0) return body;
  const evaluator = csgEvaluator();
  let current = new Brush(prepareCsgGeometry(body));
  current.updateMatrixWorld();
  for (const v of verts) {
    const sg = new SphereGeometry(size, 12, 10);
    sg.translate(v.x, v.y, v.z);
    const brush = new Brush(prepareCsgGeometry(sg));
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
  placement?: { ox: number; oy: number; rotation: number; fitMul?: number },
  quality: "preview" | "print" = "preview",
): Promise<PlacedGlyph | null> {
  const depth = resolveCarveDepth(die, glyph.depth);
  const fit = glyphFitSize(face) * die.fontScale * globalScale * (placement?.fitMul ?? 1);
  const inset = die.engraveMode !== "emboss";
  const cut = cutterPlacement(depth, die.engraveMode);
  const segments = quality === "print" ? 5 : 8;
  const cutter = await buildGlyphGeometry(
    glyph,
    font,
    logos,
    fit,
    cut.height,
    "center",
    false,
    segments,
  );
  if (!cutter) return null;
  const preview =
    quality === "print"
      ? cutter
      : await buildGlyphGeometry(
          glyph,
          font,
          logos,
          fit,
          depth,
          inset ? "inset" : "outset",
          false,
          segments,
        );
  if (!preview) return null;
  const ox = (placement?.ox ?? 0) + glyph.offsetX * fit * 0.45;
  const oy = (placement?.oy ?? 0) + glyph.offsetY * fit * 0.45;
  const rotation = (placement?.rotation ?? 0) + glyph.rotation;
  return {
    geometry: preview.geometry,
    matrix: faceMatrix(face, 0, rotation, ox, oy),
    wellMatrix: faceMatrix(face, -depth, rotation, ox, oy),
    cutter: cutter.geometry,
    cutterMatrix: faceMatrix(face, cut.zOffset, rotation, ox, oy),
    faceIndex: face.index,
    role,
    depth,
    ox,
    oy,
    rotation,
    shapes: preview.contours,
    inset,
  };
}

function pipGlyphs(face: NumberedFace, die: DieInstance): PlacedGlyph[] {
  const value = Number(face.label);
  if (!Number.isFinite(value) || value < 1 || value > 6) return [];
  const fit = glyphFitSize(face);
  const span = fit * 0.28;
  const radius = fit * 0.09 * die.fontScale;
  const depth = resolveCarveDepth(die);
  const cut = cutterPlacement(depth, die.engraveMode);
  const pts = pipPositions(value, span);
  const inset = die.engraveMode !== "emboss";
  return pts.map((p) => {
    const preview = new CylinderGeometry(radius, radius, depth, 20);
    preview.rotateX(Math.PI / 2);
    if (inset) preview.translate(0, 0, -depth / 2);
    else preview.translate(0, 0, depth / 2);
    const cutter = new CylinderGeometry(radius, radius, cut.height, 20);
    cutter.rotateX(Math.PI / 2);
    return {
      geometry: preview,
      matrix: faceMatrix(face, 0, 0, p.x, p.y),
      wellMatrix: faceMatrix(face, -depth, 0, p.x, p.y),
      cutter,
      cutterMatrix: faceMatrix(face, cut.zOffset, 0, p.x, p.y),
      faceIndex: face.index,
      role: "pip" as const,
      depth,
      ox: p.x,
      oy: p.y,
      rotation: 0,
      shapes: [],
      inset,
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
  if (quality === "print" && die.bumpers) {
    try {
      body = applyBumpers(body, die.bumperSize);
    } catch {
      body = sharp;
    }
  }
  const glyphs: PlacedGlyph[] = [];
  const vertexLabels = usesVertexNumerals(die.type)
    ? tetraOppositeVertexLabels(faces)
    : null;

  for (const face of faces) {
    const settings = die.faces[face.index];
    if (!settings) continue;

    const usePips =
      die.numberStyle === "pips" &&
      die.type === "d6" &&
      settings.primary.kind === "number";

    if (usePips) {
      glyphs.push(...pipGlyphs(face, die));
    } else if (vertexLabels && settings.primary.kind === "number") {
      for (const corner of d4CornerPlacements(face, vertexLabels)) {
        const glyph = {
          ...settings.primary,
          text: corner.label,
          underscore: corner.label === "6" || corner.label === "9",
        };
        const placed = await placedFromGlyph(
          glyph,
          face,
          die,
          font,
          logos,
          globalScale,
          "primary",
          { ox: corner.ox, oy: corner.oy, rotation: corner.rotation, fitMul: 0.42 },
          quality,
        );
        if (placed) glyphs.push(placed);
      }
    } else {
      const primary = await placedFromGlyph(
        settings.primary,
        face,
        die,
        font,
        logos,
        globalScale,
        "primary",
        undefined,
        quality,
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
        undefined,
        quality,
      );
      if (emblem) glyphs.push(emblem);
    }
  }

  return {
    body,
    pickGeometry: sharp,
    faces,
    glyphs,
    sizeMm: die.sizeMm,
    engraveMode: die.engraveMode,
    carved: false,
  };
}

export async function bakeEngraving(
  build: DieBuild,
  mode: DieInstance["engraveMode"],
): Promise<BufferGeometry> {
  if (build.glyphs.length === 0) return build.body.clone();
  const evaluator = csgEvaluator();
  const op = mode === "emboss" ? ADDITION : SUBTRACTION;

  const worldCutter = (glyph: PlacedGlyph) => {
    const geom = prepareCsgGeometry((glyph.cutter ?? glyph.geometry).clone());
    geom.applyMatrix4(glyph.cutterMatrix ?? glyph.matrix);
    return geom;
  };

  const finish = (geom: BufferGeometry) => {
    if (!geom.getAttribute("position") || geom.getAttribute("position")!.count < 3) {
      return build.body.clone();
    }
    geom.computeVertexNormals();
    return geom;
  };

  const body = new Brush(prepareCsgGeometry(build.body.clone()));
  body.updateMatrixWorld();

  try {
    let current = body;
    const batch = 3;
    for (let i = 0; i < build.glyphs.length; i += batch) {
      const parts = build.glyphs.slice(i, i + batch).map(worldCutter);
      const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
      if (merged?.getAttribute("position")) {
        const tool = new Brush(prepareCsgGeometry(merged));
        tool.updateMatrixWorld();
        current = evaluator.evaluate(current, tool, op);
      }
      for (const part of parts) {
        if (part !== merged) part.dispose();
      }
      if (parts.length > 1) merged?.dispose();
      await yieldToMain();
    }
    return finish(current.geometry.clone());
  } catch {
    return build.body.clone();
  }
}

export function glyphWorldMesh(glyph: PlacedGlyph): Mesh {
  const mesh = new Mesh(glyph.geometry);
  mesh.applyMatrix4(glyph.matrix);
  return mesh;
}
