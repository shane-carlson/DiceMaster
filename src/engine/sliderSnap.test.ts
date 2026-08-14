import { describe, expect, it } from "vitest";
import { defaultTickRatio, snapToDefault } from "./sliderSnap";

describe("slider default detent", () => {
  it("places the tick at the default along the track", () => {
    expect(defaultTickRatio(0.18, 0, 0.7)).toBeCloseTo(0.18 / 0.7);
    expect(defaultTickRatio(0, -50, 50)).toBeCloseTo(0.5);
    expect(defaultTickRatio(16, 8, 60)).toBeCloseTo((16 - 8) / (60 - 8));
  });

  it("hides the tick when the default is off the track", () => {
    expect(defaultTickRatio(undefined, 0, 1)).toBeNull();
    expect(defaultTickRatio(2, 0, 1)).toBeNull();
    expect(defaultTickRatio(-1, 0, 1)).toBeNull();
  });

  it("snaps nearby values onto the default", () => {
    expect(snapToDefault(0.17, 0.18, 0, 0.7, 0.01)).toBe(0.18);
    expect(snapToDefault(0.19, 0.18, 0, 0.7, 0.01)).toBe(0.18);
    expect(snapToDefault(0, 0, -80, 80, 1)).toBe(0);
    expect(snapToDefault(3, 0, -80, 80, 1)).toBe(0);
  });

  it("lets the thumb leave once it is past the sticky zone", () => {
    expect(snapToDefault(0.12, 0.18, 0, 0.7, 0.01)).toBe(0.12);
    expect(snapToDefault(0.3, 0.18, 0, 0.7, 0.01)).toBe(0.3);
    expect(snapToDefault(10, 0, -80, 80, 1)).toBe(10);
  });

  it("does not snap when no default is set", () => {
    expect(snapToDefault(0.17, undefined, 0, 0.7, 0.01)).toBe(0.17);
  });
});
