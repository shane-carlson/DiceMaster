import type { Font } from "opentype.js";

export interface FontOption {
  id: string;
  name: string;
  file: string;
  mood: string;
}

export const BUILTIN_FONTS: FontOption[] = [
  {
    id: "oswald",
    name: "Oswald Bold",
    file: "/fonts/Oswald-Bold.ttf",
    mood: "Clean numerals, prints sharp",
  },
  {
    id: "cinzel",
    name: "Cinzel Bold",
    file: "/fonts/Cinzel-Bold.ttf",
    mood: "Imperial serif, high-fantasy",
  },
  {
    id: "uncial",
    name: "Uncial Antiqua",
    file: "/fonts/UncialAntiqua-Regular.ttf",
    mood: "Illuminated manuscript",
  },
  {
    id: "medieval",
    name: "Medieval Sharp",
    file: "/fonts/MedievalSharp-Regular.ttf",
    mood: "Tavern-sign gothic",
  },
  {
    id: "pirata",
    name: "Pirata One",
    file: "/fonts/PirataOne-Regular.ttf",
    mood: "Swashbuckling display",
  },
  {
    id: "metamorphous",
    name: "Metamorphous",
    file: "/fonts/Metamorphous-Regular.ttf",
    mood: "Arcane and slightly alien",
  },
  {
    id: "cinzel-deco",
    name: "Cinzel Decorative",
    file: "/fonts/CinzelDecorative-Bold.ttf",
    mood: "Ornate titles & crests",
  },
];

const cache = new Map<string, Promise<Font>>();

async function parseFontBuffer(buffer: ArrayBuffer): Promise<Font> {
  const opentype = await import("opentype.js");
  const font = opentype.parse(buffer);
  if (!font || !font.glyphs || font.glyphs.length === 0) {
    throw new Error("Could not parse font file");
  }
  return font;
}

export function loadBuiltinFont(id: string): Promise<Font> {
  const option = BUILTIN_FONTS.find((f) => f.id === id) ?? BUILTIN_FONTS[0];
  const key = `builtin:${option.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = fetch(option.file)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load font ${option.name}`);
      return r.arrayBuffer();
    })
    .then(parseFontBuffer);
  cache.set(key, promise);
  return promise;
}

export function loadFontFromBase64(base64: string): Promise<Font> {
  const key = `custom:${base64.slice(0, 48)}:${base64.length}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const promise = parseFontBuffer(bytes.buffer);
  cache.set(key, promise);
  return promise;
}

export async function loadProjectFont(
  fontId: string,
  customFontBase64?: string,
): Promise<Font> {
  if (fontId === "custom" && customFontBase64) {
    return loadFontFromBase64(customFontBase64);
  }
  return loadBuiltinFont(fontId);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
