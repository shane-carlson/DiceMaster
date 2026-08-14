import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  AdminUser,
  Announcement,
  AssetKind,
  AssetRecord,
  AssetSummary,
  PublicUser,
  SavedSetRecord,
  SavedSetSummary,
  SiteFont,
  SiteFontGroup,
  SiteSymbol,
  UserRole,
  UserSettings,
  WorkspacePayload,
  WorkspaceSession,
} from "../shared/account";
import { DEFAULT_SESSION, DEFAULT_SETTINGS, EMAIL_VERIFICATION_DAYS } from "../shared/account";

const VERIFICATION_TTL_MS = EMAIL_VERIFICATION_DAYS * 24 * 60 * 60 * 1000;

export type UserRecord = PublicUser & {
  passwordHash: string;
  updatedAt: number;
  disabled: boolean;
  emailVerifiedAt: number | null;
  verificationSentAt: number | null;
};

export type VerificationRecord = {
  userId: string;
  expiresAt: number;
  consumedAt?: number;
};

export type CatalogFontRecord = SiteFont & {
  mime: string;
  data: string;
  createdAt: number;
};

export type LibraryState = {
  hiddenFontIds: string[];
  extraFonts: CatalogFontRecord[];
  hiddenSymbolIds: string[];
  extraSymbols: SiteSymbol[];
};

const EMPTY_LIBRARY: LibraryState = {
  hiddenFontIds: [],
  extraFonts: [],
  hiddenSymbolIds: [],
  extraSymbols: [],
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

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function publicUser(user: UserRecord): PublicUser {
  const role = user.role ?? "user";
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    role,
    emailVerified: user.emailVerified ?? role === "admin",
  };
}

function normalizeUser(raw: UserRecord | null): UserRecord | null {
  if (!raw) return null;
  const role = raw.role ?? "user";
  const emailVerified = raw.emailVerified ?? role === "admin";
  return {
    ...raw,
    role,
    disabled: Boolean(raw.disabled),
    emailVerified,
    emailVerifiedAt: raw.emailVerifiedAt ?? (emailVerified ? raw.createdAt : null),
    verificationSentAt: raw.verificationSentAt ?? null,
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

  private verificationsPath() {
    return join(this.metaDir, "verifications.json");
  }

  private accountPath(userId: string) {
    return join(this.userDir(userId), "account.json");
  }

  now() {
    return Date.now();
  }

  createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    role?: UserRole;
    emailVerified?: boolean;
  }): UserRecord {
    const email = input.email.toLowerCase();
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    if (emails[email]) {
      throw Object.assign(new Error("An account with that email already exists."), { status: 409 });
    }
    const now = this.now();
    const role = input.role ?? "user";
    const emailVerified = input.emailVerified ?? role === "admin";
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
      role,
      disabled: false,
      emailVerified,
      emailVerifiedAt: emailVerified ? now : null,
      verificationSentAt: null,
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
    return normalizeUser(readJson<UserRecord | null>(this.accountPath(id), null));
  }

  findUserByEmail(email: string): UserRecord | null {
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    const id = emails[email.toLowerCase()];
    return id ? this.getUser(id) : null;
  }

  updateUser(
    id: string,
    patch: Partial<
      Pick<
        UserRecord,
        | "displayName"
        | "email"
        | "passwordHash"
        | "role"
        | "disabled"
        | "emailVerified"
        | "emailVerifiedAt"
        | "verificationSentAt"
      >
    >,
  ): UserRecord {
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
      user.emailVerified = false;
      user.emailVerifiedAt = null;
      writeJson(this.emailsPath(), emails);
      this.clearVerificationsForUser(id);
    }
    if (patch.displayName) user.displayName = patch.displayName;
    if (patch.passwordHash) user.passwordHash = patch.passwordHash;
    if (patch.role) user.role = patch.role;
    if (patch.disabled !== undefined) user.disabled = patch.disabled;
    if (patch.emailVerified !== undefined) {
      user.emailVerified = patch.emailVerified;
      user.emailVerifiedAt = patch.emailVerified ? (patch.emailVerifiedAt ?? this.now()) : null;
    } else if (patch.emailVerifiedAt !== undefined) {
      user.emailVerifiedAt = patch.emailVerifiedAt;
    }
    if (patch.verificationSentAt !== undefined) user.verificationSentAt = patch.verificationSentAt;
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

  ensureAdmin(input: { email: string; displayName: string; passwordHash: string }) {
    if (this.findUserByEmail(input.email)) return;
    this.createUser({ ...input, role: "admin" });
  }

  listUsers(): AdminUser[] {
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    return Object.values(emails)
      .map((id) => this.getUser(id))
      .filter((u): u is UserRecord => Boolean(u))
      .map((u) => ({
        ...publicUser(u),
        disabled: u.disabled,
        updatedAt: u.updatedAt,
        setCount: this.listSets(u.id).length,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  enabledAdminCount(exceptId?: string): number {
    return this.listUsers().filter((u) => u.role === "admin" && !u.disabled && u.id !== exceptId).length;
  }

  deleteSessionsForUser(userId: string) {
    const sessions = readJson<SessionIndex>(this.sessionsPath(), {});
    let changed = false;
    for (const [id, session] of Object.entries(sessions)) {
      if (session.userId === userId) {
        delete sessions[id];
        changed = true;
      }
    }
    if (changed) writeJson(this.sessionsPath(), sessions);
  }

  deleteUser(id: string): boolean {
    const user = this.getUser(id);
    if (!user) return false;
    const emails = readJson<EmailIndex>(this.emailsPath(), {});
    delete emails[user.email];
    writeJson(this.emailsPath(), emails);
    this.deleteSessionsForUser(id);
    this.clearVerificationsForUser(id);
    rmSync(this.userDir(id), { recursive: true, force: true });
    return true;
  }

  private readVerifications(): Record<string, VerificationRecord> {
    return readJson<Record<string, VerificationRecord>>(this.verificationsPath(), {});
  }

  clearVerificationsForUser(userId: string) {
    const tokens = this.readVerifications();
    let changed = false;
    for (const [token, rec] of Object.entries(tokens)) {
      if (rec.userId === userId) {
        delete tokens[token];
        changed = true;
      }
    }
    if (changed) writeJson(this.verificationsPath(), tokens);
  }

  issueEmailVerification(userId: string): { token: string; expiresAt: number } {
    this.clearVerificationsForUser(userId);
    const tokens = this.readVerifications();
    const token = randomToken();
    const expiresAt = this.now() + VERIFICATION_TTL_MS;
    tokens[token] = { userId, expiresAt };
    writeJson(this.verificationsPath(), tokens);
    this.updateUser(userId, { verificationSentAt: this.now() });
    return { token, expiresAt };
  }

  latestVerificationToken(userId: string): string | null {
    const now = this.now();
    let best: { token: string; expiresAt: number } | null = null;
    for (const [token, rec] of Object.entries(this.readVerifications())) {
      if (rec.userId !== userId || rec.consumedAt || rec.expiresAt <= now) continue;
      if (!best || rec.expiresAt > best.expiresAt) best = { token, expiresAt: rec.expiresAt };
    }
    return best?.token ?? null;
  }

  consumeEmailVerification(token: string): UserRecord | null {
    const trimmed = token.trim();
    if (!trimmed) return null;
    const tokens = this.readVerifications();
    const rec = tokens[trimmed];
    if (!rec || rec.expiresAt <= this.now()) {
      if (rec) {
        delete tokens[trimmed];
        writeJson(this.verificationsPath(), tokens);
      }
      return null;
    }
    const user = this.getUser(rec.userId);
    if (!user) {
      delete tokens[trimmed];
      writeJson(this.verificationsPath(), tokens);
      return null;
    }
    if (rec.consumedAt) {
      return user.emailVerified ? user : null;
    }
    tokens[trimmed] = { ...rec, consumedAt: this.now() };
    writeJson(this.verificationsPath(), tokens);
    return this.updateUser(user.id, { emailVerified: true, emailVerifiedAt: this.now() });
  }

  private announcementsPath() {
    return join(this.metaDir, "announcements.json");
  }

  listAnnouncements(): Announcement[] {
    return readJson<Announcement[]>(this.announcementsPath(), []).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  putAnnouncement(row: Announcement): Announcement {
    const list = this.listAnnouncements();
    const idx = list.findIndex((a) => a.id === row.id);
    const next = { ...row, updatedAt: this.now() };
    if (idx >= 0) list[idx] = next;
    else list.unshift(next);
    writeJson(this.announcementsPath(), list);
    return next;
  }

  deleteAnnouncement(id: string): boolean {
    const list = this.listAnnouncements();
    const next = list.filter((a) => a.id !== id);
    if (next.length === list.length) return false;
    writeJson(this.announcementsPath(), next);
    return true;
  }

  private libraryPath() {
    return join(this.metaDir, "library.json");
  }

  getLibrary(): LibraryState {
    const raw = readJson<Partial<LibraryState>>(this.libraryPath(), EMPTY_LIBRARY);
    return {
      hiddenFontIds: raw.hiddenFontIds ?? [],
      extraFonts: raw.extraFonts ?? [],
      hiddenSymbolIds: raw.hiddenSymbolIds ?? [],
      extraSymbols: raw.extraSymbols ?? [],
    };
  }

  putLibrary(patch: Partial<LibraryState>): LibraryState {
    const current = this.getLibrary();
    const next: LibraryState = {
      hiddenFontIds: patch.hiddenFontIds ?? current.hiddenFontIds,
      extraFonts: patch.extraFonts ?? current.extraFonts,
      hiddenSymbolIds: patch.hiddenSymbolIds ?? current.hiddenSymbolIds,
      extraSymbols: patch.extraSymbols ?? current.extraSymbols,
    };
    writeJson(this.libraryPath(), next);
    return next;
  }

  publicCatalog(): {
    announcements: Announcement[];
    hiddenFontIds: string[];
    extraFonts: SiteFont[];
    hiddenSymbolIds: string[];
    extraSymbols: SiteSymbol[];
  } {
    const library = this.getLibrary();
    return {
      announcements: this.listAnnouncements().filter((a) => a.active),
      hiddenFontIds: library.hiddenFontIds,
      extraFonts: library.extraFonts.map(({ id, name, mood, group }) => ({
        id,
        name,
        mood,
        group,
        file: `/api/catalog/fonts/${id}`,
      })),
      hiddenSymbolIds: library.hiddenSymbolIds,
      extraSymbols: library.extraSymbols,
    };
  }

  getCatalogFont(id: string): CatalogFontRecord | null {
    return this.getLibrary().extraFonts.find((f) => f.id === id) ?? null;
  }

  addCatalogFont(input: {
    name: string;
    mood: string;
    group: SiteFontGroup;
    mime: string;
    data: string;
  }): CatalogFontRecord {
    const library = this.getLibrary();
    const row: CatalogFontRecord = {
      id: `site-${crypto.randomUUID()}`,
      name: input.name,
      mood: input.mood,
      group: input.group,
      file: "",
      mime: input.mime,
      data: input.data,
      createdAt: this.now(),
    };
    row.file = `/api/catalog/fonts/${row.id}`;
    this.putLibrary({ extraFonts: [row, ...library.extraFonts] });
    return row;
  }

  deleteCatalogFont(id: string): boolean {
    const library = this.getLibrary();
    const extraFonts = library.extraFonts.filter((f) => f.id !== id);
    if (extraFonts.length === library.extraFonts.length) return false;
    this.putLibrary({ extraFonts });
    return true;
  }

  addCatalogSymbol(symbol: SiteSymbol): SiteSymbol {
    const library = this.getLibrary();
    if (library.extraSymbols.some((s) => s.id === symbol.id)) {
      throw Object.assign(new Error("A symbol with that id already exists."), { status: 409 });
    }
    this.putLibrary({ extraSymbols: [...library.extraSymbols, symbol] });
    return symbol;
  }

  updateCatalogSymbol(id: string, patch: Partial<SiteSymbol>): SiteSymbol | null {
    const library = this.getLibrary();
    const idx = library.extraSymbols.findIndex((s) => s.id === id);
    if (idx < 0) return null;
    const next = { ...library.extraSymbols[idx], ...patch, id };
    const extraSymbols = library.extraSymbols.slice();
    extraSymbols[idx] = next;
    this.putLibrary({ extraSymbols });
    return next;
  }

  deleteCatalogSymbol(id: string): boolean {
    const library = this.getLibrary();
    const extraSymbols = library.extraSymbols.filter((s) => s.id !== id);
    if (extraSymbols.length === library.extraSymbols.length) return false;
    this.putLibrary({ extraSymbols });
    return true;
  }
}
