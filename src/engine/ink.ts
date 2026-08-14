/** Relative luminance of a CSS hex color (sRGB). */
export function hexLuminance(hex: string): number {
  const raw = hex.trim().replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (n.length < 6) return 0;
  const srgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(srgb[0]) + 0.7152 * lin(srgb[1]) + 0.0722 * lin(srgb[2]);
}

export const INK_DARK = "#1a1008";
export const INK_LIGHT = "#fff8ee";
export const EMBLEM_INK = "#f0d78a";
/** Unpainted well floor — same grey on every die so carvings stay readable. */
export const CARVE_FLOOR = "#b4aea6";

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const l1 = hexLuminance(a);
  const l2 = hexLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Preview / editor mark color. Carve floors are grey on every pigment. */
export function numeralInk(
  _dieColor: string,
  role: "primary" | "emblem" | "pip" = "primary",
): string {
  if (role === "emblem") return EMBLEM_INK;
  return CARVE_FLOOR;
}
