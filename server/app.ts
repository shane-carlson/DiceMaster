import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Project } from "../src/engine/types";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  type AssetKind,
  type PublicUser,
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

function cookieOpts(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  const secure = process.env.COOKIE_SECURE === "1" || url.protocol === "https:";
  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax" as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure,
  };
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, cookieOpts(c));
}

export function createApp(vault: FileVault) {
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

  const authed = new Hono<AppEnv>();
  authed.use("*", async (c, next) => {
    const session = vault.getSession(getCookie(c, SESSION_COOKIE));
    if (!session) {
      throw new HTTPException(401, { message: "Sign in to continue." });
    }
    const user = vault.getUser(session.userId);
    if (!user) {
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

  app.route("/api", authed);

  return app;
}

export type AuthResponse = {
  user: PublicUser;
  workspace: WorkspacePayload;
};
