import { useEffect, useRef, useState } from "react";
import type { MeResponse, TreeResponse } from "../api/types";

interface AccountMenuProps {
  me: MeResponse;
  trees: TreeResponse[];
  activeTreeId: string | null;
  onSubmitContribution: () => void;
  onSelectTree: (treeId: string) => void;
  onLogout: () => void;
}

export function AccountMenu({
  me,
  trees,
  activeTreeId,
  onSubmitContribution,
  onSelectTree,
  onLogout,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = trees.find((t) => t.id === activeTreeId);

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
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-menu__label">
          {me.displayName}
          {active ? ` · ${active.name}` : ""}
        </span>
        <span className="account-menu__caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="account-menu__dropdown" role="menu">
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
              {tree.kind === "main" ? "Ana ağaç" : "Katkı"}: {tree.name}
              {tree.id === activeTreeId ? " ✓" : ""}
            </button>
          ))}
          {active?.kind === "contribution" &&
            active.status === "draft" &&
            active.canWrite && (
              <>
                <hr className="app-menu__sep" />
                <button
                  type="button"
                  className="app-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSubmitContribution();
                  }}
                >
                  Katkıyı gönder
                </button>
              </>
            )}
          <hr className="app-menu__sep" />
          <button
            type="button"
            className="app-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
