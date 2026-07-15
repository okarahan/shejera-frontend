import { useCallback, useRef, useState } from "react";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

export function calcFitZoom(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 48,
): number {
  if (contentWidth <= 0 || contentHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return 1;
  }

  const scaleX = (viewportWidth - padding) / contentWidth;
  const scaleY = (viewportHeight - padding) / contentHeight;
  const scale = Math.min(scaleX, scaleY);

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export function useZoom(initial = 1) {
  const [zoom, setZoom] = useState(initial);
  const userAdjustedRef = useRef(false);

  const zoomIn = useCallback(() => {
    userAdjustedRef.current = true;
    setZoom((z) => {
      const next = Math.round((z + ZOOM_STEP) * 10) / 10;
      return Math.min(MAX_ZOOM, next);
    });
  }, []);

  const zoomOut = useCallback(() => {
    userAdjustedRef.current = true;
    setZoom((z) => {
      const next = Math.round((z - ZOOM_STEP) * 10) / 10;
      return Math.max(MIN_ZOOM, next);
    });
  }, []);

  const fitZoom = useCallback(
    (
      contentWidth: number,
      contentHeight: number,
      viewportWidth: number,
      viewportHeight: number,
    ) => {
      userAdjustedRef.current = false;
      setZoom(
        calcFitZoom(contentWidth, contentHeight, viewportWidth, viewportHeight),
      );
    },
    [],
  );

  const resetZoom = useCallback(
    (
      contentWidth: number,
      contentHeight: number,
      viewportWidth: number,
      viewportHeight: number,
    ) => {
      fitZoom(contentWidth, contentHeight, viewportWidth, viewportHeight);
    },
    [fitZoom],
  );

  const applyFitIfNeeded = useCallback(
    (
      contentWidth: number,
      contentHeight: number,
      viewportWidth: number,
      viewportHeight: number,
    ) => {
      if (userAdjustedRef.current) return;
      setZoom(
        calcFitZoom(contentWidth, contentHeight, viewportWidth, viewportHeight),
      );
    },
    [],
  );

  return {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitZoom,
    applyFitIfNeeded,
  };
}
