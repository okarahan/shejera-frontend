import { useEffect, useRef, useState } from "react";
import type { MeResponse } from "../api/types";

interface AccountMenuProps {
  me: MeResponse;
  treeName?: string | null;
  onLogout: () => void;
}

/** Main-app account menu (Authelia `/`). No contribution trees here. */
export function AccountMenu({ me, treeName, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
          {treeName ? ` · ${treeName}` : ""}
        </span>
        <span className="account-menu__caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="account-menu__dropdown" role="menu">
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
