import type { SiteFont, SiteSymbol } from "../../shared/account";

export type LibraryOverlay = {
  hiddenFontIds: string[];
  extraFonts: SiteFont[];
  hiddenSymbolIds: string[];
  extraSymbols: SiteSymbol[];
};

const EMPTY: LibraryOverlay = {
  hiddenFontIds: [],
  extraFonts: [],
  hiddenSymbolIds: [],
  extraSymbols: [],
};

let overlay: LibraryOverlay = EMPTY;

export function setLibraryOverlay(next: Partial<LibraryOverlay> | null) {
  overlay = {
    hiddenFontIds: next?.hiddenFontIds ?? [],
    extraFonts: next?.extraFonts ?? [],
    hiddenSymbolIds: next?.hiddenSymbolIds ?? [],
    extraSymbols: next?.extraSymbols ?? [],
  };
}

export function getLibraryOverlay(): LibraryOverlay {
  return overlay;
}
