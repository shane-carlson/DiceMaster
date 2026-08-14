import { create } from "zustand";
import type { PublicUser, UserSettings, WorkspacePayload, WorkspaceSession } from "../../shared/account";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "../../shared/account";
import { api, ApiError } from "../api/client";
import { saveLocal, normalizeProject } from "../engine/projectIO";
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
  pendingVerificationEmail: string | null;
  bootstrap: () => Promise<void>;
  signup: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  clearPendingVerification: () => void;
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

function guestState(pendingVerificationEmail: string | null = null): Partial<AuthState> {
  return {
    status: "guest",
    user: null,
    workspace: null,
    settings: { ...DEFAULT_SETTINGS },
    session: { ...DEFAULT_SESSION },
    saveStatus: "offline",
    error: null,
    pendingVerificationEmail,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "bootstrapping",
  user: null,
  workspace: null,
  settings: { ...DEFAULT_SETTINGS },
  session: { ...DEFAULT_SESSION },
  saveStatus: "offline",
  error: null,
  pendingVerificationEmail: null,

  applyWorkspace: (workspace, replaceProject) => {
    set({
      workspace,
      settings: workspace.settings,
      session: workspace.session,
    });
    if (!replaceProject || !workspace.project) return;
    const project = normalizeProject(workspace.project);
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
      if (!payload.user.emailVerified) {
        set(guestState(payload.user.email));
        return;
      }
      set({
        status: "signed-in",
        user: payload.user,
        error: null,
        saveStatus: "saved",
        pendingVerificationEmail: null,
      });
      get().applyWorkspace(payload.workspace, true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        set(guestState(err.email ?? null));
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        set(guestState());
        return;
      }
      set(guestState());
    }
  },

  signup: async (input) => {
    const payload = await api.signup({ ...input, project: adoptGuestProject() });
    set(guestState(payload.email));
  },

  login: async (input) => {
    try {
      const payload = await api.login({ ...input, project: adoptGuestProject() });
      set({
        status: "signed-in",
        user: payload.user,
        error: null,
        saveStatus: "saved",
        pendingVerificationEmail: null,
      });
      get().applyWorkspace(payload.workspace, true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        set(guestState(err.email ?? input.email));
      }
      throw err;
    }
  },

  loginWithGoogle: async (credential) => {
    const payload = await api.googleSignIn({ credential, project: adoptGuestProject() });
    set({
      status: "signed-in",
      user: payload.user,
      error: null,
      saveStatus: "saved",
      pendingVerificationEmail: null,
    });
    get().applyWorkspace(payload.workspace, true);
  },

  verifyEmail: async (token) => {
    const payload = await api.verifyEmail(token);
    set({
      status: "signed-in",
      user: payload.user,
      error: null,
      saveStatus: "saved",
      pendingVerificationEmail: null,
    });
    get().applyWorkspace(payload.workspace, true);
  },

  resendVerification: async (email) => {
    const target = email || get().pendingVerificationEmail;
    if (!target) return;
    await api.resendVerification(target);
    set({ pendingVerificationEmail: target });
  },

  clearPendingVerification: () => set({ pendingVerificationEmail: null }),

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* still drop local session */
    }
    set(guestState());
  },

  updateProfile: async (input) => {
    const result = await api.updateProfile(input);
    if (result.needsVerification) {
      set(guestState(result.email ?? result.user.email));
      return;
    }
    set({ user: result.user });
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
