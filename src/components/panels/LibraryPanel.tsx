import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { arrayBufferToBase64, BUILTIN_FONTS, fontsByGroup } from "../../engine/fonts";
import { uid } from "../../engine/id";
import { SET_TEMPLATES } from "../../engine/templates";
import type { DieType, GlyphSettings, SizeFormatId } from "../../engine/types";
import { TOKEN_DIAMETER_MM, TOKEN_THICKNESS_MM } from "../../engine/token";
import { symbolsByCategory, SYMBOL_CREDIT } from "../../engine/symbols";
import { useAuthStore } from "../../store/authStore";
import { useCatalogStore } from "../../store/catalogStore";
import { useProjectStore } from "../../store/projectStore";
import { api } from "../../api/client";
import type { AssetSummary, SavedSetSummary } from "../../../shared/account";
import { openSavedSet, saveCurrentSet, saveFontAsset, saveLogoAsset } from "../../sync/workspaceSync";
import { HintedField } from "../ui/InfoTip";

const ADDABLE: { type: DieType; label: string }[] = [
  { type: "d2", label: "D2" },
  { type: "d4", label: "D4" },
  { type: "d4crystal", label: "D4C" },
  { type: "d4teardrop", label: "D4T" },
  { type: "d6", label: "D6" },
  { type: "d8", label: "D8" },
  { type: "d10", label: "D10" },
  { type: "d00", label: "D%" },
  { type: "d12", label: "D12" },
  { type: "d20", label: "D20" },
];

export function LibraryPanel({ onOpenFaceEditor }: { onOpenFaceEditor?: () => void }) {
  const project = useProjectStore((s) => s.project);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const addDie = useProjectStore((s) => s.addDie);
  const focusDie = useProjectStore((s) => s.focusDie);
  const removeDie = useProjectStore((s) => s.removeDie);
  const duplicateDie = useProjectStore((s) => s.duplicateDie);
  const setFontId = useProjectStore((s) => s.setFontId);
  const setCustomFont = useProjectStore((s) => s.setCustomFont);
  const addLogo = useProjectStore((s) => s.addLogo);
  const updateFaceGlyph = useProjectStore((s) => s.updateFaceGlyph);
  const ensureFaceSelection = useProjectStore((s) => s.ensureFaceSelection);
  const revealInspector = useProjectStore((s) => s.revealInspector);
  const fontRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [placeMode, setPlaceModeLocal] = useState<"add" | "replace">("add");
  const signedIn = useAuthStore((s) => s.status === "signed-in");
  const savedPlaceMode = useAuthStore((s) => s.settings.placeMode);
  const [vaultSets, setVaultSets] = useState<SavedSetSummary[]>([]);
  const [vaultAssets, setVaultAssets] = useState<AssetSummary[]>([]);
  useCatalogStore((s) => s.revision);

  const placeModeActive = signedIn ? savedPlaceMode : placeMode;
  const setPlaceMode = (mode: "add" | "replace") => {
    if (signedIn) useAuthStore.getState().patchSettings({ placeMode: mode });
    else setPlaceModeLocal(mode);
  };

  useEffect(() => {
    if (!signedIn) return;
    void Promise.all([api.listSets(), api.listAssets()]).then(([sets, assets]) => {
      setVaultSets(sets.sets);
      setVaultAssets(assets.assets);
    });
  }, [signedIn, project.logos.length, project.customFontName]);

  const onFont = async (file: File) => {
    const buf = await file.arrayBuffer();
    const data = arrayBufferToBase64(buf);
    setCustomFont(file.name, data);
    void saveFontAsset({ name: file.name, data });
  };

  const onLogo = async (file: File) => {
    if (file.type.includes("svg") || file.name.endsWith(".svg")) {
      const data = await file.text();
      addLogo({ id: uid(), name: file.name, kind: "svg", data });
      void saveLogoAsset({ name: file.name, mime: "image/svg+xml", data });
    } else {
      const data = await readDataUrl(file);
      addLogo({ id: uid(), name: file.name, kind: "png", data });
      void saveLogoAsset({ name: file.name, mime: file.type || "image/png", data });
    }
  };

  const placeOnFace = (which: "primary" | "emblem", patch: Partial<GlyphSettings>) => {
    const target = ensureFaceSelection();
    if (!target) return;
    updateFaceGlyph(target.dieId, target.faceIndex, which, patch);
    revealInspector();
  };

  return (
    <aside className="panel">
      <h2>Your vault</h2>
      {signedIn ? (
        <>
          <div className="chip-row" style={{ marginBottom: 8 }}>
            <button className="btn btn-small" onClick={() => void saveCurrentSet(project.name)}>
              Save this set
            </button>
            <Link to="/account" className="btn btn-small">
              Manage
            </Link>
          </div>
          <div className="chip-row">
            {vaultSets.slice(0, 8).map((set) => (
              <button key={set.id} className="chip" onClick={() => void openSavedSet(set.id)}>
                {set.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="help">
          <Link to="/signup">Sign up</Link> to keep sets, logos, and fonts in a vault that follows
          you back.
        </p>
      )}

      <h2>Templates</h2>
      <div className="chip-row">
        {SET_TEMPLATES.filter((t) => t.featured).map((t) => (
          <button key={t.id} className="chip" onClick={() => loadTemplate(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginTop: 6 }}>
        {SET_TEMPLATES.filter((t) => !t.featured).map((t) => (
          <button key={t.id} className="chip" onClick={() => loadTemplate(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      <h2>Add a die</h2>
      <div className="type-grid">
        {ADDABLE.map(({ type, label }) => (
          <button key={type} className="type-btn" onClick={() => addDie(type, "standard")}>
            {label}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {(["mini", "standard", "chonk", "giant"] as SizeFormatId[]).map((fmt) => (
          <button
            key={fmt}
            className="chip"
            onClick={() => addDie("d20", fmt)}
            title={`Add a ${fmt} D20`}
          >
            + {fmt} D20
          </button>
        ))}
      </div>

      <h2>Add-ons</h2>
      <p className="help">
        Two-faced maker tokens, {TOKEN_DIAMETER_MM}mm across and {TOKEN_THICKNESS_MM}mm thick. Pick a
        silhouette in the Inspector.
      </p>
      <div className="chip-row">
        <button className="type-btn" onClick={() => addDie("token")}>
          Maker token
        </button>
      </div>

      <h2>This set</h2>
      <div className="chip-row" style={{ marginBottom: 10 }}>
        {onOpenFaceEditor && (
          <button className="btn btn-gold btn-small" onClick={onOpenFaceEditor}>
            Face editor
          </button>
        )}
        <button className="btn btn-small" onClick={() => revealInspector()}>
          Inspector
        </button>
      </div>
      <div className="die-list">
        {project.dice.length === 0 && <div className="empty">The vault is empty. Add a die.</div>}
        {project.dice.map((die) => (
          <div key={die.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 4 }}>
            <button
              className={`die-item ${die.id === selectedDieId ? "active" : ""}`}
              style={{ "--die-color": die.color } as CSSProperties}
              onClick={() => focusDie(die.id)}
            >
              <span>
                {die.name}
                <small>
                  {die.type.toUpperCase()} · {die.sizeMm}mm · {die.sizeFormat}
                </small>
              </span>
            </button>
            <button className="btn btn-small" onClick={() => duplicateDie(die.id)} title="Duplicate">
              ⎘
            </button>
            <button className="btn btn-small btn-danger" onClick={() => removeDie(die.id)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </div>

      <h2>Fonts</h2>
      <HintedField
        label="Typeface"
        hint="Typeface used for numbers and text on every die in this set."
      >
        <select value={project.fontId} onChange={(e) => setFontId(e.target.value)}>
          {fontsByGroup().map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          ))}
          {project.customFontBase64 && (
            <option value="custom">{project.customFontName ?? "Custom TTF"}</option>
          )}
        </select>
        <p className="help">
          {BUILTIN_FONTS.find((f) => f.id === project.fontId)?.mood ?? "Your uploaded typeface"}
        </p>
        <button className="btn btn-small" onClick={() => fontRef.current?.click()}>
          Upload TTF / OTF
        </button>
        {signedIn && vaultAssets.some((a) => a.kind === "font") && (
          <div className="chip-row" style={{ marginTop: 8 }}>
            {vaultAssets
              .filter((a) => a.kind === "font")
              .map((asset) => (
                <button
                  key={asset.id}
                  className="chip"
                  onClick={() => {
                    void api.getAsset(asset.id).then((full) => setCustomFont(full.name, full.data));
                  }}
                >
                  {asset.name}
                </button>
              ))}
          </div>
        )}
        <input
          ref={fontRef}
          className="hidden-input"
          type="file"
          accept=".ttf,.otf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFont(file);
          }}
        />
      </HintedField>

      <h2>Crests & logos</h2>
      <p className="help">
        Select a face, then choose how a mark lands: beside the number, or in place of it.
      </p>
      <HintedField
        label="Place mode"
        hint="Add beside number keeps the inscription and parks a crest next to it. Replace number swaps the inscription for the mark."
      >
        <div className="kind-tabs">
          <button
            className={`chip ${placeModeActive === "add" ? "active" : ""}`}
            onClick={() => setPlaceMode("add")}
          >
            Add beside number
          </button>
          <button
            className={`chip ${placeModeActive === "replace" ? "active" : ""}`}
            onClick={() => setPlaceMode("replace")}
          >
            Replace number
          </button>
        </div>
      </HintedField>
      <button className="btn btn-small" onClick={() => logoRef.current?.click()}>
        Upload SVG or PNG
      </button>
      <input
        ref={logoRef}
        className="hidden-input"
        type="file"
        accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onLogo(file);
        }}
      />
      <div className="logo-list" style={{ marginTop: 8 }}>
        {project.logos.map((logo) => (
          <button
            key={logo.id}
            className="btn btn-small"
            onClick={() => {
              if (placeModeActive === "add") {
                placeOnFace("emblem", { kind: "logo", logoId: logo.id, text: "" });
              } else {
                placeOnFace("primary", { kind: "logo", logoId: logo.id, text: "" });
              }
            }}
          >
            {logo.name}
          </button>
        ))}
        {signedIn &&
          vaultAssets
            .filter((a) => a.kind === "logo" && !project.logos.some((l) => l.name === a.name))
            .map((asset) => (
              <button
                key={asset.id}
                className="btn btn-small"
                onClick={() => {
                  void api.getAsset(asset.id).then((full) => {
                    const logo = {
                      id: uid(),
                      name: full.name,
                      kind: (full.mime.includes("svg") ? "svg" : "png") as "svg" | "png",
                      data: full.data,
                    };
                    addLogo(logo);
                    if (placeModeActive === "add") {
                      placeOnFace("emblem", { kind: "logo", logoId: logo.id, text: "" });
                    } else {
                      placeOnFace("primary", { kind: "logo", logoId: logo.id, text: "" });
                    }
                  });
                }}
              >
                {asset.name}
              </button>
            ))}
      </div>

      <h2>Symbol vault</h2>
      <div className="symbol-grid">
        {symbolsByCategory().flatMap((group) => [
          <div key={`cat-${group.category}`} className="symbol-cat">
            {group.category}
          </div>,
          ...group.symbols.map((s) => (
            <button
              key={s.id}
              className="symbol-btn"
              title={s.name}
              onClick={() => {
                if (placeModeActive === "add") {
                  placeOnFace("emblem", { kind: "symbol", symbolId: s.id, text: "" });
                } else {
                  placeOnFace("primary", { kind: "symbol", symbolId: s.id, text: "" });
                }
              }}
            >
              <svg viewBox={`0 0 ${s.viewBox} ${s.viewBox}`}>
                <path d={s.path} fillRule="evenodd" />
              </svg>
            </button>
          )),
        ])}
      </div>
      <p className="help" style={{ marginTop: 8 }}>
        Add beside number keeps the inscription. Size and Move sliders are in the Inspector
        (right panel, or the Inspector tab) and in Face editor after you click a face.
      </p>
      <p className="help">
        {SYMBOL_CREDIT.replace("https://game-icons.net", "").trim()}{" "}
        <a href="https://game-icons.net" target="_blank" rel="noreferrer">
          game-icons.net
        </a>{" "}
        (CC BY 3.0).
      </p>
    </aside>
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
