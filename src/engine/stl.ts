import { BufferGeometry, Mesh, MeshNormalMaterial } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import JSZip from "jszip";
import type { Font } from "opentype.js";
import { bakeEngraving, buildDie, yieldToMain, type DieBuild } from "./buildDie";
import { packFootprints, STANDARD_RESIN_PLATE } from "./packPlate";
import type { DieInstance, LogoAsset, Project } from "./types";

const exporter = new STLExporter();

export type ExportPhase = "preparing" | "building" | "carving" | "packing" | "complete";

export type ExportProgress = {
  done: number;
  total: number;
  label: string;
  phase: ExportPhase;
  detail: string;
  percent: number;
};

export type ExportProgressHandler = (progress: ExportProgress) => void | Promise<void>;

/** Dice occupy 0–94%; packing 97%; complete is 100. */
export function exportPercent(
  dieIndex: number,
  dieCount: number,
  dieFraction: number,
  stage: "work" | "packing" | "complete" = "work",
): number {
  if (stage === "complete" || dieCount <= 0) return 100;
  if (stage === "packing") return 97;
  const frac = Math.min(1, Math.max(0, dieFraction));
  return Math.min(94, Math.round(((dieIndex + frac) / dieCount) * 94));
}

function carveFraction(glyphsDone: number, glyphsTotal: number): number {
  if (glyphsTotal <= 0) return 1;
  return 0.1 + 0.9 * (glyphsDone / glyphsTotal);
}

function dieProgress(
  die: DieInstance,
  dieIndex: number,
  dieCount: number,
  phase: "building" | "carving",
  glyphsDone: number,
  glyphsTotal: number,
): ExportProgress {
  const dieFraction = phase === "building" ? 0.08 : carveFraction(glyphsDone, glyphsTotal);
  return {
    done: dieIndex,
    total: dieCount,
    label: die.name,
    phase,
    detail:
      phase === "building"
        ? `Building ${die.name}`
        : glyphsTotal > 0
          ? `Carving ${die.name} · ${glyphsDone} of ${glyphsTotal}`
          : `Carving ${die.name}`,
    percent: exportPercent(dieIndex, dieCount, dieFraction),
  };
}

async function buildAndBake(
  die: DieInstance,
  font: Font,
  logos: LogoAsset[],
  globalScale: number,
  onCarve?: (phase: "building" | "carving", glyphsDone: number, glyphsTotal: number) => void | Promise<void>,
): Promise<{ build: DieBuild; baked: BufferGeometry }> {
  await onCarve?.("building", 0, 1);
  const build = await buildDie(die, font, logos, globalScale, "print");
  const baked = await bakeEngraving(build, die.engraveMode, async (done, total) => {
    await onCarve?.("carving", done, total);
  });
  return { build, baked };
}

export function geometryToStl(geometry: BufferGeometry): ArrayBuffer {
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
  onProgress?: ExportProgressHandler,
): Promise<{ name: string; buffer: ArrayBuffer }> {
  const { build, baked } = await buildAndBake(
    die,
    font,
    logos,
    globalScale,
    async (phase, gDone, gTotal) => {
      await onProgress?.(dieProgress(die, 0, 1, phase, gDone, gTotal));
    },
  );
  const buffer = geometryToStl(baked);
  baked.dispose();
  build.body.dispose();
  for (const g of build.glyphs) g.geometry.dispose();
  await onProgress?.({
    done: 1,
    total: 1,
    label: die.name,
    phase: "complete",
    detail: "Ready to download",
    percent: 100,
  });
  return { name: `${slug(die.name)}-${die.type}-${Math.round(die.sizeMm)}mm.stl`, buffer };
}

export async function exportProjectZip(
  project: Project,
  dice: DieInstance[],
  font: Font,
  onProgress?: ExportProgressHandler,
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(slug(project.name) || "dicemaster")!;
  const total = dice.length;
  for (let i = 0; i < dice.length; i++) {
    const die = dice[i];
    await yieldToMain();
    const { build, baked } = await buildAndBake(
      die,
      font,
      project.logos,
      project.globalFontScale,
      async (phase, gDone, gTotal) => {
        await onProgress?.(dieProgress(die, i, total, phase, gDone, gTotal));
      },
    );
    const buffer = geometryToStl(baked);
    folder.file(`${slug(die.name)}-${die.type}-${Math.round(die.sizeMm)}mm.stl`, buffer);
    baked.dispose();
    build.body.dispose();
    for (const g of build.glyphs) g.geometry.dispose();
  }
  await onProgress?.({
    done: total,
    total,
    label: "Archive",
    phase: "packing",
    detail: "Zipping STL files",
    percent: exportPercent(0, total, 0, "packing"),
  });
  const blob = await zip.generateAsync({ type: "blob" });
  await onProgress?.({
    done: total,
    total,
    label: "Archive",
    phase: "complete",
    detail: "Ready to download",
    percent: 100,
  });
  return blob;
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
  onProgress?: ExportProgressHandler,
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
    await yieldToMain();
    const { build, baked } = await buildAndBake(
      die,
      font,
      project.logos,
      project.globalFontScale,
      async (phase, gDone, gTotal) => {
        await onProgress?.(dieProgress(die, i, total, phase, gDone, gTotal));
      },
    );
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

  await onProgress?.({
    done: total,
    total,
    label: "Plate",
    phase: "packing",
    detail: "Packing the build plate",
    percent: exportPercent(0, total, 0, "packing"),
  });
  await yieldToMain();

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
  await onProgress?.({
    done: total,
    total,
    label: "Plate",
    phase: "complete",
    detail: "Ready to download",
    percent: 100,
  });
  return {
    name: `${slug(project.name) || "dicemaster"}-plate.stl`,
    buffer,
    width: packed.width,
    depth: packed.depth,
    fitsPlate: packed.fitsPlate,
  };
}
