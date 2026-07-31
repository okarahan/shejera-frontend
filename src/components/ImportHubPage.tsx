import { useMemo, useState } from "react";
import type { MeResponse } from "../api/types";
import { ImportDialog } from "./ImportDialog";
import { ImportPreviewPage } from "./ImportPreviewPage";

interface ImportHubPageProps {
  me: MeResponse;
  onCommitted: (treeId: string) => Promise<void>;
}

/** Invite-only import surface (`/import`). No admin / main-tree menu here. */
export function ImportHubPage({ me, onCommitted }: ImportHubPageProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [view, setView] = useState<"hub" | "import-preview">("hub");
  const [previewKey, setPreviewKey] = useState(0);
  const [lockedAfterSave, setLockedAfterSave] = useState(false);

  const isAdmin = me.role === "admin";
  const alreadyHasContribution = Boolean(me.contributionTreeId);
  const canImport = useMemo(() => {
    // Contributors: one save only. Admins may import again.
    if (isAdmin) return true;
    if (lockedAfterSave || alreadyHasContribution) return false;
    return true;
  }, [alreadyHasContribution, isAdmin, lockedAfterSave]);

  if (!canImport) {
    const status = me.contributionTreeStatus;
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p>
          Katkı ağacın zaten kaydedildi.
          {status === "submitted"
            ? " Onay bekleniyor."
            : status === "draft"
              ? " İstersen ana uygulamada düzenleyebilirsin."
              : ""}
        </p>
        <p className="muted">
          Aynı davetle ikinci bir katkı ağacı oluşturulamaz. Yeni import için bir
          yönetici gerekir.
        </p>
        <p>
          <a href="/">Gösterge paneline git</a>
        </p>
      </div>
    );
  }

  return (
    <div className={view === "import-preview" ? "app" : "app app--centered"}>
      {view === "hub" && (
        <>
          <h1>Shejera</h1>
          <p className="muted">Davetinle içe aktarmaya başla.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setImportDialogOpen(true)}
          >
            İçe aktarmayı başlat
          </button>
        </>
      )}

      {view === "import-preview" && (
        <ImportPreviewPage
          key={previewKey}
          onBack={() => setView("hub")}
          onOpenImport={() => setImportDialogOpen(true)}
          onCommitted={async (treeId) => {
            await onCommitted(treeId);
            setLockedAfterSave(true);
            setView("hub");
          }}
        />
      )}

      {importDialogOpen && (
        <ImportDialog
          onClose={() => setImportDialogOpen(false)}
          onPreview={() => {
            setImportDialogOpen(false);
            setPreviewKey((k) => k + 1);
            setView("import-preview");
          }}
        />
      )}
    </div>
  );
}
