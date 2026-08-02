import { useCallback, useEffect, useMemo, useState } from "react";
import { api, setActiveTreeId } from "../api/client";
import type { MeResponse, TreeResponse } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { TreeWorkspace } from "./TreeWorkspace";

interface ContribTreePageProps {
  me: MeResponse;
  trees: TreeResponse[];
  treeId: string;
  onSessionChanged: () => Promise<{
    user: MeResponse;
    trees: TreeResponse[];
  }>;
}

/** Contribution tree editor at `/contrib/tree/{id}` (invite JWT). */
export function ContribTreePage({
  me,
  trees,
  treeId,
  onSessionChanged,
}: ContribTreePageProps) {
  const [localTrees, setLocalTrees] = useState(trees);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [reimportConfirmOpen, setReimportConfirmOpen] = useState(false);
  const [reimportBusy, setReimportBusy] = useState(false);

  useEffect(() => {
    setLocalTrees(trees);
  }, [trees]);

  const tree = useMemo(
    () =>
      localTrees.find((t) => t.id === treeId && t.kind === "contribution") ??
      null,
    [localTrees, treeId],
  );

  const status = tree?.status ?? me.contributionTreeStatus ?? null;
  // Prefer API canWrite; fall back for draft when list is briefly stale after commit.
  const canWrite = Boolean(
    tree?.canWrite ?? (status === "draft" && tree?.kind === "contribution"),
  );

  useEffect(() => {
    setActiveTreeId(treeId);
  }, [treeId]);

  const refresh = useCallback(async () => {
    const next = await onSessionChanged();
    setLocalTrees(next.trees);
    return next;
  }, [onSessionChanged]);

  async function handleSubmit() {
    if (!canWrite || submitBusy) return;
    setSubmitBusy(true);
    try {
      setActiveTreeId(treeId);
      await api.submitContributionTree(treeId);
      setSubmitConfirmOpen(false);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Gönderme başarısız");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handleReimport() {
    if (!canWrite || reimportBusy) return;
    setReimportBusy(true);
    try {
      setActiveTreeId(treeId);
      await api.discardContributionTree(treeId);
      setReimportConfirmOpen(false);
      window.location.replace("/contrib?reimport=1");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Silme başarısız");
      setReimportBusy(false);
    }
  }

  if (!tree) {
    return (
      <div className="app app--centered">
        <p className="error-banner">Katkı ağacı bulunamadı.</p>
        <p>
          <a href="/contrib">Katkı sayfasına dön</a>
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <TreeWorkspace
        treeId={treeId}
        canWrite={canWrite && status === "draft"}
        emptyTitle="Katkı ağacı"
        emptyHint="Önce bir görsel içe aktar."
        toolbar={
          <div className="import-editor__toolbar">
            <div className="import-editor__toolbar-start">
              <h1 className="import-editor__title">{tree.name}</h1>
              <p className="muted import-editor__status">
                {status === "submitted"
                  ? "Gönderildi — salt okunur"
                  : "Taslak — ana ağaç gibi düzenleyebilirsin"}
              </p>
            </div>
            <div className="import-editor__toolbar-actions">
              {status === "draft" && (
                <>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setReimportConfirmOpen(true)}
                  >
                    Tekrar içe aktar
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={submitBusy || !canWrite}
                    onClick={() => setSubmitConfirmOpen(true)}
                  >
                    Katkıyı gönder
                  </button>
                </>
              )}
            </div>
          </div>
        }
      />

      {submitConfirmOpen && (
        <ConfirmDialog
          title="Katkıyı gönder"
          confirmLabel="Evet, gönder"
          cancelLabel="Vazgeç"
          busy={submitBusy}
          onCancel={() => {
            if (!submitBusy) setSubmitConfirmOpen(false);
          }}
          onConfirm={() => void handleSubmit()}
        >
          <p className="confirm-dialog__lead">
            Katkı ağacını göndermek istediğinize emin misiniz?
          </p>
          <p className="confirm-dialog__note">
            Gönderildikten sonra düzenleme yapılamaz.
          </p>
        </ConfirmDialog>
      )}

      {reimportConfirmOpen && (
        <ConfirmDialog
          title="Tekrar içe aktar"
          confirmLabel="Evet, sil ve yeniden başla"
          cancelLabel="Vazgeç"
          busy={reimportBusy}
          onCancel={() => {
            if (!reimportBusy) setReimportConfirmOpen(false);
          }}
          onConfirm={() => void handleReimport()}
        >
          <p className="confirm-dialog__lead">
            Mevcut katkı ağacı silinip yeniden içe aktarma başlar.
          </p>
          <p className="confirm-dialog__note">
            Bu taslak ve tüm kişileri kalıcı olarak silinir.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
