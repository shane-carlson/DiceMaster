import { DIE_COLORS, DIE_LABELS, type FaceKind, type SizeFormatId } from "../../engine/types";
import { SYMBOLS } from "../../engine/symbols";
import { selectedDie, useProjectStore } from "../../store/projectStore";
import { makeGlyph } from "../../engine/defaults";

const KINDS: { id: FaceKind; label: string }[] = [
  { id: "number", label: "Number" },
  { id: "text", label: "Text" },
  { id: "symbol", label: "Symbol" },
  { id: "logo", label: "Logo" },
  { id: "blank", label: "Blank" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <label>{label}</label>
        <span>
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function InspectorPanel() {
  const state = useProjectStore();
  const die = selectedDie(state);
  const face = die && state.selectedFaceIndex !== null ? die.faces[state.selectedFaceIndex] : null;

  if (!die) {
    return (
      <aside className="panel panel-right">
        <h2>Inspector</h2>
        <p className="help">Choose a die from the vault, or summon one from a template.</p>
      </aside>
    );
  }

  const faceNo = state.selectedFaceIndex;

  return (
    <aside className="panel panel-right">
      <h2>Die</h2>
      <div className="field">
        <label>Name</label>
        <input
          type="text"
          value={die.name}
          onChange={(e) => state.updateDie(die.id, { name: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Shape</label>
        <select
          value={die.type}
          onChange={(e) =>
            state.updateDie(die.id, { type: e.target.value as typeof die.type })
          }
        >
          {Object.entries(DIE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Size format</label>
        <div className="chip-row">
          {(["mini", "standard", "chonk", "giant"] as SizeFormatId[]).map((fmt) => (
            <button
              key={fmt}
              className={`chip ${die.sizeFormat === fmt ? "active" : ""}`}
              onClick={() => state.setSizeFormat(die.id, fmt)}
            >
              {fmt}
            </button>
          ))}
          <button
            className={`chip ${die.sizeFormat === "custom" ? "active" : ""}`}
            onClick={() => state.setSizeFormat(die.id, "custom", die.sizeMm)}
          >
            custom
          </button>
        </div>
      </div>
      <Slider
        label="Size"
        value={die.sizeMm}
        min={8}
        max={60}
        step={0.5}
        suffix=" mm"
        onChange={(n) => state.setSizeFormat(die.id, "custom", n)}
      />
      <Slider
        label="Corner rounding"
        value={die.cornerRounding}
        min={0}
        max={0.7}
        step={0.01}
        onChange={(n) => state.updateDie(die.id, { cornerRounding: n })}
      />
      <Slider
        label="Engraving depth"
        value={die.engravingDepth}
        min={0.2}
        max={2.4}
        step={0.05}
        suffix=" mm"
        onChange={(n) => state.updateDie(die.id, { engravingDepth: n })}
      />
      <Slider
        label="Glyph scale"
        value={die.fontScale}
        min={0.4}
        max={1.8}
        step={0.02}
        onChange={(n) => state.updateDie(die.id, { fontScale: n })}
      />
      <div className="field">
        <label>Carve mode</label>
        <div className="chip-row">
          <button
            className={`chip ${die.engraveMode === "engrave" ? "active" : ""}`}
            onClick={() => state.updateDie(die.id, { engraveMode: "engrave" })}
          >
            Engrave
          </button>
          <button
            className={`chip ${die.engraveMode === "emboss" ? "active" : ""}`}
            onClick={() => state.updateDie(die.id, { engraveMode: "emboss" })}
          >
            Emboss
          </button>
        </div>
      </div>
      {(die.type === "d10" || die.type === "d00") && (
        <div className="field">
          <label>D10 numbering</label>
          <div className="chip-row">
            <button
              className={`chip ${die.d10Style === "0-9" ? "active" : ""}`}
              onClick={() => state.updateDie(die.id, { d10Style: "0-9" })}
            >
              0–9
            </button>
            <button
              className={`chip ${die.d10Style === "1-10" ? "active" : ""}`}
              onClick={() => state.updateDie(die.id, { d10Style: "1-10" })}
            >
              1–10
            </button>
          </div>
        </div>
      )}
      {die.type === "d6" && (
        <div className="field">
          <label>D6 glyphs</label>
          <div className="chip-row">
            <button
              className={`chip ${die.numberStyle === "numerals" ? "active" : ""}`}
              onClick={() => state.updateDie(die.id, { numberStyle: "numerals" })}
            >
              Numerals
            </button>
            <button
              className={`chip ${die.numberStyle === "pips" ? "active" : ""}`}
              onClick={() => state.updateDie(die.id, { numberStyle: "pips" })}
            >
              Pips
            </button>
          </div>
        </div>
      )}
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={die.bumpers}
            onChange={(e) => state.updateDie(die.id, { bumpers: e.target.checked })}
          />{" "}
          Print bumpers
        </label>
      </div>
      {die.bumpers && (
        <Slider
          label="Bumper size"
          value={die.bumperSize}
          min={0.15}
          max={1.6}
          step={0.05}
          suffix=" mm"
          onChange={(n) => state.updateDie(die.id, { bumperSize: n })}
        />
      )}
      <div className="field">
        <label>Preview pigment</label>
        <div className="color-row">
          {DIE_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${die.color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => state.updateDie(die.id, { color: c })}
            />
          ))}
        </div>
      </div>

      <h2>Face {faceNo === null ? "" : faceNo + 1}</h2>
      {die.type === "d4" && (
        <p className="help">
          Tetrahedron D4s carry three numbers per face, one at each vertex. After a roll, read the
          number at the point that stands up.
        </p>
      )}
      {die.type === "d4crystal" && (
        <p className="help">
          Crystal D4s land on the four long prism faces. The pyramidal caps are unnumbered.
        </p>
      )}
      {die.type === "d4teardrop" && (
        <p className="help">
          Teardrop D4s are a double-ended kite — one number in the center of each face.
        </p>
      )}
      {!face && (
        <p className="help">Click a face on the die to inscribe numbers, crests, or blank it for a logo.</p>
      )}
      {face && faceNo !== null && (
        <>
          <p className="help">Primary mark</p>
          <div className="kind-tabs">
            {KINDS.map((k) => (
              <button
                key={k.id}
                className={`chip ${face.primary.kind === k.id ? "active" : ""}`}
                onClick={() => state.setFaceKind(die.id, faceNo, "primary", k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
          {(face.primary.kind === "text" ||
            (face.primary.kind === "number" && die.type !== "d4")) && (
            <div className="field">
              <label>Inscription</label>
              <input
                type="text"
                value={face.primary.text}
                onChange={(e) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { text: e.target.value })
                }
              />
            </div>
          )}
          {face.primary.kind === "symbol" && (
            <div className="field">
              <label>Symbol</label>
              <select
                value={face.primary.symbolId ?? ""}
                onChange={(e) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { symbolId: e.target.value })
                }
              >
                {SYMBOLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {face.primary.kind === "logo" && (
            <div className="field">
              <label>Logo</label>
              <select
                value={face.primary.logoId ?? ""}
                onChange={(e) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { logoId: e.target.value })
                }
              >
                <option value="">Choose upload…</option>
                {state.project.logos.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Slider
            label="Scale"
            value={face.primary.scale}
            min={0.3}
            max={2.2}
            step={0.02}
            onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "primary", { scale: n })}
          />
          <Slider
            label="Offset X"
            value={face.primary.offsetX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "primary", { offsetX: n })}
          />
          <Slider
            label="Offset Y"
            value={face.primary.offsetY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "primary", { offsetY: n })}
          />
          <Slider
            label="Rotation"
            value={face.primary.rotation}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "primary", { rotation: n })}
          />
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={face.primary.underscore}
                onChange={(e) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { underscore: e.target.checked })
                }
              />{" "}
              Underscore (6 / 9)
            </label>
          </div>
          <button className="btn btn-small" onClick={() => state.copyFaceToAll(die.id, faceNo)}>
            Copy placement to every face
          </button>

          <h3>Corner emblem</h3>
          <p className="help">
            Park a crest where a number is not — a high-face dragon, a clan mark, a crit burst.
          </p>
          {!face.emblem && (
            <button
              className="btn btn-small"
              onClick={() =>
                state.updateFaceGlyph(die.id, faceNo, "emblem", {
                  ...makeGlyph(""),
                  kind: "symbol",
                  symbolId: "dragon",
                  scale: 0.45,
                  offsetY: 0.72,
                })
              }
            >
              Add emblem
            </button>
          )}
          {face.emblem && (
            <>
              <div className="kind-tabs">
                {KINDS.filter((k) => k.id !== "number").map((k) => (
                  <button
                    key={k.id}
                    className={`chip ${face.emblem?.kind === k.id ? "active" : ""}`}
                    onClick={() => state.setFaceKind(die.id, faceNo, "emblem", k.id)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              {face.emblem.kind === "symbol" && (
                <select
                  value={face.emblem.symbolId ?? "star"}
                  onChange={(e) =>
                    state.updateFaceGlyph(die.id, faceNo, "emblem", { symbolId: e.target.value })
                  }
                >
                  {SYMBOLS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {face.emblem.kind === "logo" && (
                <select
                  value={face.emblem.logoId ?? ""}
                  onChange={(e) =>
                    state.updateFaceGlyph(die.id, faceNo, "emblem", { logoId: e.target.value })
                  }
                >
                  {state.project.logos.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
              {face.emblem.kind === "text" && (
                <input
                  type="text"
                  value={face.emblem.text}
                  onChange={(e) =>
                    state.updateFaceGlyph(die.id, faceNo, "emblem", { text: e.target.value })
                  }
                />
              )}
              <Slider
                label="Emblem scale"
                value={face.emblem.scale}
                min={0.2}
                max={1.4}
                step={0.02}
                onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "emblem", { scale: n })}
              />
              <Slider
                label="Emblem X"
                value={face.emblem.offsetX}
                min={-1}
                max={1}
                step={0.01}
                onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "emblem", { offsetX: n })}
              />
              <Slider
                label="Emblem Y"
                value={face.emblem.offsetY}
                min={-1}
                max={1}
                step={0.01}
                onChange={(n) => state.updateFaceGlyph(die.id, faceNo, "emblem", { offsetY: n })}
              />
              <button
                className="btn btn-small"
                onClick={() => state.updateFaceGlyph(die.id, faceNo, "emblem", null)}
              >
                Remove emblem
              </button>
            </>
          )}

          <h3>Quick rites</h3>
          <button
            className="btn btn-small"
            onClick={() =>
              state.applyEmblemToHighest(die.id, {
                ...makeGlyph(""),
                kind: "symbol",
                symbolId: "dragon",
                scale: 1,
              })
            }
          >
            Dragon on the highest face
          </button>
          <button
            className="btn btn-small"
            style={{ marginTop: 6 }}
            onClick={() =>
              state.applyEmblemToHighest(die.id, {
                ...makeGlyph(""),
                kind: "symbol",
                symbolId: "spark",
                scale: 1,
              })
            }
          >
            Crit burst on the highest face
          </button>
        </>
      )}

      <h2>Set-wide type</h2>
      <Slider
        label="Global glyph scale"
        value={state.project.globalFontScale}
        min={0.6}
        max={1.5}
        step={0.02}
        onChange={(n) => state.setGlobalFontScale(n)}
      />
    </aside>
  );
}
