import { create } from "zustand";
import type { Announcement, PublicCatalog } from "../../shared/account";
import { api } from "../api/client";
import { setLibraryOverlay } from "../engine/libraryOverlay";

type CatalogState = {
  revision: number;
  announcements: Announcement[];
  catalog: PublicCatalog | null;
  load: () => Promise<void>;
};

export const useCatalogStore = create<CatalogState>((set) => ({
  revision: 0,
  announcements: [],
  catalog: null,
  load: async () => {
    try {
      const catalog = await api.catalog();
      setLibraryOverlay({
        hiddenFontIds: catalog.hiddenFontIds,
        extraFonts: catalog.extraFonts,
        hiddenSymbolIds: catalog.hiddenSymbolIds,
        extraSymbols: catalog.extraSymbols,
      });
      set((s) => ({
        catalog,
        announcements: catalog.announcements,
        revision: s.revision + 1,
      }));
    } catch {
      setLibraryOverlay(null);
    }
  },
}));
