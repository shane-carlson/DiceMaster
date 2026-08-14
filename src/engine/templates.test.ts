import { describe, expect, it } from "vitest";
import { createDie } from "./defaults";
import { diceFromTemplate, SET_TEMPLATES, templateById } from "./templates";
import { DIE_FACE_COUNT } from "./types";
import { Mesh, MeshNormalMaterial } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { createDieGeometry } from "./geometry";

describe("templates", () => {
  it("standard polyhedral set has seven pieces", () => {
    const t = templateById("standard-polyhedral");
    expect(t).toBeTruthy();
    const dice = diceFromTemplate(t!);
    expect(dice).toHaveLength(7);
    expect(dice.map((d) => d.type)).toEqual(["d4", "d6", "d8", "d10", "d00", "d12", "d20"]);
    expect(dice.every((d) => d.cornerRounding === 0)).toBe(true);
  });

  it("every template die starts with zero corner rounding", () => {
    for (const t of SET_TEMPLATES) {
      for (const die of diceFromTemplate(t)) {
        expect(die.cornerRounding, t.id).toBe(0);
      }
    }
  });

  it("every template builds the advertised face counts", () => {
    for (const t of SET_TEMPLATES) {
      for (const die of diceFromTemplate(t)) {
        expect(die.faces).toHaveLength(DIE_FACE_COUNT[die.type]);
      }
    }
  });

  it("crystal kit uses the catalog heights and silhouettes", () => {
    const t = templateById("crystal-kit");
    expect(t).toBeTruthy();
    const dice = diceFromTemplate(t!);
    expect(dice.map((d) => [d.type, d.sizeMm, d.name])).toEqual([
      ["d4crystal", 29, "D4 Crystal"],
      ["d4teardrop", 29, "D4 Teardrop"],
      ["d4", 20, "D4 Caltrop"],
      ["d6", 16, "D6 Cube"],
      ["d8", 29, "D8 Octahedron"],
      ["d10", 29, "D10 Trapezohedron"],
      ["d00", 29, "D% Percentile"],
      ["d12", 19, "D12 Dodecahedron"],
      ["d20", 26, "D20 Icosahedron"],
      ["d20", 45, "D20 45mm"],
    ]);
    for (const die of dice) {
      expect(die.sizeFormat).toBe("custom");
      const geo = createDieGeometry(die.type, die.sizeMm);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      expect(bb.max.y - bb.min.y).toBeCloseTo(die.sizeMm, 3);
    }
  });

  it("chonk D20 is oversized versus standard", () => {
    const chonk = createDie("d20", "chonk");
    const standard = createDie("d20", "standard");
    expect(chonk.sizeMm).toBeGreaterThan(standard.sizeMm);
  });
});

describe("stl exporter", () => {
  it("writes a binary STL larger than the 84-byte header", () => {
    const geom = createDieGeometry("d6", 16);
    const mesh = new Mesh(geom, new MeshNormalMaterial());
    const exporter = new STLExporter();
    const data = exporter.parse(mesh, { binary: true });
    expect(data).toBeInstanceOf(DataView);
    expect((data as DataView).byteLength).toBeGreaterThan(84);
  });
});
