import { BufferAttribute, BufferGeometry, Matrix4 } from "three";
import type { Manifold, ManifoldToplevel, Mat4 } from "manifold-3d";
import { loadManifold } from "./manifoldWasm";
import { uniqueVertices } from "./geometry";
import { cutterPlacement } from "./carve";
import type { PlacedGlyph } from "./buildDie";
import type { GlyphShapeContours } from "./glyphs";

function toMat4(matrix: Matrix4): Mat4 {
  return [...matrix.elements] as Mat4;
}

function uniquePoly(points: { x: number; y: number }[]): [number, number][] {
  const ring: [number, number][] = [];
  const e2 = 1e-10;
  for (const p of points) {
    const prev = ring[ring.length - 1];
    if (prev && (prev[0] - p.x) ** 2 + (prev[1] - p.y) ** 2 < e2) continue;
    ring.push([p.x, p.y]);
  }
  if (ring.length > 1) {
    const a = ring[0];
    const b = ring[ring.length - 1];
    if ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < e2) ring.pop();
  }
  return ring;
}

function signedArea(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  return area / 2;
}

function contourPolygons(contours: GlyphShapeContours[]): [number, number][][] {
  const polys: [number, number][][] = [];
  for (const contour of contours) {
    const outer = uniquePoly(contour.outer);
    if (outer.length >= 3) {
      if (signedArea(outer) < 0) outer.reverse();
      polys.push(outer);
    }
    for (const holePts of contour.holes) {
      const hole = uniquePoly(holePts);
      if (hole.length < 3) continue;
      if (signedArea(hole) > 0) hole.reverse();
      polys.push(hole);
    }
  }
  return polys;
}

function glyphCutter(wasm: ManifoldToplevel, glyph: PlacedGlyph, mode: "engrave" | "emboss"): Manifold | null {
  const cut = cutterPlacement(glyph.depth, mode);
  const matrix = glyph.cutterMatrix ?? glyph.matrix;
  if (glyph.shapes.length > 0) {
    const polys = contourPolygons(glyph.shapes);
    if (polys.length === 0) return null;
    const cs = new wasm.CrossSection(polys, "Positive");
    if (cs.isEmpty()) {
      cs.delete();
      return null;
    }
    const solid = cs.extrude(cut.height, 0, 0, 1, true);
    cs.delete();
    const placed = solid.transform(toMat4(matrix));
    solid.delete();
    return placed;
  }

  const cutter = glyph.cutter ?? glyph.geometry;
  cutter.computeBoundingBox();
  const bb = cutter.boundingBox;
  if (!bb) return null;
  const radius = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y) / 2;
  if (!(radius > 1e-4)) return null;
  const cyl = wasm.Manifold.cylinder(cut.height, radius, radius, 24, true);
  const placed = cyl.transform(toMat4(matrix));
  cyl.delete();
  return placed;
}

function manifoldToGeometry(solid: Manifold): BufferGeometry {
  const cleaned = solid.asOriginal();
  const mesh = cleaned.getMesh();
  cleaned.delete();
  const { numProp, vertProperties, triVerts } = mesh;
  let positions: Float32Array;
  if (numProp === 3) {
    positions = new Float32Array(vertProperties);
  } else {
    const n = vertProperties.length / numProp;
    positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = vertProperties[i * numProp];
      positions[i * 3 + 1] = vertProperties[i * numProp + 1];
      positions[i * 3 + 2] = vertProperties[i * numProp + 2];
    }
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(positions, 3));
  geom.setIndex(new BufferAttribute(new Uint32Array(triVerts), 1));
  geom.computeVertexNormals();
  return geom;
}

export async function carvePrintSolid(
  bodyGeom: BufferGeometry,
  glyphs: PlacedGlyph[],
  mode: "engrave" | "emboss",
  bumperMm: number,
  onProgress?: (done: number, total: number) => void | Promise<void>,
): Promise<BufferGeometry> {
  const wasm = await loadManifold();
  const pts = uniqueVertices(bodyGeom).map((v) => [v.x, v.y, v.z] as [number, number, number]);
  if (pts.length < 4) return bodyGeom.clone();

  let body = wasm.Manifold.hull(pts);
  const spawned: Manifold[] = [];
  const forget = (m: Manifold) => {
    spawned.push(m);
  };
  forget(body);

  try {
    if (bumperMm > 0.05) {
      const spheres = uniqueVertices(bodyGeom).map((v) => {
        const s = wasm.Manifold.sphere(bumperMm, 16);
        const t = s.translate([v.x, v.y, v.z]);
        s.delete();
        forget(t);
        return t;
      });
      const bumped = wasm.Manifold.union([body, ...spheres]);
      forget(bumped);
      body = bumped;
    }

    const total = Math.max(glyphs.length, 1);
    await onProgress?.(0, total);
    const tools: Manifold[] = [];
    for (let i = 0; i < glyphs.length; i++) {
      try {
        const tool = glyphCutter(wasm, glyphs[i], mode);
        if (tool && !tool.isEmpty()) {
          forget(tool);
          tools.push(tool);
        } else {
          tool?.delete();
        }
      } catch {
        // Skip a glyph that cannot form a solid rather than shredding the die.
      }
      await onProgress?.(i + 1, total);
    }

    if (tools.length > 0) {
      const cutter = tools.length === 1 ? tools[0] : wasm.Manifold.union(tools);
      if (tools.length > 1) forget(cutter);
      const carved = mode === "emboss" ? body.add(cutter) : body.subtract(cutter);
      forget(carved);
      if (carved.isEmpty() || carved.status() !== "NoError" || carved.volume() <= 0) {
        throw new Error("Could not carve a solid STL mesh.");
      }
      body = carved;
    }

    return manifoldToGeometry(body);
  } finally {
    for (const m of spawned) {
      try {
        m.delete();
      } catch {
        /* already freed */
      }
    }
  }
}
