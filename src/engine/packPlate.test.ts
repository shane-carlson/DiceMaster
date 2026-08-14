import { describe, expect, it } from "vitest";
import { packFootprints, slotsHaveClearance, STANDARD_RESIN_PLATE } from "./packPlate";
import { createDie } from "./defaults";

describe("resin plate packing", () => {
  it("uses a support-tree gap on a 140×90 mm plate", () => {
    expect(STANDARD_RESIN_PLATE.width).toBe(140);
    expect(STANDARD_RESIN_PLATE.depth).toBe(90);
    expect(STANDARD_RESIN_PLATE.gap).toBe(8);
    expect(STANDARD_RESIN_PLATE.margin).toBe(6);
  });

  it("fits a standard seven-piece set of catalog squares", () => {
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

  it("does not overlap footprints and keeps the support gap", () => {
    const items = [
      { id: "a", width: 20, depth: 20 },
      { id: "b", width: 16, depth: 16 },
      { id: "c", width: 18, depth: 28 },
    ];
    const { slots } = packFootprints(items);
    expect(slotsHaveClearance(slots, STANDARD_RESIN_PLATE.gap)).toBe(true);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = Math.abs(slots[i]!.x - slots[j]!.x);
        const dz = Math.abs(slots[i]!.z - slots[j]!.z);
        const minX = (slots[i]!.width + slots[j]!.width) / 2;
        const minZ = (slots[i]!.depth + slots[j]!.depth) / 2;
        expect(dx >= minX - 0.05 || dz >= minZ - 0.05).toBe(true);
      }
    }
  });

  it("rotates a long footprint when that keeps the row shorter", () => {
    const packed = packFootprints([{ id: "token", width: 8, depth: 25 }]);
    const slot = packed.slots[0]!;
    expect(slot.width === 8 || slot.width === 25).toBe(true);
    expect(slot.depth === 8 || slot.depth === 25).toBe(true);
    expect(slot.width + slot.depth).toBe(33);
  });
});
