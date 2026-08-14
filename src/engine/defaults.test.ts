import { describe, expect, it } from "vitest";
import {
  createDie,
  DEFAULT_CORNER_ROUNDING,
  DEFAULT_EMBLEM_OFFSET_Y,
  DEFAULT_EMBLEM_SCALE,
  DEFAULT_FONT_SCALE,
  DEFAULT_GLYPH_SCALE,
  makeEmblem,
  resetDieSliders,
} from "./defaults";
import { defaultCarveDepth } from "./carve";
import { sizeFor } from "./sizes";

describe("resetDieSliders", () => {
  it("restores sliders and options while keeping inscriptions", () => {
    const die = createDie("d6", "standard", { name: "Lucky cube" });
    die.cornerRounding = 0.5;
    die.sizeMm = 40;
    die.sizeFormat = "custom";
    die.engravingDepth = 2;
    die.fontScale = 1.4;
    die.bumpers = true;
    die.engraveMode = "emboss";
    die.numberStyle = "pips";
    die.color = "#000000";
    die.faces[0].primary.text = "NAT";
    die.faces[0].primary.offsetX = 0.4;
    die.faces[0].primary.scale = 1.8;
    die.faces[5].emblem = {
      ...makeEmblem("symbol", "dragon"),
      offsetY: 0.1,
      scale: 0.9,
      rotation: 45,
    };

    const next = resetDieSliders(die);
    expect(next.id).toBe(die.id);
    expect(next.name).toBe("Lucky cube");
    expect(next.type).toBe("d6");
    expect(next.sizeFormat).toBe("standard");
    expect(next.sizeMm).toBe(sizeFor("d6", "standard"));
    expect(next.cornerRounding).toBe(DEFAULT_CORNER_ROUNDING);
    expect(next.engravingDepth).toBe(defaultCarveDepth("standard"));
    expect(next.fontScale).toBe(DEFAULT_FONT_SCALE);
    expect(next.bumpers).toBe(false);
    expect(next.engraveMode).toBe("engrave");
    expect(next.numberStyle).toBe("numerals");
    expect(next.faces[0].primary.text).toBe("NAT");
    expect(next.faces[0].primary.offsetX).toBe(0);
    expect(next.faces[0].primary.scale).toBe(DEFAULT_GLYPH_SCALE);
    expect(next.faces[5].emblem?.symbolId).toBe("dragon");
    expect(next.faces[5].emblem?.offsetY).toBe(DEFAULT_EMBLEM_OFFSET_Y);
    expect(next.faces[5].emblem?.scale).toBe(DEFAULT_EMBLEM_SCALE);
    expect(next.faces[5].emblem?.rotation).toBe(0);
  });

  it("keeps a named size format and restores that format’s catalog size", () => {
    const die = createDie("d20", "chonk");
    die.sizeMm = 50;
    const next = resetDieSliders(die);
    expect(next.sizeFormat).toBe("chonk");
    expect(next.sizeMm).toBe(sizeFor("d20", "chonk"));
  });
});
