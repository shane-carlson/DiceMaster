// Dice-notation engine for DiceMaster.
//
// Supports standard tabletop notation combined with + / - between terms, e.g.
//   "2d6+3", "d20", "4d8 - 1 + 1d4", "3d6+2d10+5".
// Each dice term is `[count]d<sides>`; a bare integer is a flat modifier.

export interface RollTerm {
  kind: "dice" | "modifier";
  /** Original text of the term, e.g. "2d6" or "3". */
  text: string;
  /** Number of dice for a dice term (0 for a modifier). */
  count: number;
  /** Number of sides for a dice term (0 for a modifier). */
  sides: number;
  /** Sign applied to this term's contribution (+1 or -1). */
  sign: number;
  /** Individual die results for a dice term (empty for a modifier). */
  rolls: number[];
  /** Signed subtotal contributed by this term. */
  subtotal: number;
}

export interface RollResult {
  notation: string;
  terms: RollTerm[];
  total: number;
}

const MAX_DICE = 1000;
const MAX_SIDES = 1000;

export type RandomFn = (sides: number) => number;

const defaultRandom: RandomFn = (sides: number) => Math.floor(Math.random() * sides) + 1;

interface ParsedTerm {
  sign: number;
  text: string;
  isDice: boolean;
  count: number;
  sides: number;
  value: number;
}

/**
 * Parse dice notation into signed terms. Throws an Error with a helpful
 * message when the notation is malformed or exceeds safety limits.
 */
export function parseNotation(notation: string): ParsedTerm[] {
  if (typeof notation !== "string" || notation.trim() === "") {
    throw new Error("Notation must be a non-empty string.");
  }

  const compact = notation.replace(/\s+/g, "");
  // Split into signed chunks while keeping the leading sign of each term.
  const tokens = compact.match(/[+-]?[^+-]+/g);
  if (!tokens) {
    throw new Error(`Could not parse notation: "${notation}".`);
  }

  const diceRe = /^(\d*)d(\d+)$/i;
  const modRe = /^(\d+)$/;
  const terms: ParsedTerm[] = [];

  for (const raw of tokens) {
    let sign = 1;
    let body = raw;
    if (body.startsWith("+")) {
      body = body.slice(1);
    } else if (body.startsWith("-")) {
      sign = -1;
      body = body.slice(1);
    }
    if (body === "") {
      throw new Error(`Empty term in notation: "${notation}".`);
    }

    const diceMatch = body.match(diceRe);
    if (diceMatch) {
      const count = diceMatch[1] === "" ? 1 : parseInt(diceMatch[1], 10);
      const sides = parseInt(diceMatch[2], 10);
      if (count < 1 || count > MAX_DICE) {
        throw new Error(`Dice count must be between 1 and ${MAX_DICE} (got ${count}).`);
      }
      if (sides < 2 || sides > MAX_SIDES) {
        throw new Error(`Dice sides must be between 2 and ${MAX_SIDES} (got ${sides}).`);
      }
      terms.push({ sign, text: body, isDice: true, count, sides, value: 0 });
      continue;
    }

    const modMatch = body.match(modRe);
    if (modMatch) {
      terms.push({ sign, text: body, isDice: false, count: 0, sides: 0, value: parseInt(body, 10) });
      continue;
    }

    throw new Error(`Invalid term "${raw}" in notation: "${notation}".`);
  }

  return terms;
}

/**
 * Roll the given dice notation, returning per-term breakdowns and a total.
 * `random` is injectable for deterministic testing.
 */
export function rollNotation(notation: string, random: RandomFn = defaultRandom): RollResult {
  const parsed = parseNotation(notation);
  const terms: RollTerm[] = [];
  let total = 0;

  for (const term of parsed) {
    if (term.isDice) {
      const rolls: number[] = [];
      for (let i = 0; i < term.count; i++) {
        rolls.push(random(term.sides));
      }
      const raw = rolls.reduce((a, b) => a + b, 0);
      const subtotal = term.sign * raw;
      total += subtotal;
      terms.push({
        kind: "dice",
        text: `${term.count}d${term.sides}`,
        count: term.count,
        sides: term.sides,
        sign: term.sign,
        rolls,
        subtotal,
      });
    } else {
      const subtotal = term.sign * term.value;
      total += subtotal;
      terms.push({
        kind: "modifier",
        text: term.text,
        count: 0,
        sides: 0,
        sign: term.sign,
        rolls: [],
        subtotal,
      });
    }
  }

  return { notation, terms, total };
}
