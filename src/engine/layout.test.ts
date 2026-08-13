import { describe, expect, it } from "vitest";
import { createDie } from "./defaults";
import { dieWorldPosition, layoutSet } from "./layout";

describe("viewport layout", () => {
  it("lets the camera pull back far enough to frame a seven-piece set", () => {
    const dice = ["d4", "d6", "d8", "d10", "d00", "d12", "d20"] as const;
    const set = dice.map((t) => createDie(t, "standard"));
    const layout = layoutSet(set);
    expect(layout.maxDistance).toBeGreaterThan(layout.cameraZ * 2);
    expect(layout.cameraZ).toBeGreaterThan(layout.width * 0.4);
    expect(layout.spacing).toBeGreaterThan(set[0].sizeMm);
  });

  it("places the selected die on a world-space slot in the row", () => {
    expect(dieWorldPosition(0, 1, 20)).toEqual([0, 0, 0]);
    expect(dieWorldPosition(1, 3, 10)[0]).toBe(0);
    expect(dieWorldPosition(0, 3, 10)[0]).toBe(-10);
    expect(dieWorldPosition(2, 3, 10)[0]).toBe(10);
  });
});
