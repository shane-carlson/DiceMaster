import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { ExportDialog } from "../components/panels/ExportDialog";
import { InspectorPanel } from "../components/panels/InspectorPanel";
import { LibraryPanel } from "../components/panels/LibraryPanel";
import { DiceViewport } from "../components/viewport/DiceViewport";
import { useFont } from "../hooks/useFont";
import { useProjectStore } from "../store/projectStore";

export function Workshop() {
  const [params] = useSearchParams();
  const hydrate = useProjectStore((s) => s.hydrate);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const project = useProjectStore((s) => s.project);
  const font = useFont(project.fontId, project.customFontBase64);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const template = params.get("template");
    if (template) loadTemplate(template);
    else hydrate();
  }, [hydrate, loadTemplate, params]);

  return (
    <div className="workshop">
      <TopBar onExport={() => setExportOpen(true)} />
      <div className="workshop-body">
        <LibraryPanel />
        <DiceViewport font={font} />
        <InspectorPanel />
      </div>
      {exportOpen && <ExportDialog font={font} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
