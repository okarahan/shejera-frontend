import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ImportUploadResponse } from "../api/types";

interface ImportDialogProps {
  onClose: () => void;
  onStartProcessing: () => void;
}

export function ImportDialog({ onClose, onStartProcessing }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<ImportUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploaded = upload !== null;

  useEffect(() => {
    api
      .getImportStatus()
      .then((current) => {
        if (!current.hasUpload || !current.originalFileName) return;
        setUpload({
          originalFileName: current.originalFileName,
          storedFileName: current.storedFileName ?? "",
          storedPath: current.storedPath ?? "",
          uploadedAt: current.uploadedAt ?? "",
          sizeBytes: 0,
        });
      })
      .catch(() => {
        // Ignore status errors on open; user can still upload.
      });
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadImportImage(file);
      setUpload(result);
    } catch (err) {
      setUpload(null);
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(next: File | null) {
    setFile(next);
    setUpload(null);
    setError(null);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
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
            disabled={uploading}
          >
            ×
          </button>
        </div>

        <div className="import-dialog__body">
          <p className="muted">
            Soy ağacı görselini seçip yükleyin. &quot;İşleme başla&quot; ile
            backend gerçek taramayı başlatır.
          </p>

          {error && <p className="person-form__error">{error}</p>}

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
              disabled={uploading}
            >
              Dosya seç
            </button>
            <button
              type="button"
              className="btn btn--upload"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "…" : "Yükle"}
            </button>
            <span className="file-picker__name">
              {file?.name ??
                upload?.originalFileName ??
                "Dosya seçilmedi"}
            </span>
          </div>

          {uploaded && (
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
        </div>

        <div className="person-form__actions import-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            disabled={uploading}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onStartProcessing}
            disabled={!uploaded || uploading}
          >
            İşleme başla
          </button>
        </div>
      </div>
    </div>
  );
}
