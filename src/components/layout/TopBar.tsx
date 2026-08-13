import { useRef } from "react";
import { Link } from "react-router-dom";
import { downloadJson, parseProject } from "../../engine/projectIO";
import { useProjectStore } from "../../store/projectStore";

export function TopBar({ onExport }: { onExport: () => void }) {
  const name = useProjectStore((s) => s.project.name);
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const replaceProject = useProjectStore((s) => s.replaceProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (file: File) => {
    const text = await file.text();
    replaceProject(parseProject(text));
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
            <path
              d="M32 8 L56 22 L56 42 L32 56 L8 42 L8 22 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          <span className="brand-name">DICEMASTER</span>
        </Link>
        <input
          className="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Set name"
        />
      </div>
      <div className="topbar-right">
        <button className="btn btn-small" onClick={() => downloadJson(project)}>
          Save
        </button>
        <button className="btn btn-small" onClick={() => fileRef.current?.click()}>
          Load
        </button>
        <input
          ref={fileRef}
          className="hidden-input"
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void load(file);
          }}
        />
        <button className="btn btn-small" onClick={resetProject}>
          New set
        </button>
        <button className="btn btn-gold btn-small" onClick={onExport}>
          Export STL
        </button>
      </div>
    </header>
  );
}
