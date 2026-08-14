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
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dm-vault-"));
    app = createApp(new FileVault(dir));
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

  it("signs up, keeps a session, and restores the guest project", async () => {
    const { res, cookie, body } = await signup();
    expect(res.status).toBe(201);
    expect(body.user.email).toBe("forge@example.com");
    expect(body.user.displayName).toBe("Raven");
    expect(body.workspace.project.name).toBe("Guest Hoard");
    expect(cookie.startsWith("dm_session=")).toBe(true);

    const me = await app.request("/api/me", { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody.user.displayName).toBe("Raven");
    expect(meBody.workspace.session.lastPath).toBe("/workshop");
  });

  it("rejects a duplicate email", async () => {
    await signup();
    const { res, body } = await signup();
    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already exists/i);
  });

  it("logs in and rejects a bad password", async () => {
    await signup();
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
    const { cookie } = await signup();
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
    const { cookie } = await signup();
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
    const a = await signup("a@example.com");
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
    const b = await signup("b@example.com");
    const sneak = await app.request(`/api/sets/${set.id}`, { headers: { cookie: b.cookie } });
    expect(sneak.status).toBe(404);
  });

  it("logs out and drops the session", async () => {
    const { cookie } = await signup();
    await app.request("/api/auth/logout", { method: "POST", headers: { cookie } });
    const me = await app.request("/api/me", { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});
