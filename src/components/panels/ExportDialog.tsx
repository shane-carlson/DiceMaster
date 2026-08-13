import { useMemo, useState } from "react";
import type { Font } from "opentype.js";
import { STANDARD_RESIN_PLATE } from "../../engine/packPlate";
import { downloadBlob, exportDieStl, exportPackedPlateStl, exportProjectZip } from "../../engine/stl";
import { useProjectStore } from "../../store/projectStore";

export function ExportDialog({
  font,
  onClose,
}: {
  font: Font | null;
  onClose: () => void;
}) {
  const project = useProjectStore((s) => s.project);
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(project.dice.map((d) => [d.id, true])),
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 1, label: "" });
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"plate" | "zip">("plate");

  const selected = useMemo(
    () => project.dice.filter((d) => picked[d.id]),
    [project.dice, picked],
  );

  const allOn = selected.length === project.dice.length && project.dice.length > 0;

  const run = async () => {
    if (!font) {
      setError("The typeface is still loading.");
      return;
    }
    if (selected.length === 0) {
      setError("Choose at least one die.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "zip") {
        if (selected.length === 1) {
          setProgress({ done: 0, total: 1, label: selected[0].name });
          const { name, buffer } = await exportDieStl(
            selected[0],
            font,
            project.logos,
            project.globalFontScale,
          );
          downloadBlob(new Blob([new Uint8Array(buffer)], { type: "model/stl" }), name);
        } else {
          const blob = await exportProjectZip(project, selected, font, (done, total, label) => {
            setProgress({ done, total, label });
          });
          downloadBlob(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}-stl.zip`);
        }
      } else {
        const packed = await exportPackedPlateStl(
          project,
          selected,
          font,
          (done, total, label) => setProgress({ done, total, label }),
        );
        downloadBlob(
          new Blob([new Uint8Array(packed.buffer)], { type: "model/stl" }),
          packed.name,
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export STL masters</h2>
        <p className="help">
          Binary STL, 1 unit = 1 mm. By default every selected die is packed onto a single{" "}
          {STANDARD_RESIN_PLATE.width}×{STANDARD_RESIN_PLATE.depth} mm resin plate (Mars 3 / Photon
          class). Uncheck a die to leave it off the plate.
        </p>
        <div className="chip-row" style={{ marginBottom: 10 }}>
          <button className={`chip ${mode === "plate" ? "active" : ""}`} onClick={() => setMode("plate")}>
            One plate STL
          </button>
          <button className={`chip ${mode === "zip" ? "active" : ""}`} onClick={() => setMode("zip")}>
            Separate files (ZIP)
          </button>
        </div>
        <div className="export-list">
          <label className="export-row">
            <input
              type="checkbox"
              checked={allOn}
              onChange={(e) => {
                const on = e.target.checked;
                setPicked(Object.fromEntries(project.dice.map((d) => [d.id, on])));
              }}
            />
            <span>All dice</span>
          </label>
          {project.dice.map((d) => (
            <label key={d.id} className="export-row">
              <input
                type="checkbox"
                checked={!!picked[d.id]}
                onChange={(e) => setPicked((p) => ({ ...p, [d.id]: e.target.checked }))}
              />
              <span>
                {d.name}{" "}
                <small style={{ color: "var(--muted)" }}>
                  {d.type.toUpperCase()} · {d.sizeMm}mm
                </small>
              </span>
            </label>
          ))}
        </div>
        {busy && (
          <>
            <div className="progress">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="help">
              Forging {progress.label} ({progress.done}/{progress.total})
            </p>
          </>
        )}
        {error && <p className="help" style={{ color: "#f0b4a8" }}>{error}</p>}
        <div className="hero-actions">
          <button className="btn btn-gold" disabled={busy} onClick={() => void run()}>
            {busy
              ? "Carving…"
              : mode === "plate"
                ? `Download plate (${selected.length})`
                : selected.length > 1
                  ? "Download ZIP"
                  : "Download STL"}
          </button>
          <button className="btn" disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
