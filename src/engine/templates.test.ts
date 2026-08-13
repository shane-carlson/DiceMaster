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
  });

  it("every template builds the advertised face counts", () => {
    for (const t of SET_TEMPLATES) {
      for (const die of diceFromTemplate(t)) {
        expect(die.faces).toHaveLength(DIE_FACE_COUNT[die.type]);
      }
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
