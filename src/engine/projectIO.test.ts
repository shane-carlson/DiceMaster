import { describe, expect, it } from "vitest";
import { createDie } from "./defaults";
import { normalizeProject, parseProject, serializeProject } from "./projectIO";

function projectWith(rounding: number) {
  return {
    version: 1 as const,
    name: "Legacy",
    fontId: "oswald",
    globalDepth: 0.77,
    globalFontScale: 1,
    dice: [createDie("d20", "standard", { cornerRounding: rounding })],
    logos: [],
  };
}

describe("normalizeProject", () => {
  it("turns the old factory rounding into 0", () => {
    const next = normalizeProject(projectWith(0.18));
    expect(next.dice[0].cornerRounding).toBe(0);
  });

  it("keeps rounding the user set", () => {
    const next = normalizeProject(projectWith(0.4));
    expect(next.dice[0].cornerRounding).toBe(0.4);
  });

  it("applies the same migration when parsing saved JSON", () => {
    const raw = serializeProject(projectWith(0.18));
    expect(parseProject(raw).dice[0].cornerRounding).toBe(0);
  });
});
