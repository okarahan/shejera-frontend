import { useEffect, useMemo } from "react";
import { setActiveTreeId } from "../api/client";
import type { MeResponse, TreeResponse } from "../api/types";
import { AccountMenu } from "./AccountMenu";
import { AppShell } from "./AppShell";
import { TreeWorkspace } from "./TreeWorkspace";

interface MainTreePageProps {
  me: MeResponse;
  trees: TreeResponse[];
  treeId: string;
  onLogout: () => Promise<void>;
}

/** Authelia-protected main tree at `/main/tree/{id}`. */
export function MainTreePage({
  me,
  trees,
  treeId,
  onLogout,
}: MainTreePageProps) {
  const tree = useMemo(
    () => trees.find((t) => t.id === treeId && t.kind === "main") ?? null,
    [treeId, trees],
  );

  useEffect(() => {
    setActiveTreeId(treeId);
  }, [treeId]);

  if (!tree) {
    return (
      <div className="app app--centered">
        <p className="error-banner">Ana ağaç bulunamadı.</p>
        <p>
          <a href="/">Yeniden dene</a>
        </p>
      </div>
    );
  }

  return (
    <AppShell
      me={me}
      section="dashboard"
      accountMenu={
        <AccountMenu
          me={me}
          treeName={tree.name}
          onLogout={() => void onLogout()}
        />
      }
    >
      <TreeWorkspace treeId={tree.id} canWrite={tree.canWrite} />
    </AppShell>
  );
}
