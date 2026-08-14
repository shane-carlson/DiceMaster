import { afterEach, describe, expect, it } from "vitest";
import { BUILTIN_FONTS, fontsByGroup } from "./fonts";
import { setLibraryOverlay } from "./libraryOverlay";
import { SYMBOLS, symbolById, symbolsByCategory } from "./symbols";

describe("library overlay", () => {
  afterEach(() => {
    setLibraryOverlay(null);
  });

  it("hides bundled fonts and appends site fonts", () => {
    setLibraryOverlay({
      hiddenFontIds: ["oswald"],
      extraFonts: [
        {
          id: "site-rune",
          name: "Rune",
          mood: "Test",
          group: "fantasy",
          file: "/api/catalog/fonts/site-rune",
        },
      ],
    });
    const groups = fontsByGroup();
    const ids = groups.flatMap((g) => g.fonts.map((f) => f.id));
    expect(ids).not.toContain("oswald");
    expect(ids).toContain("site-rune");
    expect(ids.length).toBe(BUILTIN_FONTS.length);
  });

  it("hides picker symbols but still resolves them for existing dice", () => {
    setLibraryOverlay({
      hiddenSymbolIds: ["star"],
      extraSymbols: [
        {
          id: "site-mark",
          name: "Site Mark",
          category: "Marks",
          viewBox: 512,
          path: "M0 0",
        },
      ],
    });
    const visible = symbolsByCategory().flatMap((g) => g.symbols.map((s) => s.id));
    expect(visible).not.toContain("star");
    expect(visible).toContain("site-mark");
    expect(symbolById("star")?.id).toBe("star");
    expect(SYMBOLS.some((s) => s.id === "star")).toBe(true);
  });
});
