import { describe, expect, it } from "vitest";
import { createDie } from "./defaults";
import {
  dieWorldPosition,
  layoutSet,
  overviewFitDistance,
  overviewSeat,
  setWorldCorners,
} from "./layout";

const STANDARD_SET = ["d4", "d6", "d8", "d10", "d00", "d12", "d20"] as const;

describe("viewport layout", () => {
  it("frames every die of a seven-piece set in a square stage", () => {
    const set = STANDARD_SET.map((t) => createDie(t, "standard"));
    const layout = layoutSet(set, 1);
    const need = overviewFitDistance(setWorldCorners(set), 1, layout.fov, 1);
    expect(layout.distance).toBeGreaterThanOrEqual(need);
    expect(layout.cameraZ).toBeGreaterThan(layout.maxSize);
    expect(layout.maxDistance).toBeGreaterThan(layout.distance * 2);
  });

  it("pulls the camera back when the stage is taller and narrower", () => {
    const set = STANDARD_SET.map((t) => createDie(t, "standard"));
    const wide = overviewSeat(set, 1.8);
    const square = overviewSeat(set, 1);
    const tall = overviewSeat(set, 0.55);
    expect(tall.distance).toBeGreaterThan(square.distance);
    expect(square.distance).toBeGreaterThan(wide.distance);
  });

  it("sits closer for a single die than for a full set", () => {
    const one = overviewSeat([createDie("d6", "standard")], 1);
    const set = overviewSeat(
      STANDARD_SET.map((t) => createDie(t, "standard")),
      1,
    );
    expect(set.distance).toBeGreaterThan(one.distance * 1.5);
  });

  it("places the selected die on a world-space slot in the row", () => {
    expect(dieWorldPosition(0, 1, 20)).toEqual([0, 0, 0]);
    expect(dieWorldPosition(1, 3, 10)[0]).toBe(0);
    expect(dieWorldPosition(0, 3, 10)[0]).toBe(-10);
    expect(dieWorldPosition(2, 3, 10)[0]).toBe(10);
  });
});
