import { DEFAULT_DEPTH } from "./sizes";
import type { DieInstance, EngraveMode, SizeFormatId } from "./types";

export function defaultCarveDepth(format: SizeFormatId | "custom" = "standard"): number {
  return format === "custom" ? DEFAULT_DEPTH.standard : DEFAULT_DEPTH[format];
}

/** Engraving depth in mm for any render path. Invalid values fall back to the size-format default. */
export function resolveCarveDepth(
  die: Pick<DieInstance, "engravingDepth" | "sizeFormat">,
  glyphDepth?: number | null,
): number {
  const fallback = defaultCarveDepth(die.sizeFormat);
  const raw = glyphDepth ?? die.engravingDepth;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0.08) return fallback;
  return raw;
}

/**
 * How far an engrave cutter must stick *out* of the face. Manifold leaves a
 * paper-thin skin over the well (slicer "slits") if this is only a fraction of
 * a millimetre — the tool has to clearly pass through the surface.
 */
const ENGRAVE_THROUGH_MM = 3;
const EMBOSS_OVERLAP = 0.2;

/**
 * Preview numerals sit this far off the face as a flat decal (mm).
 * A 3D slab's back cap z-fights the die and reads as white.
 */
export const PREVIEW_INK_HEIGHT = 0.18;

/**
 * Centered cutter so CSG crosses the face and the cut floor sits at -depth (engrave)
 * or the raised top at +depth (emboss).
 */
export function cutterPlacement(
  depth: number,
  mode: EngraveMode,
): { height: number; zOffset: number } {
  if (mode === "emboss") {
    const overlap = Math.min(EMBOSS_OVERLAP, Math.max(depth * 0.15, 0.12));
    const height = depth + overlap;
    return { height, zOffset: (depth - overlap) / 2 };
  }
  const overlap = Math.max(ENGRAVE_THROUGH_MM, depth);
  const height = depth + overlap;
  return { height, zOffset: (overlap - depth) / 2 };
}
