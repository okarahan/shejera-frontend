import { useCallback, useEffect, useState } from "react";
import { api, setActiveTreeId } from "./api/client";
import type { MeResponse, TreeResponse } from "./api/types";
import { AdminPage, type AdminSection } from "./components/AdminPage";
import { ContribHubPage } from "./components/ContribHubPage";
import { ContribTreePage } from "./components/ContribTreePage";
import { InvitePage } from "./components/InvitePage";
import { MainTreePage } from "./components/MainTreePage";

function adminSectionFromPath(): AdminSection | null {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/admin") return "list";
  if (path === "/admin/list") return "list";
  if (path === "/admin/invite") return "invite";
  return null;
}

function parsePath(): {
  kind:
    | "invite-token"
    | "contrib-hub"
    | "contrib-tree"
    | "main-tree"
    | "admin"
    | "root"
    | "view"
    | "unknown";
  token?: string;
  treeId?: string;
  adminSection?: AdminSection;
} {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/view") return { kind: "view" };

  const contribTree = path.match(/^\/contrib\/tree\/([^/]+)$/);
  if (contribTree) {
    return { kind: "contrib-tree", treeId: decodeURIComponent(contribTree[1]) };
  }

  const contribToken = path.match(/^\/contrib\/([^/]+)$/);
  if (contribToken && contribToken[1] !== "tree") {
    return { kind: "invite-token", token: decodeURIComponent(contribToken[1]) };
  }

  if (path === "/contrib") return { kind: "contrib-hub" };

  const mainTree = path.match(/^\/main\/tree\/([^/]+)$/);
  if (mainTree) {
    return { kind: "main-tree", treeId: decodeURIComponent(mainTree[1]) };
  }

  const admin = adminSectionFromPath();
  if (admin || path.startsWith("/admin")) {
    return { kind: "admin", adminSection: admin ?? "list" };
  }

  if (path === "/") return { kind: "root" };

  return { kind: "unknown" };
}

function pickContributionId(
  user: MeResponse,
  treeList: TreeResponse[],
  preferredTreeId?: string | null,
): string | null {
  if (preferredTreeId && treeList.some((t) => t.id === preferredTreeId)) {
    return preferredTreeId;
  }
  if (
    user.contributionTreeId &&
    treeList.some((t) => t.id === user.contributionTreeId)
  ) {
    return user.contributionTreeId;
  }
  return (
    treeList.find(
      (t) =>
        t.kind === "contribution" &&
        (t.status === "draft" || t.status === "submitted"),
    )?.id ?? null
  );
}

function contribLandingPath(
  user: MeResponse,
  treeList: TreeResponse[],
): string {
  const contribId = pickContributionId(user, treeList);
  return contribId ? `/contrib/tree/${contribId}` : "/contrib";
}

/**
 * - `/` → `/main/tree/{id}` (Authelia)
 * - `/main/tree/{id}` — main tree
 * - `/contrib` — contributor hub (→ tree if exists)
 * - `/contrib/{token}` — invite redeem → tree or hub
 * - `/contrib/tree/{id}` — contribution tree
 * - `/admin/*` — invites admin
 */
export default function Root() {
  const route = parsePath();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [trees, setTrees] = useState<TreeResponse[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isContribSurface =
    route.kind === "contrib-hub" ||
    route.kind === "contrib-tree" ||
    route.kind === "invite-token";

  const refreshSession = useCallback(async (nextMe?: MeResponse) => {
    const user = nextMe ?? (await api.getMe());
    const treeList = await api.listTrees();
    setMe(user);
    setTrees(treeList);
    return { user, treeList };
  }, []);

  const goContribLanding = useCallback(
    (user: MeResponse, treeList: TreeResponse[]) => {
      const path = contribLandingPath(user, treeList);
      const contribId = pickContributionId(user, treeList);
      setActiveTreeId(contribId);
      window.location.replace(path);
    },
    [],
  );

  const onInviteRedeemed = useCallback(
    (user: MeResponse) => {
      void refreshSession(user).then(({ user: u, treeList }) => {
        goContribLanding(u, treeList);
      });
    },
    [refreshSession, goContribLanding],
  );

  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, "") === "/admin") {
      window.history.replaceState({}, "", "/admin/list");
    }
  }, []);

  // Invite link: session → redeem + land; no session → InvitePage auto-redeems
  useEffect(() => {
    if (route.kind !== "invite-token" || !route.token) return;
    let cancelled = false;
    refreshSession()
      .then(async ({ user, treeList }) => {
        if (cancelled) return;
        try {
          const meAfter = await api.redeemInvite(route.token!);
          if (cancelled) return;
          const next = await refreshSession(meAfter);
          goContribLanding(next.user, next.treeList);
        } catch {
          if (cancelled) return;
          goContribLanding(user, treeList);
        }
      })
      .catch(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.kind, route.token, refreshSession, goContribLanding]);

  useEffect(() => {
    if (route.kind === "view" || route.kind === "invite-token") {
      if (route.kind !== "invite-token") setAuthLoading(false);
      return;
    }

    if (me) {
      setAuthLoading(false);
      return;
    }
    refreshSession()
      .then(({ user, treeList }) => {
        if (isContribSurface) {
          const contribId = pickContributionId(user, treeList);
          setActiveTreeId(contribId);
        } else {
          const mainId =
            treeList.find((t) => t.kind === "main")?.id ?? null;
          setActiveTreeId(mainId);
        }
      })
      .catch((err) => {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setAuthError(
            isContribSurface
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
  }, [refreshSession, me, isContribSurface, route.kind]);

  useEffect(() => {
    if (route.kind === "root" && me && trees.length > 0) {
      const mainId = trees.find((t) => t.kind === "main")?.id;
      if (mainId) {
        window.location.replace(`/main/tree/${mainId}`);
      }
    }
  }, [route.kind, me, trees]);

  // /contrib with session + existing tree → /contrib/tree/{id}
  useEffect(() => {
    if (route.kind !== "contrib-hub" || !me) return;
    const autoOpen =
      new URLSearchParams(window.location.search).get("reimport") === "1";
    if (autoOpen) return;
    const contribId = pickContributionId(me, trees);
    if (contribId) {
      window.location.replace(`/contrib/tree/${contribId}`);
    }
  }, [route.kind, me, trees]);

  if (route.kind === "invite-token" && route.token) {
    // Still loading existing-session redirect?
    if (authLoading || me) {
      return (
        <div className="app app--centered">
          <p>Yönlendiriliyor…</p>
        </div>
      );
    }
    return (
      <InvitePage token={route.token} onRedeemed={onInviteRedeemed} />
    );
  }

  if (route.kind === "view") {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="muted">
          <code>/view</code> daha sonra gelecek. Ana ekran: <a href="/">/</a>
        </p>
      </div>
    );
  }

  if (authLoading || (route.kind === "root" && me)) {
    return (
      <div className="app app--centered">
        <p>Yükleniyor…</p>
      </div>
    );
  }

  // Hub redirect in progress
  if (route.kind === "contrib-hub" && me) {
    const autoOpen =
      new URLSearchParams(window.location.search).get("reimport") === "1";
    const contribId = pickContributionId(me, trees);
    if (contribId && !autoOpen) {
      return (
        <div className="app app--centered">
          <p>Yönlendiriliyor…</p>
        </div>
      );
    }
  }

  if (!me) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="error-banner">{authError ?? "Oturum açılmadı"}</p>
        <p className="muted">
          {isContribSurface
            ? "Lütfen kişisel davet bağlantını aç."
            : "Yerel: backend + yönetici oturumu. Canlıda: Authelia `/` önünde."}
        </p>
      </div>
    );
  }

  if (route.kind === "contrib-hub") {
    const autoOpen =
      new URLSearchParams(window.location.search).get("reimport") === "1";
    return (
      <ContribHubPage
        me={me}
        trees={trees}
        autoOpenImport={autoOpen}
        onSessionChanged={async () => {
          const next = await refreshSession();
          const contribId = pickContributionId(next.user, next.treeList);
          setActiveTreeId(contribId);
          return { user: next.user, trees: next.treeList };
        }}
      />
    );
  }

  if (route.kind === "contrib-tree" && route.treeId) {
    return (
      <ContribTreePage
        me={me}
        trees={trees}
        treeId={route.treeId}
        onSessionChanged={async () => {
          const next = await refreshSession();
          setActiveTreeId(route.treeId!);
          return { user: next.user, trees: next.treeList };
        }}
      />
    );
  }

  if (route.kind === "admin") {
    return <AdminPage me={me} section={route.adminSection ?? "list"} />;
  }

  if (route.kind === "main-tree" && route.treeId) {
    return (
      <MainTreePage
        me={me}
        trees={trees}
        treeId={route.treeId}
        onLogout={async () => {
          await api.logout();
          setMe(null);
          setTrees([]);
          setActiveTreeId(null);
          setAuthError("Çıkış yapıldı.");
        }}
      />
    );
  }

  return (
    <div className="app app--centered">
      <h1>Shejera</h1>
      <p className="muted">
        Bilinmeyen yol. <a href="/">Ana ağaca</a> veya{" "}
        <a href="/contrib">Katkıya</a>.
      </p>
    </div>
  );
}
