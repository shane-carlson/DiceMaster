export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  viewBox: number;
  path: string;
}

export const SYMBOLS: SymbolDef[] = [
  {
    id: "star",
    name: "Star",
    category: "Marks",
    viewBox: 100,
    path: "M50 4 L61 36 L96 36 L68 56 L79 90 L50 70 L21 90 L32 56 L4 36 L39 36 Z",
  },
  {
    id: "skull",
    name: "Skull",
    category: "Dark",
    viewBox: 100,
    path: "M50 8 C28 8 14 24 14 44 C14 58 20 66 26 70 L26 86 L38 86 L40 74 L60 74 L62 86 L74 86 L74 70 C80 66 86 58 86 44 C86 24 72 8 50 8 Z M36 42 A8 8 0 1 1 36 41.9 Z M64 42 A8 8 0 1 1 64 41.9 Z M40 62 L45 58 L50 62 L55 58 L60 62 L55 70 L45 70 Z",
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
    path: "M50 6 L86 18 L86 48 C86 72 70 88 50 96 C30 88 14 72 14 48 L14 18 Z M50 18 L74 26 L74 48 C74 64 64 76 50 84 C36 76 26 64 26 48 L26 26 Z",
  },
  {
    id: "dragon",
    name: "Dragon",
    category: "Beasts",
    viewBox: 100,
    path: "M18 62 C22 40 38 28 54 30 C62 18 78 16 88 26 C80 28 74 36 72 46 C84 50 90 62 86 74 C74 70 62 74 52 82 C40 78 28 78 18 86 C16 74 14 68 18 62 Z M34 48 A5 5 0 1 1 34 47.9 Z",
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
    path: "M46 4 H54 V18 H46 Z M46 82 H54 V96 H46 Z M4 46 H18 V54 H4 Z M82 46 H96 V54 H82 Z M16 16 L22 10 L32 20 L26 26 Z M68 68 L74 62 L84 72 L78 78 Z M84 16 L90 22 L80 32 L74 26 Z M16 84 L22 90 L32 80 L26 74 Z M50 30 A20 20 0 1 1 50 29.9 Z",
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
    id: "heart",
    name: "Heart",
    category: "Marks",
    viewBox: 100,
    path: "M50 88 L18 52 C8 42 8 26 20 16 C32 6 46 12 50 22 C54 12 68 6 80 16 C92 26 92 42 82 52 Z",
  },
  {
    id: "crown",
    name: "Crown",
    category: "Marks",
    viewBox: 100,
    path: "M12 78 L12 42 L32 58 L50 22 L68 58 L88 42 L88 78 Z M20 82 H80 V90 H20 Z",
  },
  {
    id: "eye",
    name: "Eye",
    category: "Arcane",
    viewBox: 100,
    path: "M8 50 C22 24 38 14 50 14 C62 14 78 24 92 50 C78 76 62 86 50 86 C38 86 22 76 8 50 Z M50 34 A16 16 0 1 1 50 33.9 Z M50 44 A6 6 0 1 1 50 43.9 Z",
  },
  {
    id: "paw",
    name: "Paw",
    category: "Beasts",
    viewBox: 100,
    path: "M50 48 C32 48 24 64 24 78 C24 90 34 96 50 96 C66 96 76 90 76 78 C76 64 68 48 50 48 Z M22 30 A10 12 0 1 1 22 29.9 Z M50 18 A10 12 0 1 1 50 17.9 Z M78 30 A10 12 0 1 1 78 29.9 Z M34 42 A8 10 0 1 1 34 41.9 Z M66 42 A8 10 0 1 1 66 41.9 Z",
  },
  {
    id: "clover",
    name: "Clover",
    category: "Marks",
    viewBox: 100,
    path: "M50 48 C50 30 36 18 28 28 C20 38 32 50 50 48 C32 50 20 62 28 72 C36 82 50 70 50 52 C50 70 64 82 72 72 C80 62 68 50 50 52 C68 50 80 38 72 28 C64 18 50 30 50 48 Z M48 70 H52 V96 H48 Z",
  },
  {
    id: "anvil",
    name: "Anvil",
    category: "Arms",
    viewBox: 100,
    path: "M12 38 H88 V50 H70 L62 78 H38 L30 50 H12 Z M40 78 H60 V90 H40 Z M18 28 H50 V38 H18 Z",
  },
  {
    id: "spark",
    name: "Crit Burst",
    category: "Marks",
    viewBox: 100,
    path: "M50 2 L56 38 L94 28 L64 50 L96 72 L58 62 L50 98 L42 62 L4 72 L36 50 L6 28 L44 38 Z",
  },
  {
    id: "d20mark",
    name: "D20 Mark",
    category: "Arcane",
    viewBox: 100,
    path: "M50 6 L90 28 L90 72 L50 94 L10 72 L10 28 Z M50 6 L50 94 M10 28 L90 28 M10 72 L90 72 M10 28 L50 94 L90 28 M10 72 L50 6 L90 72",
  },
  {
    id: "rune",
    name: "Rune",
    category: "Arcane",
    viewBox: 100,
    path: "M50 8 L82 90 H68 L62 74 H38 L32 90 H18 Z M50 28 L42 62 H58 Z",
  },
];

export function symbolById(id: string): SymbolDef | undefined {
  return SYMBOLS.find((s) => s.id === id);
}
