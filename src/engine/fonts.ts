import type { Font } from "opentype.js";
import { withBase } from "../appBase";
import { getLibraryOverlay } from "./libraryOverlay";

export type FontGroupId = "print" | "fantasy" | "scifi" | "gamer";

export interface FontOption {
  id: string;
  name: string;
  file: string;
  mood: string;
  group: FontGroupId;
}

export const FONT_GROUPS: { id: FontGroupId; label: string }[] = [
  { id: "print", label: "Print & numerals" },
  { id: "fantasy", label: "Fantasy & historic" },
  { id: "scifi", label: "Sci-fi" },
  { id: "gamer", label: "Arcade & gamer" },
];

export const BUILTIN_FONTS: FontOption[] = [
  {
    id: "oswald",
    name: "Oswald Bold",
    file: "/fonts/Oswald-Bold.ttf",
    mood: "Clean numerals, prints sharp",
    group: "print",
  },
  {
    id: "anton",
    name: "Anton",
    file: "/fonts/Anton-Regular.ttf",
    mood: "Condensed slam, big on a D20",
    group: "print",
  },
  {
    id: "archivo-black",
    name: "Archivo Black",
    file: "/fonts/ArchivoBlack-Regular.ttf",
    mood: "Poster black, high fill",
    group: "print",
  },
  {
    id: "alfa-slab",
    name: "Alfa Slab One",
    file: "/fonts/AlfaSlabOne-Regular.ttf",
    mood: "Chunky slab serif",
    group: "print",
  },
  {
    id: "bebas",
    name: "Bebas Neue",
    file: "/fonts/BebasNeue-Regular.ttf",
    mood: "Tall condensed caps",
    group: "print",
  },
  {
    id: "cinzel",
    name: "Cinzel Bold",
    file: "/fonts/Cinzel-Bold.ttf",
    mood: "Imperial serif, high-fantasy",
    group: "fantasy",
  },
  {
    id: "uncial",
    name: "Uncial Antiqua",
    file: "/fonts/UncialAntiqua-Regular.ttf",
    mood: "Illuminated manuscript",
    group: "fantasy",
  },
  {
    id: "medieval",
    name: "Medieval Sharp",
    file: "/fonts/MedievalSharp-Regular.ttf",
    mood: "Tavern-sign gothic",
    group: "fantasy",
  },
  {
    id: "pirata",
    name: "Pirata One",
    file: "/fonts/PirataOne-Regular.ttf",
    mood: "Swashbuckling display",
    group: "fantasy",
  },
  {
    id: "metamorphous",
    name: "Metamorphous",
    file: "/fonts/Metamorphous-Regular.ttf",
    mood: "Arcane and slightly alien",
    group: "fantasy",
  },
  {
    id: "cinzel-deco",
    name: "Cinzel Decorative",
    file: "/fonts/CinzelDecorative-Bold.ttf",
    mood: "Ornate titles & crests",
    group: "fantasy",
  },
  {
    id: "orbitron",
    name: "Orbitron Bold",
    file: "/fonts/Orbitron-Bold.ttf",
    mood: "Spaceship HUD geometry",
    group: "scifi",
  },
  {
    id: "audiowide",
    name: "Audiowide",
    file: "/fonts/Audiowide-Regular.ttf",
    mood: "Tubular techno",
    group: "scifi",
  },
  {
    id: "michroma",
    name: "Michroma",
    file: "/fonts/Michroma-Regular.ttf",
    mood: "Wide futurist caps",
    group: "scifi",
  },
  {
    id: "oxanium",
    name: "Oxanium Bold",
    file: "/fonts/Oxanium-Bold.ttf",
    mood: "Cockpit UI",
    group: "scifi",
  },
  {
    id: "chakra",
    name: "Chakra Petch Bold",
    file: "/fonts/ChakraPetch-Bold.ttf",
    mood: "Angular sci-fi",
    group: "scifi",
  },
  {
    id: "electrolize",
    name: "Electrolize",
    file: "/fonts/Electrolize-Regular.ttf",
    mood: "Circuit-board display",
    group: "scifi",
  },
  {
    id: "zendots",
    name: "Zen Dots",
    file: "/fonts/ZenDots-Regular.ttf",
    mood: "Dotted future",
    group: "scifi",
  },
  {
    id: "turret",
    name: "Turret Road Bold",
    file: "/fonts/TurretRoad-Bold.ttf",
    mood: "Mech stencil",
    group: "scifi",
  },
  {
    id: "quantico",
    name: "Quantico Bold",
    file: "/fonts/Quantico-Bold.ttf",
    mood: "Military sci-fi",
    group: "scifi",
  },
  {
    id: "iceberg",
    name: "Iceberg",
    file: "/fonts/Iceberg-Regular.ttf",
    mood: "Crystalline readout",
    group: "scifi",
  },
  {
    id: "aldrich",
    name: "Aldrich",
    file: "/fonts/Aldrich-Regular.ttf",
    mood: "Station signage",
    group: "scifi",
  },
  {
    id: "brunoace",
    name: "Bruno Ace",
    file: "/fonts/BrunoAce-Regular.ttf",
    mood: "Racing HUD",
    group: "scifi",
  },
  {
    id: "geo",
    name: "Geo",
    file: "/fonts/Geo-Regular.ttf",
    mood: "Sparse geometry",
    group: "scifi",
  },
  {
    id: "sharetech",
    name: "Share Tech Mono",
    file: "/fonts/ShareTechMono-Regular.ttf",
    mood: "Terminal telemetry",
    group: "scifi",
  },
  {
    id: "blackops",
    name: "Black Ops One",
    file: "/fonts/BlackOpsOne-Regular.ttf",
    mood: "Stencil ops",
    group: "gamer",
  },
  {
    id: "bungee",
    name: "Bungee",
    file: "/fonts/Bungee-Regular.ttf",
    mood: "Arcade stacked caps",
    group: "gamer",
  },
  {
    id: "russo",
    name: "Russo One",
    file: "/fonts/RussoOne-Regular.ttf",
    mood: "Blocky versus screen",
    group: "gamer",
  },
  {
    id: "pressstart",
    name: "Press Start 2P",
    file: "/fonts/PressStart2P-Regular.ttf",
    mood: "8-bit cabinet",
    group: "gamer",
  },
  {
    id: "silkscreen",
    name: "Silkscreen Bold",
    file: "/fonts/Silkscreen-Bold.ttf",
    mood: "Pixel marquee",
    group: "gamer",
  },
  {
    id: "goldman",
    name: "Goldman Bold",
    file: "/fonts/Goldman-Bold.ttf",
    mood: "Sports HUD",
    group: "gamer",
  },
  {
    id: "bangers",
    name: "Bangers",
    file: "/fonts/Bangers-Regular.ttf",
    mood: "Comic KO",
    group: "gamer",
  },
  {
    id: "wallpoet",
    name: "Wallpoet",
    file: "/fonts/Wallpoet-Regular.ttf",
    mood: "Graffiti stencil",
    group: "gamer",
  },
  {
    id: "titanone",
    name: "Titan One",
    file: "/fonts/TitanOne-Regular.ttf",
    mood: "Heavyweight round",
    group: "gamer",
  },
  {
    id: "bowlby",
    name: "Bowlby One SC",
    file: "/fonts/BowlbyOneSC-Regular.ttf",
    mood: "Chunky small-caps",
    group: "gamer",
  },
  {
    id: "righteous",
    name: "Righteous",
    file: "/fonts/Righteous-Regular.ttf",
    mood: "Retro racer",
    group: "gamer",
  },
  {
    id: "changaone",
    name: "Changa One",
    file: "/fonts/ChangaOne-Regular.ttf",
    mood: "Compact punch",
    group: "gamer",
  },
];

export function fontsByGroup(): { id: FontGroupId; label: string; fonts: FontOption[] }[] {
  const overlay = getLibraryOverlay();
  const hidden = new Set(overlay.hiddenFontIds);
  const fonts: FontOption[] = [
    ...BUILTIN_FONTS.filter((f) => !hidden.has(f.id)),
    ...overlay.extraFonts.map((f) => ({
      id: f.id,
      name: f.name,
      file: f.file,
      mood: f.mood,
      group: f.group,
    })),
  ];
  return FONT_GROUPS.map((group) => ({
    ...group,
    fonts: fonts.filter((f) => f.group === group.id),
  })).filter((g) => g.fonts.length > 0);
}

export function fontOptionById(id: string): FontOption | undefined {
  const overlay = getLibraryOverlay();
  const extra = overlay.extraFonts.find((f) => f.id === id);
  if (extra) {
    return { id: extra.id, name: extra.name, file: extra.file, mood: extra.mood, group: extra.group };
  }
  return BUILTIN_FONTS.find((f) => f.id === id);
}

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
  const option = fontOptionById(id) ?? BUILTIN_FONTS[0];
  const key = `builtin:${option.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = fetch(withBase(option.file))
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
