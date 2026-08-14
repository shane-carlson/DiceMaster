import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { ExportDialog } from "../components/panels/ExportDialog";
import { FaceEditor } from "../components/panels/FaceEditor";
import { InspectorPanel } from "../components/panels/InspectorPanel";
import { LibraryPanel } from "../components/panels/LibraryPanel";
import { DiceViewport } from "../components/viewport/DiceViewport";
import { useFont } from "../hooks/useFont";
import { useAuthStore } from "../store/authStore";
import { useProjectStore } from "../store/projectStore";

export function Workshop() {
  const [params] = useSearchParams();
  const hydrate = useProjectStore((s) => s.hydrate);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const project = useProjectStore((s) => s.project);
  const font = useFont(project.fontId, project.customFontBase64);
  const status = useAuthStore((s) => s.status);
  const faceEditorFromSession = useAuthStore((s) => s.session.faceEditorOpen);
  const [exportOpen, setExportOpen] = useState(false);
  const [faceEditorOpen, setFaceEditorOpen] = useState(false);

  useEffect(() => {
    if (status === "bootstrapping") return;
    const template = params.get("template");
    if (template) {
      loadTemplate(template);
      return;
    }
    if (status === "guest") hydrate();
    else setFaceEditorOpen(faceEditorFromSession);
  }, [hydrate, loadTemplate, params, status, faceEditorFromSession]);

  const setEditorOpen = (open: boolean) => {
    setFaceEditorOpen(open);
    useAuthStore.getState().patchSession({ faceEditorOpen: open });
  };

  return (
    <div className="workshop">
      <TopBar onExport={() => setExportOpen(true)} />
      <div className="workshop-body">
        <LibraryPanel onOpenFaceEditor={() => setEditorOpen(true)} />
        <DiceViewport font={font} />
        <InspectorPanel />
        <button
          className="face-editor-tab"
          onClick={() => setEditorOpen(true)}
          hidden={faceEditorOpen}
        >
          Face editor
        </button>
        <button
          className="inspector-tab"
          onClick={() => {
            setEditorOpen(false);
            useProjectStore.getState().revealInspector();
          }}
        >
          Inspector
        </button>
        <FaceEditor open={faceEditorOpen} onClose={() => setEditorOpen(false)} />
      </div>
      {exportOpen && <ExportDialog font={font} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
