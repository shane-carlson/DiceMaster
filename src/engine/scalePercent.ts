/** Convert a scale multiplier to percent change from the default (0 = default). */
export function scaleToPercent(value: number, defaultValue: number): number {
  if (!(defaultValue > 0) || !Number.isFinite(value)) return 0;
  return Math.round((value / defaultValue - 1) * 100);
}

export function percentToScale(percent: number, defaultValue: number): number {
  return defaultValue * (1 + percent / 100);
}

export function formatSignedPercent(percent: number): string {
  const n = Math.round(percent);
  if (n > 0) return `+${n}%`;
  return `${n}%`;
}
