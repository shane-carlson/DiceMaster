import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  applyViewPose,
  faceViewDistance,
  faceViewPose,
  interpolatePose,
  overviewViewPose,
  slerpUnit,
  type ViewPose,
} from "./cameraFocus";
import { extractFaces, faceCircumradius } from "./faces";
import { createDieGeometry } from "./geometry";
import { numberFaces } from "./numbering";

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

  it("does not emit NaNs from a zero up vector", () => {
    const mid = slerpUnit(new Vector3(0, 0, 0), new Vector3(0, 1, 0), 0.4);
    expect(mid.toArray().every(Number.isFinite)).toBe(true);
    expect(mid.length()).toBeCloseTo(1, 5);
  });
});

describe("overview view", () => {
  it("looks at the origin with world-up from the default camera seat", () => {
    const pose = overviewViewPose(12, 48);
    expect(pose.target.toArray()).toEqual([0, 0, 0]);
    expect(pose.position.toArray()).toEqual([0, 12, 48]);
    expect(pose.up.toArray()).toEqual([0, 1, 0]);
  });
});

describe("face inspect framing", () => {
  it("sits along the D6 two-face normal instead of looking through a side neighbor", () => {
    const geom = createDieGeometry("d6", 16);
    const faces = numberFaces("d6", extractFaces(geom, "d6"), "0-9");
    const two = faces.find((f) => f.label === "2");
    expect(two).toBeTruthy();
    const pose = faceViewPose([0, 0, 0], two!, 16);
    expect(two!.normal.z).toBeGreaterThan(0.9);
    expect(pose.position.z).toBeGreaterThan(Math.abs(pose.position.x) + 4);
    const look = two!.center.clone().sub(pose.position).normalize();
    expect(look.dot(two!.normal.clone().negate())).toBeGreaterThan(0.98);
  });

  it("frames a D20 face by its own size so neighboring facets fall out of view", () => {
    const d20 = extractFaces(createDieGeometry("d20", 20), "d20")[0];
    const d6 = extractFaces(createDieGeometry("d6", 16), "d6")[0];
    const close = faceViewDistance(d20);
    const cube = faceViewDistance(d6);
    expect(close).toBeGreaterThanOrEqual(10);
    expect(close).toBeLessThan(cube * 0.75);
    expect(close).toBeLessThan(20);
    const r = faceCircumradius(d20);
    const half = (46 / 2) * (Math.PI / 180);
    const cornerAngle = Math.atan(r / close);
    expect(cornerAngle).toBeGreaterThan(half * 0.7);
  });
});

describe("applyViewPose", () => {
  it("aims the camera with a stable basis", () => {
    const camera = new PerspectiveCamera(42, 1, 0.1, 4000);
    const pose = {
      target: new Vector3(0, 0, 0),
      position: new Vector3(0, 8, 24),
      up: new Vector3(0, 0, 1),
    };
    const ok = applyViewPose(camera, pose);
    expect(ok).toBe(true);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
    const forward = pose.target.clone().sub(pose.position).normalize();
    const camForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    expect(camForward.dot(forward)).toBeGreaterThan(0.98);
    expect(Math.abs(camera.up.dot(camForward))).toBeLessThan(0.05);
  });
});
