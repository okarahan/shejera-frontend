import { useRef, useState } from "react";
import { api } from "../api/client";
import type { ImportUploadResponse } from "../api/types";

type Phase = "pick" | "uploaded" | "processing" | "done" | "error";

type StepStatus = "pending" | "current" | "done";

const STEPS = ["Dosya seç", "Yükle", "İşleme başla"] as const;

interface ImportDialogProps {
  onClose: () => void;
  onPreview: () => void;
}

function stepStatuses(
  phase: Phase,
  hasFile: boolean,
  uploading: boolean,
): StepStatus[] {
  if (phase === "done") {
    return ["done", "done", "done"];
  }
  if (phase === "processing" || phase === "error") {
    return ["done", "done", phase === "error" ? "current" : "current"];
  }
  if (phase === "uploaded") {
    return ["done", "done", "current"];
  }
  // pick
  if (uploading) {
    return ["done", "current", "pending"];
  }
  if (hasFile) {
    return ["done", "current", "pending"];
  }
  return ["current", "pending", "pending"];
}

function ImportStepper({ statuses }: { statuses: StepStatus[] }) {
  return (
    <ol className="import-stepper" aria-label="Import adımları">
      {STEPS.map((label, index) => {
        const status = statuses[index];
        const lineFilled = statuses[index] === "done";

        return (
          <li
            key={label}
            className={`import-stepper__step import-stepper__step--${status}`}
          >
            <div className="import-stepper__row">
              <span className="import-stepper__dot" aria-hidden>
                {status === "done" ? "✓" : index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`import-stepper__line${lineFilled ? " import-stepper__line--done" : ""}`}
                  aria-hidden
                />
              )}
            </div>
            <span className="import-stepper__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ImportDialog({ onClose, onPreview }: ImportDialogProps) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<ImportUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || phase === "processing";
  const statuses = stepStatuses(phase, Boolean(file), uploading);

  async function handleUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadImportImage(file);
      setUpload(result);
      setPhase("uploaded");
    } catch (err) {
      setUpload(null);
      setPhase("pick");
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  async function handleStartProcessing() {
    if (phase !== "uploaded") return;
    setPhase("processing");
    setError(null);
    setProgress(5);
    setSummary(null);

    let tickId = 0;
    tickId = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 92) return value;
        return value + Math.max(1, Math.round((92 - value) * 0.04));
      });
    }, 400);

    try {
      const result = await api.scanImport();
      window.clearInterval(tickId);
      setProgress(100);
      setSummary(
        `${result.personCount} kişi, ${result.familyCount} aile (${result.recognizer})`,
      );
      setPhase("done");
    } catch (err) {
      window.clearInterval(tickId);
      setProgress(0);
      const message = err instanceof Error ? err.message : "İşleme başarısız";
      setError(
        message.includes("aborted") || message.includes("Timeout")
          ? "İşleme zaman aşımına uğradı. Backend çalışıyor mu?"
          : message || "İşleme başarısız (sunucu hatası).",
      );
      setPhase("error");
    }
  }

  function handleFileChange(next: File | null) {
    setFile(next);
    setUpload(null);
    setError(null);
    setSummary(null);
    setProgress(0);
    setPhase("pick");
    if (!next && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="modal modal--import"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="import-dialog-title" className="modal__title">
            Soy ağacı importu
          </h2>
          <button
            type="button"
            className="btn btn--ghost modal__close"
            onClick={onClose}
            aria-label="Kapat"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <ImportStepper statuses={statuses} />

        <div className="import-dialog__body">
          {(phase === "pick" || phase === "uploaded") && (
            <>
              {error && phase === "pick" && (
                <p className="person-form__error">{error}</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              <div className="file-picker">
                <button
                  type="button"
                  className="btn btn--file-select"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || phase === "uploaded"}
                >
                  Dosya seç
                </button>
                <span className="file-picker__name">
                  {file?.name ?? "Dosya seçilmedi"}
                </span>
              </div>

              {phase === "uploaded" && upload && (
                <p className="import-dialog__uploaded" role="status">
                  <span className="import-dialog__check" aria-hidden>
                    ✓
                  </span>
                  <span>
                    <strong>Yüklendi</strong>
                    {upload.originalFileName
                      ? ` — ${upload.originalFileName}`
                      : ""}
                  </span>
                </p>
              )}
            </>
          )}

          {(phase === "processing" || phase === "done" || phase === "error") && (
            <>
              {phase === "error" ? (
                <p className="person-form__error">{error}</p>
              ) : phase === "done" ? (
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
                  Görsel analiz ediliyor… Bu birkaç dakika sürebilir.
                </p>
              )}

              <div
                className={`progress${phase === "done" ? " progress--success" : ""}${phase === "error" ? " progress--error" : ""}`}
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
                {phase === "error"
                  ? "Başarısız"
                  : phase === "done"
                    ? "100% — başarılı"
                    : `${progress}%`}
              </p>
            </>
          )}
        </div>

        <div className="person-form__actions import-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            İptal
          </button>

          {phase === "pick" && (
            <button
              type="button"
              className="btn btn--upload"
              onClick={() => void handleUpload()}
              disabled={!file || uploading}
            >
              {uploading ? "…" : "Yükle"}
            </button>
          )}

          {phase === "uploaded" && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleStartProcessing()}
            >
              İşleme başla
            </button>
          )}

          {(phase === "done" || phase === "error") && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onPreview}
              disabled={phase !== "done"}
            >
              Önizleme
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
