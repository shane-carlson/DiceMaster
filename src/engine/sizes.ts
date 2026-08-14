import type { DieType, SizeFormatId } from "./types";
import { TOKEN_DIAMETER_MM } from "./token";

/** Characteristic size in millimetres (longest bounding-box axis).
 *  D8 / D10 / D% are also this wide at the equator.
 *  Crystal / teardrop D4s use vertical (pole-to-pole) height. */
export const SIZE_CHART: Record<SizeFormatId, Record<DieType, number>> = {
  mini: {
    d2: 16,
    d4: 14,
    d4crystal: 22,
    d4teardrop: 22,
    d6: 12,
    d8: 12,
    d10: 12,
    d00: 12,
    d12: 14,
    d20: 15,
    token: TOKEN_DIAMETER_MM,
  },
  standard: {
    d2: 22,
    d4: 18,
    d4crystal: 29,
    d4teardrop: 29,
    d6: 16,
    d8: 16,
    d10: 16,
    d00: 16,
    d12: 18,
    d20: 20,
    token: TOKEN_DIAMETER_MM,
  },
  chonk: {
    d2: 28,
    d4: 26,
    d4crystal: 38,
    d4teardrop: 38,
    d6: 22,
    d8: 22,
    d10: 22,
    d00: 22,
    d12: 26,
    d20: 30,
    token: TOKEN_DIAMETER_MM,
  },
  giant: {
    d2: 38,
    d4: 36,
    d4crystal: 52,
    d4teardrop: 52,
    d6: 32,
    d8: 32,
    d10: 32,
    d00: 32,
    d12: 36,
    d20: 42,
    token: TOKEN_DIAMETER_MM,
  },
};

/** Vertical heights (mm) and silhouettes from the crystal-kit size chart. */
export interface CrystalKitPiece {
  type: DieType;
  sizeMm: number;
  name: string;
}

export const CRYSTAL_KIT_CHART: CrystalKitPiece[] = [
  { type: "d4crystal", sizeMm: 29, name: "D4 Crystal" },
  { type: "d4teardrop", sizeMm: 29, name: "D4 Teardrop" },
  { type: "d4", sizeMm: 20, name: "D4 Caltrop" },
  { type: "d6", sizeMm: 16, name: "D6 Cube" },
  { type: "d8", sizeMm: 29, name: "D8 Octahedron" },
  { type: "d10", sizeMm: 29, name: "D10 Trapezohedron" },
  { type: "d00", sizeMm: 29, name: "D% Percentile" },
  { type: "d12", sizeMm: 19, name: "D12 Dodecahedron" },
  { type: "d20", sizeMm: 26, name: "D20 Icosahedron" },
];

export const DEFAULT_DEPTH: Record<SizeFormatId, number> = {
  mini: 0.605,
  standard: 0.77,
  chonk: 0.99,
  giant: 1.265,
};

export const DEFAULT_BUMPER: Record<SizeFormatId, number> = {
  mini: 0.35,
  standard: 0.45,
  chonk: 0.6,
  giant: 0.8,
};

export function defaultBumperSize(format: SizeFormatId | "custom"): number {
  return format === "custom" ? DEFAULT_BUMPER.standard : DEFAULT_BUMPER[format];
}

export function sizeFor(type: DieType, format: SizeFormatId): number {
  return SIZE_CHART[format][type];
}
