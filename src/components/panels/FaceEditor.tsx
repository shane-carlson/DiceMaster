import { useMemo, useRef, useState } from "react";
import { arrayBufferToBase64, fontsByGroup } from "../../engine/fonts";
import { previewFacesForSet, type FacePreview } from "../../engine/facePreview";
import { numeralInk } from "../../engine/ink";
import { symbolById } from "../../engine/symbols";
import type { FaceKind } from "../../engine/types";
import { makeEmblem } from "../../engine/defaults";
import { useProjectStore } from "../../store/projectStore";

const TOOLS: { id: FaceKind | "copy" | "copyAll" | "addMark"; label: string }[] = [
  { id: "number", label: "Number" },
  { id: "logo", label: "Replace with logo" },
  { id: "symbol", label: "Replace with symbol" },
  { id: "addMark", label: "Add symbol" },
  { id: "blank", label: "Empty" },
  { id: "copy", label: "Copy" },
  { id: "copyAll", label: "Copy to all" },
];

function FaceCell({
  face,
  selected,
  onClick,
}: {
  face: FacePreview;
  selected: boolean;
  onClick: () => void;
}) {
  const xs = face.polygon.map((p) => p.x);
  const ys = face.polygon.map((p) => p.y);
  if (xs.length === 0) {
    return (
      <button className={`face-cell ${selected ? "active" : ""}`} onClick={onClick} title={face.dieName}>
        <span className="face-cell-label">{face.dieName}</span>
      </button>
    );
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * 0.22;
  const vb = `${minX - pad} ${-(maxY + pad)} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  const fontSize = span * 0.22;

  return (
    <button
      className={`face-cell ${selected ? "active" : ""}`}
      onClick={onClick}
      title={`${face.dieName} · face ${face.faceIndex + 1}`}
    >
      <svg viewBox={vb} className="face-cell-svg" aria-hidden>
        <g transform="scale(1,-1)">
          <polygon
            points={face.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={face.dieColor}
            stroke="rgba(244,234,212,0.35)"
            strokeWidth={span * 0.03}
            strokeLinejoin="round"
          />
          {face.marks.map((m, i) => {
            const ink = numeralInk(face.dieColor, m.kind === "symbol" || m.kind === "logo" ? "emblem" : "primary");
            const def = m.symbolId ? symbolById(m.symbolId) : null;
            const size = fontSize * Math.max(m.scale, 0.25);
            return (
              <g key={i} transform={`translate(${m.x} ${m.y}) rotate(${-m.rotation})`}>
                {def ? (
                  <g transform={`translate(${-size / 2} ${size / 2}) scale(${size / def.viewBox} ${-size / def.viewBox})`}>
                    <path d={def.path} fill={ink} fillRule="evenodd" />
                  </g>
                ) : (
                  <text
                    transform="scale(1,-1)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size}
                    fill={ink}
                    fontWeight={700}
                  >
                    {m.text}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <span className="face-cell-label">
        {face.dieName} {face.faceIndex + 1}
      </span>
    </button>
  );
}

export function FaceEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const setFontId = useProjectStore((s) => s.setFontId);
  const setCustomFont = useProjectStore((s) => s.setCustomFont);
  const setGlobalFontScale = useProjectStore((s) => s.setGlobalFontScale);
  const setFaceKind = useProjectStore((s) => s.setFaceKind);
  const updateFaceGlyph = useProjectStore((s) => s.updateFaceGlyph);
  const copyFaceToAll = useProjectStore((s) => s.copyFaceToAll);
  const focusDieFace = useProjectStore((s) => s.focusDieFace);
  const fontRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<{ dieId: string; faceIndex: number } | null>(null);

  const faces = useMemo(() => previewFacesForSet(project.dice), [project.dice]);
  const fontSize = Math.round(project.globalFontScale * 13);

  const onFont = async (file: File) => {
    const buf = await file.arrayBuffer();
    setCustomFont(file.name, arrayBufferToBase64(buf));
  };

  const applyTool = (id: (typeof TOOLS)[number]["id"]) => {
    if (!selectedDieId || selectedFaceIndex === null) return;
    if (id === "copy") {
      setCopied({ dieId: selectedDieId, faceIndex: selectedFaceIndex });
      return;
    }
    if (id === "copyAll") {
      copyFaceToAll(selectedDieId, selectedFaceIndex);
      return;
    }
    if (id === "addMark") {
      updateFaceGlyph(selectedDieId, selectedFaceIndex, "emblem", makeEmblem("symbol", "star"));
      return;
    }
    setFaceKind(selectedDieId, selectedFaceIndex, "primary", id);
  };

  return (
    <div className={`face-editor ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="face-editor-head">
        <h2>Face editor</h2>
        <button className="btn btn-small" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="face-editor-fonts">
        <label>
          Font
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
        </label>
        <label>
          Size
          <input
            type="number"
            min={8}
            max={22}
            value={fontSize}
            onChange={(e) => setGlobalFontScale(Number(e.target.value) / 13)}
          />
        </label>
        <button className="btn btn-small" onClick={() => fontRef.current?.click()}>
          Upload font
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
      <p className="help">
        Size is set-wide. Use Add symbol to park a crest beside the number. Replace with
        symbol or logo swaps the number out. D4 tetrahedron faces show three numbers, one at
        each vertex — read the point that lands up.
      </p>

      <div className="face-editor-tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className="chip"
            disabled={!selectedDieId || selectedFaceIndex === null}
            onClick={() => applyTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {copied && <p className="help">Copied face {copied.faceIndex + 1}. Use Copy to all to stamp placement.</p>}

      <div className="face-grid">
        {faces.map((face) => (
          <FaceCell
            key={`${face.dieId}-${face.faceIndex}`}
            face={face}
            selected={face.dieId === selectedDieId && face.faceIndex === selectedFaceIndex}
            onClick={() => {
              focusDieFace(face.dieId, face.faceIndex);
            }}
          />
        ))}
      </div>
    </div>
  );
}
