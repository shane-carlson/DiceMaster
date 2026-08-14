import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import type { AdminUser, Announcement, AnnouncementTone, SiteFont, SiteSymbol } from "../../shared/account";
import { api, ApiError } from "../api/client";
import { Brand } from "../components/layout/Brand";
import { arrayBufferToBase64 } from "../engine/fonts";
import { BUILTIN_FONTS, FONT_GROUPS } from "../engine/fonts";
import { SYMBOL_GROUPS, SYMBOLS } from "../engine/symbols";
import { useAuthStore } from "../store/authStore";
import { useCatalogStore } from "../store/catalogStore";

type Tab = "users" | "banners" | "fonts" | "symbols";

export function AdminConsole() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [tab, setTab] = useState<Tab>("users");
  const [error, setError] = useState<string | null>(null);

  if (status === "bootstrapping") {
    return (
      <div className="home account-page">
        <nav className="home-nav">
          <Brand />
        </nav>
        <p className="help" style={{ padding: "0 7vw" }}>
          Checking staff access…
        </p>
      </div>
    );
  }

  if (status !== "signed-in" || user?.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="home account-page">
      <nav className="home-nav">
        <Brand />
        <div className="home-nav-actions">
          <Link to="/workshop" className="btn btn-small">
            Workshop
          </Link>
          <button
            className="btn"
            onClick={() => {
              void logout();
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <section className="account-grid admin-grid">
        <div>
          <p className="kicker">Staff</p>
          <h1>Admin console</h1>
          <p className="lede">
            Signed in as {user.displayName}. Manage accounts, site banners, and the shared font
            and symbol libraries.
          </p>
          <div className="kind-tabs">
            {(["users", "banners", "fonts", "symbols"] as Tab[]).map((id) => (
              <button key={id} className={`chip ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
                {id === "banners" ? "Announcements" : id[0].toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div>
          {tab === "users" && <UsersTab onError={setError} />}
          {tab === "banners" && <BannersTab onError={setError} />}
          {tab === "fonts" && <FontsTab onError={setError} />}
          {tab === "symbols" && <SymbolsTab onError={setError} />}
        </div>
      </section>
    </div>
  );
}

function UsersTab({ onError }: { onError: (msg: string | null) => void }) {
  const selfId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const refresh = async () => {
    const { users: list } = await api.adminUsers();
    setUsers(list);
  };

  useEffect(() => {
    void refresh().catch((err) => onError(err instanceof ApiError ? err.message : "Could not load users."));
  }, [onError]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    onError(null);
    try {
      await api.adminCreateUser({ displayName, email, password, role });
      setDisplayName("");
      setEmail("");
      setPassword("");
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not create user.");
    }
  };

  const patch = async (id: string, body: Parameters<typeof api.adminPatchUser>[1]) => {
    onError(null);
    try {
      await api.adminPatchUser(id, body);
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not update user.");
    }
  };

  return (
    <>
      <h2>Create account</h2>
      <form className="auth-form" onSubmit={(e) => void create(e)}>
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="btn btn-gold" type="submit">
          Create user
        </button>
      </form>
      <h2>Accounts</h2>
      <div className="vault-list">
        {users.map((u) => (
          <article key={u.id} className={`vault-item ${u.disabled ? "" : "active"}`}>
            <div>
              <strong>
                {u.displayName} {u.id === selfId ? "(you)" : ""}
              </strong>
              <small>
                {u.email} · {u.role}
                {u.emailVerified ? "" : " · unverified"}
                {u.disabled ? " · disabled" : ""} · {u.setCount} sets
              </small>
            </div>
            <div className="chip-row">
              <button
                className="btn btn-small"
                onClick={() => void patch(u.id, { role: u.role === "admin" ? "user" : "admin" })}
              >
                {u.role === "admin" ? "Make user" : "Make admin"}
              </button>
              <button className="btn btn-small" onClick={() => void patch(u.id, { disabled: !u.disabled })}>
                {u.disabled ? "Enable" : "Disable"}
              </button>
              <button
                className="btn btn-small"
                onClick={() => {
                  const next = window.prompt("New password (8+ characters)", "");
                  if (next) void patch(u.id, { password: next });
                }}
              >
                Password
              </button>
              {u.id !== selfId && (
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${u.email}?`)) {
                      void api
                        .adminDeleteUser(u.id)
                        .then(refresh)
                        .catch((err) => onError(err instanceof ApiError ? err.message : "Could not delete."));
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function BannersTab({ onError }: { onError: (msg: string | null) => void }) {
  const reloadCatalog = useCatalogStore((s) => s.load);
  const [rows, setRows] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<AnnouncementTone>("gold");

  const refresh = async () => {
    const { announcements } = await api.adminAnnouncements();
    setRows(announcements);
    await reloadCatalog();
  };

  useEffect(() => {
    void refresh().catch((err) => onError(err instanceof ApiError ? err.message : "Could not load banners."));
  }, [onError]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    onError(null);
    try {
      await api.adminCreateAnnouncement({ message, tone, active: true });
      setMessage("");
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not post announcement.");
    }
  };

  return (
    <>
      <h2>New announcement</h2>
      <p className="help">Shown on every page until dismissed. All visitors see active banners.</p>
      <form className="auth-form" onSubmit={(e) => void create(e)}>
        <label className="field">
          <span>Message</span>
          <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} required />
        </label>
        <label className="field">
          <span>Tone</span>
          <select value={tone} onChange={(e) => setTone(e.target.value as AnnouncementTone)}>
            <option value="gold">Gold</option>
            <option value="info">Info</option>
            <option value="alert">Alert</option>
          </select>
        </label>
        <button className="btn btn-gold" type="submit">
          Publish
        </button>
      </form>
      <h2>Banners</h2>
      <div className="vault-list">
        {rows.length === 0 && <p className="empty">No announcements yet.</p>}
        {rows.map((row) => (
          <article key={row.id} className={`vault-item ${row.active ? "active" : ""}`}>
            <div>
              <strong>{row.message}</strong>
              <small>
                {row.tone} · {row.active ? "visible" : "hidden"}
              </small>
            </div>
            <div className="chip-row">
              <button
                className="btn btn-small"
                onClick={() => void api.adminPatchAnnouncement(row.id, { active: !row.active }).then(refresh)}
              >
                {row.active ? "Hide" : "Show"}
              </button>
              <button
                className="btn btn-small btn-danger"
                onClick={() => void api.adminDeleteAnnouncement(row.id).then(refresh)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function FontsTab({ onError }: { onError: (msg: string | null) => void }) {
  const reloadCatalog = useCatalogStore((s) => s.load);
  const [hidden, setHidden] = useState<string[]>([]);
  const [extras, setExtras] = useState<SiteFont[]>([]);
  const [name, setName] = useState("");
  const [mood, setMood] = useState("");
  const [group, setGroup] = useState<(typeof FONT_GROUPS)[number]["id"]>("print");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const library = await api.adminLibrary();
    setHidden(library.hiddenFontIds);
    setExtras(library.extraFonts);
    await reloadCatalog();
  };

  useEffect(() => {
    void refresh().catch((err) => onError(err instanceof ApiError ? err.message : "Could not load fonts."));
  }, [onError]);

  const toggleHidden = async (id: string) => {
    const hiddenFontIds = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    await api.adminHideLibrary({ hiddenFontIds });
    await refresh();
  };

  const upload = async (file: File) => {
    onError(null);
    try {
      const data = arrayBufferToBase64(await file.arrayBuffer());
      await api.adminAddFont({
        name: name.trim() || file.name.replace(/\.(ttf|otf)$/i, ""),
        mood: mood.trim() || "Site library",
        group,
        mime: "font/ttf",
        data,
      });
      setName("");
      setMood("");
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not add font.");
    }
  };

  return (
    <>
      <h2>Add a site font</h2>
      <p className="help">Appears in every workshop font picker. TTF or OTF, stored in the site vault.</p>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          fileRef.current?.click();
        }}
      >
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Mood</span>
          <input value={mood} onChange={(e) => setMood(e.target.value)} />
        </label>
        <label className="field">
          <span>Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
            {FONT_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-gold" type="submit">
          Upload TTF / OTF
        </button>
        <input
          ref={fileRef}
          className="hidden-input"
          type="file"
          accept=".ttf,.otf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </form>
      <h2>Site fonts</h2>
      <div className="vault-list">
        {extras.length === 0 && <p className="empty">No extra site fonts yet.</p>}
        {extras.map((font) => (
          <article key={font.id} className="vault-item active">
            <div>
              <strong>{font.name}</strong>
              <small>
                {font.group} · {font.mood}
              </small>
            </div>
            <button
              className="btn btn-small btn-danger"
              onClick={() => void api.adminDeleteFont(font.id).then(refresh)}
            >
              Remove
            </button>
          </article>
        ))}
      </div>
      <h2>Bundled typefaces</h2>
      <p className="help">Hide a face to drop it from the picker. Existing sets that already use it still load.</p>
      <div className="vault-list">
        {BUILTIN_FONTS.map((font) => (
          <article key={font.id} className={`vault-item ${hidden.includes(font.id) ? "" : "active"}`}>
            <div>
              <strong>{font.name}</strong>
              <small>{font.mood}</small>
            </div>
            <button className="btn btn-small" onClick={() => void toggleHidden(font.id)}>
              {hidden.includes(font.id) ? "Show" : "Hide"}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function SymbolsTab({ onError }: { onError: (msg: string | null) => void }) {
  const reloadCatalog = useCatalogStore((s) => s.load);
  const [hidden, setHidden] = useState<string[]>([]);
  const [extras, setExtras] = useState<SiteSymbol[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(SYMBOL_GROUPS[0]?.label ?? "Marks");
  const [path, setPath] = useState("");

  const refresh = async () => {
    const library = await api.adminLibrary();
    setHidden(library.hiddenSymbolIds);
    setExtras(library.extraSymbols);
    await reloadCatalog();
  };

  useEffect(() => {
    void refresh().catch((err) => onError(err instanceof ApiError ? err.message : "Could not load symbols."));
  }, [onError]);

  const toggleHidden = async (id: string) => {
    const hiddenSymbolIds = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    await api.adminHideLibrary({ hiddenSymbolIds });
    await refresh();
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    onError(null);
    try {
      await api.adminAddSymbol({ name, category, path, viewBox: 512 });
      setName("");
      setPath("");
      await refresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not add symbol.");
    }
  };

  return (
    <>
      <h2>Add a site symbol</h2>
      <p className="help">Paste an SVG path (`d` attribute). Shown in the vault for every user.</p>
      <form className="auth-form" onSubmit={(e) => void create(e)}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {SYMBOL_GROUPS.map((g) => (
              <option key={g.id} value={g.label}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>SVG path</span>
          <input value={path} onChange={(e) => setPath(e.target.value)} required />
        </label>
        <button className="btn btn-gold" type="submit">
          Add symbol
        </button>
      </form>
      {name && path && (
        <svg className="admin-symbol-preview" viewBox="0 0 512 512" aria-hidden>
          <path d={path} fill="currentColor" fillRule="evenodd" />
        </svg>
      )}
      <h2>Site symbols</h2>
      <div className="vault-list">
        {extras.length === 0 && <p className="empty">No extra site symbols yet.</p>}
        {extras.map((symbol) => (
          <article key={symbol.id} className="vault-item active">
            <div>
              <strong>{symbol.name}</strong>
              <small>
                {symbol.category} · {symbol.id}
              </small>
            </div>
            <button
              className="btn btn-small btn-danger"
              onClick={() => void api.adminDeleteSymbol(symbol.id).then(refresh)}
            >
              Remove
            </button>
          </article>
        ))}
      </div>
      <h2>Bundled marks</h2>
      <div className="vault-list">
        {SYMBOLS.map((symbol) => (
          <article key={symbol.id} className={`vault-item ${hidden.includes(symbol.id) ? "" : "active"}`}>
            <div>
              <strong>{symbol.name}</strong>
              <small>
                {symbol.category} · {symbol.id}
              </small>
            </div>
            <button className="btn btn-small" onClick={() => void toggleHidden(symbol.id)}>
              {hidden.includes(symbol.id) ? "Show" : "Hide"}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
