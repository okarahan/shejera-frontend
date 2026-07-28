import { useMemo, useState } from "react";
import type { MeResponse } from "../api/types";
import { ImportDialog } from "./ImportDialog";
import { ImportProcessingDialog } from "./ImportProcessingDialog";
import { ImportPreviewPage } from "./ImportPreviewPage";

interface ImportHubPageProps {
  me: MeResponse;
  onCommitted: (treeId: string) => Promise<void>;
}

export function ImportHubPage({ me, onCommitted }: ImportHubPageProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const [view, setView] = useState<"hub" | "import-preview">("hub");

  const canImport = useMemo(() => {
    return (
      me.role === "admin" ||
      !me.contributionTreeId ||
      me.contributionTreeStatus === "draft"
    );
  }, [me.contributionTreeId, me.contributionTreeStatus, me.role]);

  if (!canImport) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="muted">
          Aktuell ist kein Import möglich. Bitte warte, bis dein Beitrag
          freigegeben wurde oder ein Admin dich entlastet.
        </p>
      </div>
    );
  }

  return (
    <div className="app app--centered">
      {view === "hub" && (
        <>
          <h1>Shejera</h1>
          <p className="muted">Starten Sie den Import über die Einladung.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setImportDialogOpen(true)}
          >
            Import starten
          </button>
        </>
      )}

      {view === "import-preview" && (
        <ImportPreviewPage
          onBack={() => setView("hub")}
          onOpenImport={() => setImportDialogOpen(true)}
          onCommitted={async (treeId) => {
            await onCommitted(treeId);
            setView("hub");
          }}
        />
      )}

      {importDialogOpen && (
        <ImportDialog
          onClose={() => setImportDialogOpen(false)}
          onStartProcessing={() => {
            setImportDialogOpen(false);
            setProcessingDialogOpen(true);
          }}
        />
      )}

      {processingDialogOpen && (
        <ImportProcessingDialog
          onClose={() => setProcessingDialogOpen(false)}
          onPreview={() => {
            setProcessingDialogOpen(false);
            setView("import-preview");
          }}
        />
      )}
    </div>
  );
}

