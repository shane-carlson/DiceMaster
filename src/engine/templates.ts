import { createDie, DEFAULT_CORNER_ROUNDING } from "./defaults";
import { CRYSTAL_KIT_CHART } from "./sizes";
import type { DieInstance, DieType, SizeFormatId } from "./types";

export const POLYHEDRAL_SET: DieType[] = [
  "d4",
  "d6",
  "d8",
  "d10",
  "d00",
  "d12",
  "d20",
];

export interface TemplateDieSpec {
  type: DieType;
  sizeMm?: number;
  name?: string;
}

export interface SetTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  format: SizeFormatId;
  types: DieType[];
  pieces?: TemplateDieSpec[];
  featured?: boolean;
}

export const SET_TEMPLATES: SetTemplate[] = [
  {
    id: "standard-polyhedral",
    name: "Standard Polyhedral",
    tagline: "The classic seven",
    description:
      "A full adventuring set: D4 through D20 plus percentile, at table-ready sizes.",
    format: "standard",
    types: POLYHEDRAL_SET,
    featured: true,
  },
  {
    id: "mini-polyhedral",
    name: "Mini Set",
    tagline: "Travel-sized fortune",
    description:
      "Pocket polyhedrals for travel bags, minis trays, and spare character kits.",
    format: "mini",
    types: POLYHEDRAL_SET,
    featured: true,
  },
  {
    id: "chonk-set",
    name: "Chonk Set",
    tagline: "Oversized and proud",
    description:
      "Every piece scaled up. Satisfying in the hand, dramatic on the table.",
    format: "chonk",
    types: POLYHEDRAL_SET,
    featured: true,
  },
  {
    id: "chonk-d20",
    name: "Chonk D20",
    tagline: "The nat-20 slab",
    description:
      "A single oversized D20, the centerpiece of a character kit or a resin master.",
    format: "chonk",
    types: ["d20"],
    featured: true,
  },
  {
    id: "giant-d20",
    name: "Giant D20",
    tagline: "Session-zero monument",
    description: "A display-scale icosahedron. Print a master, cast a legend.",
    format: "giant",
    types: ["d20"],
  },
  {
    id: "giant-set",
    name: "Giant Polyhedral",
    tagline: "Boss-fight dice",
    description: "The full set at giant scale for props, display, and bold prints.",
    format: "giant",
    types: POLYHEDRAL_SET,
  },
  {
    id: "standard-core",
    name: "Core Six",
    tagline: "No percentile",
    description: "D4, D6, D8, D10, D12, and D20: the everyday RPG spread.",
    format: "standard",
    types: ["d4", "d6", "d8", "d10", "d12", "d20"],
  },
  {
    id: "crystal-kit",
    name: "Crystal Kit",
    tagline: "Chart-scale gems",
    description:
      "Caltrop, teardrop, and crystal D4s plus the full polyhedral spread at catalog heights, including 26mm and 45mm D20s.",
    format: "standard",
    types: ["d4crystal", "d4teardrop", "d4", "d6", "d8", "d10", "d00", "d12", "d20"],
    pieces: CRYSTAL_KIT_CHART,
  },
];

export function diceFromTemplate(template: SetTemplate): DieInstance[] {
  const specs: TemplateDieSpec[] =
    template.pieces ?? template.types.map((type) => ({ type }));
  return specs.map((spec) => {
    const extras: Partial<DieInstance> = {};
    if (spec.sizeMm != null) {
      extras.sizeMm = spec.sizeMm;
      extras.sizeFormat = "custom";
    }
    if (spec.name) extras.name = spec.name;
    const die = createDie(spec.type, template.format, extras);
    die.cornerRounding = DEFAULT_CORNER_ROUNDING;
    if (spec.type === "d00" && !spec.name) {
      die.name = "D% Percentile";
    }
    return die;
  });
}

export function templateById(id: string): SetTemplate | undefined {
  return SET_TEMPLATES.find((t) => t.id === id);
}
