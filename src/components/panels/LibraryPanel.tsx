import { useRef } from "react";
import { arrayBufferToBase64 } from "../../engine/fonts";
import { uid } from "../../engine/id";
import { BUILTIN_FONTS } from "../../engine/fonts";
import { SET_TEMPLATES } from "../../engine/templates";
import type { DieType, SizeFormatId } from "../../engine/types";
import { SYMBOLS } from "../../engine/symbols";
import { useProjectStore } from "../../store/projectStore";

const ADDABLE: DieType[] = [
  "d2",
  "d4",
  "d4crystal",
  "d6",
  "d8",
  "d10",
  "d00",
  "d12",
  "d20",
];

export function LibraryPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const addDie = useProjectStore((s) => s.addDie);
  const selectDie = useProjectStore((s) => s.selectDie);
  const removeDie = useProjectStore((s) => s.removeDie);
  const duplicateDie = useProjectStore((s) => s.duplicateDie);
  const setFontId = useProjectStore((s) => s.setFontId);
  const setCustomFont = useProjectStore((s) => s.setCustomFont);
  const addLogo = useProjectStore((s) => s.addLogo);
  const updateFaceGlyph = useProjectStore((s) => s.updateFaceGlyph);
  const fontRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const onFont = async (file: File) => {
    const buf = await file.arrayBuffer();
    setCustomFont(file.name, arrayBufferToBase64(buf));
  };

  const onLogo = async (file: File) => {
    if (file.type.includes("svg") || file.name.endsWith(".svg")) {
      const data = await file.text();
      addLogo({ id: uid(), name: file.name, kind: "svg", data });
    } else {
      const data = await readDataUrl(file);
      addLogo({ id: uid(), name: file.name, kind: "png", data });
    }
  };

  return (
    <aside className="panel">
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
        {ADDABLE.map((type) => (
          <button key={type} className="type-btn" onClick={() => addDie(type, "standard")}>
            {type.toUpperCase()}
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

      <h2>This set</h2>
      <div className="die-list">
        {project.dice.length === 0 && <div className="empty">The vault is empty. Add a die.</div>}
        {project.dice.map((die) => (
          <div key={die.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 4 }}>
            <button
              className={`die-item ${die.id === selectedDieId ? "active" : ""}`}
              onClick={() => selectDie(die.id)}
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
      <div className="field">
        <select value={project.fontId} onChange={(e) => setFontId(e.target.value)}>
          {BUILTIN_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
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
      </div>

      <h2>Crests & logos</h2>
      <p className="help">
        Drop a clan mark onto a face — especially the high face, or a blank corner emblem.
      </p>
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
              if (!selectedDieId || selectedFaceIndex === null) return;
              updateFaceGlyph(selectedDieId, selectedFaceIndex, "primary", {
                kind: "logo",
                logoId: logo.id,
              });
            }}
          >
            {logo.name}
          </button>
        ))}
      </div>

      <h2>Symbol vault</h2>
      <div className="symbol-grid">
        {SYMBOLS.map((s) => (
          <button
            key={s.id}
            className="symbol-btn"
            title={s.name}
            onClick={() => {
              if (!selectedDieId || selectedFaceIndex === null) return;
              updateFaceGlyph(selectedDieId, selectedFaceIndex, "primary", {
                kind: "symbol",
                symbolId: s.id,
                text: "",
              });
            }}
          >
            <svg viewBox={`0 0 ${s.viewBox} ${s.viewBox}`}>
              <path d={s.path} />
            </svg>
          </button>
        ))}
      </div>
      <p className="help" style={{ marginTop: 8 }}>
        Select a face, then tap a symbol. Use the inspector to park a crest in a corner instead of
        replacing the number.
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
