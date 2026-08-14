import { BufferGeometry, Mesh, MeshNormalMaterial } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import JSZip from "jszip";
import type { Font } from "opentype.js";
import { bakeEngraving, buildDie } from "./buildDie";
import { packFootprints, STANDARD_RESIN_PLATE } from "./packPlate";
import type { DieInstance, LogoAsset, Project } from "./types";

const exporter = new STLExporter();

export function geometryToStl(geometry: ReturnType<typeof bakeEngraving>): ArrayBuffer {
  const mesh = new Mesh(geometry, new MeshNormalMaterial());
  mesh.updateMatrixWorld();
  const data = exporter.parse(mesh, { binary: true });
  if (data instanceof ArrayBuffer) return data;
  if (typeof DataView !== "undefined" && data instanceof DataView) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return copy.buffer;
  }
  const text = String(data);
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "die"
  );
}

export async function exportDieStl(
  die: DieInstance,
  font: Font,
  logos: LogoAsset[],
  globalScale: number,
): Promise<{ name: string; buffer: ArrayBuffer }> {
  const build = await buildDie(die, font, logos, globalScale, "print");
  const baked = bakeEngraving(build, die.engraveMode);
  const buffer = geometryToStl(baked);
  baked.dispose();
  build.body.dispose();
  for (const g of build.glyphs) g.geometry.dispose();
  return { name: `${slug(die.name)}-${die.type}-${Math.round(die.sizeMm)}mm.stl`, buffer };
}

export async function exportProjectZip(
  project: Project,
  dice: DieInstance[],
  font: Font,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(slug(project.name) || "dicemaster")!;
  const total = dice.length;
  for (let i = 0; i < dice.length; i++) {
    const die = dice[i];
    onProgress?.(i, total, die.name);
    const { name, buffer } = await exportDieStl(
      die,
      font,
      project.logos,
      project.globalFontScale,
    );
    folder.file(name, buffer);
  }
  onProgress?.(total, total, "Packing");
  return zip.generateAsync({ type: "blob" });
}

export function safeFilename(name: string, ext: string): string {
  return `${slug(name)}.${ext}`;
}

function sitOnBuildPlate(geom: BufferGeometry) {
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return;
  geom.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
}

export async function exportPackedPlateStl(
  project: Project,
  dice: DieInstance[],
  font: Font,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<{
  name: string;
  buffer: ArrayBuffer;
  width: number;
  depth: number;
  fitsPlate: boolean;
}> {
  const pieces: { id: string; geom: BufferGeometry; width: number; depth: number }[] = [];
  const total = dice.length;
  for (let i = 0; i < dice.length; i++) {
    const die = dice[i];
    onProgress?.(i, total, die.name);
    const build = await buildDie(die, font, project.logos, project.globalFontScale, "print");
    const baked = bakeEngraving(build, die.engraveMode);
    sitOnBuildPlate(baked);
    baked.computeBoundingBox();
    const bb = baked.boundingBox!;
    pieces.push({
      id: die.id,
      geom: baked,
      width: bb.max.x - bb.min.x,
      depth: bb.max.z - bb.min.z,
    });
    build.body.dispose();
    for (const g of build.glyphs) g.geometry.dispose();
  }

  const packed = packFootprints(
    pieces.map((p) => ({ id: p.id, width: p.width, depth: p.depth })),
    STANDARD_RESIN_PLATE,
  );
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const placed: BufferGeometry[] = [];
  for (const slot of packed.slots) {
    const piece = byId.get(slot.id);
    if (!piece) continue;
    piece.geom.translate(slot.x, 0, slot.z);
    placed.push(piece.geom);
  }

  for (const geom of placed) {
    if (geom.getAttribute("uv")) geom.deleteAttribute("uv");
    if (!geom.getAttribute("normal")) geom.computeVertexNormals();
  }
  const merged =
    placed.length <= 1 ? placed[0]! : (mergeGeometries(placed, false) ?? placed[0]!);
  merged.rotateX(-Math.PI / 2);
  merged.computeBoundingBox();
  const bb = merged.boundingBox;
  if (bb) merged.translate(-bb.min.x, -bb.min.y, -bb.min.z);

  const buffer = geometryToStl(merged);
  if (placed.length > 1) {
    for (const g of placed) g.dispose();
  }
  merged.dispose();
  onProgress?.(total, total, "Plate");
  return {
    name: `${slug(project.name) || "dicemaster"}-plate.stl`,
    buffer,
    width: packed.width,
    depth: packed.depth,
    fitsPlate: packed.fitsPlate,
  };
}
