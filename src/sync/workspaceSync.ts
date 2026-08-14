import type { WorkspacePayload } from "../../shared/account";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useProjectStore } from "../store/projectStore";

const DEBOUNCE_MS = 900;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let lastPath = "/";

function snapshot(): Partial<WorkspacePayload> {
  const auth = useAuthStore.getState();
  const project = useProjectStore.getState();
  return {
    project: project.project,
    session: {
      ...auth.session,
      lastPath,
      selectedDieId: project.selectedDieId,
      selectedFaceIndex: project.selectedFaceIndex,
      previewMode: project.previewMode,
    },
    settings: auth.settings,
  };
}

export async function flushWorkspace() {
  if (useAuthStore.getState().status !== "signed-in") return;
  useAuthStore.getState().setSaveStatus("saving");
  try {
    const workspace = await api.putWorkspace(snapshot());
    useAuthStore.setState({ workspace, saveStatus: "saved" });
  } catch {
    useAuthStore.getState().setSaveStatus("error");
  }
}

export function scheduleWorkspaceSave() {
  if (useAuthStore.getState().status !== "signed-in") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushWorkspace();
  }, DEBOUNCE_MS);
}

export function setTrackedPath(path: string) {
    if (path === "/login" || path === "/signup" || path.startsWith("/admin")) return;
  lastPath = path;
  useAuthStore.getState().patchSession({ lastPath: path });
  scheduleWorkspaceSave();
}

export function startWorkspaceSync() {
  if (started) return;
  started = true;
  useProjectStore.subscribe(() => {
    scheduleWorkspaceSave();
  });
  useAuthStore.subscribe((state, prev) => {
    if (state.status !== "signed-in") return;
    if (state.settings !== prev.settings || state.session.lastSetId !== prev.session.lastSetId) {
      scheduleWorkspaceSave();
    }
  });
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (useAuthStore.getState().status !== "signed-in") return;
      void fetch("/api/workspace", {
        method: "PUT",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot()),
      });
    });
  }
}

export async function saveCurrentSet(name?: string) {
  const project = useProjectStore.getState().project;
  const lastSetId = useAuthStore.getState().session.lastSetId;
  const label = (name ?? project.name).trim() || "Unnamed Set";
  if (lastSetId) {
    const record = await api.updateSet(lastSetId, { name: label, project });
    useAuthStore.getState().patchSession({ lastSetId: record.id });
    await flushWorkspace();
    return record;
  }
  const record = await api.createSet({ name: label, project });
  useAuthStore.getState().patchSession({ lastSetId: record.id });
  await flushWorkspace();
  return record;
}

export async function openSavedSet(id: string) {
  const record = await api.getSet(id);
  useProjectStore.getState().replaceProject(record.project);
  useAuthStore.getState().patchSession({ lastSetId: record.id, lastPath: "/workshop" });
  await flushWorkspace();
}

export async function saveLogoAsset(input: { name: string; mime: string; data: string }) {
  if (useAuthStore.getState().status !== "signed-in") return;
  await api.createAsset({ kind: "logo", ...input });
}

export async function saveFontAsset(input: { name: string; data: string }) {
  if (useAuthStore.getState().status !== "signed-in") return;
  await api.createAsset({ kind: "font", name: input.name, mime: "font/ttf", data: input.data });
}
