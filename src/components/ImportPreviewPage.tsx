import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type { RecognizedTree } from "../api/types";
import { FamilyTree } from "../tree/FamilyTree";
import { layoutTree } from "../tree/layoutTree";
import { buildRecognizedTreeGraph } from "../tree/recognizedToGraph";
import { TreeZoomControls } from "../tree/TreeZoomControls";
import { useZoom } from "../tree/useZoom";

interface ImportPreviewPageProps {
  onBack: () => void;
  onOpenImport: () => void;
}

export function ImportPreviewPage({
  onBack,
  onOpenImport,
}: ImportPreviewPageProps) {
  const [tree, setTree] = useState<RecognizedTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const { zoom, zoomIn, zoomOut, resetZoom, applyFitIfNeeded } = useZoom(1);

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

  const treeLayout = useMemo(
    () => (graph ? layoutTree(graph.nodes, graph.edges) : null),
    [graph],
  );

  const treePadding = 64;
  const treeContentWidth = (treeLayout?.width ?? 0) + treePadding;
  const treeContentHeight = (treeLayout?.height ?? 0) + treePadding;

  useEffect(() => {
    const el = treeAreaRef.current;
    if (!el || !graph || graph.nodes.length === 0) return;

    const updateFit = () => {
      applyFitIfNeeded(
        treeContentWidth,
        treeContentHeight,
        el.clientWidth,
        el.clientHeight,
      );
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    applyFitIfNeeded,
    graph,
    treeContentWidth,
    treeContentHeight,
  ]);

  const handleResetZoom = useCallback(() => {
    const el = treeAreaRef.current;
    if (!el) return;
    resetZoom(
      treeContentWidth,
      treeContentHeight,
      el.clientWidth,
      el.clientHeight,
    );
  }, [resetZoom, treeContentWidth, treeContentHeight]);

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
            onClick={onOpenImport}
          >
            Importu düzenle
          </button>
        </div>

        <h2 className="import-preview__title">İşlenen soy ağacı önizlemesi</h2>
        <p className="muted import-preview__subtitle">
          Bu aşamada ağaç henüz kaydedilmez.
          {tree
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
        <div className="import-preview__tree" ref={treeAreaRef}>
          <TreeZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={handleResetZoom}
          />
          <div className="tree-viewport">
            <FamilyTree
              graph={graph}
              selectedId={null}
              zoom={zoom}
              onSelect={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
