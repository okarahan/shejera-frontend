import { useEffect, useState } from "react";
import { api } from "../api/client";

interface ImportProcessingDialogProps {
  onClose: () => void;
  onPreview: () => void;
}

export function ImportProcessingDialog({
  onClose,
  onPreview,
}: ImportProcessingDialogProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tickId = 0;

    async function run() {
      setError(null);
      setDone(false);
      setProgress(5);

      tickId = window.setInterval(() => {
        setProgress((value) => {
          if (value >= 92) return value;
          return value + Math.max(1, Math.round((92 - value) * 0.04));
        });
      }, 400);

      try {
        const result = await api.scanImport();
        if (cancelled) return;
        window.clearInterval(tickId);
        setProgress(100);
        setSummary(
          `${result.personCount} kişi, ${result.familyCount} aile (${result.recognizer})`,
        );
        setDone(true);
      } catch (err) {
        if (cancelled) return;
        window.clearInterval(tickId);
        setProgress(0);
        const message =
          err instanceof Error ? err.message : "İşleme başarısız";
        setError(
          message.includes("aborted") || message.includes("Timeout")
            ? "İşleme zaman aşımına uğradı. Backend çalışıyor mu?"
            : message,
        );
      }
    }

    void run();

    return () => {
      cancelled = true;
      window.clearInterval(tickId);
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-processing-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="import-processing-title" className="modal__title">
            Görsel işleniyor
          </h2>
          <button
            type="button"
            className="btn btn--ghost modal__close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="import-dialog__body">
          {error ? (
            <p className="person-form__error">{error}</p>
          ) : done ? (
            <p className="import-dialog__uploaded" role="status">
              <span className="import-dialog__check" aria-hidden>
                ✓
              </span>
              <span>
                <strong>İşleme tamamlandı</strong>
                {summary ? ` — ${summary}` : ""}
              </span>
            </p>
          ) : (
            <p className="muted">
              Backend görseli OpenCV/Tesseract ile analiz ediyor… Bu birkaç
              dakika sürebilir.
            </p>
          )}

          <div
            className={`progress${done ? " progress--success" : ""}${error ? " progress--error" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="İşleme durumu"
          >
            <div
              className="progress__bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress__label">
            {error ? "Başarısız" : done ? "100% — başarılı" : `${progress}%`}
          </p>
        </div>

        <div className="person-form__actions import-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onPreview}
            disabled={!done}
          >
            Önizleme
          </button>
        </div>
      </div>
    </div>
  );
}
