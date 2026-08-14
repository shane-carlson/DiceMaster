import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  AssetKind,
  AssetRecord,
  AssetSummary,
  PublicUser,
  SavedSetRecord,
  SavedSetSummary,
  UserSettings,
  WorkspacePayload,
  WorkspaceSession,
} from "../shared/account";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "../shared/account";

export type UserRecord = PublicUser & {
  passwordHash: string;
  updatedAt: number;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
};

type EmailIndex = Record<string, string>;
type SessionIndex = Record<string, SessionRecord>;

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
}

function publicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export class FileVault {
  constructor(private readonly root: string) {
    mkdirSync(this.metaDir, { recursive: true });
  }

  private get metaDir() {
    return join(this.root, "meta");
  }

  private userDir(userId: string) {
    return join(this.root, "users", userId);
  }

  private emailsPath() {
    return join(this.metaDir, "emails.json");
  }

  private sessionsPath() {
    return join(this.metaDir, "sessions.json");
  }

  private accountPath(userId: string) {
    return join(this.userDir(userId), "account.json");
  }

  now() {
    return Date.now();
  }

  createUser(input: { email: string; displayName: string; passwordHash: string }): UserRecord {
    const email = input.email.toLowerCase();
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    if (emails[email]) {
      throw Object.assign(new Error("An account with that email already exists."), { status: 409 });
    }
    const now = this.now();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    emails[email] = user.id;
    writeJson(this.emailsPath(), emails);
    writeJson(this.accountPath(user.id), user);
    writeJson(join(this.userDir(user.id), "workspace.json"), {
      project: null,
      session: { ...DEFAULT_SESSION },
      settings: { ...DEFAULT_SETTINGS },
      updatedAt: now,
    } satisfies WorkspacePayload);
    return user;
  }

  getUser(id: string): UserRecord | null {
    return readJson<UserRecord | null>(this.accountPath(id), null);
  }

  findUserByEmail(email: string): UserRecord | null {
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    const id = emails[email.toLowerCase()];
    return id ? this.getUser(id) : null;
  }

  updateUser(id: string, patch: Partial<Pick<UserRecord, "displayName" | "email" | "passwordHash">>): UserRecord {
    const user = this.getUser(id);
    if (!user) {
      throw Object.assign(new Error("Account not found."), { status: 404 });
    }
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    if (patch.email && patch.email !== user.email) {
      const nextEmail = patch.email.toLowerCase();
      if (emails[nextEmail] && emails[nextEmail] !== id) {
        throw Object.assign(new Error("An account with that email already exists."), { status: 409 });
      }
      delete emails[user.email];
      emails[nextEmail] = id;
      user.email = nextEmail;
      writeJson(this.emailsPath(), emails);
    }
    if (patch.displayName) user.displayName = patch.displayName;
    if (patch.passwordHash) user.passwordHash = patch.passwordHash;
    user.updatedAt = this.now();
    writeJson(this.accountPath(id), user);
    return user;
  }

  toPublic(user: UserRecord): PublicUser {
    return publicUser(user);
  }

  createSession(userId: string, ttlMs: number): SessionRecord {
    const sessions = readJson<SessionIndex>(this.sessionsPath(), {});
    const now = this.now();
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      createdAt: now,
      expiresAt: now + ttlMs,
    };
    sessions[session.id] = session;
    writeJson(this.sessionsPath(), sessions);
    return session;
  }

  getSession(id: string | undefined | null): SessionRecord | null {
    if (!id) return null;
    const sessions = readJson<SessionIndex>(this.sessionsPath(), {});
    const session = sessions[id];
    if (!session) return null;
    if (session.expiresAt <= this.now()) {
      delete sessions[id];
      writeJson(this.sessionsPath(), sessions);
      return null;
    }
    return session;
  }

  deleteSession(id: string | undefined | null) {
    if (!id) return;
    const sessions = readJson<SessionIndex>(this.sessionsPath(), {});
    if (!sessions[id]) return;
    delete sessions[id];
    writeJson(this.sessionsPath(), sessions);
  }

  getWorkspace(userId: string): WorkspacePayload {
    const fallback: WorkspacePayload = {
      project: null,
      session: { ...DEFAULT_SESSION },
      settings: { ...DEFAULT_SETTINGS },
      updatedAt: 0,
    };
    const raw = readJson<Partial<WorkspacePayload>>(join(this.userDir(userId), "workspace.json"), fallback);
    return {
      project: raw.project ?? null,
      session: { ...DEFAULT_SESSION, ...raw.session },
      settings: { ...DEFAULT_SETTINGS, ...raw.settings },
      updatedAt: raw.updatedAt ?? 0,
    };
  }

  putWorkspace(
    userId: string,
    input: {
      project?: WorkspacePayload["project"];
      session?: Partial<WorkspaceSession>;
      settings?: Partial<UserSettings>;
    },
  ): WorkspacePayload {
    const current = this.getWorkspace(userId);
    const next: WorkspacePayload = {
      project: input.project === undefined ? current.project : input.project,
      session: { ...current.session, ...input.session },
      settings: { ...current.settings, ...input.settings },
      updatedAt: this.now(),
    };
    writeJson(join(this.userDir(userId), "workspace.json"), next);
    return next;
  }

  listSets(userId: string): SavedSetSummary[] {
    const dir = join(this.userDir(userId), "sets");
    let names: string[] = [];
    try {
      names = readdirSync(dir).filter((n) => n.endsWith(".json"));
    } catch {
      return [];
    }
    return names
      .map((name) => readJson<SavedSetRecord | null>(join(dir, name), null))
      .filter((row): row is SavedSetRecord => Boolean(row?.id))
      .map(({ id, name, updatedAt, dieCount }) => ({ id, name, updatedAt, dieCount }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getSet(userId: string, id: string): SavedSetRecord | null {
    return readJson<SavedSetRecord | null>(join(this.userDir(userId), "sets", `${id}.json`), null);
  }

  putSet(userId: string, record: SavedSetRecord): SavedSetRecord {
    const next = { ...record, updatedAt: this.now() };
    writeJson(join(this.userDir(userId), "sets", `${next.id}.json`), next);
    return next;
  }

  deleteSet(userId: string, id: string): boolean {
    const path = join(this.userDir(userId), "sets", `${id}.json`);
    try {
      rmSync(path);
      return true;
    } catch {
      return false;
    }
  }

  listAssets(userId: string, kind?: AssetKind): AssetSummary[] {
    const dir = join(this.userDir(userId), "assets");
    let names: string[] = [];
    try {
      names = readdirSync(dir).filter((n) => n.endsWith(".json"));
    } catch {
      return [];
    }
    return names
      .map((name) => readJson<AssetRecord | null>(join(dir, name), null))
      .filter((row): row is AssetRecord => Boolean(row?.id))
      .filter((row) => (kind ? row.kind === kind : true))
      .map(({ id, kind: k, name, mime, createdAt, size }) => ({ id, kind: k, name, mime, createdAt, size }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getAsset(userId: string, id: string): AssetRecord | null {
    return readJson<AssetRecord | null>(join(this.userDir(userId), "assets", `${id}.json`), null);
  }

  putAsset(userId: string, record: AssetRecord): AssetRecord {
    writeJson(join(this.userDir(userId), "assets", `${record.id}.json`), record);
    return record;
  }

  deleteAsset(userId: string, id: string): boolean {
    const path = join(this.userDir(userId), "assets", `${id}.json`);
    try {
      rmSync(path);
      return true;
    } catch {
      return false;
    }
  }
}
