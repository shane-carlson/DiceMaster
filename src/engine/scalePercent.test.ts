import { describe, expect, it } from "vitest";
import { formatSignedPercent, percentToScale, scaleToPercent } from "./scalePercent";

describe("scale percent", () => {
  it("treats the default as 0%", () => {
    expect(scaleToPercent(1, 1)).toBe(0);
    expect(scaleToPercent(0.42, 0.42)).toBe(0);
  });

  it("reports increase and decrease from default", () => {
    expect(scaleToPercent(1.5, 1)).toBe(50);
    expect(scaleToPercent(0.5, 1)).toBe(-50);
    expect(formatSignedPercent(50)).toBe("+50%");
    expect(formatSignedPercent(-25)).toBe("-25%");
    expect(formatSignedPercent(0)).toBe("0%");
  });

  it("round-trips percent back to scale", () => {
    expect(percentToScale(0, 1)).toBe(1);
    expect(percentToScale(50, 1)).toBe(1.5);
    expect(percentToScale(-50, 0.42)).toBeCloseTo(0.21);
  });
});
