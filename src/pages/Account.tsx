import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AssetSummary, SavedSetSummary } from "../../shared/account";
import { api, ApiError } from "../api/client";
import { Brand } from "../components/layout/Brand";
import { arrayBufferToBase64 } from "../engine/fonts";
import { uid } from "../engine/id";
import { useAuthStore } from "../store/authStore";
import { useProjectStore } from "../store/projectStore";
import { openSavedSet, saveCurrentSet, saveFontAsset, saveLogoAsset } from "../sync/workspaceSync";
import { InfoTip } from "../components/ui/InfoTip";

export function Account() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const lastSetId = useAuthStore((s) => s.session.lastSetId);
  const projectName = useProjectStore((s) => s.project.name);
  const addLogo = useProjectStore((s) => s.addLogo);
  const setCustomFont = useProjectStore((s) => s.setCustomFont);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<SavedSetSummary[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "guest") navigate("/login?next=/account", { replace: true });
  }, [navigate, status]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
    }
  }, [user]);

  const refresh = async () => {
    const [setList, assetList] = await Promise.all([api.listSets(), api.listAssets()]);
    setSets(setList.sets);
    setAssets(assetList.assets);
  };

  useEffect(() => {
    if (status !== "signed-in") return;
    void refresh().catch((err) => setError(err instanceof ApiError ? err.message : "Could not load vault."));
  }, [status]);

  const onProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await updateProfile({
        displayName,
        email,
        ...(password ? { password, currentPassword } : {}),
      });
      setPassword("");
      setCurrentPassword("");
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update profile.");
    }
  };

  const onOpenSet = async (id: string) => {
    await openSavedSet(id);
    navigate("/workshop");
  };

  const onSaveCurrent = async () => {
    await saveCurrentSet(projectName);
    setMessage("Current set saved to your vault.");
    await refresh();
  };

  const onRename = async (id: string) => {
    await api.updateSet(id, { name: renameValue });
    setRenameId(null);
    await refresh();
  };

  const onDeleteSet = async (id: string) => {
    await api.deleteSet(id);
    if (useAuthStore.getState().session.lastSetId === id) {
      useAuthStore.getState().patchSession({ lastSetId: null });
    }
    await refresh();
  };

  const onUseLogo = async (id: string) => {
    const asset = await api.getAsset(id);
    addLogo({
      id: uid(),
      name: asset.name,
      kind: asset.mime.includes("svg") ? "svg" : "png",
      data: asset.data,
    });
    setMessage(`${asset.name} added to the open set.`);
  };

  const onUseFont = async (id: string) => {
    const asset = await api.getAsset(id);
    setCustomFont(asset.name, asset.data);
    setMessage(`${asset.name} is now the set typeface.`);
  };

  const onUploadLogo = async (file: File) => {
    const svg = file.type.includes("svg") || file.name.endsWith(".svg");
    const data = svg ? await file.text() : await readDataUrl(file);
    const mime = svg ? "image/svg+xml" : file.type || "image/png";
    await saveLogoAsset({ name: file.name, mime, data });
    addLogo({ id: uid(), name: file.name, kind: svg ? "svg" : "png", data });
    await refresh();
  };

  const onUploadFont = async (file: File) => {
    const data = arrayBufferToBase64(await file.arrayBuffer());
    await saveFontAsset({ name: file.name, data });
    setCustomFont(file.name, data);
    await refresh();
  };

  if (status !== "signed-in" || !user) {
    return (
      <div className="home auth-page">
        <nav className="home-nav">
          <Brand />
        </nav>
        <p className="help" style={{ padding: "0 7vw" }}>
          Loading your vault…
        </p>
      </div>
    );
  }

  return (
    <div className="home account-page">
      <nav className="home-nav">
        <Brand />
        <div className="home-nav-actions">
          <Link to="/workshop" className="btn btn-gold">
            Open workshop
          </Link>
          <button
            className="btn"
            onClick={() => {
              void logout().then(() => navigate("/"));
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <section className="account-grid">
        <div>
          <p className="kicker">Profile</p>
          <h1>{user.displayName}</h1>
          <p className="lede">
            Signed in as {user.email}. Sets, logos, fonts, and workshop position live in your
            vault.
          </p>
          <form className="auth-form" onSubmit={(e) => void onProfile(e)}>
            <label className="field">
              <span>
                Display name
                <InfoTip text="Shown in the workshop header and on your vault." />
              </span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
            </label>
            <label className="field">
              <span>
                Email
                <InfoTip text="The address you use to sign in. Keep it current so you can recover the account." />
              </span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>
                Current password
                <InfoTip text="Required only when you set a new password below." />
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <span>
                New password
                <InfoTip text="Leave blank to keep your current password. Must be at least 8 characters." />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-ok">{message}</p>}
            <button className="btn btn-gold" type="submit">
              Save profile
            </button>
          </form>
        </div>

        <div>
          <h2>Saved sets</h2>
          <p className="help">Named snapshots. Opening one restores it as the live workshop set.</p>
          <button className="btn btn-small" onClick={() => void onSaveCurrent()}>
            Save “{projectName}” to vault
          </button>
          <div className="vault-list">
            {sets.length === 0 && <p className="empty">No saved sets yet.</p>}
            {sets.map((set) => (
              <article key={set.id} className={`vault-item ${set.id === lastSetId ? "active" : ""}`}>
                {renameId === set.id ? (
                  <form
                    className="rename-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void onRename(set.id);
                    }}
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      aria-label="Set name"
                    />
                    <InfoTip text="Renames this snapshot in your vault. It does not change the live workshop set until you open it." />
                    <button className="btn btn-small" type="submit">
                      Rename
                    </button>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{set.name}</strong>
                      <small>
                        {set.dieCount} dice · {new Date(set.updatedAt).toLocaleString()}
                      </small>
                    </div>
                    <div className="chip-row">
                      <button className="btn btn-small" onClick={() => void onOpenSet(set.id)}>
                        Open
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          setRenameId(set.id);
                          setRenameValue(set.name);
                        }}
                      >
                        Rename
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => void onDeleteSet(set.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>

          <h2>Logos</h2>
          <button className="btn btn-small" onClick={() => logoRef.current?.click()}>
            Upload logo
          </button>
          <input
            ref={logoRef}
            className="hidden-input"
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUploadLogo(file);
            }}
          />
          <div className="vault-list">
            {assets.filter((a) => a.kind === "logo").length === 0 && (
              <p className="empty">No logos in the vault.</p>
            )}
            {assets
              .filter((a) => a.kind === "logo")
              .map((asset) => (
                <article key={asset.id} className="vault-item">
                  <div>
                    <strong>{asset.name}</strong>
                    <small>{Math.round(asset.size / 1024)} KB</small>
                  </div>
                  <div className="chip-row">
                    <button className="btn btn-small" onClick={() => void onUseLogo(asset.id)}>
                      Add to set
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => void api.deleteAsset(asset.id).then(refresh)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
          </div>

          <h2>Fonts</h2>
          <button className="btn btn-small" onClick={() => fontRef.current?.click()}>
            Upload TTF / OTF
          </button>
          <input
            ref={fontRef}
            className="hidden-input"
            type="file"
            accept=".ttf,.otf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUploadFont(file);
            }}
          />
          <div className="vault-list">
            {assets.filter((a) => a.kind === "font").length === 0 && (
              <p className="empty">No custom fonts in the vault.</p>
            )}
            {assets
              .filter((a) => a.kind === "font")
              .map((asset) => (
                <article key={asset.id} className="vault-item">
                  <div>
                    <strong>{asset.name}</strong>
                    <small>{Math.round(asset.size / 1024)} KB</small>
                  </div>
                  <div className="chip-row">
                    <button className="btn btn-small" onClick={() => void onUseFont(asset.id)}>
                      Use in set
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => void api.deleteAsset(asset.id).then(refresh)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
