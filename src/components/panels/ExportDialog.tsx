import { useMemo, useState } from "react";
import type { Font } from "opentype.js";
import { STANDARD_RESIN_PLATE } from "../../engine/packPlate";
import {
  downloadBlob,
  exportDieStl,
  exportPackedPlateStl,
  exportProjectZip,
  type ExportProgress,
} from "../../engine/stl";
import { yieldToMain } from "../../engine/buildDie";
import { useProjectStore } from "../../store/projectStore";

const idleProgress: ExportProgress = {
  done: 0,
  total: 1,
  label: "",
  phase: "preparing",
  detail: "",
  percent: 0,
};

function phaseHeadline(progress: ExportProgress): string {
  switch (progress.phase) {
    case "preparing":
      return "Preparing export";
    case "building":
      return `Building ${progress.label}`;
    case "carving":
      return `Carving ${progress.label}`;
    case "packing":
      return progress.label === "Archive" ? "Packing ZIP" : "Packing the plate";
    case "complete":
      return "Export complete";
  }
}

function rowState(
  dieId: string,
  selectedIds: string[],
  progress: ExportProgress,
  busy: boolean,
): "idle" | "queued" | "current" | "done" {
  if (!busy) return "idle";
  const index = selectedIds.indexOf(dieId);
  if (index < 0) return "idle";
  if (progress.phase === "packing" || progress.phase === "complete") return "done";
  if (index < progress.done) return "done";
  if (index === progress.done) return "current";
  return "queued";
}

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
  const [progress, setProgress] = useState<ExportProgress>(idleProgress);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"plate" | "zip">("plate");

  const selected = useMemo(
    () => project.dice.filter((d) => picked[d.id]),
    [project.dice, picked],
  );
  const selectedIds = useMemo(() => selected.map((d) => d.id), [selected]);

  const allOn = selected.length === project.dice.length && project.dice.length > 0;

  const report = async (next: ExportProgress) => {
    setProgress(next);
    await yieldToMain();
  };

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
    await report({
      done: 0,
      total: selected.length,
      label: selected[0]?.name ?? "",
      phase: "preparing",
      detail: `Preparing ${selected.length} ${selected.length === 1 ? "die" : "dice"}`,
      percent: 0,
    });
    try {
      if (mode === "zip") {
        if (selected.length === 1) {
          const { name, buffer } = await exportDieStl(
            selected[0],
            font,
            project.logos,
            project.globalFontScale,
            report,
          );
          downloadBlob(new Blob([new Uint8Array(buffer)], { type: "model/stl" }), name);
        } else {
          const blob = await exportProjectZip(project, selected, font, report);
          downloadBlob(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}-stl.zip`);
        }
      } else {
        const packed = await exportPackedPlateStl(project, selected, font, report);
        downloadBlob(
          new Blob([new Uint8Array(packed.buffer)], { type: "model/stl" }),
          packed.name,
        );
      }
      await report({
        done: selected.length,
        total: selected.length,
        label: selected.length === 1 ? selected[0].name : mode === "zip" ? "Archive" : "Plate",
        phase: "complete",
        detail: "Download started",
        percent: 100,
      });
      await new Promise((resolve) => setTimeout(resolve, 450));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const percent = Math.max(0, Math.min(100, progress.percent));

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} aria-busy={busy}>
        <h2>{busy ? "Forging STL masters" : "Export STL masters"}</h2>
        <p className="help">
          Binary STL, 1 unit = 1 mm. By default every selected die is packed onto a single{" "}
          {STANDARD_RESIN_PLATE.width}×{STANDARD_RESIN_PLATE.depth} mm resin plate (Mars 3 / Photon
          class). Uncheck a die to leave it off the plate.
        </p>
        <div className="chip-row" style={{ marginBottom: 10 }}>
          <button
            className={`chip ${mode === "plate" ? "active" : ""}`}
            disabled={busy}
            onClick={() => setMode("plate")}
          >
            One plate STL
          </button>
          <button
            className={`chip ${mode === "zip" ? "active" : ""}`}
            disabled={busy}
            onClick={() => setMode("zip")}
          >
            Separate files (ZIP)
          </button>
        </div>
        <div className="export-list">
          <label className="export-row">
            <input
              type="checkbox"
              checked={allOn}
              disabled={busy}
              onChange={(e) => {
                const on = e.target.checked;
                setPicked(Object.fromEntries(project.dice.map((d) => [d.id, on])));
              }}
            />
            <span>All dice</span>
          </label>
          {project.dice.map((d) => {
            const state = rowState(d.id, selectedIds, progress, busy);
            return (
              <label key={d.id} className={`export-row ${state !== "idle" ? state : ""}`}>
                <input
                  type="checkbox"
                  checked={!!picked[d.id]}
                  disabled={busy}
                  onChange={(e) => setPicked((p) => ({ ...p, [d.id]: e.target.checked }))}
                />
                <span>
                  {d.name}{" "}
                  <small style={{ color: "var(--muted)" }}>
                    {d.type.toUpperCase()} · {d.sizeMm}mm
                  </small>
                </span>
                {state === "done" && (
                  <span className="export-status done" aria-label="Carved">
                    Done
                  </span>
                )}
                {state === "current" && (
                  <span className="export-status current" aria-label="In progress">
                    Carving
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {busy && (
          <div className="export-progress" role="status" aria-live="polite">
            <div className="progress-meta">
              <strong>{phaseHeadline(progress)}</strong>
              <span>{Math.round(percent)}%</span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-label={progress.detail || phaseHeadline(progress)}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="help">
              {progress.detail || phaseHeadline(progress)}
              {progress.total > 1 && progress.phase !== "complete" && progress.phase !== "packing"
                ? ` · ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`
                : ""}
            </p>
          </div>
        )}
        {error && (
          <p className="help" style={{ color: "#f0b4a8" }}>
            {error}
          </p>
        )}
        <div className="hero-actions">
          <button className="btn btn-gold" disabled={busy} onClick={() => void run()}>
            {busy
              ? `${Math.round(percent)}%`
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
