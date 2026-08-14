import { extractFaces, faceOutline2D, roundingReachScale } from "./faces";
import { createDieGeometry, filletRadiusMm } from "./geometry";
import { numberFaces } from "./numbering";
import { d4CornerPlacements, tetraOppositeVertexLabels, usesVertexNumerals } from "./d4";
import type { DieInstance, FaceKind, GlyphSettings } from "./types";

export interface FaceMarkPreview {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  text: string;
  symbolId: string | null;
  kind: "text" | "symbol" | "logo";
}

export interface FacePreview {
  dieId: string;
  dieName: string;
  dieColor: string;
  dieType: DieInstance["type"];
  faceIndex: number;
  kind: FaceKind;
  polygon: { x: number; y: number }[];
  marks: FaceMarkPreview[];
}

function glyphMark(glyph: GlyphSettings, span: number, fallbackText: string): FaceMarkPreview | null {
  if (glyph.kind === "blank") return null;
  const x = glyph.offsetX * 0.35 * span;
  const y = glyph.offsetY * 0.35 * span;
  if (glyph.kind === "symbol") {
    return {
      x,
      y,
      rotation: glyph.rotation,
      scale: glyph.scale,
      text: "✦",
      symbolId: glyph.symbolId,
      kind: "symbol",
    };
  }
  if (glyph.kind === "logo") {
    return {
      x,
      y,
      rotation: glyph.rotation,
      scale: glyph.scale,
      text: "▣",
      symbolId: null,
      kind: "logo",
    };
  }
  return {
    x,
    y,
    rotation: glyph.rotation,
    scale: glyph.scale,
    text: glyph.text || fallbackText,
    symbolId: null,
    kind: "text",
  };
}

function projectFace(die: DieInstance): FacePreview[] {
  const geom = createDieGeometry(die.type, die.sizeMm, die.tokenShape);
  const faces = numberFaces(die.type, extractFaces(geom, die.type), die.d10Style);
  const vertexLabels = usesVertexNumerals(die.type) ? tetraOppositeVertexLabels(faces) : null;
  const filletMm = filletRadiusMm(die.sizeMm, die.cornerRounding);
  geom.dispose();

  return faces
    .filter((face) => face.index < die.faces.length)
    .map((face) => {
    const settings = die.faces[face.index];
    const pts = faceOutline2D(face);
    const span = Math.max(...pts.map((p) => Math.hypot(p.x, p.y)), 1);
    const marks: FaceMarkPreview[] = [];
    const kind = settings?.primary.kind ?? "number";
    if (kind === "blank") {
      /* number replaced with empty; emblem may still show */
    } else if (vertexLabels && kind === "number") {
      const reach = 0.6 * roundingReachScale(face, filletMm);
      marks.push(
        ...d4CornerPlacements(face, vertexLabels, reach).map((c) => ({
          x: c.ox,
          y: c.oy,
          rotation: c.rotation,
          scale: 1,
          text: c.label,
          symbolId: null,
          kind: "text" as const,
        })),
      );
    } else {
      const primary = glyphMark(settings.primary, span, face.label);
      if (primary) marks.push(primary);
    }
    if (settings?.emblem) {
      const emblem = glyphMark(settings.emblem, span, "✦");
      if (emblem) marks.push(emblem);
    }
    return {
      dieId: die.id,
      dieName: die.name,
      dieColor: die.color,
      dieType: die.type,
      faceIndex: face.index,
      kind,
      polygon: pts,
      marks,
    };
  });
}

export function previewFacesForSet(dice: DieInstance[]): FacePreview[] {
  return dice.flatMap(projectFace);
}
