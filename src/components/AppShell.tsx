import { useEffect, useState, type ReactNode } from "react";
import type { MeResponse } from "../api/types";

export type AppShellSection = "dashboard" | "admin-list" | "admin-invite";

interface AppShellProps {
  me: MeResponse;
  section: AppShellSection;
  accountMenu?: ReactNode;
  children: ReactNode;
  defaultNavOpen?: boolean;
}

function pathFor(section: AppShellSection): string {
  switch (section) {
    case "dashboard":
      return "/";
    case "admin-list":
      return "/admin/list";
    case "admin-invite":
      return "/admin/invite";
  }
}

export function AppShell({
  me,
  section,
  accountMenu,
  children,
  defaultNavOpen = false,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(defaultNavOpen);
  const adminActive =
    section === "admin-list" || section === "admin-invite";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app app-shell${navOpen ? " app-shell--nav-open" : ""}`}>
      <header className="header app-shell__header">
        <div className="app-shell__header-start">
          <button
            type="button"
            className="app-shell__menu-btn"
            aria-expanded={navOpen}
            aria-controls="app-shell-nav"
            aria-label={navOpen ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="app-menu__icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          <a className="header__title app-shell__brand" href="/">
            Shejera
          </a>
        </div>
        <div className="app-shell__header-end">
          {accountMenu ?? (
            <span className="muted app-shell__user">{me.displayName}</span>
          )}
        </div>
      </header>

      {navOpen && (
        <button
          type="button"
          className="app-shell__backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        id="app-shell-nav"
        className="app-shell__nav"
        aria-hidden={!navOpen}
      >
        <nav className="app-shell__nav-inner" aria-label="Ana menü">
          <a
            className={`app-shell__nav-link${section === "dashboard" ? " app-shell__nav-link--active" : ""}`}
            href={pathFor("dashboard")}
          >
            Gösterge paneli
          </a>

          {me.canManageInvites ? (
            <div className="app-shell__nav-group">
              <a
                className={`app-shell__nav-link${adminActive ? " app-shell__nav-link--active" : ""}`}
                href="/admin/list"
              >
                Yönetici
              </a>
              <div className="app-shell__nav-sub" role="group" aria-label="Yönetici">
                <a
                  className={`app-shell__nav-sublink${section === "admin-list" ? " app-shell__nav-sublink--active" : ""}`}
                  href="/admin/list"
                >
                  Liste
                </a>
                <a
                  className={`app-shell__nav-sublink${section === "admin-invite" ? " app-shell__nav-sublink--active" : ""}`}
                  href="/admin/invite"
                >
                  Davet et
                </a>
              </div>
            </div>
          ) : (
            <span className="app-shell__nav-link app-shell__nav-link--disabled">
              Yönetici
            </span>
          )}
        </nav>
      </aside>

      <div className="app-shell__content">{children}</div>
    </div>
  );
}
