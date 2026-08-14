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

  it("fills in a 6/9 mark when loading old JSON", () => {
    const project = projectWith(0);
    const raw = JSON.parse(serializeProject(project)) as { dice: Array<{ digitAnchor?: string }> };
    delete raw.dice[0].digitAnchor;
    expect(parseProject(JSON.stringify(raw)).dice[0].digitAnchor).toBe("underline");
  });

  it("migrates fully unchecked 6/9 underscores to none", () => {
    const die = createDie("d6");
    for (const face of die.faces) {
      if (face.primary.text === "6" || face.primary.text === "9") {
        face.primary.underscore = false;
      }
    }
    const project = {
      version: 1 as const,
      name: "Legacy",
      fontId: "oswald",
      globalDepth: 0.77,
      globalFontScale: 1,
      dice: [die],
      logos: [],
    };
    const raw = JSON.parse(serializeProject(project)) as {
      dice: Array<{ digitAnchor?: string }>;
    };
    delete raw.dice[0].digitAnchor;
    expect(parseProject(JSON.stringify(raw)).dice[0].digitAnchor).toBe("none");
  });
});
