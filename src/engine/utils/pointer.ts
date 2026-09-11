/**
 * Generic pointer dragging utility for interactive canvas and UI components.
 * Manages pointerdown, pointermove, pointerup lifecycles with pointer capture
 * and automatic window cleanup.
 */

export interface PointerDragDelta {
  dx: number;
  dy: number;
  startX: number;
  startY: number;
}

export interface PointerDragCallbacks {
  onStart?: (e: PointerEvent) => boolean | void;
  onMove?: (e: PointerEvent, delta: PointerDragDelta) => void;
  onEnd?: (e: PointerEvent, delta: PointerDragDelta) => void;
  capture?: boolean;
}

export function trackPointerDrag(
  element: HTMLElement | SVGElement,
  callbacks: PointerDragCallbacks
): () => void {
  let isTracking = false;
  let startX = 0;
  let startY = 0;
  let currentPointerId: number | null = null;

  const onPointerMove = (e: PointerEvent) => {
    if (!isTracking) return;
    callbacks.onMove?.(e, {
      dx: e.clientX - startX,
      dy: e.clientY - startY,
      startX,
      startY
    });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isTracking) return;
    isTracking = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (callbacks.capture && currentPointerId !== null) {
      try { element.releasePointerCapture(currentPointerId); } catch { /* ignore */ }
    }
    callbacks.onEnd?.(e, {
      dx: e.clientX - startX,
      dy: e.clientY - startY,
      startX,
      startY
    });
    currentPointerId = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (callbacks.onStart) {
      const allowed = callbacks.onStart(e);
      if (allowed === false) return;
    }
    isTracking = true;
    startX = e.clientX;
    startY = e.clientY;
    currentPointerId = e.pointerId;
    if (callbacks.capture) {
      try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  element.addEventListener('pointerdown', onPointerDown as EventListener);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown as EventListener);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
}
