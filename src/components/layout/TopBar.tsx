import { useRef, useState } from "react";
import { downloadJson, parseProject } from "../../engine/projectIO";
import { useAuthStore } from "../../store/authStore";
import { useProjectStore } from "../../store/projectStore";
import { saveCurrentSet } from "../../sync/workspaceSync";
import { Brand } from "./Brand";
import { HostExitLink } from "./HostExitLink";
import { UserLinks } from "./UserLinks";
import { InfoTip } from "../ui/InfoTip";

export function TopBar({ onExport }: { onExport: () => void }) {
  const name = useProjectStore((s) => s.project.name);
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const replaceProject = useProjectStore((s) => s.replaceProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const signedIn = useAuthStore((s) => s.status === "signed-in");
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = async (file: File) => {
    const text = await file.text();
    replaceProject(parseProject(text));
  };

  const onSave = async () => {
    if (signedIn) {
      await saveCurrentSet(name);
      setNote("Saved to vault");
      window.setTimeout(() => setNote(null), 1800);
      return;
    }
    downloadJson(project);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <HostExitLink />
        <Brand />
        <label className="project-name-field">
          <span className="sr-only">Set name</span>
          <input
            className="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Set name"
          />
          <InfoTip text="Name of this set. Used for vault saves and exported file names." />
        </label>
      </div>
      <div className="topbar-right">
        {note && <span className="save-pill">{note}</span>}
        <button
          className="btn btn-small"
          onClick={() => {
            resetProject();
            useAuthStore.getState().patchSession({ lastSetId: null });
          }}
        >
          New set
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
        <button className="btn btn-small" onClick={() => void onSave()}>
          {signedIn ? "Save to vault" : "Save"}
        </button>
        <button className="btn btn-small" onClick={() => downloadJson(project)}>
          JSON
        </button>
        <button className="btn btn-gold btn-small" onClick={onExport}>
          Export STL
        </button>
        <UserLinks />
      </div>
    </header>
  );
}
