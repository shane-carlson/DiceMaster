/** Position of the default on a range, 0–1, or null when it is off the track. */
export function defaultTickRatio(
  defaultValue: number | undefined,
  min: number,
  max: number,
): number | null {
  if (defaultValue === undefined || !Number.isFinite(defaultValue)) return null;
  const span = max - min;
  if (!(span > 0)) return null;
  const t = (defaultValue - min) / span;
  if (t < 0 || t > 1) return null;
  return t;
}

/**
 * Snap to the default when the thumb is close, so the factory value is a
 * sticky detent while dragging.
 */
export function snapToDefault(
  value: number,
  defaultValue: number | undefined,
  min: number,
  max: number,
  step: number,
): number {
  if (defaultValue === undefined || !Number.isFinite(defaultValue)) return value;
  if (defaultValue < min || defaultValue > max) return value;
  const span = max - min;
  if (!(span > 0)) return value;
  const sticky = Math.max(Math.abs(step) * 2.5, span * 0.03);
  if (Math.abs(value - defaultValue) <= sticky + 1e-9) return defaultValue;
  return value;
}
