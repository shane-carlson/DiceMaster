import { describe, expect, it } from "vitest";
import { createDie } from "./defaults";
import { layoutSet } from "./layout";

describe("viewport layout", () => {
  it("lets the camera pull back far enough to frame a seven-piece set", () => {
    const dice = ["d4", "d6", "d8", "d10", "d00", "d12", "d20"] as const;
    const set = dice.map((t) => createDie(t, "standard"));
    const layout = layoutSet(set);
    expect(layout.maxDistance).toBeGreaterThan(layout.cameraZ * 2);
    expect(layout.cameraZ).toBeGreaterThan(layout.width * 0.4);
    expect(layout.spacing).toBeGreaterThan(set[0].sizeMm);
  });
});
