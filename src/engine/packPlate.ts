export interface PlateSpec {
  /** Printable width in mm (slicer X). */
  width: number;
  /** Printable depth in mm (slicer Y). */
  depth: number;
  margin: number;
  gap: number;
}

/** Conservative Mars 3 / Photon-class resin plate. */
export const STANDARD_RESIN_PLATE: PlateSpec = {
  width: 140,
  depth: 90,
  margin: 5,
  gap: 3.5,
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
    const w = item.width;
    const d = item.depth;
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
