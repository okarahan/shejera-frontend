import { useEffect, useRef, useState } from "react";
import type { MeResponse, TreeResponse } from "../api/types";

interface AppMenuProps {
  me: MeResponse;
  trees: TreeResponse[];
  activeTreeId: string | null;
  onImport: () => void;
  onInvites: () => void;
  onCreateContribution: () => void;
  onSubmitContribution: () => void;
  onSelectTree: (treeId: string) => void;
  onLogout: () => void;
}

export function AppMenu({
  me,
  trees,
  activeTreeId,
  onImport,
  onInvites,
  onCreateContribution,
  onSubmitContribution,
  onSelectTree,
  onLogout,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = trees.find((t) => t.id === activeTreeId);
  const canImport =
    me.role === "admin" ||
    !me.contributionTreeId ||
    me.contributionTreeStatus === "draft";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="app-menu" ref={rootRef}>
      <div className="app-menu__meta">
        <span className="muted">
          {me.displayName}
          {active ? ` · ${active.name}` : ""}
        </span>
      </div>
      <button
        type="button"
        className="app-menu__toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menü"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-menu__icon" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      {open && (
        <div className="app-menu__dropdown" role="menu">
          {trees.map((tree) => (
            <button
              key={tree.id}
              type="button"
              className="app-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelectTree(tree.id);
              }}
            >
              {tree.kind === "main" ? "Hauptbaum" : "Beitrag"}: {tree.name}
              {tree.id === activeTreeId ? " ✓" : ""}
            </button>
          ))}
          <hr className="app-menu__sep" />
          {canImport && (
            <button
              type="button"
              className="app-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onImport();
              }}
            >
              Import
            </button>
          )}
          <button
            type="button"
            className="app-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCreateContribution();
            }}
          >
            Beitragsbaum anlegen
          </button>
          {active?.kind === "contribution" && active.status === "draft" && active.canWrite && (
            <button
              type="button"
              className="app-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSubmitContribution();
              }}
            >
              Beitrag einreichen
            </button>
          )}
          {me.canManageInvites && (
            <button
              type="button"
              className="app-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onInvites();
              }}
            >
              Einladungen
            </button>
          )}
          <button
            type="button"
            className="app-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
