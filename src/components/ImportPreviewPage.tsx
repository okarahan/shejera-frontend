import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { RecognizedTree } from "../api/types";
import { FamilyTree, measureFamilyTreeSize } from "../tree/FamilyTree";
import { TreeCanvas } from "../tree/TreeCanvas";
import { buildRecognizedTreeGraph } from "../tree/recognizedToGraph";
import { TreeZoomControls } from "../tree/TreeZoomControls";
import { useTreeCanvas, ZOOM_STEP } from "../tree/useZoom";
import { ConfirmDialog } from "./ConfirmDialog";

interface ImportPreviewPageProps {
  onBack: () => void;
  onOpenImport: () => void;
  onCommitted: (treeId: string) => void | Promise<void>;
}

export function ImportPreviewPage({
  onBack,
  onOpenImport,
  onCommitted,
}: ImportPreviewPageProps) {
  const [tree, setTree] = useState<RecognizedTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const {
    zoom,
    pan,
    setPan,
    zoomIn,
    zoomOut,
    zoomToPoint,
    resetView,
    applyFitIfNeeded,
    markUserAdjusted,
    suppressClickRef,
  } = useTreeCanvas(1);

  useEffect(() => {
    setLoading(true);
    api
      .getImportPreview()
      .then(setTree)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Önizleme yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, []);

  const graph = useMemo(
    () => (tree ? buildRecognizedTreeGraph(tree) : null),
    [tree],
  );

  const treeSize = useMemo(
    () => (graph ? measureFamilyTreeSize(graph, "root") : { width: 0, height: 0 }),
    [graph],
  );

  useEffect(() => {
    const el = treeAreaRef.current;
    if (!el || !graph || graph.nodes.length === 0) return;

    const updateFit = () => {
      applyFitIfNeeded(
        treeSize.width,
        treeSize.height,
        el.clientWidth,
        el.clientHeight,
      );
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [applyFitIfNeeded, graph, treeSize.height, treeSize.width]);

  const handleResetZoom = useCallback(() => {
    const el = treeAreaRef.current;
    if (!el) return;
    resetView(treeSize.width, treeSize.height, el.clientWidth, el.clientHeight);
  }, [resetView, treeSize.height, treeSize.width]);

  const handleZoomIn = useCallback(() => {
    const el = treeAreaRef.current;
    if (!el) {
      zoomIn();
      return;
    }
    zoomToPoint(el.clientWidth / 2, el.clientHeight / 2, zoom + ZOOM_STEP);
  }, [zoom, zoomIn, zoomToPoint]);

  const handleZoomOut = useCallback(() => {
    const el = treeAreaRef.current;
    if (!el) {
      zoomOut();
      return;
    }
    zoomToPoint(el.clientWidth / 2, el.clientHeight / 2, zoom - ZOOM_STEP);
  }, [zoom, zoomOut, zoomToPoint]);

  async function handleCommit() {
    if (saved || committing) return;
    setCommitting(true);
    setError(null);
    try {
      const result = await api.commitImport();
      setSaved(true);
      setConfirmOpen(false);
      await onCommitted(result.treeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="import-preview">
      <div className="import-preview__header">
        <div className="import-preview__toolbar">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ← Ağaca dön
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={saved}
            onClick={onOpenImport}
          >
            Tekrar içe aktar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saved || committing || !tree || tree.people.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {committing ? "Kaydediliyor…" : saved ? "Kaydedildi" : "Kaydet"}
          </button>
        </div>
        <h1 className="import-preview__title">İçe aktarma önizlemesi</h1>
        <p className="muted import-preview__subtitle">
          {saved
            ? "Katkı ağacı kaydedildi. Düzenleme ekranına geçiliyor…"
            : "Kayıt kalıcı bir katkı ağacı taslağı oluşturur (ana ağaç değil). Bir kez kaydedilir."}
          {!saved && tree
            ? ` ${tree.people.length} kişi, ${tree.families.length} aile tanındı.`
            : ""}
        </p>
      </div>

      {loading && <p className="import-preview__status">Yükleniyor…</p>}
      {error && <p className="person-form__error">{error}</p>}

      {!loading && !error && graph && graph.nodes.length === 0 && (
        <p className="muted import-preview__status">
          Önizlenecek kişi bulunamadı.
        </p>
      )}

      {graph && graph.nodes.length > 0 && (
        <div className="import-preview__tree-wrap">
          <TreeZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetZoom}
          />
          <TreeCanvas
            viewportRef={treeAreaRef}
            className="import-preview__tree"
            zoom={zoom}
            pan={pan}
            onPanChange={setPan}
            onZoomToPoint={zoomToPoint}
            onUserInteract={markUserAdjusted}
            suppressClickRef={suppressClickRef}
            contentWidth={treeSize.width}
            contentHeight={treeSize.height}
          >
            <FamilyTree
              graph={graph}
              selectedId={null}
              focusId="root"
              suppressClickRef={suppressClickRef}
              onSelect={() => {}}
            />
          </TreeCanvas>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Katkı ağacını kaydet"
          confirmLabel="Evet, kaydet"
          cancelLabel="Vazgeç"
          busy={committing}
          onCancel={() => {
            if (!committing) setConfirmOpen(false);
          }}
          onConfirm={() => void handleCommit()}
        >
          <p>
            Tanınan kişiler ve aileler kalıcı bir katkı ağacı olarak
            kaydedilecek. Devam edilsin mi?
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
