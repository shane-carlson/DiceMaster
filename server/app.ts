import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Project } from "../src/engine/types";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  SESSION_COOKIE,
  SESSION_DAYS,
  type AnnouncementTone,
  type AssetKind,
  type PublicUser,
  type SiteFontGroup,
  type UserSettings,
  type WorkspacePayload,
  type WorkspaceSession,
} from "../shared/account";
import { hashPassword, verifyPassword } from "./crypto";
import { FileVault, type UserRecord } from "./store";

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AppEnv = {
  Variables: {
    vault: FileVault;
    user: UserRecord;
  };
};

function asStatusError(err: unknown): HTTPException {
  if (err instanceof HTTPException) return err;
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return new HTTPException((status || 500) as 400, { message });
}

function requireEmail(email: unknown): string {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 120) {
    throw new HTTPException(400, { message: "Enter a valid email address." });
  }
  return email.trim().toLowerCase();
}

function requirePassword(password: unknown, label = "Password"): string {
  if (typeof password !== "string" || password.length < 8 || password.length > 200) {
    throw new HTTPException(400, { message: `${label} must be at least 8 characters.` });
  }
  return password;
}

function requireDisplayName(name: unknown): string {
  if (typeof name !== "string") {
    throw new HTTPException(400, { message: "Display name is required." });
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new HTTPException(400, { message: "Display name must be 1–40 characters." });
  }
  return trimmed;
}

function isProject(value: unknown): value is Project {
  return Boolean(value && typeof value === "object" && (value as Project).version === 1 && Array.isArray((value as Project).dice));
}

function optionalProject(value: unknown): Project | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (!isProject(value)) {
    throw new HTTPException(400, { message: "That is not a DiceMaster project." });
  }
  return value;
}

function publicBasePath(): string {
  return (process.env.PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
}

function cookieOpts(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  const secure = process.env.COOKIE_SECURE === "1" || url.protocol === "https:";
  return {
    httpOnly: true,
    path: publicBasePath() || "/",
    sameSite: "Lax" as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure,
  };
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, cookieOpts(c));
}

const FONT_GROUPS: SiteFontGroup[] = ["print", "fantasy", "scifi", "gamer"];
const TONES: AnnouncementTone[] = ["info", "gold", "alert"];

function requireTone(value: unknown): AnnouncementTone {
  if (typeof value !== "string" || !TONES.includes(value as AnnouncementTone)) {
    throw new HTTPException(400, { message: "Tone must be info, gold, or alert." });
  }
  return value as AnnouncementTone;
}

function requireGroup(value: unknown): SiteFontGroup {
  if (typeof value !== "string" || !FONT_GROUPS.includes(value as SiteFontGroup)) {
    throw new HTTPException(400, { message: "Font group must be print, fantasy, scifi, or gamer." });
  }
  return value as SiteFontGroup;
}

function requireMessage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HTTPException(400, { message: "Announcement text is required." });
  }
  return value.trim().slice(0, 280);
}

function slugId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function createApp(vault: FileVault) {
  vault.ensureAdmin({
    email: (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    displayName: "Administrator",
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD),
  });

  const app = new Hono<AppEnv>();

  app.use("/api/*", async (c, next) => {
    c.set("vault", vault);
    await next();
  });

  app.onError((err, c) => {
    const http = asStatusError(err);
    return c.json({ error: http.message }, http.status);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.post("/api/auth/signup", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = requireEmail(body.email);
    const password = requirePassword(body.password);
    const displayName = requireDisplayName(body.displayName);
    const project = optionalProject(body.project);
    try {
      const user = vault.createUser({
        email,
        displayName,
        passwordHash: hashPassword(password),
      });
      if (project) {
        vault.putWorkspace(user.id, { project, session: { lastPath: "/workshop" } });
      }
      const session = vault.createSession(user.id, SESSION_MS);
      setSessionCookie(c, session.id);
      return c.json({ user: vault.toPublic(user), workspace: vault.getWorkspace(user.id) }, 201);
    } catch (err) {
      throw asStatusError(err);
    }
  });

  app.post("/api/auth/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = requireEmail(body.email);
    const password = requirePassword(body.password);
    const user = vault.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new HTTPException(401, { message: "Email or password is incorrect." });
    }
    if (user.disabled) {
      throw new HTTPException(403, { message: "This account has been disabled." });
    }
    const guestProject = optionalProject(body.project);
    const workspace = vault.getWorkspace(user.id);
    if (!workspace.project && guestProject) {
      vault.putWorkspace(user.id, { project: guestProject, session: { lastPath: "/workshop" } });
    }
    const session = vault.createSession(user.id, SESSION_MS);
    setSessionCookie(c, session.id);
    return c.json({ user: vault.toPublic(user), workspace: vault.getWorkspace(user.id) });
  });

  app.post("/api/auth/logout", async (c) => {
    vault.deleteSession(getCookie(c, SESSION_COOKIE));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/api/catalog", (c) => c.json(vault.publicCatalog()));

  app.get("/api/announcements", (c) =>
    c.json({ announcements: vault.listAnnouncements().filter((a) => a.active) }),
  );

  app.get("/api/catalog/fonts/:id", (c) => {
    const font = vault.getCatalogFont(c.req.param("id"));
    if (!font) throw new HTTPException(404, { message: "Font not found." });
    const bytes = Buffer.from(font.data, "base64");
    return c.body(bytes, 200, {
      "Content-Type": font.mime || "font/ttf",
      "Cache-Control": "public, max-age=3600",
    });
  });

  app.post("/api/admin/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = requireEmail(body.email);
    const password = requirePassword(body.password);
    const user = vault.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new HTTPException(401, { message: "Email or password is incorrect." });
    }
    if (user.disabled) {
      throw new HTTPException(403, { message: "This account has been disabled." });
    }
    if (user.role !== "admin") {
      throw new HTTPException(403, { message: "This account is not an administrator." });
    }
    const session = vault.createSession(user.id, SESSION_MS);
    setSessionCookie(c, session.id);
    return c.json({ user: vault.toPublic(user) });
  });

  const authed = new Hono<AppEnv>();
  authed.use("*", async (c, next) => {
    const session = vault.getSession(getCookie(c, SESSION_COOKIE));
    if (!session) {
      throw new HTTPException(401, { message: "Sign in to continue." });
    }
    const user = vault.getUser(session.userId);
    if (!user || user.disabled) {
      throw new HTTPException(401, { message: "Sign in to continue." });
    }
    c.set("user", user);
    await next();
  });

  authed.get("/me", (c) => {
    return c.json({ user: vault.toPublic(c.get("user")), workspace: vault.getWorkspace(c.get("user").id) });
  });

  authed.patch("/me", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const user = c.get("user");
    const patch: { displayName?: string; email?: string; passwordHash?: string } = {};
    if (body.displayName !== undefined) patch.displayName = requireDisplayName(body.displayName);
    if (body.email !== undefined) patch.email = requireEmail(body.email);
    if (body.password !== undefined) {
      if (typeof body.currentPassword !== "string" || !verifyPassword(body.currentPassword, user.passwordHash)) {
        throw new HTTPException(400, { message: "Current password is incorrect." });
      }
      patch.passwordHash = hashPassword(requirePassword(body.password, "New password"));
    }
    try {
      const next = vault.updateUser(user.id, patch);
      return c.json({ user: vault.toPublic(next) });
    } catch (err) {
      throw asStatusError(err);
    }
  });

  authed.get("/workspace", (c) => c.json(vault.getWorkspace(c.get("user").id)));

  authed.put("/workspace", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const project = body.project === undefined ? undefined : body.project === null ? null : optionalProject(body.project) ?? null;
    const session = body.session as Partial<WorkspaceSession> | undefined;
    const settings = body.settings as Partial<UserSettings> | undefined;
    const next = vault.putWorkspace(c.get("user").id, { project, session, settings });
    return c.json(next);
  });

  authed.get("/sets", (c) => c.json({ sets: vault.listSets(c.get("user").id) }));

  authed.post("/sets", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const project = optionalProject(body.project);
    if (!project) throw new HTTPException(400, { message: "A project is required." });
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : project.name;
    const record = vault.putSet(c.get("user").id, {
      id: crypto.randomUUID(),
      name,
      project,
      dieCount: project.dice.length,
      updatedAt: Date.now(),
    });
    return c.json(record, 201);
  });

  authed.get("/sets/:id", (c) => {
    const record = vault.getSet(c.get("user").id, c.req.param("id"));
    if (!record) throw new HTTPException(404, { message: "Set not found." });
    return c.json(record);
  });

  authed.put("/sets/:id", async (c) => {
    const existing = vault.getSet(c.get("user").id, c.req.param("id"));
    if (!existing) throw new HTTPException(404, { message: "Set not found." });
    const body = await c.req.json().catch(() => ({}));
    const project = body.project === undefined ? existing.project : optionalProject(body.project);
    if (!project) throw new HTTPException(400, { message: "A project is required." });
    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : existing.name;
    const record = vault.putSet(c.get("user").id, {
      ...existing,
      name,
      project,
      dieCount: project.dice.length,
    });
    return c.json(record);
  });

  authed.delete("/sets/:id", (c) => {
    if (!vault.deleteSet(c.get("user").id, c.req.param("id"))) {
      throw new HTTPException(404, { message: "Set not found." });
    }
    return c.json({ ok: true });
  });

  authed.get("/assets", (c) => {
    const kind = c.req.query("kind") as AssetKind | undefined;
    if (kind && kind !== "logo" && kind !== "font") {
      throw new HTTPException(400, { message: "kind must be logo or font." });
    }
    return c.json({ assets: vault.listAssets(c.get("user").id, kind) });
  });

  authed.post("/assets", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (body.kind !== "logo" && body.kind !== "font") {
      throw new HTTPException(400, { message: "kind must be logo or font." });
    }
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new HTTPException(400, { message: "Asset name is required." });
    }
    if (typeof body.data !== "string" || body.data.length < 1) {
      throw new HTTPException(400, { message: "Asset data is required." });
    }
    if (body.data.length > 6_000_000) {
      throw new HTTPException(400, { message: "That file is too large (6 MB limit)." });
    }
    const mime = typeof body.mime === "string" && body.mime ? body.mime : "application/octet-stream";
    const record = vault.putAsset(c.get("user").id, {
      id: crypto.randomUUID(),
      kind: body.kind,
      name: body.name.trim().slice(0, 80),
      mime,
      data: body.data,
      createdAt: Date.now(),
      size: body.data.length,
    });
    const { data: _data, ...summary } = record;
    return c.json(summary, 201);
  });

  authed.get("/assets/:id", (c) => {
    const record = vault.getAsset(c.get("user").id, c.req.param("id"));
    if (!record) throw new HTTPException(404, { message: "Asset not found." });
    return c.json(record);
  });

  authed.delete("/assets/:id", (c) => {
    if (!vault.deleteAsset(c.get("user").id, c.req.param("id"))) {
      throw new HTTPException(404, { message: "Asset not found." });
    }
    return c.json({ ok: true });
  });

  const admin = new Hono<AppEnv>();
  admin.use("*", async (c, next) => {
    const session = vault.getSession(getCookie(c, SESSION_COOKIE));
    if (!session) throw new HTTPException(401, { message: "Sign in to continue." });
    const user = vault.getUser(session.userId);
    if (!user || user.disabled) throw new HTTPException(401, { message: "Sign in to continue." });
    if (user.role !== "admin") throw new HTTPException(403, { message: "Administrator access required." });
    c.set("user", user);
    await next();
  });

  admin.get("/users", (c) => c.json({ users: vault.listUsers() }));

  admin.post("/users", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = requireEmail(body.email);
    const displayName = requireDisplayName(body.displayName);
    const password = requirePassword(body.password);
    const role = body.role === "admin" ? "admin" : "user";
    try {
      const user = vault.createUser({
        email,
        displayName,
        passwordHash: hashPassword(password),
        role,
      });
      return c.json({ user: vault.listUsers().find((u) => u.id === user.id) }, 201);
    } catch (err) {
      throw asStatusError(err);
    }
  });

  admin.patch("/users/:id", async (c) => {
    const id = c.req.param("id");
    const target = vault.getUser(id);
    if (!target) throw new HTTPException(404, { message: "Account not found." });
    const body = await c.req.json().catch(() => ({}));
    const actor = c.get("user");
    const nextRole = body.role === "admin" || body.role === "user" ? body.role : undefined;
    const nextDisabled = typeof body.disabled === "boolean" ? body.disabled : undefined;
    const strippingAdmin =
      (nextRole === "user" && target.role === "admin") ||
      (nextDisabled === true && target.role === "admin" && !target.disabled);
    if (strippingAdmin && vault.enabledAdminCount(target.id) < 1) {
      throw new HTTPException(400, { message: "Keep at least one active administrator." });
    }
    if (id === actor.id && nextDisabled === true) {
      throw new HTTPException(400, { message: "You cannot disable your own account." });
    }
    const patch: Parameters<FileVault["updateUser"]>[1] = {};
    if (body.displayName !== undefined) patch.displayName = requireDisplayName(body.displayName);
    if (body.email !== undefined) patch.email = requireEmail(body.email);
    if (body.password !== undefined) patch.passwordHash = hashPassword(requirePassword(body.password));
    if (nextRole) patch.role = nextRole;
    if (nextDisabled !== undefined) patch.disabled = nextDisabled;
    try {
      vault.updateUser(id, patch);
      if (nextDisabled === true) vault.deleteSessionsForUser(id);
      return c.json({ user: vault.listUsers().find((u) => u.id === id) });
    } catch (err) {
      throw asStatusError(err);
    }
  });

  admin.delete("/users/:id", (c) => {
    const id = c.req.param("id");
    const target = vault.getUser(id);
    if (!target) throw new HTTPException(404, { message: "Account not found." });
    if (id === c.get("user").id) {
      throw new HTTPException(400, { message: "You cannot delete your own account." });
    }
    if (target.role === "admin" && vault.enabledAdminCount(id) < 1) {
      throw new HTTPException(400, { message: "Keep at least one active administrator." });
    }
    vault.deleteUser(id);
    return c.json({ ok: true });
  });

  admin.get("/announcements", (c) => c.json({ announcements: vault.listAnnouncements() }));

  admin.post("/announcements", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const now = Date.now();
    const row = vault.putAnnouncement({
      id: crypto.randomUUID(),
      message: requireMessage(body.message),
      tone: body.tone ? requireTone(body.tone) : "gold",
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    });
    return c.json({ announcement: row }, 201);
  });

  admin.patch("/announcements/:id", async (c) => {
    const existing = vault.listAnnouncements().find((a) => a.id === c.req.param("id"));
    if (!existing) throw new HTTPException(404, { message: "Announcement not found." });
    const body = await c.req.json().catch(() => ({}));
    const row = vault.putAnnouncement({
      ...existing,
      message: body.message !== undefined ? requireMessage(body.message) : existing.message,
      tone: body.tone !== undefined ? requireTone(body.tone) : existing.tone,
      active: typeof body.active === "boolean" ? body.active : existing.active,
    });
    return c.json({ announcement: row });
  });

  admin.delete("/announcements/:id", (c) => {
    if (!vault.deleteAnnouncement(c.req.param("id"))) {
      throw new HTTPException(404, { message: "Announcement not found." });
    }
    return c.json({ ok: true });
  });

  admin.get("/library", (c) => {
    const library = vault.getLibrary();
    return c.json({
      hiddenFontIds: library.hiddenFontIds,
      hiddenSymbolIds: library.hiddenSymbolIds,
      extraFonts: library.extraFonts.map(({ data: _d, ...rest }) => rest),
      extraSymbols: library.extraSymbols,
    });
  });

  admin.put("/library/hidden", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const hiddenFontIds = Array.isArray(body.hiddenFontIds)
      ? body.hiddenFontIds.filter((id: unknown) => typeof id === "string")
      : undefined;
    const hiddenSymbolIds = Array.isArray(body.hiddenSymbolIds)
      ? body.hiddenSymbolIds.filter((id: unknown) => typeof id === "string")
      : undefined;
    const library = vault.putLibrary({ hiddenFontIds, hiddenSymbolIds });
    return c.json({ hiddenFontIds: library.hiddenFontIds, hiddenSymbolIds: library.hiddenSymbolIds });
  });

  admin.post("/library/fonts", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new HTTPException(400, { message: "Font name is required." });
    }
    if (typeof body.data !== "string" || body.data.length < 1) {
      throw new HTTPException(400, { message: "Font data is required." });
    }
    if (body.data.length > 6_000_000) {
      throw new HTTPException(400, { message: "That file is too large (6 MB limit)." });
    }
    const row = vault.addCatalogFont({
      name: body.name.trim().slice(0, 80),
      mood: typeof body.mood === "string" && body.mood.trim() ? body.mood.trim().slice(0, 80) : "Site library",
      group: requireGroup(body.group ?? "print"),
      mime: typeof body.mime === "string" && body.mime ? body.mime : "font/ttf",
      data: body.data,
    });
    const { data: _d, ...summary } = row;
    return c.json(summary, 201);
  });

  admin.delete("/library/fonts/:id", (c) => {
    if (!vault.deleteCatalogFont(c.req.param("id"))) {
      throw new HTTPException(404, { message: "Font not found." });
    }
    return c.json({ ok: true });
  });

  admin.post("/library/symbols", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new HTTPException(400, { message: "Symbol name is required." });
    }
    if (typeof body.path !== "string" || !body.path.trim()) {
      throw new HTTPException(400, { message: "SVG path data is required." });
    }
    const name = body.name.trim().slice(0, 80);
    const id =
      typeof body.id === "string" && slugId(body.id)
        ? slugId(body.id)
        : slugId(name) || `mark-${crypto.randomUUID().slice(0, 8)}`;
    const symbol = {
      id,
      name,
      category: typeof body.category === "string" && body.category.trim() ? body.category.trim().slice(0, 40) : "Marks",
      viewBox: typeof body.viewBox === "number" && body.viewBox > 0 ? body.viewBox : 512,
      path: body.path.trim(),
    };
    try {
      vault.addCatalogSymbol(symbol);
      return c.json({ symbol }, 201);
    } catch (err) {
      throw asStatusError(err);
    }
  });

  admin.patch("/library/symbols/:id", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        throw new HTTPException(400, { message: "Symbol name is required." });
      }
      patch.name = body.name.trim().slice(0, 80);
    }
    if (body.category !== undefined && typeof body.category === "string") {
      patch.category = body.category.trim().slice(0, 40);
    }
    if (body.path !== undefined) {
      if (typeof body.path !== "string" || !body.path.trim()) {
        throw new HTTPException(400, { message: "SVG path data is required." });
      }
      patch.path = body.path.trim();
    }
    if (body.viewBox !== undefined && typeof body.viewBox === "number" && body.viewBox > 0) {
      patch.viewBox = body.viewBox;
    }
    const next = vault.updateCatalogSymbol(c.req.param("id"), patch);
    if (!next) throw new HTTPException(404, { message: "Symbol not found." });
    return c.json({ symbol: next });
  });

  admin.delete("/library/symbols/:id", (c) => {
    if (!vault.deleteCatalogSymbol(c.req.param("id"))) {
      throw new HTTPException(404, { message: "Symbol not found." });
    }
    return c.json({ ok: true });
  });

  app.route("/api/admin", admin);
  app.route("/api", authed);

  const base = publicBasePath();
  if (!base) return app;
  const root = new Hono<AppEnv>();
  root.route(base, app);
  root.onError((err, c) => {
    const http = asStatusError(err);
    return c.json({ error: http.message }, http.status);
  });
  return root;
}

export type AuthResponse = {
  user: PublicUser;
  workspace: WorkspacePayload;
};
