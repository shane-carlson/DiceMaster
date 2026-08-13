import { createDie } from "./defaults";
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

export interface SetTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  format: SizeFormatId;
  types: DieType[];
  featured?: boolean;
}

export const SET_TEMPLATES: SetTemplate[] = [
  {
    id: "standard-polyhedral",
    name: "Standard Polyhedral",
    tagline: "The classic seven",
    description:
      "A full adventuring set — D4 through D20 plus percentile — at table-ready sizes.",
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
      "A single oversized D20 — the centerpiece of a character kit or a resin master.",
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
    description: "D4, D6, D8, D10, D12, and D20 — the everyday RPG spread.",
    format: "standard",
    types: ["d4", "d6", "d8", "d10", "d12", "d20"],
  },
  {
    id: "crystal-kit",
    name: "Crystal Kit",
    tagline: "Elongated D4 + standard set",
    description:
      "A crystal-cut D4 with the rest of a standard polyhedral set.",
    format: "standard",
    types: ["d4crystal", "d6", "d8", "d10", "d00", "d12", "d20"],
  },
];

export function diceFromTemplate(template: SetTemplate): DieInstance[] {
  return template.types.map((type) => {
    const die = createDie(type, template.format);
    if (type === "d00") {
      die.name = "D% Percentile";
    }
    return die;
  });
}

export function templateById(id: string): SetTemplate | undefined {
  return SET_TEMPLATES.find((t) => t.id === id);
}
