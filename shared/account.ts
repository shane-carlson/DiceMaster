import type { Project } from "../src/engine/types";

export type UserRole = "user" | "admin";

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  role: UserRole;
  emailVerified: boolean;
};

export const EMAIL_VERIFICATION_DAYS = 2;
export const EMAIL_VERIFICATION_RESEND_MS = 60_000;

export type AdminUser = PublicUser & {
  disabled: boolean;
  updatedAt: number;
  setCount: number;
};

export type AnnouncementTone = "info" | "gold" | "alert";

export type Announcement = {
  id: string;
  message: string;
  tone: AnnouncementTone;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SiteFontGroup = "print" | "fantasy" | "scifi" | "gamer";

export type SiteFont = {
  id: string;
  name: string;
  mood: string;
  group: SiteFontGroup;
  file: string;
};

export type SiteSymbol = {
  id: string;
  name: string;
  category: string;
  viewBox: number;
  path: string;
};

export type PublicCatalog = {
  announcements: Announcement[];
  hiddenFontIds: string[];
  extraFonts: SiteFont[];
  hiddenSymbolIds: string[];
  extraSymbols: SiteSymbol[];
};

export const DEFAULT_ADMIN_EMAIL = "admin@dicemaster.local";
export const DEFAULT_ADMIN_PASSWORD = "ForgeMaster#1";

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
