import { useEffect } from "react";
import { DIE_COLORS, DIE_LABELS, type FaceKind, type SizeFormatId } from "../../engine/types";
import { selectedDie, useProjectStore } from "../../store/projectStore";
import {
  DEFAULT_EMBLEM_SCALE,
  DEFAULT_FONT_SCALE,
  DEFAULT_GLOBAL_FONT_SCALE,
  makeEmblem,
} from "../../engine/defaults";
import { defaultBumperSize } from "../../engine/sizes";
import { GlyphPlace } from "./GlyphPlace";
import { PercentSlider, Slider } from "./Slider";
import { SymbolSelect } from "./SymbolPicker";
import { HintedField, InfoTip } from "../ui/InfoTip";

const KINDS: { id: FaceKind; label: string }[] = [
  { id: "number", label: "Number" },
  { id: "text", label: "Text" },
  { id: "symbol", label: "Symbol" },
  { id: "logo", label: "Logo" },
  { id: "blank", label: "Blank" },
];

export function InspectorPanel() {
  const state = useProjectStore();
  const die = selectedDie(state);
  const face = die && state.selectedFaceIndex !== null ? die.faces[state.selectedFaceIndex] : null;
  const faceNo = state.selectedFaceIndex;
  const reveal = state.inspectorFocusGeneration;

  useEffect(() => {
    if (!reveal) return;
    const panel = document.getElementById("inspector-panel");
    const faceEl = document.getElementById("inspector-face");
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    panel?.classList.remove("panel-reveal");
    void panel?.offsetWidth;
    panel?.classList.add("panel-reveal");
    faceEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reveal]);

  if (!die) {
    return (
      <aside id="inspector-panel" className="panel panel-right">
        <h2>Inspector</h2>
        <p className="help">Choose a die from the vault, or summon one from a template.</p>
      </aside>
    );
  }

  return (
    <aside id="inspector-panel" className="panel panel-right">
      <h2>Inspector</h2>
      <p className="help">
        {die.name} · {die.type.toUpperCase()}. Click a face on the die or in Face editor, then
        resize and move marks here.
      </p>

      <h3 id="inspector-face">Face {faceNo === null ? "" : faceNo + 1}</h3>
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
          Teardrop D4s land on four long triangular faces (~80% of the length). The short
          four-sided cap is unnumbered; numerals point toward the cap.
        </p>
      )}
      {!face && (
        <p className="help">
          Click a face on the die (or open Face editor) to inscribe numbers, add a symbol beside
          them, or replace the number with a crest.
        </p>
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
            <HintedField
              label="Inscription"
              hint="Characters carved on this face. Keep the face number, or type custom text."
            >
              <input
                type="text"
                value={face.primary.text}
                onChange={(e) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { text: e.target.value })
                }
              />
            </HintedField>
          )}
          {face.primary.kind === "symbol" && (
            <HintedField
              label="Symbol"
              hint="Pick a vault mark to carve as the main inscription on this face."
            >
              <SymbolSelect
                value={face.primary.symbolId ?? "star"}
                onChange={(id) =>
                  state.updateFaceGlyph(die.id, faceNo, "primary", { symbolId: id })
                }
              />
            </HintedField>
          )}
          {face.primary.kind === "logo" && (
            <HintedField
              label="Logo"
              hint="Choose an uploaded crest to carve as the main mark on this face."
            >
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
            </HintedField>
          )}
          <GlyphPlace
            glyph={face.primary}
            sizeMin={0.3}
            sizeMax={2.2}
            onChange={(patch) => state.updateFaceGlyph(die.id, faceNo, "primary", patch)}
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
              <InfoTip text="Adds a bar under 6 and 9 so they stay readable after a roll." />
            </label>
          </div>
          <button className="btn btn-small" onClick={() => state.copyFaceToAll(die.id, faceNo)}>
            Copy placement to every face
          </button>

          <h3 id="inspector-emblem">Symbol or logo on this face</h3>
          <p className="help">
            Sits beside the number. Size and move it here. To swap the number for a symbol, use
            the tabs above.
          </p>
          {!face.emblem && (
            <button
              className="btn btn-small"
              onClick={() =>
                state.updateFaceGlyph(die.id, faceNo, "emblem", makeEmblem("symbol", "star"))
              }
            >
              Add symbol
            </button>
          )}
          {face.emblem && (
            <>
              <div className="kind-tabs">
                {KINDS.filter((k) => k.id === "symbol" || k.id === "logo").map((k) => (
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
                <HintedField
                  label="Symbol"
                  hint="Vault mark that sits beside the number on this face."
                >
                  <SymbolSelect
                    value={face.emblem.symbolId ?? "star"}
                    onChange={(id) =>
                      state.updateFaceGlyph(die.id, faceNo, "emblem", { symbolId: id })
                    }
                  />
                </HintedField>
              )}
              {face.emblem.kind === "logo" && (
                <HintedField
                  label="Logo"
                  hint="Uploaded crest that sits beside the number on this face."
                >
                  <select
                    value={face.emblem.logoId ?? ""}
                    onChange={(e) =>
                      state.updateFaceGlyph(die.id, faceNo, "emblem", { logoId: e.target.value })
                    }
                  >
                    <option value="">Choose upload…</option>
                    {state.project.logos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </HintedField>
              )}
              <GlyphPlace
                glyph={face.emblem}
                defaultScale={DEFAULT_EMBLEM_SCALE}
                onChange={(patch) => state.updateFaceGlyph(die.id, faceNo, "emblem", patch)}
              />
              <button
                className="btn btn-small"
                onClick={() => state.updateFaceGlyph(die.id, faceNo, "emblem", null)}
              >
                Remove symbol
              </button>
            </>
          )}

          <h3>Quick rites</h3>
          <button
            className="btn btn-small"
            onClick={() => state.applyEmblemToHighest(die.id, makeEmblem("symbol", "dragon"))}
          >
            Dragon on the highest face
          </button>
          <button
            className="btn btn-small"
            style={{ marginTop: 6 }}
            onClick={() => state.applyEmblemToHighest(die.id, makeEmblem("symbol", "spark"))}
          >
            Crit burst on the highest face
          </button>
        </>
      )}

      <h3>Die</h3>
      <HintedField
        label="Name"
        hint="Label for this die in the vault, face editor, and exported STL filename."
      >
        <input
          type="text"
          value={die.name}
          onChange={(e) => state.updateDie(die.id, { name: e.target.value })}
        />
      </HintedField>
      <HintedField
        label="Shape"
        hint="Polyhedron type. Changing shape rebuilds faces and numbering for this die."
      >
        <select
          value={die.type}
          onChange={(e) => state.updateDie(die.id, { type: e.target.value as typeof die.type })}
        >
          {Object.entries(DIE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </HintedField>
      <HintedField
        label="Size format"
        hint="Preset body sizes. Mini, standard, chonk, and giant match common tabletop scales. Custom unlocks the millimetre slider."
      >
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
      </HintedField>
      <Slider
        label="Size"
        hint="Across-flats body size in millimetres. Moving this slider switches the die to a custom size."
        value={die.sizeMm}
        min={8}
        max={60}
        step={0.5}
        suffix=" mm"
        onChange={(n) => state.setSizeFormat(die.id, "custom", n)}
      />
      <Slider
        label="Corner rounding"
        hint="How much edges and corners are filleted. Higher is rounder and sits more comfortably in hand."
        value={die.cornerRounding}
        min={0}
        max={0.7}
        step={0.01}
        onChange={(n) => state.updateDie(die.id, { cornerRounding: n })}
      />
      <Slider
        label="Engraving depth"
        hint="How deep numbers and marks are cut — or raised, in emboss mode — in millimetres."
        value={die.engravingDepth}
        min={0.2}
        max={2.4}
        step={0.05}
        suffix=" mm"
        onChange={(n) => state.updateDie(die.id, { engravingDepth: n })}
      />
      <PercentSlider
        label="Glyph scale"
        hint="Size of every mark on this die, as a percent from the default. 0% is the default size."
        value={die.fontScale}
        defaultValue={DEFAULT_FONT_SCALE}
        min={0.4}
        max={1.8}
        onChange={(n) => state.updateDie(die.id, { fontScale: n })}
      />
      <HintedField
        label="Carve mode"
        hint="Engrave cuts marks into the body. Emboss raises them above the surface."
      >
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
      </HintedField>
      {(die.type === "d10" || die.type === "d00") && (
        <HintedField
          label="D10 numbering"
          hint="0–9 is classic percentile pairing. 1–10 uses a ten in place of zero."
        >
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
        </HintedField>
      )}
      {die.type === "d6" && (
        <HintedField
          label="D6 glyphs"
          hint="Numerals carve digits. Pips carve classic dice-dot patterns instead."
        >
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
        </HintedField>
      )}
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={die.bumpers}
            onChange={(e) => state.updateDie(die.id, { bumpers: e.target.checked })}
          />{" "}
          Print bumpers
          <InfoTip text="Small pads on the faces so the die sits off the resin plate while printing." />
        </label>
      </div>
      {die.bumpers && (
        <PercentSlider
          label="Bumper size"
          hint="How large those print pads are, as a percent from the size-format default."
          value={die.bumperSize}
          defaultValue={defaultBumperSize(die.sizeFormat)}
          min={0.15}
          max={1.6}
          onChange={(n) => state.updateDie(die.id, { bumperSize: n })}
        />
      )}
      <HintedField
        label="Preview pigment"
        hint="Viewport colour only. It is not written into the STL."
      >
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
      </HintedField>

      <h3>Set-wide type</h3>
      <PercentSlider
        label="Global glyph scale"
        hint="Scales every number and mark on every die in this set. 0% is the default size."
        value={state.project.globalFontScale}
        defaultValue={DEFAULT_GLOBAL_FONT_SCALE}
        min={0.6}
        max={1.5}
        onChange={(n) => state.setGlobalFontScale(n)}
      />
    </aside>
  );
}
