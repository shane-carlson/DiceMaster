import type {
  AdminUser,
  Announcement,
  AssetRecord,
  AssetSummary,
  PublicCatalog,
  PublicUser,
  SavedSetRecord,
  SavedSetSummary,
  SiteFont,
  SiteSymbol,
  WorkspacePayload,
} from "../../shared/account";
import type { Project } from "../engine/types";
import { withBase } from "../appBase";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(withBase(path), { ...init, headers, credentials: "include" });
  const text = await res.text();
  let data: { error?: string } & Record<string, unknown>;
  try {
    data = text ? (JSON.parse(text) as { error?: string } & Record<string, unknown>) : {};
  } catch {
    throw new ApiError(res.status, "Account service is unavailable.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Request failed.");
  }
  return data as T;
}

export type AuthPayload = { user: PublicUser; workspace: WorkspacePayload };

export const api = {
  me: () => request<AuthPayload>("/api/me"),
  signup: (body: { email: string; password: string; displayName: string; project?: Project }) =>
    request<AuthPayload>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string; project?: Project }) =>
    request<AuthPayload>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  updateProfile: (body: {
    displayName?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
  }) => request<{ user: PublicUser }>("/api/me", { method: "PATCH", body: JSON.stringify(body) }),
  putWorkspace: (body: Partial<WorkspacePayload>) =>
    request<WorkspacePayload>("/api/workspace", { method: "PUT", body: JSON.stringify(body) }),
  listSets: () => request<{ sets: SavedSetSummary[] }>("/api/sets"),
  getSet: (id: string) => request<SavedSetRecord>(`/api/sets/${id}`),
  createSet: (body: { name: string; project: Project }) =>
    request<SavedSetRecord>("/api/sets", { method: "POST", body: JSON.stringify(body) }),
  updateSet: (id: string, body: { name?: string; project?: Project }) =>
    request<SavedSetRecord>(`/api/sets/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSet: (id: string) => request<{ ok: boolean }>(`/api/sets/${id}`, { method: "DELETE" }),
  listAssets: (kind?: "logo" | "font") =>
    request<{ assets: AssetSummary[] }>(`/api/assets${kind ? `?kind=${kind}` : ""}`),
  createAsset: (body: { kind: "logo" | "font"; name: string; mime: string; data: string }) =>
    request<AssetSummary>("/api/assets", { method: "POST", body: JSON.stringify(body) }),
  getAsset: (id: string) => request<AssetRecord>(`/api/assets/${id}`),
  deleteAsset: (id: string) => request<{ ok: boolean }>(`/api/assets/${id}`, { method: "DELETE" }),
  catalog: () => request<PublicCatalog>("/api/catalog"),
  announcements: () => request<{ announcements: Announcement[] }>("/api/announcements"),
  adminLogin: (body: { email: string; password: string }) =>
    request<{ user: PublicUser }>("/api/admin/login", { method: "POST", body: JSON.stringify(body) }),
  adminUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),
  adminCreateUser: (body: {
    email: string;
    password: string;
    displayName: string;
    role?: "user" | "admin";
  }) => request<{ user: AdminUser }>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  adminPatchUser: (
    id: string,
    body: {
      displayName?: string;
      email?: string;
      password?: string;
      role?: "user" | "admin";
      disabled?: boolean;
    },
  ) => request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminDeleteUser: (id: string) => request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  adminAnnouncements: () => request<{ announcements: Announcement[] }>("/api/admin/announcements"),
  adminCreateAnnouncement: (body: { message: string; tone?: string; active?: boolean }) =>
    request<{ announcement: Announcement }>("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminPatchAnnouncement: (id: string, body: Partial<Pick<Announcement, "message" | "tone" | "active">>) =>
    request<{ announcement: Announcement }>(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adminDeleteAnnouncement: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/announcements/${id}`, { method: "DELETE" }),
  adminLibrary: () =>
    request<{
      hiddenFontIds: string[];
      hiddenSymbolIds: string[];
      extraFonts: SiteFont[];
      extraSymbols: SiteSymbol[];
    }>("/api/admin/library"),
  adminHideLibrary: (body: { hiddenFontIds?: string[]; hiddenSymbolIds?: string[] }) =>
    request<{ hiddenFontIds: string[]; hiddenSymbolIds: string[] }>("/api/admin/library/hidden", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  adminAddFont: (body: { name: string; mood: string; group: string; mime: string; data: string }) =>
    request<SiteFont>("/api/admin/library/fonts", { method: "POST", body: JSON.stringify(body) }),
  adminDeleteFont: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/library/fonts/${id}`, { method: "DELETE" }),
  adminAddSymbol: (body: { id?: string; name: string; category: string; viewBox?: number; path: string }) =>
    request<{ symbol: SiteSymbol }>("/api/admin/library/symbols", { method: "POST", body: JSON.stringify(body) }),
  adminPatchSymbol: (id: string, body: Partial<SiteSymbol>) =>
    request<{ symbol: SiteSymbol }>(`/api/admin/library/symbols/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adminDeleteSymbol: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/library/symbols/${id}`, { method: "DELETE" }),
};
