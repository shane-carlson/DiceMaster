import { describe, expect, it } from "vitest";
import { packFootprints, STANDARD_RESIN_PLATE } from "./packPlate";
import { createDie } from "./defaults";

describe("resin plate packing", () => {
  it("fits a standard seven-piece set on a 140×90 mm plate", () => {
    const dice = ["d4", "d6", "d8", "d10", "d00", "d12", "d20"].map((t) =>
      createDie(t as "d20", "standard"),
    );
    const packed = packFootprints(
      dice.map((d) => ({ id: d.id, width: d.sizeMm, depth: d.sizeMm })),
    );
    expect(packed.slots).toHaveLength(7);
    expect(packed.fitsPlate).toBe(true);
    expect(packed.width).toBeLessThanOrEqual(STANDARD_RESIN_PLATE.width);
    expect(packed.depth).toBeLessThanOrEqual(STANDARD_RESIN_PLATE.depth);
    const ids = new Set(packed.slots.map((s) => s.id));
    expect(ids.size).toBe(7);
  });

  it("does not overlap footprints", () => {
    const items = [
      { id: "a", width: 20, depth: 20 },
      { id: "b", width: 16, depth: 16 },
      { id: "c", width: 18, depth: 18 },
    ];
    const { slots } = packFootprints(items);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = Math.abs(slots[i].x - slots[j].x);
        const dz = Math.abs(slots[i].z - slots[j].z);
        const minX = (slots[i].width + slots[j].width) / 2;
        const minZ = (slots[i].depth + slots[j].depth) / 2;
        expect(dx >= minX - 0.05 || dz >= minZ - 0.05).toBe(true);
      }
    }
  });
});
