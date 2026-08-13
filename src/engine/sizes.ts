import type { DieType, SizeFormatId } from "./types";

/** Characteristic size in millimetres (longest bounding-box axis). */
export const SIZE_CHART: Record<SizeFormatId, Record<DieType, number>> = {
  mini: {
    d2: 16,
    d4: 14,
    d4crystal: 16,
    d6: 12,
    d8: 12,
    d10: 12,
    d00: 12,
    d12: 14,
    d20: 15,
  },
  standard: {
    d2: 22,
    d4: 18,
    d4crystal: 21,
    d6: 16,
    d8: 16,
    d10: 16,
    d00: 16,
    d12: 18,
    d20: 20,
  },
  chonk: {
    d2: 28,
    d4: 26,
    d4crystal: 30,
    d6: 22,
    d8: 22,
    d10: 22,
    d00: 22,
    d12: 26,
    d20: 30,
  },
  giant: {
    d2: 38,
    d4: 36,
    d4crystal: 40,
    d6: 32,
    d8: 32,
    d10: 32,
    d00: 32,
    d12: 36,
    d20: 42,
  },
};

export const DEFAULT_DEPTH: Record<SizeFormatId, number> = {
  mini: 0.55,
  standard: 0.7,
  chonk: 0.9,
  giant: 1.15,
};

export const DEFAULT_BUMPER: Record<SizeFormatId, number> = {
  mini: 0.35,
  standard: 0.45,
  chonk: 0.6,
  giant: 0.8,
};

export function sizeFor(type: DieType, format: SizeFormatId): number {
  return SIZE_CHART[format][type];
}
