import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { FileVault } from "./store";

process.env.SCRYPT_N = "1024";

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  return raw.split(";")[0];
}

describe("account API", () => {
  let dir: string;
  let vault: FileVault;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dm-vault-"));
    vault = new FileVault(dir);
    app = createApp(vault);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function signup(email = "forge@example.com") {
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "obsidian8",
        displayName: "Raven",
        project: {
          version: 1,
          name: "Guest Hoard",
          fontId: "oswald",
          globalDepth: 0.77,
          globalFontScale: 1,
          dice: [],
          logos: [],
        },
      }),
    });
    return { res, cookie: cookieFrom(res), body: await res.json() };
  }

  async function verify(email: string) {
    const user = vault.findUserByEmail(email);
    const token = user ? vault.latestVerificationToken(user.id) : null;
    expect(token).toBeTruthy();
    const res = await app.request("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return { res, cookie: cookieFrom(res), body: await res.json() };
  }

  async function signupAndVerify(email = "forge@example.com") {
    const signed = await signup(email);
    expect(signed.res.status).toBe(201);
    return verify(email);
  }

  it("signs up without a session until the email is confirmed", async () => {
    const { res, cookie, body } = await signup();
    expect(res.status).toBe(201);
    expect(body.needsVerification).toBe(true);
    expect(body.user.email).toBe("forge@example.com");
    expect(body.user.emailVerified).toBe(false);
    expect(cookie.startsWith("dm_session=")).toBe(false);

    const blocked = await app.request("/api/me", { headers: { cookie } });
    expect(blocked.status).toBe(401);

    const { res: verified, cookie: session, body: unlocked } = await verify("forge@example.com");
    expect(verified.status).toBe(200);
    expect(session.startsWith("dm_session=")).toBe(true);
    expect(unlocked.user.emailVerified).toBe(true);
    expect(unlocked.workspace.project.name).toBe("Guest Hoard");

    const me = await app.request("/api/me", { headers: { cookie: session } });
    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody.user.displayName).toBe("Raven");
    expect(meBody.workspace.session.lastPath).toBe("/workshop");
  });

  it("reminds at login when the email is still unconfirmed", async () => {
    await signup();
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forge@example.com", password: "obsidian8" }),
    });
    expect(login.status).toBe(403);
    const body = await login.json();
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(body.email).toBe("forge@example.com");
    expect(cookieFrom(login).startsWith("dm_session=")).toBe(false);
  });

  it("accepts a verification token twice so email clients can retry", async () => {
    await signup();
    const token = vault.latestVerificationToken(vault.findUserByEmail("forge@example.com")!.id);
    const first = await app.request("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const second = await app.request("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).user.emailVerified).toBe(true);
  });

  it("resends verification without revealing whether the email exists", async () => {
    await signup();
    const unknown = await app.request("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com" }),
    });
    expect(unknown.status).toBe(200);
    const known = await app.request("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forge@example.com" }),
    });
    expect(known.status).toBe(200);
  });

  it("rejects a duplicate email", async () => {
    await signup();
    const { res, body } = await signup();
    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already exists/i);
  });

  it("logs in and rejects a bad password", async () => {
    await signupAndVerify();
    const bad = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forge@example.com", password: "wrongpass" }),
    });
    expect(bad.status).toBe(401);

    const ok = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forge@example.com", password: "obsidian8" }),
    });
    expect(ok.status).toBe(200);
  });

  it("updates a profile and changes the password", async () => {
    const { cookie } = await signupAndVerify();
    const patched = await app.request("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ displayName: "Ash" }),
    });
    expect(patched.status).toBe(200);
    expect((await patched.json()).user.displayName).toBe("Ash");

    const pw = await app.request("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ currentPassword: "obsidian8", password: "moonstone9" }),
    });
    expect(pw.status).toBe(200);

    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forge@example.com", password: "moonstone9" }),
    });
    expect(login.status).toBe(200);
  });

  it("stores workspace session, saved sets, and blob assets", async () => {
    const { cookie } = await signupAndVerify();
    const project = {
      version: 1 as const,
      name: "Crystal Kit",
      fontId: "oswald",
      globalDepth: 0.77,
      globalFontScale: 1.1,
      dice: [{ id: "d1", type: "d20", name: "D20", faces: [] }],
      logos: [],
    };

    const ws = await app.request("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        project,
        session: { lastPath: "/workshop", selectedDieId: "d1", previewMode: "die" },
        settings: { placeMode: "replace" },
      }),
    });
    expect(ws.status).toBe(200);
    const saved = await ws.json();
    expect(saved.session.selectedDieId).toBe("d1");
    expect(saved.settings.placeMode).toBe("replace");

    const created = await app.request("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Crystal Kit", project }),
    });
    expect(created.status).toBe(201);
    const set = await created.json();

    const listed = await app.request("/api/sets", { headers: { cookie } });
    expect((await listed.json()).sets[0].id).toBe(set.id);

    const asset = await app.request("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        kind: "logo",
        name: "crest.svg",
        mime: "image/svg+xml",
        data: "<svg />",
      }),
    });
    expect(asset.status).toBe(201);
    const assets = await (await app.request("/api/assets?kind=logo", { headers: { cookie } })).json();
    expect(assets.assets).toHaveLength(1);
    expect(assets.assets[0].name).toBe("crest.svg");

    const full = await app.request(`/api/assets/${assets.assets[0].id}`, { headers: { cookie } });
    expect((await full.json()).data).toBe("<svg />");
  });

  it("does not let one account read another account's blobs", async () => {
    const a = await signupAndVerify("a@example.com");
    const created = await app.request("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: a.cookie },
      body: JSON.stringify({
        name: "Secret",
        project: {
          version: 1,
          name: "Secret",
          fontId: "oswald",
          globalDepth: 0.77,
          globalFontScale: 1,
          dice: [],
          logos: [],
        },
      }),
    });
    const set = await created.json();
    const b = await signupAndVerify("b@example.com");
    const sneak = await app.request(`/api/sets/${set.id}`, { headers: { cookie: b.cookie } });
    expect(sneak.status).toBe(404);
  });

  it("logs out and drops the session", async () => {
    const { cookie } = await signupAndVerify();
    await app.request("/api/auth/logout", { method: "POST", headers: { cookie } });
    const me = await app.request("/api/me", { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});

describe("admin console API", () => {
  let dir: string;
  let vault: FileVault;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dm-admin-"));
    vault = new FileVault(dir);
    app = createApp(vault);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function adminCookie() {
    const res = await app.request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@dicemaster.local", password: "ForgeMaster#1" }),
    });
    expect(res.status).toBe(200);
    return cookieFrom(res);
  }

  it("seeds an administrator and rejects a regular user from the console", async () => {
    const cookie = await adminCookie();
    const users = await (await app.request("/api/admin/users", { headers: { cookie } })).json();
    expect(users.users.some((u: { role: string }) => u.role === "admin")).toBe(true);

    const signup = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "player@example.com",
        password: "obsidian8",
        displayName: "Player",
      }),
    });
    expect(signup.status).toBe(201);
    const playerUser = vault.findUserByEmail("player@example.com");
    const token = playerUser ? vault.latestVerificationToken(playerUser.id) : null;
    const verified = await app.request("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const player = cookieFrom(verified);
    const denied = await app.request("/api/admin/users", { headers: { cookie: player } });
    expect(denied.status).toBe(403);

    const notAdmin = await app.request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "player@example.com", password: "obsidian8" }),
    });
    expect(notAdmin.status).toBe(403);
    expect((await notAdmin.json()).error).toMatch(/administrator/i);
  });

  it("creates, disables, and lists users", async () => {
    const cookie = await adminCookie();
    const created = await app.request("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        email: "smith@example.com",
        password: "anvilhead",
        displayName: "Smith",
        role: "user",
      }),
    });
    expect(created.status).toBe(201);
    const { user } = await created.json();
    const disabled = await app.request(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ disabled: true }),
    });
    expect(disabled.status).toBe(200);
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "smith@example.com", password: "anvilhead" }),
    });
    expect(login.status).toBe(403);
  });

  it("publishes banners and catalog fonts/symbols for everyone", async () => {
    const cookie = await adminCookie();
    const banner = await app.request("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ message: "Vat is hot tonight.", tone: "gold" }),
    });
    expect(banner.status).toBe(201);
    const publicBanners = await (await app.request("/api/announcements")).json();
    expect(publicBanners.announcements[0].message).toBe("Vat is hot tonight.");

    await app.request("/api/admin/library/hidden", {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ hiddenFontIds: ["oswald"], hiddenSymbolIds: ["star"] }),
    });
    const symbol = await app.request("/api/admin/library/symbols", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Rune", category: "Marks", path: "M0 0 L10 10" }),
    });
    expect(symbol.status).toBe(201);
    const catalog = await (await app.request("/api/catalog")).json();
    expect(catalog.hiddenFontIds).toContain("oswald");
    expect(catalog.hiddenSymbolIds).toContain("star");
    expect(catalog.extraSymbols.some((s: { id: string }) => s.id === "rune")).toBe(true);
    expect(catalog.announcements).toHaveLength(1);
  });
});

describe("subdirectory mount", () => {
  it("serves the API under PUBLIC_BASE_PATH", async () => {
    const previous = process.env.PUBLIC_BASE_PATH;
    process.env.PUBLIC_BASE_PATH = "/sidequests/dicemaster";
    const dir = mkdtempSync(join(tmpdir(), "dm-vault-"));
    try {
      const app = createApp(new FileVault(dir));
      const health = await app.request("/sidequests/dicemaster/api/health");
      expect(health.status).toBe(200);
      const rootHealth = await app.request("/api/health");
      expect(rootHealth.status).toBe(404);
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_BASE_PATH;
      else process.env.PUBLIC_BASE_PATH = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
