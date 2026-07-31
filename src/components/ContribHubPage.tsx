import { useEffect, useMemo, useState } from "react";
import { setActiveTreeId } from "../api/client";
import type { MeResponse, TreeResponse } from "../api/types";
import { ImportDialog } from "./ImportDialog";

interface ContribHubPageProps {
  me: MeResponse;
  trees: TreeResponse[];
  /** Open import dialog immediately (e.g. after Tekrar içe aktar). */
  autoOpenImport?: boolean;
  onSessionChanged: () => Promise<{
    user: MeResponse;
    trees: TreeResponse[];
  }>;
}

function pickOwnContribution(
  me: MeResponse,
  trees: TreeResponse[],
): TreeResponse | null {
  if (me.contributionTreeId) {
    const mine = trees.find((t) => t.id === me.contributionTreeId);
    if (mine) return mine;
  }
  return (
    trees.find(
      (t) =>
        t.kind === "contribution" &&
        (t.status === "draft" || t.status === "submitted") &&
        (me.role === "admin" || t.contributorUserId === me.id),
    ) ??
    trees.find(
      (t) =>
        t.kind === "contribution" &&
        (t.status === "draft" || t.status === "submitted"),
    ) ??
    null
  );
}

/** Invite home at `/contrib`: import CTA or redirect to existing tree. */
export function ContribHubPage({
  me,
  trees,
  autoOpenImport = false,
  onSessionChanged,
}: ContribHubPageProps) {
  const existing = useMemo(() => pickOwnContribution(me, trees), [me, trees]);
  const [importDialogOpen, setImportDialogOpen] = useState(autoOpenImport);

  useEffect(() => {
    if (autoOpenImport) {
      window.history.replaceState({}, "", "/contrib");
    }
  }, [autoOpenImport]);

  useEffect(() => {
    if (existing) {
      window.location.replace(`/contrib/tree/${existing.id}`);
    }
  }, [existing]);

  if (existing) {
    return (
      <div className="app app--centered">
        <p>Yönlendiriliyor…</p>
      </div>
    );
  }

  return (
    <div className="app app--centered">
      <h1>Shejera</h1>
      <p className="muted">Davetinle soy ağacı katkına başla.</p>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => setImportDialogOpen(true)}
      >
        İçe aktar
      </button>

      {importDialogOpen && (
        <ImportDialog
          onClose={() => setImportDialogOpen(false)}
          onCommitted={async (treeId) => {
            setActiveTreeId(treeId);
            await onSessionChanged();
            window.location.assign(`/contrib/tree/${treeId}`);
          }}
        />
      )}
    </div>
  );
}
