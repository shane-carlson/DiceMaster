import { describe, expect, it } from "vitest";
import {
  createDie,
  DEFAULT_CORNER_ROUNDING,
  DEFAULT_DIGIT_ANCHOR,
  DEFAULT_EMBLEM_OFFSET_Y,
  DEFAULT_EMBLEM_SCALE,
  DEFAULT_FONT_SCALE,
  DEFAULT_GLYPH_SCALE,
  ensureCornerRounding,
  ensureDigitAnchor,
  LEGACY_DEFAULT_CORNER_ROUNDING,
  makeEmblem,
  resetDieSliders,
} from "./defaults";
import { defaultCarveDepth } from "./carve";
import { sizeFor } from "./sizes";
import { needsDigitAnchor } from "./types";

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
    die.digitAnchor = "arrow";
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
    expect(next.digitAnchor).toBe(DEFAULT_DIGIT_ANCHOR);
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

describe("createDie", () => {
  it("starts every shape with zero corner rounding", () => {
    for (const type of ["d4", "d6", "d8", "d10", "d00", "d12", "d20"] as const) {
      expect(createDie(type).cornerRounding).toBe(DEFAULT_CORNER_ROUNDING);
    }
  });

  it("underlines 6 and 9 by default", () => {
    expect(createDie("d20").digitAnchor).toBe("underline");
    expect(createDie("d6").faces.find((f) => f.primary.text === "6")?.primary.underscore).toBe(true);
  });
});

describe("ensureCornerRounding", () => {
  it("migrates the old 0.18 factory default to 0", () => {
    const die = createDie("d20", "standard", { cornerRounding: LEGACY_DEFAULT_CORNER_ROUNDING });
    expect(ensureCornerRounding(die).cornerRounding).toBe(0);
  });

  it("keeps a custom rounding value", () => {
    const die = createDie("d6", "standard", { cornerRounding: 0.35 });
    expect(ensureCornerRounding(die).cornerRounding).toBe(0.35);
  });
});

describe("ensureDigitAnchor", () => {
  it("defaults missing marks to underline", () => {
    const die = createDie("d20");
    const legacy = { ...die, digitAnchor: undefined as never };
    expect(ensureDigitAnchor(legacy).digitAnchor).toBe("underline");
  });

  it("treats every 6/9 underscore off as none", () => {
    const die = createDie("d6");
    for (const face of die.faces) {
      if (face.primary.text === "6" || face.primary.text === "9") {
        face.primary.underscore = false;
      }
    }
    const legacy = { ...die, digitAnchor: undefined as never };
    expect(ensureDigitAnchor(legacy).digitAnchor).toBe("none");
  });

  it("keeps a chosen mark", () => {
    const die = createDie("d10", "standard", { digitAnchor: "arrow" });
    expect(ensureDigitAnchor(die).digitAnchor).toBe("arrow");
  });
});

describe("needsDigitAnchor", () => {
  it("only marks the ambiguous single digits", () => {
    expect(needsDigitAnchor("6")).toBe(true);
    expect(needsDigitAnchor("9")).toBe(true);
    expect(needsDigitAnchor(" 6 ")).toBe(true);
    expect(needsDigitAnchor("16")).toBe(false);
    expect(needsDigitAnchor("60")).toBe(false);
    expect(needsDigitAnchor("1")).toBe(false);
  });
});
