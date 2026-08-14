import type {
  AssetRecord,
  AssetSummary,
  PublicUser,
  SavedSetRecord,
  SavedSetSummary,
  WorkspacePayload,
} from "../../shared/account";
import type { Project } from "../engine/types";

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
  const res = await fetch(path, { ...init, headers, credentials: "include" });
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
};
