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

/** 3/4 overview seat: lift vs back along +Z, matching the initial canvas camera. */
export const OVERVIEW_LIFT = 2.4;
export const OVERVIEW_BACK = 3.6;
const OVERVIEW_PADDING = 1.18;
const DEFAULT_FOV = 46;

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export function setSpacing(dice: DieInstance[]): { maxSize: number; spacing: number; width: number } {
  const maxSize = dice.reduce((m, d) => Math.max(m, d.sizeMm), 16);
  const spacing = maxSize * 1.2;
  const width = Math.max(maxSize, Math.max(0, dice.length - 1) * spacing + maxSize);
  return { maxSize, spacing, width };
}

/** Axis-aligned corners of every die in the workshop row. */
export function setWorldCorners(dice: DieInstance[]): WorldPoint[] {
  const { spacing } = setSpacing(dice);
  const points: WorldPoint[] = [];
  const count = Math.max(dice.length, 1);
  const list = dice.length > 0 ? dice : [{ sizeMm: 16 } as DieInstance];
  list.forEach((die, i) => {
    const [ox, oy, oz] = dieWorldPosition(i, count, spacing);
    const h = Math.max(die.sizeMm, 8) / 2;
    for (const dx of [-h, h]) {
      for (const dy of [-h, h]) {
        for (const dz of [-h, h]) {
          points.push({ x: ox + dx, y: oy + dy, z: oz + dz });
        }
      }
    }
  });
  return points;
}

/**
 * Distance along the overview look-direction so every point fits in a
 * perspective frustum of `fov` (vertical, degrees) and `aspect` (width/height).
 */
export function overviewFitDistance(
  points: WorldPoint[],
  aspect: number,
  fovDeg = DEFAULT_FOV,
  padding = OVERVIEW_PADDING,
): number {
  const len = Math.hypot(OVERVIEW_LIFT, OVERVIEW_BACK);
  const backY = OVERVIEW_LIFT / len;
  const backZ = OVERVIEW_BACK / len;
  const camUpY = backZ;
  const camUpZ = -backY;
  const halfV = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const halfH = halfV * Math.max(aspect, 0.05);
  let dist = 0;
  for (const p of points) {
    const depth = p.y * backY + p.z * backZ;
    const right = Math.abs(p.x);
    const up = Math.abs(p.y * camUpY + p.z * camUpZ);
    dist = Math.max(dist, depth + right / halfH, depth + up / halfV);
  }
  return Math.max(dist * padding, 28);
}

export function overviewSeat(dice: DieInstance[], aspect: number, fovDeg = DEFAULT_FOV) {
  const distance = overviewFitDistance(setWorldCorners(dice), aspect, fovDeg);
  const len = Math.hypot(OVERVIEW_LIFT, OVERVIEW_BACK);
  return {
    distance,
    cameraY: (OVERVIEW_LIFT / len) * distance,
    cameraZ: (OVERVIEW_BACK / len) * distance,
  };
}

export function layoutSet(dice: DieInstance[], aspect = 1) {
  const { maxSize, spacing, width } = setSpacing(dice);
  const fov = DEFAULT_FOV;
  const seat = overviewSeat(dice, aspect, fov);
  return {
    spacing,
    maxSize,
    width,
    fov,
    aspect,
    distance: seat.distance,
    cameraY: seat.cameraY,
    cameraZ: seat.cameraZ,
    maxDistance: Math.max(600, seat.distance * 3, width * 4),
    minDistance: Math.max(24, maxSize * 1.15),
    groundY: -maxSize * 0.7,
    groundR: Math.max(width * 0.42, maxSize * 1.2),
  };
}
