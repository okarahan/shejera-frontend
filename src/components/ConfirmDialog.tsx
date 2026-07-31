import type { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function ConfirmDialog({
  title,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="modal modal--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="confirm-dialog-title" className="modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--ghost modal__close"
            onClick={onCancel}
            aria-label="Kapat"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="confirm-dialog__body">{children}</div>

        <div className="person-form__actions import-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
