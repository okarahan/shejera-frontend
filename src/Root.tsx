import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import type { MeResponse, TreeResponse } from "./api/types";
import App from "./App";
import { InvitePage } from "./components/InvitePage";
import { ImportHubPage } from "./components/ImportHubPage";

function importTokenFromPath(): string | null {
  const match = window.location.pathname.match(/^\/import\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Root() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [trees, setTrees] = useState<TreeResponse[]>([]);
  const [activeTreeId, setActiveTreeIdState] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const importToken = importTokenFromPath();
  const isImportHubPath =
    window.location.pathname === "/import" ||
    window.location.pathname === "/import/";
  const isViewPath = window.location.pathname === "/view";

  const refreshSession = useCallback(async (nextMe?: MeResponse) => {
    const user = nextMe ?? (await api.getMe());
    const treeList = await api.listTrees();
    setMe(user);
    setTrees(treeList);
    const preferred =
      treeList.find((t) => t.kind === "main")?.id ?? treeList[0]?.id ?? null;
    setActiveTreeIdState((prev) => {
      const next =
        prev && treeList.some((t) => t.id === prev) ? prev : preferred;
      return next;
    });
    return user;
  }, []);

  useEffect(() => {
    // Import-first: `/` wird zum Import-Hub umgeleitet.
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/import");
    }
  }, []);

  useEffect(() => {
    // Any unknown route goes back to import hub (import focus).
    if (
      window.location.pathname !== "/view" &&
      !isImportHubPath &&
      !importToken
    ) {
      window.history.replaceState({}, "", "/import");
    }
  }, [importToken, isImportHubPath]);

  useEffect(() => {
    if (importToken) {
      setAuthLoading(false);
      return;
    }
    if (me) {
      setAuthLoading(false);
      return;
    }
    refreshSession()
      .catch((err) => {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setAuthError("Invite-Link erforderlich.");
        } else {
          setAuthError(
            err instanceof Error ? err.message : "Auth fehlgeschlagen",
          );
        }
        setMe(null);
      })
      .finally(() => setAuthLoading(false));
  }, [importToken, refreshSession, me]);

  if (importToken) {
    return (
      <InvitePage
        token={importToken}
        onRedeemed={(user) => {
          void refreshSession(user).then(() => {
            window.history.replaceState({}, "", "/import");
          });
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="app app--centered">
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (!me) {
    if (isImportHubPath) {
      return (
        <div className="app app--centered">
          <h1>Shejera</h1>
          <p className="error-banner">{authError ?? "Nicht angemeldet"}</p>
          <p className="muted">Bitte öffne deinen persönlichen Import-Invite.</p>
        </div>
      );
    }
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="error-banner">{authError ?? "Nicht angemeldet"}</p>
        <p className="muted">Bitte öffne deinen persönlichen Import-Invite.</p>
      </div>
    );
  }

  if (isImportHubPath) {
    return (
      <ImportHubPage
        me={me}
        onCommitted={async (treeId) => {
          await refreshSession(me);
          setActiveTreeIdState(treeId);
        }}
      />
    );
  }

  if (isViewPath) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="muted">`/view` ist später — aktuell Fokus: `/import`.</p>
      </div>
    );
  }

  return (
    <App
      me={me}
      trees={trees}
      activeTreeId={activeTreeId}
      onTreesChanged={async () => {
        await refreshSession(me);
      }}
      onSelectTree={(treeId) => {
        setActiveTreeIdState(treeId);
      }}
      onLogout={async () => {
        await api.logout();
        setMe(null);
        setTrees([]);
        setActiveTreeIdState(null);
        setAuthError("Abgemeldet. Öffne erneut deinen Einladungslink.");
      }}
    />
  );
}
