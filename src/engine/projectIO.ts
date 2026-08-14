import type { DieInstance, Project } from "./types";
import { ensureCarveDepth, ensureCornerRounding, ensureFaceCount } from "./defaults";
import { defaultCarveDepth } from "./carve";

const STORAGE_KEY = "dicemaster.project.v1";

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

function normalizeDie(die: DieInstance): DieInstance {
  return ensureCarveDepth(ensureFaceCount(ensureCornerRounding(die)));
}

export function normalizeProject(project: Project): Project {
  return {
    ...project,
    globalDepth: defaultCarveDepth("standard"),
    dice: project.dice.map(normalizeDie),
  };
}

export function parseProject(raw: string): Project {
  const data = JSON.parse(raw) as Project;
  if (!data || data.version !== 1 || !Array.isArray(data.dice)) {
    throw new Error("This file is not a DiceMaster project.");
  }
  return normalizeProject(data);
}

export function saveLocal(project: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProject(project));
  } catch {
    /* quota */
  }
}

export function loadLocal(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseProject(raw);
  } catch {
    return null;
  }
}

export function downloadJson(project: Project) {
  const blob = new Blob([serializeProject(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, "-").toLowerCase() || "dicemaster"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
