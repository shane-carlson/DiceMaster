import { create } from "zustand";
import {
  createDie,
  DEFAULT_GLOBAL_FONT_SCALE,
  ensureCarveDepth,
  ensureFaceCount,
  makeEmblem,
  rescaleDie,
  resetDieSliders,
} from "../engine/defaults";
import { uid } from "../engine/id";
import { loadLocal, saveLocal, normalizeProject } from "../engine/projectIO";
import { diceFromTemplate, templateById } from "../engine/templates";
import { defaultCarveDepth } from "../engine/carve";
import type {
  DieInstance,
  DieType,
  FaceKind,
  GlyphSettings,
  LogoAsset,
  Project,
  SizeFormatId,
} from "../engine/types";

function blankProject(): Project {
  return {
    version: 1,
    name: "Unnamed Set",
    fontId: "oswald",
    globalDepth: defaultCarveDepth("standard"),
    globalFontScale: 1,
    dice: diceFromTemplate(templateById("standard-polyhedral")!),
    logos: [],
  };
}

function persist(project: Project) {
  saveLocal(project);
}

export interface WorkshopState {
  project: Project;
  selectedDieId: string | null;
  selectedFaceIndex: number | null;
  focusGeneration: number;
  inspectorFocusGeneration: number;
  viewResetGeneration: number;
  previewMode: "overview" | "die" | "face";
  hydrate: () => void;
  setName: (name: string) => void;
  setFontId: (fontId: string) => void;
  setCustomFont: (name: string, base64: string) => void;
  setGlobalFontScale: (n: number) => void;
  loadTemplate: (templateId: string) => void;
  addDie: (type: DieType, format?: SizeFormatId) => void;
  removeDie: (id: string) => void;
  duplicateDie: (id: string) => void;
  selectDie: (id: string | null) => void;
  selectDieFace: (id: string, faceIndex: number) => void;
  focusDie: (id: string) => void;
  focusDieFace: (id: string, faceIndex: number) => void;
  resetView: () => void;
  selectFace: (index: number | null) => void;
  ensureFaceSelection: () => { dieId: string; faceIndex: number } | null;
  revealInspector: () => void;
  updateDie: (id: string, patch: Partial<DieInstance>) => void;
  setSizeFormat: (id: string, format: SizeFormatId | "custom", sizeMm?: number) => void;
  updateFaceGlyph: (
    dieId: string,
    faceIndex: number,
    which: "primary" | "emblem",
    patch: Partial<GlyphSettings> | null,
  ) => void;
  setFaceKind: (
    dieId: string,
    faceIndex: number,
    which: "primary" | "emblem",
    kind: FaceKind,
  ) => void;
  addLogo: (logo: LogoAsset) => void;
  removeLogo: (id: string) => void;
  copyFaceToAll: (dieId: string, faceIndex: number) => void;
  applyEmblemToHighest: (dieId: string, emblem: GlyphSettings) => void;
  resetDieDefaults: (id: string) => void;
  replaceProject: (project: Project) => void;
  resetProject: () => void;
}

function patchDie(dice: DieInstance[], id: string, fn: (d: DieInstance) => DieInstance) {
  return dice.map((d) => (d.id === id ? fn(d) : d));
}

export const useProjectStore = create<WorkshopState>((set, get) => ({
  project: blankProject(),
  selectedDieId: null,
  selectedFaceIndex: null,
  focusGeneration: 0,
  inspectorFocusGeneration: 0,
  viewResetGeneration: 0,
  previewMode: "overview",

  hydrate: () => {
    const local = loadLocal();
    if (!local) {
      const current = get().project;
      set({ selectedDieId: current.dice[0]?.id ?? null, selectedFaceIndex: null });
      return;
    }
    persist(local);
    set({
      project: local,
      selectedDieId: local.dice[0]?.id ?? null,
      selectedFaceIndex: null,
      previewMode: "overview",
    });
  },

  setName: (name) =>
    set((s) => {
      const project = { ...s.project, name };
      persist(project);
      return { project };
    }),

  setFontId: (fontId) =>
    set((s) => {
      const project = { ...s.project, fontId };
      persist(project);
      return { project };
    }),

  setCustomFont: (name, base64) =>
    set((s) => {
      const project = {
        ...s.project,
        fontId: "custom",
        customFontName: name,
        customFontBase64: base64,
      };
      persist(project);
      return { project };
    }),

  setGlobalFontScale: (n) =>
    set((s) => {
      const project = { ...s.project, globalFontScale: n };
      persist(project);
      return { project };
    }),

  loadTemplate: (templateId) => {
    const template = templateById(templateId);
    if (!template) return;
    set((s) => {
      const dice = diceFromTemplate(template);
      const project = { ...s.project, name: template.name, dice };
      persist(project);
      return {
        project,
        selectedDieId: dice[0]?.id ?? null,
        selectedFaceIndex: null,
        previewMode: "overview" as const,
      };
    });
  },

  addDie: (type, format = "standard") =>
    set((s) => {
      const die = createDie(type, format);
      const project = { ...s.project, dice: [...s.project.dice, die] };
      persist(project);
      return { project, selectedDieId: die.id, selectedFaceIndex: null };
    }),

  removeDie: (id) =>
    set((s) => {
      const dice = s.project.dice.filter((d) => d.id !== id);
      const project = { ...s.project, dice };
      persist(project);
      const selectedDieId = s.selectedDieId === id ? (dice[0]?.id ?? null) : s.selectedDieId;
      return { project, selectedDieId, selectedFaceIndex: null };
    }),

  duplicateDie: (id) =>
    set((s) => {
      const src = s.project.dice.find((d) => d.id === id);
      if (!src) return s;
      const copy: DieInstance = {
        ...structuredClone(src),
        id: uid(),
        name: `${src.name} copy`,
      };
      const idx = s.project.dice.findIndex((d) => d.id === id);
      const dice = [...s.project.dice];
      dice.splice(idx + 1, 0, copy);
      const project = { ...s.project, dice };
      persist(project);
      return { project, selectedDieId: copy.id };
    }),

  selectDie: (id) => set({ selectedDieId: id, selectedFaceIndex: null }),
  selectDieFace: (id, faceIndex) => set({ selectedDieId: id, selectedFaceIndex: faceIndex }),
  focusDie: (id) =>
    set((s) => ({
      selectedDieId: id,
      selectedFaceIndex: null,
      previewMode: "die",
      focusGeneration: s.focusGeneration + 1,
    })),
  focusDieFace: (id, faceIndex) =>
    set((s) => {
      const die = s.project.dice.find((d) => d.id === id);
      if (!die || faceIndex < 0 || faceIndex >= die.faces.length) {
        return {
          selectedDieId: id,
          selectedFaceIndex: null,
          previewMode: "die",
          focusGeneration: s.focusGeneration + 1,
        };
      }
      return {
        selectedDieId: id,
        selectedFaceIndex: faceIndex,
        previewMode: "face",
        focusGeneration: s.focusGeneration + 1,
      };
    }),
  resetView: () =>
    set((s) => ({
      previewMode: "overview",
      viewResetGeneration: s.viewResetGeneration + 1,
    })),
  selectFace: (index) => set({ selectedFaceIndex: index }),
  ensureFaceSelection: () => {
    const s = get();
    if (s.selectedDieId && s.selectedFaceIndex !== null) {
      return { dieId: s.selectedDieId, faceIndex: s.selectedFaceIndex };
    }
    const dieId = s.selectedDieId ?? s.project.dice[0]?.id;
    if (!dieId) return null;
    const die = s.project.dice.find((d) => d.id === dieId);
    if (!die || die.faces.length === 0) return null;
    const faceIndex = s.selectedFaceIndex ?? 0;
    set({ selectedDieId: dieId, selectedFaceIndex: faceIndex });
    return { dieId, faceIndex };
  },
  revealInspector: () =>
    set((s) => ({ inspectorFocusGeneration: s.inspectorFocusGeneration + 1 })),

  updateDie: (id, patch) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, id, (d) => {
          let next = { ...d, ...patch, id: d.id };
          if (patch.type && patch.type !== d.type) {
            next = ensureFaceCount({ ...next, type: patch.type });
          }
          if (patch.d10Style && patch.d10Style !== d.d10Style) {
            next = ensureFaceCount(next);
          }
          return ensureCarveDepth(next);
        }),
      };
      persist(project);
      return { project };
    }),

  setSizeFormat: (id, format, sizeMm) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, id, (d) => {
          if (format === "custom") {
            return { ...d, sizeFormat: "custom", sizeMm: sizeMm ?? d.sizeMm };
          }
          return rescaleDie(d, format);
        }),
      };
      persist(project);
      return { project };
    }),

  updateFaceGlyph: (dieId, faceIndex, which, patch) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, dieId, (d) => {
          const faces = d.faces.map((f, i) => {
            if (i !== faceIndex) return f;
            if (which === "emblem") {
              if (patch === null) return { ...f, emblem: null };
              const base = f.emblem ?? makeEmblem("symbol", "star");
              return { ...f, emblem: { ...base, ...patch } };
            }
            return { ...f, primary: { ...f.primary, ...patch } };
          });
          return { ...d, faces };
        }),
      };
      persist(project);
      return { project };
    }),

  setFaceKind: (dieId, faceIndex, which, kind) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, dieId, (d) => {
          const faces = d.faces.map((f, i) => {
            if (i !== faceIndex) return f;
            if (which === "emblem") {
              if (kind === "blank") return { ...f, emblem: null };
              const base = f.emblem ?? makeEmblem(kind === "logo" ? "logo" : "symbol", kind === "logo" ? "" : "star");
              return { ...f, emblem: { ...base, kind } };
            }
            return {
              ...f,
              primary: {
                ...f.primary,
                kind,
                symbolId: kind === "symbol" ? (f.primary.symbolId ?? "star") : f.primary.symbolId,
              },
            };
          });
          return { ...d, faces };
        }),
      };
      persist(project);
      return { project };
    }),

  addLogo: (logo) =>
    set((s) => {
      const project = { ...s.project, logos: [...s.project.logos, logo] };
      persist(project);
      return { project };
    }),

  removeLogo: (id) =>
    set((s) => {
      const project = { ...s.project, logos: s.project.logos.filter((l) => l.id !== id) };
      persist(project);
      return { project };
    }),

  copyFaceToAll: (dieId, faceIndex) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, dieId, (d) => {
          const src = d.faces[faceIndex];
          if (!src) return d;
          return {
            ...d,
            faces: d.faces.map((f) => ({
              primary: {
                ...f.primary,
                offsetX: src.primary.offsetX,
                offsetY: src.primary.offsetY,
                rotation: src.primary.rotation,
                scale: src.primary.scale,
                depth: src.primary.depth,
              },
              emblem: f.emblem,
            })),
          };
        }),
      };
      persist(project);
      return { project };
    }),

  applyEmblemToHighest: (dieId, emblem) =>
    set((s) => {
      const project = {
        ...s.project,
        dice: patchDie(s.project.dice, dieId, (d) => {
          let best = 0;
          let bestVal = -1;
          d.faces.forEach((f, i) => {
            const n = Number(f.primary.text);
            if (Number.isFinite(n) && n > bestVal) {
              bestVal = n;
              best = i;
            }
          });
          const faces = d.faces.map((f, i) =>
            i === best ? { ...f, emblem } : f,
          );
          return { ...d, faces };
        }),
      };
      persist(project);
      return { project };
    }),

  resetDieDefaults: (id) =>
    set((s) => {
      const project = {
        ...s.project,
        globalFontScale: DEFAULT_GLOBAL_FONT_SCALE,
        dice: patchDie(s.project.dice, id, resetDieSliders),
      };
      persist(project);
      return { project };
    }),

  replaceProject: (project) => {
    const next = normalizeProject(project);
    persist(next);
    set({ project: next, selectedDieId: next.dice[0]?.id ?? null, selectedFaceIndex: null });
  },

  resetProject: () => {
    const project = blankProject();
    persist(project);
    set({ project, selectedDieId: project.dice[0]?.id ?? null, selectedFaceIndex: null });
  },
}));

export function selectedDie(state: WorkshopState): DieInstance | undefined {
  return state.project.dice.find((d) => d.id === state.selectedDieId);
}
