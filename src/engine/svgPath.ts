import { ShapePath, Vector2 } from "three";

/** Split an SVG path `d` into a ShapePath (M/L/H/V/C/A/Z, abs + rel). */
export function parseSvgPath(d: string): ShapePath {
  const path = new ShapePath();
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? [];
  const point = new Vector2();
  const start = new Vector2();
  let started = false;

  const numbers = (raw: string) => parseSvgNumbers(raw);

  for (const command of commands) {
    const type = command.charAt(0);
    const nums = numbers(command.slice(1));

    switch (type) {
      case "M":
      case "m": {
        const rel = type === "m";
        for (let j = 0; j < nums.length; j += 2) {
          if (rel) {
            point.x += nums[j];
            point.y += nums[j + 1];
          } else {
            point.set(nums[j], nums[j + 1]);
          }
          if (j === 0) {
            path.moveTo(point.x, point.y);
            start.copy(point);
            started = true;
          } else {
            path.lineTo(point.x, point.y);
          }
        }
        break;
      }
      case "L":
      case "l": {
        const rel = type === "l";
        for (let j = 0; j < nums.length; j += 2) {
          if (rel) {
            point.x += nums[j];
            point.y += nums[j + 1];
          } else {
            point.set(nums[j], nums[j + 1]);
          }
          path.lineTo(point.x, point.y);
        }
        break;
      }
      case "H":
      case "h": {
        const rel = type === "h";
        for (const n of nums) {
          point.x = rel ? point.x + n : n;
          path.lineTo(point.x, point.y);
        }
        break;
      }
      case "V":
      case "v": {
        const rel = type === "v";
        for (const n of nums) {
          point.y = rel ? point.y + n : n;
          path.lineTo(point.x, point.y);
        }
        break;
      }
      case "C":
      case "c": {
        const rel = type === "c";
        for (let j = 0; j < nums.length; j += 6) {
          const x1 = rel ? point.x + nums[j] : nums[j];
          const y1 = rel ? point.y + nums[j + 1] : nums[j + 1];
          const x2 = rel ? point.x + nums[j + 2] : nums[j + 2];
          const y2 = rel ? point.y + nums[j + 3] : nums[j + 3];
          const x = rel ? point.x + nums[j + 4] : nums[j + 4];
          const y = rel ? point.y + nums[j + 5] : nums[j + 5];
          path.bezierCurveTo(x1, y1, x2, y2, x, y);
          point.set(x, y);
        }
        break;
      }
      case "A":
      case "a": {
        const rel = type === "a";
        for (let j = 0; j < nums.length; j += 7) {
          const startPt = point.clone();
          if (rel) {
            point.x += nums[j + 5];
            point.y += nums[j + 6];
          } else {
            point.set(nums[j + 5], nums[j + 6]);
          }
          addArc(path, nums[j], nums[j + 1], nums[j + 2], nums[j + 3], nums[j + 4], startPt, point);
        }
        break;
      }
      case "Z":
      case "z":
        path.currentPath?.closePath();
        if (started) point.copy(start);
        break;
      default:
        break;
    }
  }
  return path;
}

export function parseSvgNumbers(data: string): number[] {
  const out: number[] = [];
  const re = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(data))) out.push(parseFloat(match[0]));
  return out;
}

function addArc(
  path: ShapePath,
  rx: number,
  ry: number,
  rotationDeg: number,
  largeArc: number,
  sweep: number,
  start: Vector2,
  end: Vector2,
) {
  if (!path.currentPath) path.moveTo(start.x, start.y);
  const curve = path.currentPath;
  if (!curve) {
    path.lineTo(end.x, end.y);
    return;
  }
  if (rx === 0 || ry === 0) {
    path.lineTo(end.x, end.y);
    return;
  }
  const rotation = (rotationDeg * Math.PI) / 180;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const dx2 = (start.x - end.x) / 2;
  const dy2 = (start.y - end.y) / 2;
  const x1p = Math.cos(rotation) * dx2 + Math.sin(rotation) * dy2;
  const y1p = -Math.sin(rotation) * dx2 + Math.cos(rotation) * dy2;
  let rxs = rx * rx;
  let rys = ry * ry;
  const x1ps = x1p * x1p;
  const y1ps = y1p * y1p;
  const cr = x1ps / rxs + y1ps / rys;
  if (cr > 1) {
    const s = Math.sqrt(cr);
    rx *= s;
    ry *= s;
    rxs = rx * rx;
    rys = ry * ry;
  }
  const dq = rxs * y1ps + rys * x1ps;
  const pq = (rxs * rys - dq) / dq;
  let q = Math.sqrt(Math.max(0, pq));
  if (largeArc === sweep) q = -q;
  const cxp = (q * rx * y1p) / ry;
  const cyp = (-q * ry * x1p) / rx;
  const cx = Math.cos(rotation) * cxp - Math.sin(rotation) * cyp + (start.x + end.x) / 2;
  const cy = Math.sin(rotation) * cxp + Math.cos(rotation) * cyp + (start.y + end.y) / 2;
  const theta = svgAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  const delta = svgAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry) % (Math.PI * 2);
  curve.absellipse(cx, cy, rx, ry, theta, theta + delta, sweep === 0, rotation);
}

function svgAngle(ux: number, uy: number, vx: number, vy: number) {
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  let ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
  if (ux * vy - uy * vx < 0) ang = -ang;
  return ang;
}
