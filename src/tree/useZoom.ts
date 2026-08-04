import { useCallback, useRef, useState } from "react";

/** Soft floor so the tree never vanishes; no 50% clamp. */
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 0.1;

export interface Pan {
  x: number;
  y: number;
}

export function calcFitZoom(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 48,
): number {
  if (
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return 1;
  }

  const scaleX = (viewportWidth - padding) / contentWidth;
  const scaleY = (viewportHeight - padding) / contentHeight;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)));
}

export function calcFitPan(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
): Pan {
  return {
    x: (viewportWidth - contentWidth * zoom) / 2,
    y: (viewportHeight - contentHeight * zoom) / 2,
  };
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function useTreeCanvas(initialZoom = 1) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const userAdjustedRef = useRef(false);
  /** True after a drag so the following click is ignored. */
  const suppressClickRef = useRef(false);

  const markUserAdjusted = useCallback(() => {
    userAdjustedRef.current = true;
  }, []);

  const zoomIn = useCallback(() => {
    markUserAdjusted();
    const z = clampZoom(Math.round((zoomRef.current + ZOOM_STEP) * 100) / 100);
    zoomRef.current = z;
    setZoom(z);
  }, [markUserAdjusted]);

  const zoomOut = useCallback(() => {
    markUserAdjusted();
    const z = clampZoom(Math.round((zoomRef.current - ZOOM_STEP) * 100) / 100);
    zoomRef.current = z;
    setZoom(z);
  }, [markUserAdjusted]);

  /** Zoom toward a point in viewport coordinates (relative to canvas). */
  const zoomToPoint = useCallback(
    (viewportX: number, viewportY: number, nextZoom: number) => {
      markUserAdjusted();
      const prevZoom = zoomRef.current;
      const prevPan = panRef.current;
      const z = clampZoom(nextZoom);
      const nextPan = {
        x: viewportX - ((viewportX - prevPan.x) / prevZoom) * z,
        y: viewportY - ((viewportY - prevPan.y) / prevZoom) * z,
      };
      zoomRef.current = z;
      panRef.current = nextPan;
      setZoom(z);
      setPan(nextPan);
    },
    [markUserAdjusted],
  );

  const resetZoom = useCallback(() => {
    markUserAdjusted();
    zoomRef.current = 1;
    setZoom(1);
  }, [markUserAdjusted]);

  /** Reset to 100% and center content in the viewport. */
  const resetView = useCallback(
    (
      contentWidth: number,
      contentHeight: number,
      viewportWidth: number,
      viewportHeight: number,
    ) => {
      markUserAdjusted();
      const nextPan = calcFitPan(
        contentWidth,
        contentHeight,
        viewportWidth,
        viewportHeight,
        1,
      );
      zoomRef.current = 1;
      panRef.current = nextPan;
      setZoom(1);
      setPan(nextPan);
    },
    [markUserAdjusted],
  );

  const applyFitIfNeeded = useCallback(
    (
      contentWidth: number,
      contentHeight: number,
      viewportWidth: number,
      viewportHeight: number,
    ) => {
      if (userAdjustedRef.current) return;
      const z = calcFitZoom(
        contentWidth,
        contentHeight,
        viewportWidth,
        viewportHeight,
      );
      const nextPan = calcFitPan(
        contentWidth,
        contentHeight,
        viewportWidth,
        viewportHeight,
        z,
      );
      zoomRef.current = z;
      panRef.current = nextPan;
      setZoom(z);
      setPan(nextPan);
    },
    [],
  );

  const allowAutoFit = useCallback(() => {
    userAdjustedRef.current = false;
  }, []);

  return {
    zoom,
    pan,
    setPan,
    zoomIn,
    zoomOut,
    zoomToPoint,
    resetZoom,
    resetView,
    applyFitIfNeeded,
    allowAutoFit,
    markUserAdjusted,
    suppressClickRef,
  };
}

/** @deprecated Prefer useTreeCanvas */
export function useZoom(initial = 1) {
  return useTreeCanvas(initial);
}
