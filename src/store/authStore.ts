import { create } from "zustand";
import type { PublicUser, UserSettings, WorkspacePayload, WorkspaceSession } from "../../shared/account";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "../../shared/account";
import { api, ApiError } from "../api/client";
import { saveLocal } from "../engine/projectIO";
import { useProjectStore } from "./projectStore";

export type AuthStatus = "bootstrapping" | "guest" | "signed-in";
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

type AuthState = {
  status: AuthStatus;
  user: PublicUser | null;
  workspace: WorkspacePayload | null;
  settings: UserSettings;
  session: WorkspaceSession;
  saveStatus: SaveStatus;
  error: string | null;
  bootstrap: () => Promise<void>;
  signup: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: {
    displayName?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
  }) => Promise<void>;
  applyWorkspace: (workspace: WorkspacePayload, replaceProject: boolean) => void;
  patchSession: (patch: Partial<WorkspaceSession>) => void;
  patchSettings: (patch: Partial<UserSettings>) => void;
  setSaveStatus: (saveStatus: SaveStatus) => void;
};

function adoptGuestProject() {
  return useProjectStore.getState().project;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "bootstrapping",
  user: null,
  workspace: null,
  settings: { ...DEFAULT_SETTINGS },
  session: { ...DEFAULT_SESSION },
  saveStatus: "offline",
  error: null,

  applyWorkspace: (workspace, replaceProject) => {
    set({
      workspace,
      settings: workspace.settings,
      session: workspace.session,
    });
    if (!replaceProject || !workspace.project) return;
    const project = workspace.project;
    const selectedDieId =
      (workspace.session.selectedDieId &&
        project.dice.some((d) => d.id === workspace.session.selectedDieId) &&
        workspace.session.selectedDieId) ||
      project.dice[0]?.id ||
      null;
    const selectedFaceIndex =
      selectedDieId && workspace.session.selectedFaceIndex !== null
        ? workspace.session.selectedFaceIndex
        : null;
    useProjectStore.setState({
      project,
      selectedDieId,
      selectedFaceIndex,
      previewMode: workspace.session.previewMode,
    });
    saveLocal(project);
  },

  bootstrap: async () => {
    try {
      const payload = await api.me();
      set({
        status: "signed-in",
        user: payload.user,
        error: null,
        saveStatus: "saved",
      });
      get().applyWorkspace(payload.workspace, true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ status: "guest", user: null, workspace: null, saveStatus: "offline", error: null });
        return;
      }
      set({ status: "guest", user: null, saveStatus: "offline", error: null });
    }
  },

  signup: async (input) => {
    const payload = await api.signup({ ...input, project: adoptGuestProject() });
    set({ status: "signed-in", user: payload.user, error: null, saveStatus: "saved" });
    get().applyWorkspace(payload.workspace, true);
  },

  login: async (input) => {
    const payload = await api.login({ ...input, project: adoptGuestProject() });
    set({ status: "signed-in", user: payload.user, error: null, saveStatus: "saved" });
    get().applyWorkspace(payload.workspace, true);
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* still drop local session */
    }
    set({
      status: "guest",
      user: null,
      workspace: null,
      settings: { ...DEFAULT_SETTINGS },
      session: { ...DEFAULT_SESSION },
      saveStatus: "offline",
      error: null,
    });
  },

  updateProfile: async (input) => {
    const { user } = await api.updateProfile(input);
    set({ user });
  },

  patchSession: (patch) =>
    set((s) => ({
      session: { ...s.session, ...patch },
    })),

  patchSettings: (patch) =>
    set((s) => ({
      settings: { ...s.settings, ...patch },
    })),

  setSaveStatus: (saveStatus) => set({ saveStatus }),
}));
