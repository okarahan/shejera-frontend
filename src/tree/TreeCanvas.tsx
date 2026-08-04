import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Pan } from "./useZoom";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "./useZoom";

interface TreeCanvasProps {
  zoom: number;
  pan: Pan;
  onPanChange: (pan: Pan | ((prev: Pan) => Pan)) => void;
  onZoomToPoint: (viewportX: number, viewportY: number, nextZoom: number) => void;
  onUserInteract?: () => void;
  /** Set true after a drag so card clicks are ignored. */
  suppressClickRef: React.MutableRefObject<boolean>;
  contentWidth: number;
  contentHeight: number;
  children: ReactNode;
  className?: string;
  /** Forwarded so parents can measure / fit the viewport. */
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}

const DRAG_THRESHOLD_PX = 6;

/**
 * Pan/zoom surface for the family tree only (sidebar stays untouched).
 * - Trackpad pinch / Ctrl+wheel / plain wheel → zoom toward cursor
 * - Click-drag → pan (grab hand)
 * - Short click without drag → person cards stay clickable
 */
export function TreeCanvas({
  zoom,
  pan,
  onPanChange,
  onZoomToPoint,
  onUserInteract,
  suppressClickRef,
  contentWidth,
  contentHeight,
  children,
  className,
  viewportRef,
}: TreeCanvasProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const rootRef = viewportRef ?? localRef;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPan: Pan;
    moved: boolean;
    captured: boolean;
  } | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      // Stop browser page-zoom (pinch) so only the tree scales — not the sidebar.
      e.preventDefault();
      onUserInteract?.();

      const rect = el.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const direction = e.deltaY > 0 ? -1 : 1;
      const current = zoomRef.current;
      const intensity = e.ctrlKey
        ? Math.min(0.35, Math.abs(e.deltaY) * 0.015)
        : ZOOM_STEP * (e.shiftKey ? 2 : 1);
      const next = current * (1 + direction * intensity);
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      if (Math.abs(clamped - current) < 1e-6) return;
      onZoomToPoint(vx, vy, clamped);
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [onUserInteract, onZoomToPoint, rootRef]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("a, input, textarea, select, label")) return;

      // Do NOT setPointerCapture yet — that steals clicks from person cards.
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originPan: { ...panRef.current },
        moved: false,
        captured: false,
      };
      suppressClickRef.current = false;
    },
    [suppressClickRef],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (
        !drag.moved &&
        dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX
      ) {
        return;
      }

      if (!drag.moved) {
        drag.moved = true;
        suppressClickRef.current = true;
        setDragging(true);
        onUserInteract?.();
        // Capture only after a real drag so short clicks still hit the card.
        if (!drag.captured) {
          drag.captured = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }

      onPanChange({
        x: drag.originPan.x + dx,
        y: drag.originPan.y + dy,
      });
    },
    [onPanChange, onUserInteract, suppressClickRef],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setDragging(false);

      if (drag.captured) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }

      if (drag.moved) {
        // Keep suppress through the synthetic click that follows pointerup.
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      } else {
        suppressClickRef.current = false;
      }
    },
    [suppressClickRef],
  );

  return (
    <div
      ref={rootRef}
      className={`tree-canvas${className ? ` ${className}` : ""}${dragging ? " tree-canvas--dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="presentation"
    >
      <div
        className="tree-canvas__world"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}
