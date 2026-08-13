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
  const fov = 42;
  const dist = (width * 0.55) / Math.tan((fov * Math.PI) / 360) + maxSize;
  return {
    spacing,
    maxSize,
    width,
    fov,
    cameraY: maxSize * 0.7,
    cameraZ: Math.max(40, dist),
    maxDistance: Math.max(600, dist * 5),
    minDistance: Math.max(6, maxSize * 0.35),
    groundY: -maxSize * 0.7,
    groundR: Math.max(width * 0.42, maxSize * 1.2),
  };
}
