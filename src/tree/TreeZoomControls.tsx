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
  const percent = Math.round(zoom * 100);
  const atDefault = percent === 100;

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
      <span className="tree-zoom__value" aria-live="polite">
        {percent}%
      </span>
      <button
        type="button"
        className="tree-zoom__btn"
        aria-label="Yakınlaştır"
        disabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      >
        +
      </button>
      <button
        type="button"
        className="tree-zoom__btn tree-zoom__btn--reset"
        aria-label="Yakınlaştırmayı %100 yap"
        title="100%"
        disabled={atDefault}
        onClick={onReset}
      >
        100%
      </button>
    </div>
  );
}
