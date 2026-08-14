import { beforeEach, describe, expect, it } from "vitest";
import { createDie, makeEmblem } from "../engine/defaults";
import { useProjectStore } from "./projectStore";

function loadDie() {
  const die = createDie("d20", "standard");
  useProjectStore.getState().replaceProject({
    version: 1,
    name: "Test",
    fontId: "oswald",
    globalDepth: 0.77,
    globalFontScale: 1,
    dice: [die],
    logos: [],
  });
  return die;
}

describe("face emblems", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it("keeps the number when a crest is applied to the highest face", () => {
    const die = loadDie();
    const high = die.faces.findIndex((f) => f.primary.text === "20");
    expect(high).toBeGreaterThanOrEqual(0);
    useProjectStore.getState().applyEmblemToHighest(die.id, makeEmblem("symbol", "dragon"));
    const next = useProjectStore.getState().project.dice[0];
    expect(next.faces[high].primary.kind).toBe("number");
    expect(next.faces[high].primary.text).toBe("20");
    expect(next.faces[high].emblem?.symbolId).toBe("dragon");
    expect(next.faces[high].emblem?.scale).toBe(0.42);
  });

  it("adds a vault symbol beside the inscription", () => {
    const die = loadDie();
    useProjectStore.getState().updateFaceGlyph(die.id, 0, "emblem", {
      kind: "symbol",
      symbolId: "eye",
      text: "",
    });
    const face = useProjectStore.getState().project.dice[0].faces[0];
    expect(face.primary.kind).toBe("number");
    expect(face.primary.text).toBe("1");
    expect(face.emblem?.symbolId).toBe("eye");
  });

  it("still replaces the number when asked", () => {
    const die = loadDie();
    useProjectStore.getState().updateFaceGlyph(die.id, 0, "primary", {
      kind: "symbol",
      symbolId: "skull",
      text: "",
    });
    const face = useProjectStore.getState().project.dice[0].faces[0];
    expect(face.primary.kind).toBe("symbol");
    expect(face.primary.symbolId).toBe("skull");
    expect(face.emblem).toBeNull();
  });

  it("picks a face when none is selected so the inspector can open", () => {
    const die = loadDie();
    useProjectStore.setState({ selectedDieId: null, selectedFaceIndex: null });
    const target = useProjectStore.getState().ensureFaceSelection();
    expect(target).toEqual({ dieId: die.id, faceIndex: 0 });
    useProjectStore.getState().revealInspector();
    expect(useProjectStore.getState().inspectorFocusGeneration).toBeGreaterThan(0);
  });

  it("resets inspector sliders and set-wide glyph scale", () => {
    const die = loadDie();
    useProjectStore.getState().updateDie(die.id, { cornerRounding: 0.6, fontScale: 1.5 });
    useProjectStore.getState().setGlobalFontScale(1.3);
    useProjectStore.getState().resetDieDefaults(die.id);
    const next = useProjectStore.getState().project.dice[0];
    expect(next.cornerRounding).toBe(0);
    expect(next.fontScale).toBe(1);
    expect(useProjectStore.getState().project.globalFontScale).toBe(1);
  });
});
