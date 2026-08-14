import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { Mesh, Raycaster } from "three";
import { createDie } from "./defaults";
import { bakeEngraving, buildDie } from "./buildDie";
import { exportPackedPlateStl, exportPercent } from "./stl";
import type { DieType } from "./types";

const font = opentype.parse(readFileSync("public/fonts/Oswald-Bold.ttf").buffer);

describe("stl print bake", () => {
  const types: DieType[] = ["d4crystal", "d4teardrop", "d6"];

  for (const type of types) {
    it(`bakes ${type} with a position attribute`, async () => {
      const die = createDie(type, "standard");
      const build = await buildDie(die, font, [], 1, "print");
      const baked = await bakeEngraving(build, die.engraveMode);
      const pos = baked.getAttribute("position");
      expect(pos).toBeTruthy();
      expect(pos!.count).toBeGreaterThan(8);
    }, 20_000);
  }

  it("packs two dice onto one plate STL", async () => {
    const dice = [createDie("d6", "standard"), createDie("d4teardrop", "standard")];
    const packed = await exportPackedPlateStl(
      {
        version: 1,
        name: "pair",
        fontId: "oswald",
        globalDepth: 0.77,
        globalFontScale: 1,
        dice,
        logos: [],
      },
      dice,
      font,
    );
    expect(packed.buffer.byteLength).toBeGreaterThan(84);
  }, 30_000);

  it("maps die work onto a 0–100 status bar", () => {
    expect(exportPercent(0, 2, 0)).toBe(0);
    expect(exportPercent(0, 2, 1)).toBe(47);
    expect(exportPercent(1, 2, 1)).toBe(94);
    expect(exportPercent(0, 1, 0.5, "packing")).toBe(97);
    expect(exportPercent(0, 4, 0.2, "complete")).toBe(100);
  });

  it("reports glyph batches while baking", async () => {
    const die = createDie("d6", "standard");
    const build = await buildDie(die, font, [], 1, "print");
    const ticks: [number, number][] = [];
    await bakeEngraving(build, die.engraveMode, (done, total) => {
      ticks.push([done, total]);
    });
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]![1]).toBeGreaterThan(0);
    expect(ticks.at(-1)?.[0]).toBe(ticks.at(-1)?.[1]);
  }, 20_000);

  it("punches numeral wells through the d6 faces", async () => {
    const die = createDie("d6", "standard");
    const build = await buildDie(die, font, [], 1, "print");
    const baked = await bakeEngraving(build, die.engraveMode);
    const mesh = new Mesh(baked);
    let wells = 0;
    for (const face of build.faces) {
      const n = face.normal.clone();
      for (let u = -3; u <= 3; u += 1.5) {
        for (let v = -3; v <= 3; v += 1.5) {
          const origin = face.center
            .clone()
            .add(face.tangent.clone().multiplyScalar(u))
            .add(face.bitangent.clone().multiplyScalar(v))
            .add(n.clone().multiplyScalar(6));
          const hit = new Raycaster(origin, n.clone().multiplyScalar(-1), 0, 20).intersectObject(
            mesh,
            false,
          )[0];
          if (hit && n.dot(hit.point.clone().sub(face.center)) < -0.2) wells++;
        }
      }
    }
    expect(wells).toBeGreaterThan(8);
  }, 20_000);
});
