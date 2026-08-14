export interface RollTerm {
  kind: "dice" | "modifier";
  text: string;
  count: number;
  sides: number;
  sign: number;
  rolls: number[];
  subtotal: number;
}

export interface RollEntry {
  id: string;
  notation: string;
  total: number;
  terms: RollTerm[];
  rolledAt: string;
}
