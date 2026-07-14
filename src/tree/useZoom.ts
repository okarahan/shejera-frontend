import { useCallback, useState } from "react";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;

export function useZoom(initial = 1) {
  const [zoom, setZoom] = useState(initial);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.round((z + ZOOM_STEP) * 10) / 10;
      return Math.min(MAX_ZOOM, next);
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.round((z - ZOOM_STEP) * 10) / 10;
      return Math.max(MIN_ZOOM, next);
    });
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, zoomIn, zoomOut, resetZoom };
}
