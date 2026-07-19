import { useEffect, useRef, useState } from "react";

interface AppMenuProps {
  onImport: () => void;
}

export function AppMenu({ onImport }: AppMenuProps) {
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
    <div className="app-menu" ref={rootRef}>
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
        </div>
      )}
    </div>
  );
}
