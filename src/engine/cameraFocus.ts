import { Vector3 } from "three";
import type { DieFace } from "./faces";

export interface ViewPose {
  target: Vector3;
  position: Vector3;
  up: Vector3;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Spherical interpolation of unit vectors so the camera rolls instead of lerping through zero. */
export function slerpUnit(from: Vector3, to: Vector3, t: number): Vector3 {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  if (t <= 0) return a;
  if (t >= 1) return b;
  const dot = clamp(a.dot(b), -1, 1);
  if (dot > 0.9995) {
    return a.lerp(b, t).normalize();
  }
  if (dot < -0.9995) {
    const axis = Math.abs(a.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    axis.cross(a).normalize();
    return a.clone().applyAxisAngle(axis, Math.PI * t).normalize();
  }
  const theta = Math.acos(dot);
  const axis = new Vector3().crossVectors(a, b).normalize();
  return a.clone().applyAxisAngle(axis, theta * t).normalize();
}

function slerpOffset(from: Vector3, to: Vector3, t: number): Vector3 {
  const fromLen = from.length();
  const toLen = to.length();
  const len = fromLen + (toLen - fromLen) * t;
  if (len < 1e-8) return new Vector3();
  if (fromLen < 1e-8) return to.clone().setLength(len);
  if (toLen < 1e-8) return from.clone().setLength(len);
  return slerpUnit(from, to, t).multiplyScalar(len);
}

export function interpolatePose(from: ViewPose, to: ViewPose, t: number): ViewPose {
  const k = clamp(t, 0, 1);
  const target = from.target.clone().lerp(to.target, k);
  const fromOff = from.position.clone().sub(from.target);
  const toOff = to.position.clone().sub(to.target);
  const position = target.clone().add(slerpOffset(fromOff, toOff, k));
  const up = slerpUnit(from.up, to.up, k);
  const view = target.clone().sub(position);
  if (view.lengthSq() > 1e-12) {
    view.normalize();
    up.sub(view.clone().multiplyScalar(up.dot(view)));
    if (up.lengthSq() < 1e-8) up.copy(to.up);
    else up.normalize();
  }
  return { target, position, up };
}

export function dieViewPose(
  origin: [number, number, number],
  sizeMm: number,
): ViewPose {
  const [x, y, z] = origin;
  const dist = Math.max(sizeMm * 2.35, 28);
  return {
    target: new Vector3(x, y, z),
    position: new Vector3(x + sizeMm * 0.12, y + sizeMm * 0.4, z + dist),
    up: new Vector3(0, 1, 0),
  };
}

/** Look along the face normal with camera-up matching numeral-up (bitangent). */
export function faceViewPose(
  origin: [number, number, number],
  face: DieFace,
  sizeMm: number,
  numeralRotationDeg = 0,
): ViewPose {
  const target = new Vector3(origin[0], origin[1], origin[2]).add(face.center);
  const dist = Math.max(sizeMm * 1.7, 20);
  const n = face.normal.clone().normalize();
  const position = target.clone().addScaledVector(n, dist);
  const up = face.bitangent.clone();
  up.sub(n.clone().multiplyScalar(up.dot(n)));
  if (up.lengthSq() < 1e-8) {
    up.set(0, 1, 0);
    up.sub(n.clone().multiplyScalar(up.dot(n)));
  }
  if (up.lengthSq() < 1e-8) up.set(1, 0, 0);
  up.normalize();
  if (numeralRotationDeg) {
    up.applyAxisAngle(n, (numeralRotationDeg * Math.PI) / 180);
  }
  return { target, position, up };
}
