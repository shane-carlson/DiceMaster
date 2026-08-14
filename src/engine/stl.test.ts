import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { createDie } from "./defaults";
import { bakeEngraving, buildDie } from "./buildDie";
import { exportPackedPlateStl } from "./stl";
import type { DieType } from "./types";

const font = opentype.parse(readFileSync("public/fonts/Oswald-Bold.ttf").buffer);

describe("stl print bake", () => {
  const types: DieType[] = ["d4crystal", "d4teardrop", "d6"];

  for (const type of types) {
    it(`bakes ${type} with a position attribute`, async () => {
      const die = createDie(type, "standard");
      const build = await buildDie(die, font, [], 1, "print");
      const baked = bakeEngraving(build, die.engraveMode);
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
});
