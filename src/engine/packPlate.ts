export interface PlateSpec {
  /** Printable width in mm (slicer X). */
  width: number;
  /** Printable depth in mm (slicer Y). */
  depth: number;
  margin: number;
  gap: number;
}

/** Conservative Mars 3 / Photon-class resin plate, with room for support trees. */
export const STANDARD_RESIN_PLATE: PlateSpec = {
  width: 140,
  depth: 90,
  margin: 6,
  gap: 8,
};

export interface Footprint {
  id: string;
  width: number;
  depth: number;
}

export interface PackedSlot {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

function orientationsOf(item: Footprint): { width: number; depth: number }[] {
  const a = { width: item.width, depth: item.depth };
  if (Math.abs(item.width - item.depth) < 0.05) return [a];
  return [a, { width: item.depth, depth: item.width }];
}

function chooseOrientation(
  item: Footprint,
  x: number,
  x0: number,
  innerW: number,
  rowH: number,
  z: number,
  gap: number,
): { width: number; depth: number } {
  const opts = orientationsOf(item).filter((o) => o.width <= innerW + 0.05);
  const pool = opts.length ? opts : orientationsOf(item);
  let best = pool[0]!;
  let bestScore = Infinity;
  for (const o of pool) {
    const wraps = x > x0 && x + o.width > x0 + innerW + 0.05;
    const usedD = wraps ? z + rowH + gap + o.depth : z + Math.max(rowH, o.depth);
    const leftover = wraps ? innerW - o.width : x0 + innerW - (x + o.width);
    const score = usedD * 1000 + leftover + o.depth;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

export function packFootprints(
  items: Footprint[],
  plate: PlateSpec = STANDARD_RESIN_PLATE,
): { slots: PackedSlot[]; width: number; depth: number; fitsPlate: boolean } {
  const innerW = plate.width - plate.margin * 2;
  const x0 = plate.margin;
  const z0 = plate.margin;
  let x = x0;
  let z = z0;
  let rowH = 0;
  let usedW = 0;
  let usedD = 0;
  const slots: PackedSlot[] = [];

  const ordered = [...items].sort((a, b) => b.width * b.depth - a.width * a.depth);

  for (const item of ordered) {
    const { width: w, depth: d } = chooseOrientation(
      item,
      x,
      x0,
      innerW,
      rowH,
      z,
      plate.gap,
    );
    if (x > x0 && x + w > x0 + innerW) {
      x = x0;
      z += rowH + plate.gap;
      rowH = 0;
    }
    slots.push({
      id: item.id,
      x: x + w / 2,
      z: z + d / 2,
      width: w,
      depth: d,
    });
    x += w + plate.gap;
    rowH = Math.max(rowH, d);
    usedW = Math.max(usedW, x - plate.gap);
    usedD = Math.max(usedD, z + d);
  }

  const width = usedW + plate.margin;
  const depth = usedD + plate.margin;
  return {
    slots,
    width,
    depth,
    fitsPlate: width <= plate.width + 0.05 && depth <= plate.depth + 0.05,
  };
}

/** True when every pair of AABBs is separated by at least `gap` on one axis. */
export function slotsHaveClearance(slots: PackedSlot[], gap: number): boolean {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const dx = Math.abs(slots[i]!.x - slots[j]!.x);
      const dz = Math.abs(slots[i]!.z - slots[j]!.z);
      const minX = (slots[i]!.width + slots[j]!.width) / 2 + gap;
      const minZ = (slots[i]!.depth + slots[j]!.depth) / 2 + gap;
      if (dx < minX - 0.05 && dz < minZ - 0.05) return false;
    }
  }
  return true;
}
