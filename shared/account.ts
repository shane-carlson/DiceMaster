import type { Project } from "../src/engine/types";

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
};

export type WorkshopPreviewMode = "overview" | "die" | "face";

export type WorkspaceSession = {
  lastPath: string;
  selectedDieId: string | null;
  selectedFaceIndex: number | null;
  previewMode: WorkshopPreviewMode;
  lastSetId: string | null;
  faceEditorOpen: boolean;
};

export type UserSettings = {
  placeMode: "add" | "replace";
};

export type WorkspacePayload = {
  project: Project | null;
  session: WorkspaceSession;
  settings: UserSettings;
  updatedAt: number;
};

export type SavedSetSummary = {
  id: string;
  name: string;
  updatedAt: number;
  dieCount: number;
};

export type SavedSetRecord = SavedSetSummary & {
  project: Project;
};

export type AssetKind = "logo" | "font";

export type AssetSummary = {
  id: string;
  kind: AssetKind;
  name: string;
  mime: string;
  createdAt: number;
  size: number;
};

export type AssetRecord = AssetSummary & {
  data: string;
};

export const DEFAULT_SESSION: WorkspaceSession = {
  lastPath: "/",
  selectedDieId: null,
  selectedFaceIndex: null,
  previewMode: "overview",
  lastSetId: null,
  faceEditorOpen: false,
};

export const DEFAULT_SETTINGS: UserSettings = {
  placeMode: "add",
};

export const SESSION_COOKIE = "dm_session";
export const SESSION_DAYS = 30;
