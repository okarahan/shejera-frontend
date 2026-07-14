import { MAX_ZOOM, MIN_ZOOM } from "./useZoom";

interface TreeZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function TreeZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: TreeZoomControlsProps) {
  return (
    <div className="tree-zoom" role="group" aria-label="Yakınlaştırma">
      <button
        type="button"
        className="tree-zoom__btn"
        aria-label="Uzaklaştır"
        disabled={zoom <= MIN_ZOOM}
        onClick={onZoomOut}
      >
        −
      </button>
      <button
        type="button"
        className="tree-zoom__btn tree-zoom__btn--label"
        aria-label="Yakınlaştırmayı sıfırla"
        onClick={onReset}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className="tree-zoom__btn"
        aria-label="Yakınlaştır"
        disabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      >
        +
      </button>
    </div>
  );
}
