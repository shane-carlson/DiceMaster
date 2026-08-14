export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  viewBox: number;
  path: string;
}

export const SYMBOL_GROUPS: { id: string; label: string }[] = [
  { id: "marks", label: "Marks" },
  { id: "arms", label: "Arms" },
  { id: "beasts", label: "Beasts" },
  { id: "celestial", label: "Celestial" },
  { id: "elements", label: "Elements" },
  { id: "arcane", label: "Arcane" },
  { id: "dark", label: "Dark" },
  { id: "heraldry", label: "Heraldry" },
];

/** Filled silhouettes. Extra closed subpaths are counters (even-odd). */
export const SYMBOLS: SymbolDef[] = [
  {
    id: "star",
    name: "Star",
    category: "Marks",
    viewBox: 100,
    path: "M50 4 L61 36 L96 36 L68 56 L79 90 L50 70 L21 90 L32 56 L4 36 L39 36 Z",
  },
  {
    id: "heart",
    name: "Heart",
    category: "Marks",
    viewBox: 100,
    path: "M50 88 L18 52 C8 42 8 26 20 16 C32 6 46 12 50 22 C54 12 68 6 80 16 C92 26 92 42 82 52 Z",
  },
  {
    id: "spark",
    name: "Crit Burst",
    category: "Marks",
    viewBox: 100,
    path: "M50 2 L56 38 L94 28 L64 50 L96 72 L58 62 L50 98 L42 62 L4 72 L36 50 L6 28 L44 38 Z",
  },
  {
    id: "clover",
    name: "Clover",
    category: "Marks",
    viewBox: 100,
    path: "M50 48 C50 30 36 18 28 28 C20 38 32 50 50 48 C32 50 20 62 28 72 C36 82 50 70 50 52 C50 70 64 82 72 72 C80 62 68 50 50 52 C68 50 80 38 72 28 C64 18 50 30 50 48 Z M48 70 H52 V96 H48 Z",
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "Marks",
    viewBox: 100,
    path: "M50 6 L90 50 L50 94 L10 50 Z M50 22 L74 50 L50 78 L26 50 Z",
  },
  {
    id: "cross",
    name: "Cross",
    category: "Marks",
    viewBox: 100,
    path: "M42 8 H58 V42 H90 V58 H58 V92 H42 V58 H10 V42 H42 Z",
  },
  {
    id: "chevron",
    name: "Chevron",
    category: "Marks",
    viewBox: 100,
    path: "M50 12 L90 48 L78 58 L50 32 L22 58 L10 48 Z M50 42 L90 78 L78 88 L50 62 L22 88 L10 78 Z",
  },
  {
    id: "drop",
    name: "Drop",
    category: "Marks",
    viewBox: 100,
    path: "M50 8 C50 8 18 48 18 68 C18 86 32 96 50 96 C68 96 82 86 82 68 C82 48 50 8 50 8 Z M50 58 A12 12 0 1 0 50 57.9 Z",
  },
  {
    id: "sword",
    name: "Sword",
    category: "Arms",
    viewBox: 100,
    path: "M48 6 L52 6 L54 58 L62 58 L62 64 L54 64 L54 72 L62 78 L62 86 L38 86 L38 78 L46 72 L46 64 L38 64 L38 58 L46 58 Z",
  },
  {
    id: "shield",
    name: "Shield",
    category: "Arms",
    viewBox: 100,
    path: "M50 6 L86 18 L86 48 C86 72 70 88 50 96 C30 88 14 72 14 48 L14 18 Z M50 20 L74 28 L74 48 C74 64 64 76 50 84 C36 76 26 64 26 48 L26 28 Z",
  },
  {
    id: "anvil",
    name: "Anvil",
    category: "Arms",
    viewBox: 100,
    path: "M12 38 H88 V50 H70 L62 78 H38 L30 50 H12 Z M40 78 H60 V90 H40 Z M18 28 H50 V38 H18 Z",
  },
  {
    id: "axe",
    name: "Axe",
    category: "Arms",
    viewBox: 100,
    path: "M46 8 H54 V72 H46 Z M54 16 L88 28 L88 52 L54 40 Z M42 72 H58 L62 92 H38 Z",
  },
  {
    id: "bow",
    name: "Bow",
    category: "Arms",
    viewBox: 100,
    path: "M22 12 C58 20 78 38 84 50 C78 62 58 80 22 88 L28 80 C56 72 70 58 74 50 C70 42 56 28 28 20 Z M18 48 H78 V52 H18 Z",
  },
  {
    id: "dagger",
    name: "Dagger",
    category: "Arms",
    viewBox: 100,
    path: "M50 6 L58 40 H70 V48 H58 V58 H70 L62 78 L50 94 L38 78 L30 58 H42 V48 H30 V40 H42 Z",
  },
  {
    id: "hammer",
    name: "Hammer",
    category: "Arms",
    viewBox: 100,
    path: "M18 14 H82 V36 H62 V88 H38 V36 H18 Z",
  },
  {
    id: "spear",
    name: "Spear",
    category: "Arms",
    viewBox: 100,
    path: "M50 4 L62 28 H54 V92 H46 V28 H38 Z",
  },
  {
    id: "dragon",
    name: "Dragon",
    category: "Beasts",
    viewBox: 100,
    path: "M18 62 C22 40 38 28 54 30 C62 18 78 16 88 26 C80 28 74 36 72 46 C84 50 90 62 86 74 C74 70 62 74 52 82 C40 78 28 78 18 86 C16 74 14 68 18 62 Z M34 48 A5 5 0 1 0 34 47.9 Z",
  },
  {
    id: "paw",
    name: "Paw",
    category: "Beasts",
    viewBox: 100,
    path: "M50 48 C32 48 24 64 24 78 C24 90 34 96 50 96 C66 96 76 90 76 78 C76 64 68 48 50 48 Z M22 30 A10 12 0 1 0 22 29.9 Z M50 18 A10 12 0 1 0 50 17.9 Z M78 30 A10 12 0 1 0 78 29.9 Z M34 42 A8 10 0 1 0 34 41.9 Z M66 42 A8 10 0 1 0 66 41.9 Z",
  },
  {
    id: "wolf",
    name: "Wolf",
    category: "Beasts",
    viewBox: 100,
    path: "M18 78 L22 42 L38 28 L50 36 L62 28 L78 42 L82 78 L64 86 L50 80 L36 86 Z M38 50 A5 5 0 1 0 38 49.9 Z M62 50 A5 5 0 1 0 62 49.9 Z M44 66 H56 L50 74 Z",
  },
  {
    id: "raven",
    name: "Raven",
    category: "Beasts",
    viewBox: 100,
    path: "M18 62 C28 40 48 28 70 32 L88 22 L80 40 C88 50 86 66 74 74 L88 86 L70 80 C52 88 32 82 22 70 Z M58 44 A4 4 0 1 0 58 43.9 Z",
  },
  {
    id: "snake",
    name: "Snake",
    category: "Beasts",
    viewBox: 100,
    path: "M70 12 C88 12 94 30 82 40 C70 48 52 44 48 56 C44 70 60 78 74 74 L70 84 C48 90 28 78 34 58 C40 40 62 42 70 34 C76 30 74 20 64 20 C58 20 54 26 56 32 L46 28 C42 16 54 8 70 12 Z",
  },
  {
    id: "stag",
    name: "Stag",
    category: "Beasts",
    viewBox: 100,
    path: "M38 44 L28 16 L36 18 L42 36 L48 14 L56 36 L62 16 L70 18 L58 46 L72 58 L68 88 H56 L58 64 H44 L42 88 H30 L28 58 Z",
  },
  {
    id: "moon",
    name: "Moon",
    category: "Celestial",
    viewBox: 100,
    path: "M58 12 C36 16 20 36 20 58 C20 80 38 96 62 96 C74 96 84 90 90 82 C70 86 50 74 50 52 C50 34 60 20 76 14 C70 12 64 12 58 12 Z",
  },
  {
    id: "sun",
    name: "Sun",
    category: "Celestial",
    viewBox: 100,
    path: "M46 4 H54 V18 H46 Z M46 82 H54 V96 H46 Z M4 46 H18 V54 H4 Z M82 46 H96 V54 H82 Z M16 16 L22 10 L32 20 L26 26 Z M68 68 L74 62 L84 72 L78 78 Z M84 16 L90 22 L80 32 L74 26 Z M16 84 L22 90 L32 80 L26 74 Z M50 30 A20 20 0 1 0 50 29.9 Z",
  },
  {
    id: "comet",
    name: "Comet",
    category: "Celestial",
    viewBox: 100,
    path: "M72 18 A16 16 0 1 0 72 17.9 Z M12 78 L28 46 L36 54 L52 28 L58 36 L78 14 L70 42 L62 36 L48 60 L40 52 Z",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    category: "Celestial",
    viewBox: 100,
    path: "M50 10 A40 40 0 1 0 50 9.9 Z M62 28 A28 28 0 1 0 62 27.9 Z",
  },
  {
    id: "star6",
    name: "Hexagram",
    category: "Celestial",
    viewBox: 100,
    path: "M50 8 L62 40 L96 40 L68 58 L80 92 L50 72 L20 92 L32 58 L4 40 L38 40 Z M50 28 L58 48 L50 44 L42 48 Z",
  },
  {
    id: "fire",
    name: "Flame",
    category: "Elements",
    viewBox: 100,
    path: "M50 8 C58 28 40 36 42 52 C28 48 22 62 22 72 C22 88 34 96 50 96 C66 96 78 88 78 72 C78 50 64 40 62 24 C58 30 54 22 50 8 Z",
  },
  {
    id: "lightning",
    name: "Lightning",
    category: "Elements",
    viewBox: 100,
    path: "M58 4 L26 52 H48 L36 96 L80 40 H56 Z",
  },
  {
    id: "water",
    name: "Wave",
    category: "Elements",
    viewBox: 100,
    path: "M8 62 C22 48 30 48 44 62 C58 76 66 76 80 62 L88 70 C70 88 58 88 44 74 C30 60 22 60 10 70 Z M8 38 C22 24 30 24 44 38 C58 52 66 52 80 38 L88 46 C70 64 58 64 44 50 C30 36 22 36 10 46 Z",
  },
  {
    id: "leaf",
    name: "Leaf",
    category: "Elements",
    viewBox: 100,
    path: "M82 16 C52 18 20 40 18 72 C18 84 28 92 42 90 C70 86 88 56 82 16 Z M48 36 L52 40 L40 78 L36 74 Z",
  },
  {
    id: "snow",
    name: "Snowflake",
    category: "Elements",
    viewBox: 100,
    path: "M48 8 H52 V92 H48 Z M14 27 L17 22 L86 73 L83 78 Z M14 73 L17 78 L86 27 L83 22 Z M38 14 L50 26 L62 14 L66 18 L54 30 L66 42 L62 46 L50 34 L38 46 L34 42 L46 30 L34 18 Z M38 54 L50 66 L62 54 L66 58 L54 70 L66 82 L62 86 L50 74 L38 86 L34 82 L46 70 L34 58 Z",
  },
  {
    id: "mountain",
    name: "Mountain",
    category: "Elements",
    viewBox: 100,
    path: "M8 86 L32 34 L44 54 L58 22 L92 86 Z M58 42 L50 58 H66 Z",
  },
  {
    id: "eye",
    name: "Eye",
    category: "Arcane",
    viewBox: 100,
    path: "M8 50 C22 24 38 14 50 14 C62 14 78 24 92 50 C78 76 62 86 50 86 C38 86 22 76 8 50 Z M50 34 A16 16 0 1 0 50 33.9 Z",
  },
  {
    id: "d20mark",
    name: "D20 Mark",
    category: "Arcane",
    viewBox: 100,
    path: "M50 6 L90 28 L90 72 L50 94 L10 72 L10 28 Z M50 18 L78 34 V66 L50 82 L22 66 V34 Z",
  },
  {
    id: "rune",
    name: "Rune",
    category: "Arcane",
    viewBox: 100,
    path: "M50 8 L82 90 H68 L62 74 H38 L32 90 H18 Z M50 28 L42 62 H58 Z",
  },
  {
    id: "potion",
    name: "Potion",
    category: "Arcane",
    viewBox: 100,
    path: "M42 8 H58 V22 H64 C78 36 86 50 86 64 C86 82 70 94 50 94 C30 94 14 82 14 64 C14 50 22 36 36 22 H42 Z M50 40 A14 16 0 1 0 50 39.9 Z",
  },
  {
    id: "pentacle",
    name: "Pentacle",
    category: "Arcane",
    viewBox: 100,
    path: "M50 6 A44 44 0 1 0 50 5.9 Z M50 16 A34 34 0 1 0 50 15.9 Z M50 24 L58 48 L84 48 L64 64 L72 88 L50 74 L28 88 L36 64 L16 48 L42 48 Z",
  },
  {
    id: "crystal",
    name: "Crystal",
    category: "Arcane",
    viewBox: 100,
    path: "M50 6 L78 30 L64 92 H36 L22 30 Z M50 16 L36 34 H64 Z",
  },
  {
    id: "scroll",
    name: "Scroll",
    category: "Arcane",
    viewBox: 100,
    path: "M18 16 H78 C86 16 90 22 90 28 V78 C90 86 84 90 76 90 H24 C16 90 10 84 10 76 V28 C10 20 14 16 18 16 Z M22 28 H78 V72 H22 Z",
  },
  {
    id: "skull",
    name: "Skull",
    category: "Dark",
    viewBox: 100,
    path: "M50 8 C28 8 14 24 14 44 C14 58 20 66 26 70 L26 86 L38 86 L40 74 L60 74 L62 86 L74 86 L74 70 C80 66 86 58 86 44 C86 24 72 8 50 8 Z M36 42 A8 8 0 1 0 36 41.9 Z M64 42 A8 8 0 1 0 64 41.9 Z M40 62 L45 58 L50 62 L55 58 L60 62 L55 70 L45 70 Z",
  },
  {
    id: "scythe",
    name: "Scythe",
    category: "Dark",
    viewBox: 100,
    path: "M30 8 H38 V78 L22 96 H14 L30 78 Z M38 10 C70 8 92 24 94 48 C72 36 58 28 38 28 Z",
  },
  {
    id: "bones",
    name: "Bones",
    category: "Dark",
    viewBox: 100,
    path: "M18 28 A10 10 0 1 0 18 27.9 Z M82 28 A10 10 0 1 0 82 27.9 Z M22 26 H78 V34 H22 Z M18 72 A10 10 0 1 0 18 71.9 Z M82 72 A10 10 0 1 0 82 71.9 Z M22 70 H78 V78 H22 Z M46 38 H54 V62 H46 Z",
  },
  {
    id: "crown",
    name: "Crown",
    category: "Heraldry",
    viewBox: 100,
    path: "M12 78 L12 42 L32 58 L50 22 L68 58 L88 42 L88 78 Z M20 82 H80 V90 H20 Z",
  },
  {
    id: "castle",
    name: "Castle",
    category: "Heraldry",
    viewBox: 100,
    path: "M12 88 V40 H22 V28 H32 V40 H40 V18 H48 V40 H58 V18 H66 V40 H74 V28 H84 V40 H92 V88 Z M44 58 H56 V88 H44 Z M22 58 H32 V72 H22 Z M68 58 H78 V72 H68 Z",
  },
  {
    id: "banner",
    name: "Banner",
    category: "Heraldry",
    viewBox: 100,
    path: "M22 8 H30 V92 H22 Z M30 10 H86 L74 32 L86 54 H30 Z",
  },
  {
    id: "lion",
    name: "Lion",
    category: "Heraldry",
    viewBox: 100,
    path: "M22 86 L28 58 L18 44 L30 40 L38 20 L52 28 L64 16 L72 32 L86 40 L78 56 L84 86 L68 80 L62 58 L50 64 L40 56 L36 80 Z",
  },
  {
    id: "fleur",
    name: "Fleur-de-lis",
    category: "Heraldry",
    viewBox: 100,
    path: "M50 6 C62 22 62 34 50 46 C38 34 38 22 50 6 Z M22 40 C36 36 44 44 50 54 C56 44 64 36 78 40 C68 54 58 58 50 58 C42 58 32 54 22 40 Z M46 58 H54 V78 L70 88 L66 92 H34 L30 88 L46 78 Z",
  },
];

export function symbolById(id: string): SymbolDef | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

export function symbolsByCategory(): { category: string; symbols: SymbolDef[] }[] {
  const order = SYMBOL_GROUPS.map((g) => g.label);
  const map = new Map<string, SymbolDef[]>();
  for (const symbol of SYMBOLS) {
    const list = map.get(symbol.category) ?? [];
    list.push(symbol);
    map.set(symbol.category, list);
  }
  return [...map.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([category, symbols]) => ({ category, symbols }));
}
