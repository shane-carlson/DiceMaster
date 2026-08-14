import { uid } from "./id";
import { defaultBumperSize, sizeFor } from "./sizes";
import { defaultCarveDepth, resolveCarveDepth } from "./carve";
import { TOKEN_DIAMETER_MM, resolveTokenShape } from "./token";
import type {
  DigitAnchor,
  DieInstance,
  DieType,
  D10Style,
  FaceSettings,
  GlyphSettings,
  SizeFormatId,
} from "./types";
import {
  DIE_COLORS,
  DIE_FACE_COUNT,
  DIE_LABELS,
  isDigitAnchor,
  needsDigitAnchor,
} from "./types";

export function defaultLabels(type: DieType, d10Style: D10Style): string[] {
  switch (type) {
    case "d2":
      return ["1", "2"];
    case "d4":
    case "d4crystal":
    case "d4teardrop":
      return ["1", "2", "3", "4"];
    case "d6":
      return ["1", "2", "3", "4", "5", "6"];
    case "d8":
      return ["1", "2", "3", "4", "5", "6", "7", "8"];
    case "d10":
      return d10Style === "0-9"
        ? ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
        : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    case "d00":
      return ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"];
    case "d12":
      return Array.from({ length: 12 }, (_, i) => String(i + 1));
    case "d20":
      return Array.from({ length: 20 }, (_, i) => String(i + 1));
    case "token":
      return ["", ""];
  }
}

export const DEFAULT_GLYPH_SCALE = 1;
export const DEFAULT_EMBLEM_SCALE = 0.42;
export const DEFAULT_EMBLEM_OFFSET_Y = 0.58;
export const DEFAULT_FONT_SCALE = 1;
export const DEFAULT_GLOBAL_FONT_SCALE = 1;
export const DEFAULT_CORNER_ROUNDING = 0;
/** Factory rounding before it was set to 0. Migrated to 0 when loading old sets. */
export const LEGACY_DEFAULT_CORNER_ROUNDING = 0.18;
export const DEFAULT_DIGIT_ANCHOR: DigitAnchor = "underline";

export function makeEmblem(kind: "symbol" | "logo", id: string): GlyphSettings {
  return {
    kind,
    text: "",
    symbolId: kind === "symbol" ? id : null,
    logoId: kind === "logo" ? id : null,
    offsetX: 0,
    offsetY: DEFAULT_EMBLEM_OFFSET_Y,
    rotation: 0,
    scale: DEFAULT_EMBLEM_SCALE,
    depth: null,
    underscore: false,
  };
}

export function makeGlyph(text: string): GlyphSettings {
  const confused = text === "6" || text === "9";
  return {
    kind: "number",
    text,
    symbolId: null,
    logoId: null,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: DEFAULT_GLYPH_SCALE,
    depth: null,
    underscore: confused,
  };
}

export function makeBlankGlyph(): GlyphSettings {
  return {
    kind: "blank",
    text: "",
    symbolId: null,
    logoId: null,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: DEFAULT_GLYPH_SCALE,
    depth: null,
    underscore: false,
  };
}

export function makeFaces(type: DieType, d10Style: D10Style): FaceSettings[] {
  if (type === "token") {
    return Array.from({ length: DIE_FACE_COUNT.token }, () => ({
      primary: makeBlankGlyph(),
      emblem: null,
    }));
  }
  return defaultLabels(type, d10Style).map((text) => ({
    primary: makeGlyph(text),
    emblem: null,
  }));
}

export function createDie(
  type: DieType,
  format: SizeFormatId = "standard",
  extras: Partial<DieInstance> = {},
): DieInstance {
  const d10Style = extras.d10Style ?? "0-9";
  const colorIndex = Object.keys(DIE_LABELS).indexOf(type);
  const die: DieInstance = {
    id: uid(),
    type,
    name: DIE_LABELS[type],
    sizeMm: sizeFor(type, format),
    sizeFormat: format,
    cornerRounding: DEFAULT_CORNER_ROUNDING,
    engravingDepth: defaultCarveDepth(format),
    fontScale: DEFAULT_FONT_SCALE,
    color: DIE_COLORS[colorIndex % DIE_COLORS.length],
    bumpers: false,
    bumperSize: defaultBumperSize(format),
    engraveMode: "engrave",
    d10Style,
    numberStyle: "numerals",
    digitAnchor: extras.digitAnchor ?? DEFAULT_DIGIT_ANCHOR,
    tokenShape: type === "token" ? resolveTokenShape(extras.tokenShape) : extras.tokenShape,
    faces: makeFaces(type, d10Style),
  };
  if (type === "token") {
    die.sizeMm = extras.sizeMm ?? TOKEN_DIAMETER_MM;
    die.sizeFormat = extras.sizeFormat ?? "custom";
    die.name = extras.name ?? DIE_LABELS.token;
  }
  return ensureCarveDepth({ ...die, ...extras, type, faces: extras.faces ?? die.faces });
}

export function rescaleDie(die: DieInstance, format: SizeFormatId): DieInstance {
  return {
    ...die,
    sizeFormat: format,
    sizeMm: sizeFor(die.type, format),
    engravingDepth: defaultCarveDepth(format),
    bumperSize: defaultBumperSize(format),
  };
}

export function ensureCarveDepth(die: DieInstance): DieInstance {
  const engravingDepth = resolveCarveDepth(die);
  if (die.engravingDepth === engravingDepth) return die;
  return { ...die, engravingDepth };
}

export function ensureTokenShape(die: DieInstance): DieInstance {
  if (die.type !== "token") return die;
  const tokenShape = resolveTokenShape(die.tokenShape);
  if (die.tokenShape === tokenShape) return die;
  return { ...die, tokenShape };
}

export function ensureFaceCount(die: DieInstance): DieInstance {
  const needed = DIE_FACE_COUNT[die.type];
  if (die.faces.length === needed) return die;
  const next = makeFaces(die.type, die.d10Style);
  for (let i = 0; i < Math.min(needed, die.faces.length); i++) {
    next[i] = die.faces[i];
  }
  return { ...die, faces: next };
}

/** Missing values and the old 0.18 factory default become sharp (0). Custom rounding is kept. */
export function ensureCornerRounding(die: DieInstance): DieInstance {
  const value = die.cornerRounding;
  if (!Number.isFinite(value) || value === LEGACY_DEFAULT_CORNER_ROUNDING) {
    if (value === DEFAULT_CORNER_ROUNDING) return die;
    return { ...die, cornerRounding: DEFAULT_CORNER_ROUNDING };
  }
  return die;
}

function inferDigitAnchor(die: DieInstance): DigitAnchor {
  if (isDigitAnchor(die.digitAnchor)) return die.digitAnchor;
  const marks = die.faces.flatMap((f) => [f.primary, ...(f.emblem ? [f.emblem] : [])]);
  const sixNine = marks.filter((g) => needsDigitAnchor(g.text));
  if (sixNine.length > 0 && sixNine.every((g) => g.underscore === false)) return "none";
  return DEFAULT_DIGIT_ANCHOR;
}

/** Fill in 6/9 marks from saved JSON. Per-glyph underscore: false on every 6/9 becomes none. */
export function ensureDigitAnchor(die: DieInstance): DieInstance {
  const digitAnchor = inferDigitAnchor(die);
  if (die.digitAnchor === digitAnchor) return die;
  return { ...die, digitAnchor };
}

export function resetGlyphPlacement(
  glyph: GlyphSettings,
  role: "primary" | "emblem",
): GlyphSettings {
  const confused = glyph.kind === "number" && (glyph.text === "6" || glyph.text === "9");
  return {
    ...glyph,
    offsetX: 0,
    offsetY: role === "emblem" ? DEFAULT_EMBLEM_OFFSET_Y : 0,
    rotation: 0,
    scale: role === "emblem" ? DEFAULT_EMBLEM_SCALE : DEFAULT_GLYPH_SCALE,
    depth: null,
    underscore: confused,
  };
}

/** Restore inspector sliders and option chips; keep type, name, and face inscriptions. */
export function resetDieSliders(die: DieInstance): DieInstance {
  const format: SizeFormatId = die.sizeFormat === "custom" ? "standard" : die.sizeFormat;
  const fresh = createDie(die.type, format, {
    id: die.id,
    name: die.name,
    tokenShape: die.tokenShape,
  });
  return {
    ...fresh,
    faces: die.faces.map((face) => ({
      primary: resetGlyphPlacement(face.primary, "primary"),
      emblem: face.emblem ? resetGlyphPlacement(face.emblem, "emblem") : null,
    })),
  };
}
