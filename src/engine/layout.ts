import type { DieInstance } from "./types";

/** World-space origin of a die in the workshop row. */
export function dieWorldPosition(
  index: number,
  count: number,
  spacing: number,
): [number, number, number] {
  if (count <= 1) return [0, 0, 0];
  return [(index - (count - 1) / 2) * spacing, 0, 0];
}

export function layoutSet(dice: DieInstance[]) {
  const maxSize = dice.reduce((m, d) => Math.max(m, d.sizeMm), 16);
  const spacing = maxSize * 1.2;
  const width = Math.max(maxSize, Math.max(0, dice.length - 1) * spacing + maxSize);
  const fov = 46;
  return {
    spacing,
    maxSize,
    width,
    fov,
    cameraY: maxSize * 2.4,
    cameraZ: Math.max(48, maxSize * 3.6),
    maxDistance: Math.max(600, width * 4),
    minDistance: Math.max(24, maxSize * 1.15),
    groundY: -maxSize * 0.7,
    groundR: Math.max(width * 0.42, maxSize * 1.2),
  };
}
