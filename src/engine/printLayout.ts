import { BufferGeometry, Quaternion, Vector3 } from "three";
import type { DieType } from "./types";

/** Extra tilt so a D4's opposite face is not horizontal on the plate. */
export const PRINT_TILT_RAD = (18 * Math.PI) / 180;
/** Lean a standing token/coin so the faces are not perfectly vertical. */
export const TOKEN_LEAN_RAD = (15 * Math.PI) / 180;

const DOWN = new Vector3(0, -1, 0);

export function sitOnBuildPlate(geom: BufferGeometry) {
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return;
  geom.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
}

function aabbCenter(geom: BufferGeometry): Vector3 {
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  return new Vector3(
    (bb.min.x + bb.max.x) / 2,
    (bb.min.y + bb.max.y) / 2,
    (bb.min.z + bb.max.z) / 2,
  );
}

function farthestFrom(geom: BufferGeometry, origin: Vector3): Vector3 {
  const pos = geom.getAttribute("position");
  const tip = new Vector3();
  let best = -1;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = v.distanceToSquared(origin);
    if (d > best) {
      best = d;
      tip.copy(v);
    }
  }
  return tip;
}

function rotateOnto(geom: BufferGeometry, from: Vector3, to: Vector3) {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) return;
  const q = new Quaternion();
  if (a.dot(b) < -0.9999) {
    const axis = Math.abs(a.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    axis.cross(a).normalize();
    q.setFromAxisAngle(axis, Math.PI);
  } else {
    q.setFromUnitVectors(a, b);
  }
  geom.applyQuaternion(q);
}

function standOnRim(geom: BufferGeometry) {
  geom.rotateX(Math.PI / 2 + TOKEN_LEAN_RAD);
  sitOnBuildPlate(geom);
}

function standOnVertex(geom: BufferGeometry) {
  const center = aabbCenter(geom);
  const tip = farthestFrom(geom, center);
  const dir = tip.clone().sub(center);
  if (dir.lengthSq() < 1e-12) {
    sitOnBuildPlate(geom);
    return;
  }
  rotateOnto(geom, dir, DOWN);
  const contact = farthestFrom(geom, aabbCenter(geom));
  geom.translate(-contact.x, -contact.y, -contact.z);
  geom.rotateX(PRINT_TILT_RAD);
  sitOnBuildPlate(geom);
}

/** Orient a print mesh so scaffold auto-supports attach at a vertex or rim. */
export function orientForScaffoldSupports(geom: BufferGeometry, type: DieType) {
  if (type === "token" || type === "d2") standOnRim(geom);
  else standOnVertex(geom);
}

export function printFootprint(geom: BufferGeometry): { width: number; depth: number; height: number } {
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  return {
    width: bb.max.x - bb.min.x,
    depth: bb.max.z - bb.min.z,
    height: bb.max.y - bb.min.y,
  };
}

/** Rotate 90° about Y when the packer swapped width and depth. */
export function matchPackedFootprint(geom: BufferGeometry, slotWidth: number, slotDepth: number) {
  const fp = printFootprint(geom);
  const asIs = Math.abs(fp.width - slotWidth) + Math.abs(fp.depth - slotDepth);
  const swapped = Math.abs(fp.width - slotDepth) + Math.abs(fp.depth - slotWidth);
  if (swapped + 0.05 < asIs) {
    geom.rotateY(Math.PI / 2);
    sitOnBuildPlate(geom);
  }
}

/** Slicer convention: Z up, AABB in the +XYZ octant. */
export function toSlicerZUp(geom: BufferGeometry) {
  geom.rotateX(-Math.PI / 2);
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return;
  geom.translate(-bb.min.x, -bb.min.y, -bb.min.z);
}
