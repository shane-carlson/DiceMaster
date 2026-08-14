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

const CUTTER_OVERLAP = 0.2;

/**
 * Centered cutter so CSG crosses the face and the cut floor sits at -depth (engrave)
 * or the raised top at +depth (emboss).
 */
export function cutterPlacement(
  depth: number,
  mode: EngraveMode,
): { height: number; zOffset: number } {
  const overlap = Math.min(CUTTER_OVERLAP, Math.max(depth * 0.15, 0.12));
  const height = depth + overlap;
  if (mode === "emboss") {
    return { height, zOffset: (depth - overlap) / 2 };
  }
  return { height, zOffset: (overlap - depth) / 2 };
}
