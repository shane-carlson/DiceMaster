export type DieType =
  | "d2"
  | "d4"
  | "d4crystal"
  | "d4teardrop"
  | "d6"
  | "d8"
  | "d10"
  | "d00"
  | "d12"
  | "d20";

export type SizeFormatId = "mini" | "standard" | "chonk" | "giant";

export type FaceKind = "number" | "text" | "symbol" | "logo" | "blank";

export type EngraveMode = "engrave" | "emboss";

export type D10Style = "0-9" | "1-10";

export type NumberGlyphStyle = "numerals" | "pips";

export interface GlyphSettings {
  kind: FaceKind;
  text: string;
  symbolId: string | null;
  logoId: string | null;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  depth: number | null;
  underscore: boolean;
}

export interface FaceSettings {
  primary: GlyphSettings;
  emblem: GlyphSettings | null;
}

export interface DieInstance {
  id: string;
  type: DieType;
  name: string;
  sizeMm: number;
  sizeFormat: SizeFormatId | "custom";
  cornerRounding: number;
  engravingDepth: number;
  fontScale: number;
  color: string;
  bumpers: boolean;
  bumperSize: number;
  engraveMode: EngraveMode;
  d10Style: D10Style;
  numberStyle: NumberGlyphStyle;
  faces: FaceSettings[];
}

export interface LogoAsset {
  id: string;
  name: string;
  kind: "svg" | "png";
  data: string;
}

export interface Project {
  version: 1;
  name: string;
  fontId: string;
  customFontName?: string;
  customFontBase64?: string;
  globalDepth: number;
  globalFontScale: number;
  dice: DieInstance[];
  logos: LogoAsset[];
}

export const DIE_FACE_COUNT: Record<DieType, number> = {
  d2: 2,
  d4: 4,
  d4crystal: 4,
  d4teardrop: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d00: 10,
  d12: 12,
  d20: 20,
};

export const DIE_LABELS: Record<DieType, string> = {
  d2: "D2 Coin",
  d4: "D4 Tetrahedron",
  d4crystal: "D4 Crystal",
  d4teardrop: "D4 Teardrop",
  d6: "D6 Cube",
  d8: "D8 Octahedron",
  d10: "D10 Trapezohedron",
  d00: "D% Percentile",
  d12: "D12 Dodecahedron",
  d20: "D20 Icosahedron",
};

export const SIZE_FORMAT_LABELS: Record<SizeFormatId, string> = {
  mini: "Mini",
  standard: "Standard",
  chonk: "Chonk",
  giant: "Giant",
};

export const DIE_COLORS = [
  "#b84343",
  "#3d7a5c",
  "#3a5a9a",
  "#7a52b0",
  "#c4893a",
  "#5c5c68",
  "#c44a6e",
  "#2a8a9a",
] as const;
