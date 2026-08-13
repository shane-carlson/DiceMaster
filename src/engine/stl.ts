import { Mesh, MeshNormalMaterial } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import JSZip from "jszip";
import type { Font } from "opentype.js";
import { bakeEngraving, buildDie } from "./buildDie";
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
