import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { interpolatePose, slerpUnit, type ViewPose } from "./cameraFocus";

describe("camera pose interpolation", () => {
  it("slerps unit vectors along an arc", () => {
    const mid = slerpUnit(new Vector3(0, 1, 0), new Vector3(1, 0, 0), 0.5);
    expect(mid.length()).toBeCloseTo(1, 5);
    expect(mid.x).toBeCloseTo(Math.SQRT1_2, 4);
    expect(mid.y).toBeCloseTo(Math.SQRT1_2, 4);
    expect(Math.abs(mid.z)).toBeLessThan(1e-6);
  });

  it("rotates onto the face instead of cutting through the die", () => {
    const from: ViewPose = {
      target: new Vector3(0, 0, 0),
      position: new Vector3(0, 0, 40),
      up: new Vector3(0, 1, 0),
    };
    const to: ViewPose = {
      target: new Vector3(0, 8, 0),
      position: new Vector3(0, 8, -40),
      up: new Vector3(0, 0, 1),
    };
    const mid = interpolatePose(from, to, 0.5);
    expect(mid.position.length()).toBeGreaterThan(20);
    expect(mid.up.length()).toBeCloseTo(1, 5);
    expect(mid.position.distanceTo(from.position)).toBeGreaterThan(10);
    expect(mid.position.distanceTo(to.position)).toBeGreaterThan(10);
  });

  it("lands on the destination pose", () => {
    const from: ViewPose = {
      target: new Vector3(1, 2, 3),
      position: new Vector3(4, 5, 6),
      up: new Vector3(0, 1, 0),
    };
    const to: ViewPose = {
      target: new Vector3(0, 0, 0),
      position: new Vector3(0, 10, 20),
      up: new Vector3(1, 0, 0),
    };
    const end = interpolatePose(from, to, 1);
    expect(end.position.distanceTo(to.position)).toBeLessThan(1e-8);
    expect(end.target.distanceTo(to.target)).toBeLessThan(1e-8);
    expect(end.up.distanceTo(to.up)).toBeLessThan(1e-8);
  });
});
