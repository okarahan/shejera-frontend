import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import type { MeResponse, TreeResponse } from "./api/types";
import App from "./App";
import { AdminPage, type AdminSection } from "./components/AdminPage";
import { InvitePage } from "./components/InvitePage";
import { ImportHubPage } from "./components/ImportHubPage";

function importTokenFromPath(): string | null {
  const match = window.location.pathname.match(/^\/import\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function adminSectionFromPath(): AdminSection | null {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/admin") return "list"; // redirect handled below
  if (path === "/admin/list") return "list";
  if (path === "/admin/invite") return "invite";
  return null;
}

/**
 * - `/` — Dashboard (main tree)
 * - `/admin` → `/admin/list`, `/admin/invite`
 * - `/import` — invite/import hub
 * - `/view` — later read-only
 */
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
  const isViewPath =
    window.location.pathname === "/view" ||
    window.location.pathname === "/view/";
  const adminSection = adminSectionFromPath();
  const isAdminPath = adminSection !== null || window.location.pathname.startsWith("/admin");
  const isMainPath =
    window.location.pathname === "/" || window.location.pathname === "";

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
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path === "/admin") {
      window.history.replaceState({}, "", "/admin/list");
    }
  }, []);

  useEffect(() => {
    if (importToken) {
      setAuthLoading(false);
      return;
    }
    if (isViewPath) {
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
          setAuthError(
            isImportHubPath
              ? "Davet bağlantısı gerekli."
              : "Shejera oturumu yok (yönetici davetini bir kez kabul edin).",
          );
        } else {
          setAuthError(
            err instanceof Error ? err.message : "Kimlik doğrulama başarısız",
          );
        }
        setMe(null);
      })
      .finally(() => setAuthLoading(false));
  }, [importToken, refreshSession, me, isImportHubPath, isViewPath]);

  if (importToken) {
    return (
      <InvitePage
        token={importToken}
        onRedeemed={(user) => {
          void refreshSession(user).then(() => {
            window.location.replace("/import");
          });
        }}
      />
    );
  }

  if (isViewPath) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="muted">
          <code>/view</code> daha sonra gelecek (salt okunur). Ana ekran:{" "}
          <a href="/">/</a>
        </p>
      </div>
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
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="error-banner">{authError ?? "Oturum açılmadı"}</p>
        <p className="muted">
          {isImportHubPath
            ? "Lütfen kişisel davet bağlantını aç."
            : "Yerel: backend + yönetici oturumu. Canlıda: Authelia `/` önünde."}
        </p>
      </div>
    );
  }

  if (isImportHubPath) {
    return (
      <ImportHubPage
        me={me}
        onCommitted={async (treeId) => {
          await refreshSession();
          setActiveTreeIdState(treeId);
        }}
      />
    );
  }

  if (isAdminPath) {
    const section = adminSectionFromPath() ?? "list";
    return <AdminPage me={me} section={section} />;
  }

  if (isMainPath) {
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
          setAuthError("Çıkış yapıldı.");
        }}
      />
    );
  }

  return (
    <div className="app app--centered">
      <h1>Shejera</h1>
      <p className="muted">
        Bilinmeyen yol. <a href="/">Gösterge paneline</a> veya{" "}
        <a href="/import">İçe aktarmaya</a>.
      </p>
    </div>
  );
}
