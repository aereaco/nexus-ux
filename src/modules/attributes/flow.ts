import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

interface Viewport { x: number; y: number; zoom: number; tick?: number }
type FlowElement = HTMLElement & { __nexusFlowViewport?: Viewport; __flowViewport?: Viewport };

/** Elements that must not initiate a canvas pan when pressed. */
const NO_PAN = '[data-flow-node],[data-flow-handle],[data-flow-nodrag],[data-flow-resizer],[data-flow-minimap],button,a,input,textarea,select,label';

/** Read the shared, live viewport state a [data-flow] element publishes. */
const sharedViewport = (el: Element | null): Viewport => {
  const flow = el?.closest('[data-flow]') as FlowElement | null;
  const vp = flow?.__flowViewport || flow?.__nexusFlowViewport;
  return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
};

const FLOW_CSS = `
[data-flow] {
  position: relative;
  overflow: hidden;
  user-select: none;
  cursor: grab;
}
[data-flow]:active {
  cursor: grabbing;
}
[data-flow-viewport], [data-flow] > .flow-viewport, [data-flow] > [data-flow="viewport"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}
[data-flow-edges], .flow-edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
[data-flow-node] {
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
  user-select: none;
}
[data-flow-node]:active {
  cursor: grabbing;
}
[data-flow-node].selected .card,
[data-flow-node].selected > *:first-child {
  box-shadow: 0 0 0 2px var(--color-primary, #3b82f6), 0 20px 25px -5px rgba(0, 0, 0, 0.25);
}
[data-flow-handle] {
  position: absolute;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background-color: var(--color-primary, currentColor);
  border: 2px solid var(--color-base-100, #ffffff);
  cursor: crosshair;
  z-index: 20;
  box-sizing: border-box;
  transition: transform 0.15s ease;
}
[data-flow-handle]:hover {
  transform: scale(1.25);
}
[data-flow-handle-side="left"], [data-flow-side="left"], [data-flow-handle="target"]:not([data-flow-side]):not([data-flow-handle-side]) {
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
}
[data-flow-handle-side="left"]:hover, [data-flow-side="left"]:hover, [data-flow-handle="target"]:not([data-flow-side]):not([data-flow-handle-side]):hover {
  transform: translate(-50%, -50%) scale(1.25);
}
[data-flow-handle-side="right"], [data-flow-side="right"], [data-flow-handle="source"]:not([data-flow-side]):not([data-flow-handle-side]) {
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
}
[data-flow-handle-side="right"]:hover, [data-flow-side="right"]:hover, [data-flow-handle="source"]:not([data-flow-side]):not([data-flow-handle-side]):hover {
  transform: translate(50%, -50%) scale(1.25);
}
[data-flow-handle-side="top"], [data-flow-side="top"] {
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
}
[data-flow-handle-side="top"]:hover, [data-flow-side="top"]:hover {
  transform: translate(-50%, -50%) scale(1.25);
}
[data-flow-handle-side="bottom"], [data-flow-side="bottom"] {
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%);
}
[data-flow-handle-side="bottom"]:hover, [data-flow-side="bottom"]:hover {
  transform: translate(-50%, 50%) scale(1.25);
}
.flow-edge {
  fill: none;
  stroke: currentColor;
  stroke-width: 2px;
  opacity: 0.75;
  transition: opacity 0.15s ease, stroke-width 0.15s ease;
}
.flow-edge:hover {
  opacity: 1;
  stroke-width: 2.5px;
}
.flow-edge-preview {
  pointer-events: none;
  stroke-dasharray: 4 4;
}
.flow-selection-rect {
  position: absolute;
  border: 1.5px dashed var(--color-primary, #3b82f6);
  background-color: color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent);
  pointer-events: none;
  z-index: 50;
  border-radius: 4px;
}
[data-flow-node].selected > * {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}
.flow-resizer {
  position: absolute;
  inset: -2px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
[data-flow-node]:hover .flow-resizer,
[data-flow-node].selected .flow-resizer {
  opacity: 1;
}
.flow-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: var(--color-base-100, #ffffff);
  border: 1.5px solid var(--color-primary, #3b82f6);
  border-radius: 2px;
  z-index: 30;
  box-sizing: border-box;
  pointer-events: all;
}
.flow-resize-handle.top-left { top: -4px; left: -4px; cursor: nwse-resize; }
.flow-resize-handle.top-right { top: -4px; right: -4px; cursor: nesw-resize; }
.flow-resize-handle.bottom-left { bottom: -4px; left: -4px; cursor: nesw-resize; }
.flow-resize-handle.bottom-right { bottom: -4px; right: -4px; cursor: nwse-resize; }
.flow-resize-handle.top { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.flow-resize-handle.bottom { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.flow-resize-handle.left { left: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
.flow-resize-handle.right { right: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }

.flow-minimap {
  position: absolute;
  width: 12rem;
  height: 8rem;
  background: color-mix(in srgb, var(--color-base-100, #1e293b) 85%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 40;
  user-select: none;
}
.flow-minimap-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.flow-minimap-node {
  fill: var(--color-primary, #3b82f6);
  opacity: 0.75;
  rx: 3px;
}
.flow-minimap-lens {
  fill: color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
  stroke: var(--color-primary, #3b82f6);
  stroke-width: 1.5px;
  cursor: grab;
  rx: 4px;
}
.flow-minimap-lens:active {
  cursor: grabbing;
}
.flow-edge-label-group {
  pointer-events: all;
  cursor: pointer;
}
.flow-edge-label-bg {
  fill: var(--color-base-100, #1e293b);
  stroke: color-mix(in srgb, currentColor 15%, transparent);
  stroke-width: 1px;
  rx: 4px;
}
.flow-edge-label-text {
  fill: currentColor;
  font-size: 10px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}
`;

let flowSheet: CSSStyleSheet | null = null;

function ensureFlowStyles(root?: Document | ShadowRoot | null) {
  if (typeof CSSStyleSheet === 'undefined') return;
  if (!flowSheet) {
    flowSheet = new CSSStyleSheet();
    flowSheet.replaceSync(FLOW_CSS);
  }
  const rootNode = (root || (typeof document !== 'undefined' ? document : null)) as Document | ShadowRoot | null;
  if (rootNode && 'adoptedStyleSheets' in rootNode) {
    if (!rootNode.adoptedStyleSheets.includes(flowSheet)) {
      rootNode.adoptedStyleSheets = [...rootNode.adoptedStyleSheets, flowSheet];
    }
  }
  if (typeof document !== 'undefined' && 'adoptedStyleSheets' in document) {
    if (!document.adoptedStyleSheets.includes(flowSheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, flowSheet];
    }
  }
}

if (typeof document !== 'undefined') {
  ensureFlowStyles();
}

// ---------------------------------------------------------------------------
// data-flow-viewport: Transformation Pane Directive
// ---------------------------------------------------------------------------
export const flowViewportAttribute: AttributeModule = {
  name: 'flowViewport',
  attribute: 'flow-viewport',
  handle: (element: HTMLElement) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
  }
};

// ---------------------------------------------------------------------------
// data-flow: Root Canvas Directive (Infinite Viewport + Marquee + Keyboard)
// ---------------------------------------------------------------------------
export const flowAttribute: AttributeModule = {
  name: 'flow',
  attribute: 'flow',
  handle: (element: FlowElement, value: string, runtime: RuntimeContext, parsedAttr?: any) => {
    if (element.hasAttribute('data-flow-viewport') || parsedAttr?.argument === 'viewport') {
      ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
      return;
    }

    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    let config: any = {};
    if (value && value.trim()) {
      try { config = runtime.evaluate(element, value); } catch { config = {}; }
    }

    const isViewportObj = config && typeof config === 'object' && !Array.isArray(config)
      && ('zoom' in config || 'x' in config || 'y' in config);

    let state: Viewport;
    if (isViewportObj) {
      state = config;
    } else {
      let inScopeVp: any = null;
      try { inScopeVp = runtime.evaluate(element, 'viewport'); } catch { /* ignore */ }
      if (inScopeVp && typeof inScopeVp === 'object' && ('zoom' in inScopeVp || 'x' in inScopeVp || 'y' in inScopeVp)) {
        state = inScopeVp;
      } else {
        state = reactive({ x: 0, y: 0, zoom: 1, tick: 0 });
      }
    }

    if (state.zoom === undefined) state.zoom = 1;
    if (state.x === undefined) state.x = 0;
    if (state.y === undefined) state.y = 0;
    if (state.tick === undefined) state.tick = 0;

    const content = (element.querySelector('[data-flow-viewport], .flow-viewport') as HTMLElement | null)
      || (element.firstElementChild as HTMLElement | null)
      || element;

    element.__flowViewport = state;
    element.__nexusFlowViewport = state;

    const gridAttr = element.getAttribute('data-flow-grid');
    const gridSize = config?.grid ?? (gridAttr !== null ? (parseFloat(gridAttr) || 0) : 0);

    let isPanning = false;
    let startX = 0;
    let startY = 0;

    let isSelecting = false;
    let selStartX = 0;
    let selStartY = 0;
    let selRectEl: HTMLElement | null = null;
    let didMove = false;

    const screenToFlowLocal = (clientX: number, clientY: number) => {
      const r = element.getBoundingClientRect();
      const z = state.zoom || 1;
      return {
        x: (clientX - r.left - (state.x || 0)) / z,
        y: (clientY - r.top - (state.y || 0)) / z
      };
    };

    const canPan = (e: PointerEvent): boolean => {
      if (e.button === 1) return true;
      if (e.button === 0 && e.altKey) return true;
      if (e.button === 0) return !(e.target as HTMLElement).closest(NO_PAN);
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!canPan(e)) return;
      didMove = false;

      // Marquee selection if Shift is held on empty canvas
      if (e.button === 0 && e.shiftKey) {
        isSelecting = true;
        const pt = screenToFlowLocal(e.clientX, e.clientY);
        selStartX = pt.x;
        selStartY = pt.y;
        selRectEl = document.createElement('div');
        selRectEl.className = 'flow-selection-rect';
        content.appendChild(selRectEl);
        try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }

      isPanning = true;
      startX = e.clientX - state.x;
      startY = e.clientY - state.y;
      try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isSelecting && selRectEl) {
        didMove = true;
        const pt = screenToFlowLocal(e.clientX, e.clientY);
        const minX = Math.min(selStartX, pt.x);
        const minY = Math.min(selStartY, pt.y);
        const w = Math.abs(pt.x - selStartX);
        const h = Math.abs(pt.y - selStartY);
        selRectEl.style.left = `${minX}px`;
        selRectEl.style.top = `${minY}px`;
        selRectEl.style.width = `${w}px`;
        selRectEl.style.height = `${h}px`;

        const nodes = runtime.evaluate(element, 'nodes') as any[];
        if (Array.isArray(nodes)) {
          nodes.forEach(n => {
            const p = n.position || n;
            const nx = p.x || 0;
            const ny = p.y || 0;
            const nw = n.w || n.width || 176;
            const nh = n.h || n.height || 90;
            const inside = nx < minX + w && nx + nw > minX && ny < minY + h && ny + nh > minY;
            n.selected = inside;
          });
          state.tick = (state.tick || 0) + 1;
        }
        return;
      }

      if (!isPanning) return;
      didMove = true;
      state.x = e.clientX - startX;
      state.y = e.clientY - startY;
      state.tick = (state.tick || 0) + 1;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isSelecting) {
        isSelecting = false;
        selRectEl?.remove();
        selRectEl = null;
        try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }

      if (!isPanning) return;
      isPanning = false;
      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.cursor = '';

      // Clear selection on plain canvas click without drag
      if (!didMove && !e.shiftKey) {
        const nodes = runtime.evaluate(element, 'nodes') as any[];
        if (Array.isArray(nodes) && nodes.some(n => n.selected)) {
          nodes.forEach(n => { n.selected = false; });
          state.tick = (state.tick || 0) + 1;
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const factor = Math.exp(-e.deltaY * 0.0015);
      const prevZoom = state.zoom || 1;
      const nextZoom = Math.min(Math.max(prevZoom * factor, MIN_ZOOM), MAX_ZOOM);
      if (nextZoom === prevZoom) return;

      const fx = (px - state.x) / prevZoom;
      const fy = (py - state.y) / prevZoom;
      state.x = px - fx * nextZoom;
      state.y = py - fy * nextZoom;
      state.zoom = nextZoom;
      state.tick = (state.tick || 0) + 1;
    };

    // Keyboard Shortcuts: Delete, Backspace, Arrows, Escape
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
        return;
      }
      let nodes: any[] = [];
      try { nodes = runtime.evaluate(element, 'nodes') as any[] || []; } catch { nodes = []; }
      if (!Array.isArray(nodes)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIds = new Set(nodes.filter(n => n.selected).map(n => String(n.id)));
        if (selectedIds.size > 0) {
          e.preventDefault();
          const remainingNodes = nodes.filter(n => !selectedIds.has(String(n.id)));
          let edges: any[] = [];
          try { edges = runtime.evaluate(element, 'edges') as any[] || []; } catch { edges = []; }
          if (Array.isArray(edges)) {
            const remainingEdges = edges.filter(ed => !selectedIds.has(String(ed.source)) && !selectedIds.has(String(ed.target)));
            edges.length = 0;
            edges.push(...remainingEdges);
          }
          nodes.length = 0;
          nodes.push(...remainingNodes);
          state.tick = (state.tick || 0) + 1;
        }
      } else if (e.key.startsWith('Arrow')) {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          selectedNodes.forEach(n => {
            const p = n.position || n;
            if (e.key === 'ArrowLeft') p.x = (p.x || 0) - step;
            if (e.key === 'ArrowRight') p.x = (p.x || 0) + step;
            if (e.key === 'ArrowUp') p.y = (p.y || 0) - step;
            if (e.key === 'ArrowDown') p.y = (p.y || 0) + step;
          });
          state.tick = (state.tick || 0) + 1;
        }
      } else if (e.key === 'Escape') {
        nodes.forEach(n => { n.selected = false; });
        state.tick = (state.tick || 0) + 1;
      }
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    let settleFrames = 0;
    const settle = () => {
      state.tick = (state.tick || 0) + 1;
      if (++settleFrames < 24) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);

    const stop = runtime.effect(() => {
      const zoom = state.zoom || 1;
      const x = state.x || 0;
      const y = state.y || 0;

      if (content !== element && !content.hasAttribute('data-flow-viewport')) {
        content.setAttribute('data-flow-viewport', '');
      }
      content.style.transformOrigin = '0 0';
      content.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

      if (gridSize > 0 && element.style.backgroundImage) {
        const scaled = gridSize * zoom;
        element.style.backgroundSize = `${scaled}px ${scaled}px`;
        element.style.backgroundPosition = `${x}px ${y}px`;
      }
    });

    return () => {
      stop();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      delete element.__flowViewport;
      delete element.__nexusFlowViewport;
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-node: Spatial Node Directive (Multi-selection & Sub-flows)
// ---------------------------------------------------------------------------
export const flowNodeAttribute: AttributeModule = {
  name: 'flowNode',
  attribute: 'flow-node',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
    const nodeState = runtime.evaluate(element, value) as any;
    if (!nodeState || typeof nodeState !== 'object') return;

    const readPos = (n: any = nodeState) => {
      const p = n.position;
      return p ? { x: p.x || 0, y: p.y || 0 } : { x: n.x || 0, y: n.y || 0 };
    };
    const writePos = (n: any, x: number, y: number) => {
      if (n.position) { n.position.x = x; n.position.y = y; }
      else { n.x = x; n.y = y; }
    };

    const resolveSnap = (): number => {
      const local = element.getAttribute('data-flow-snap');
      if (local !== null) return parseFloat(local) || 0;
      const flowEl = element.closest('[data-flow]') as HTMLElement | null;
      const grid = flowEl?.getAttribute('data-flow-grid');
      if (grid !== null && grid !== undefined) return parseFloat(grid) || 0;
      return 0;
    };
    const snapPoint = (x: number, y: number, s: number) =>
      s > 0 ? { x: Math.round(x / s) * s, y: Math.round(y / s) * s } : { x, y };

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragGroup: Array<{ node: any; initialX: number; initialY: number }> = [];

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.altKey) return;
      if ((e.target as HTMLElement).closest(
        '[data-flow-handle],[data-flow-nodrag],[data-flow-resizer],button,a,input,textarea,select,label'
      )) return;
      e.stopPropagation();

      const flowEl = element.closest('[data-flow]') as HTMLElement | null;
      let allNodes: any[] = [];
      try { allNodes = runtime.evaluate(flowEl || element, 'nodes') as any[] || []; } catch { allNodes = []; }

      // Selection toggle / focus
      if (e.shiftKey) {
        nodeState.selected = !nodeState.selected;
      } else {
        if (!nodeState.selected) {
          allNodes.forEach(n => { n.selected = false; });
          nodeState.selected = true;
        }
      }

      // Build drag group: all selected nodes + any nested children (sub-flows)
      const selectedNodes = allNodes.filter(n => n.selected);
      const movingNodes = selectedNodes.length > 0 && nodeState.selected ? selectedNodes : [nodeState];
      
      const groupSet = new Set(movingNodes);
      allNodes.forEach(n => {
        if (n.parentId && movingNodes.some(p => String(p.id) === String(n.parentId))) {
          groupSet.add(n);
        }
      });

      dragGroup = Array.from(groupSet).map(n => {
        const p = readPos(n);
        return { node: n, initialX: p.x, initialY: p.y };
      });

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.zIndex = '1000';

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const flowEl = element.closest('[data-flow]') as FlowElement | null;
      const vp = flowEl?.__flowViewport || flowEl?.__nexusFlowViewport;
      const zoom = vp?.zoom || 1;
      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      const snap = resolveSnap();

      dragGroup.forEach(item => {
        const snapped = snapPoint(item.initialX + dx, item.initialY + dy, snap);
        writePos(item.node, snapped.x, snapped.y);
      });

      if (vp) (vp as any).tick = ((vp as any).tick || 0) + 1;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.zIndex = '';
    };

    element.addEventListener('pointerdown', onPointerDown);

    const stop = runtime.effect(() => {
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      const p = readPos();
      const s = snapPoint(p.x, p.y, resolveSnap());
      element.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;

      if (nodeState.width !== undefined) {
        element.style.width = typeof nodeState.width === 'number' ? `${nodeState.width}px` : nodeState.width;
      }
      if (nodeState.height !== undefined) {
        element.style.height = typeof nodeState.height === 'number' ? `${nodeState.height}px` : nodeState.height;
      }

      if (nodeState.selected) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });

    return () => {
      stop();
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-handle: Port Directive (connection dragging + validation)
// ---------------------------------------------------------------------------
export const flowHandleAttribute: AttributeModule = {
  name: 'flowHandle',
  attribute: 'flow-handle',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    let kind = 'source';
    const raw = value.trim();
    if (raw === 'source' || raw === 'target') {
      kind = raw;
    } else if (raw) {
      try {
        const resolved = runtime.evaluate(element, raw) as any;
        if (resolved === 'source' || resolved === 'target') kind = resolved;
      } catch { /* keep default */ }
    }
    element.setAttribute('data-flow-handle-type', kind);

    const sideAttr = element.getAttribute('data-flow-side');
    if (sideAttr) {
      element.setAttribute('data-flow-handle-side', sideAttr);
    }

    const viewport = () => element.closest('[data-flow]') as FlowElement | null;

    const toFlow = (clientX: number, clientY: number) => {
      const vp = viewport()!;
      const st = sharedViewport(element);
      const r = vp.getBoundingClientRect();
      return { x: (clientX - r.left - st.x) / st.zoom, y: (clientY - r.top - st.y) / st.zoom };
    };

    const anchorFlow = (el: Element) => {
      const r = el.getBoundingClientRect();
      return toFlow(r.left + r.width / 2, r.top + r.height / 2);
    };

    const edgesArray = () => {
      const vp = viewport();
      if (!vp) return null;
      const svg = vp.querySelector('[data-flow-edges]') as HTMLElement | null;
      const expr = (svg?.getAttribute('data-flow-edges-expr')) || (svg?.getAttribute('data-flow-edges')) || 'edges';
      try {
        const arr = runtime.evaluate(vp, expr) as any;
        return Array.isArray(arr) ? arr : null;
      } catch { return null; }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      const vp = viewport();
      const svg = vp?.querySelector('[data-flow-edges]') as SVGSVGElement | null;
      if (!vp || !svg) return;

      const srcNode = element.closest('[data-flow-node]') as HTMLElement | null;
      const srcId = srcNode?.id
        || srcNode?.getAttribute('data-bind-id')?.replace(/^['"]|['"]$/g, '').replace(/^node-/, '')
        || element.id
        || '';
      const start = anchorFlow(element);

      const preview = document.createElementNS(SVG_NS, 'path');
      preview.setAttribute('class', 'flow-edge flow-edge-preview');
      preview.setAttribute('fill', 'none');
      preview.setAttribute('stroke', 'currentColor');
      preview.setAttribute('stroke-width', '2');
      preview.setAttribute('stroke-dasharray', '4 4');
      preview.style.pointerEvents = 'none';
      svg.appendChild(preview);

      const move = (ev: PointerEvent) => {
        const pt = toFlow(ev.clientX, ev.clientY);
        const dx = Math.abs(start.x - pt.x) / 2;
        preview.setAttribute('d',
          `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${pt.x - dx} ${pt.y}, ${pt.x} ${pt.y}`);
      };

      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        preview.remove();
        const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const targetNode = target?.closest('[data-flow-node]') as HTMLElement | null;
        const tgtId = targetNode?.id
          || targetNode?.getAttribute('data-bind-id')?.replace(/^['"]|['"]$/g, '').replace(/^node-/, '')
          || '';
        if (tgtId && tgtId !== srcId) {
          const edges = edgesArray();
          if (edges && !edges.some((ed: any) => String(ed.source) === String(srcId) && String(ed.target) === String(tgtId))) {
            edges.push({ source: srcId, target: tgtId });
            const vpState = vp?.__flowViewport || vp?.__nexusFlowViewport;
            if (vpState) (vpState as any).tick = ((vpState as any).tick || 0) + 1;
          }
        }
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

    element.addEventListener('pointerdown', onPointerDown);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-edges: Edge Overlay Directive (Markers, Labels & Diverse Types)
// ---------------------------------------------------------------------------
export const flowEdgesAttribute: AttributeModule = {
  name: 'flowEdges',
  attribute: 'flow-edges',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
    const expr = value.trim() || 'edges';
    element.setAttribute('data-flow-edges-expr', expr);

    const flowEl = element.closest('[data-flow]') as FlowElement | null;
    const content = flowEl?.querySelector('[data-flow-viewport], .flow-viewport') as HTMLElement | null;
    if (content && element.parentElement !== content) {
      content.insertBefore(element, content.firstChild);
    }

    // Auto-inject SVG arrowhead markers
    if (!element.querySelector('#flow-defs')) {
      const defs = document.createElementNS(SVG_NS, 'defs');
      defs.id = 'flow-defs';
      defs.innerHTML = `
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polyline points="0,0 10,5 0,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </marker>
        <marker id="flow-arrow-closed" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" stroke="none" />
        </marker>
      `;
      element.insertBefore(defs, element.firstChild);
    }

    const hasCustomTemplate = element.querySelector('template, path[data-for], path[data-effect]');
    if (hasCustomTemplate) return;

    const stop = runtime.effect(() => {
      const currentFlow = element.closest('[data-flow]') as FlowElement | null;
      const vp = currentFlow?.__flowViewport || currentFlow?.__nexusFlowViewport;
      const _t = (vp as any)?.tick;

      let edgeList: any[] = [];
      try {
        const evaluated = runtime.evaluate(element, expr);
        if (Array.isArray(evaluated)) edgeList = evaluated;
      } catch { /* ignore */ }

      const existingPaths = new Map<string, SVGPathElement>();
      const existingLabels = new Map<string, SVGGElement>();
      element.querySelectorAll('path[data-edge-key]').forEach(p => {
        existingPaths.set(p.getAttribute('data-edge-key')!, p as SVGPathElement);
      });
      element.querySelectorAll('g[data-edge-label-key]').forEach(g => {
        existingLabels.set(g.getAttribute('data-edge-label-key')!, g as SVGGElement);
      });

      const activeKeys = new Set<string>();

      edgeList.forEach(edge => {
        const srcId = String(edge.source ?? '');
        const tgtId = String(edge.target ?? '');
        if (!srcId || !tgtId) return;

        const key = edge.id || `${srcId}->${tgtId}`;
        activeKeys.add(key);

        let pathEl = existingPaths.get(key);
        if (!pathEl) {
          pathEl = document.createElementNS(SVG_NS, 'path');
          pathEl.setAttribute('class', 'flow-edge');
          pathEl.setAttribute('data-edge-key', key);
          pathEl.setAttribute('fill', 'none');
          pathEl.setAttribute('stroke', 'currentColor');
          pathEl.setAttribute('stroke-width', '2');
          element.appendChild(pathEl);
        }

        const edgeRes = (runtime as any).$flow?.edge?.(srcId, tgtId, {
          type: edge.type || 'bezier',
          curvature: edge.curvature,
          borderRadius: edge.borderRadius,
          offset: edge.offset,
          container: currentFlow || undefined
        });

        const d = edgeRes?.d || (typeof edgeRes === 'string' ? edgeRes : '');
        if (d) pathEl.setAttribute('d', d);

        if (edge.markerEnd) {
          const markerId = edge.markerEnd === 'arrowclosed' ? 'url(#flow-arrow-closed)' : 'url(#flow-arrow)';
          pathEl.setAttribute('marker-end', markerId);
        } else {
          pathEl.removeAttribute('marker-end');
        }

        if (edge.label && edgeRes?.labelX !== undefined) {
          let labelG = existingLabels.get(key);
          if (!labelG) {
            labelG = document.createElementNS(SVG_NS, 'g');
            labelG.setAttribute('class', 'flow-edge-label-group');
            labelG.setAttribute('data-edge-label-key', key);
            labelG.innerHTML = `
              <rect class="flow-edge-label-bg" x="-32" y="-10" width="64" height="20" />
              <text class="flow-edge-label-text">${edge.label}</text>
            `;
            element.appendChild(labelG);
          } else {
            const textEl = labelG.querySelector('text');
            if (textEl && textEl.textContent !== edge.label) textEl.textContent = edge.label;
          }
          labelG.setAttribute('transform', `translate(${edgeRes.labelX}, ${edgeRes.labelY})`);
        }
      });

      existingPaths.forEach((p, k) => { if (!activeKeys.has(k)) p.remove(); });
      existingLabels.forEach((g, k) => { if (!activeKeys.has(k)) g.remove(); });
    });

    return () => {
      stop();
      element.removeAttribute('data-flow-edges-expr');
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-resizer: 8-Point Node Resize Directive
// ---------------------------------------------------------------------------
export const flowResizerAttribute: AttributeModule = {
  name: 'flowResizer',
  attribute: 'flow-resizer',
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    const nodeEl = element.closest('[data-flow-node]') as HTMLElement | null;
    if (!nodeEl) return;
    element.classList.add('flow-resizer');

    const directions = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'];
    const handleClassMap: Record<string, string> = {
      nw: 'top-left', ne: 'top-right', se: 'bottom-right', sw: 'bottom-left',
      n: 'top', s: 'bottom', e: 'right', w: 'left'
    };

    directions.forEach(dir => {
      if (!element.querySelector(`.flow-resize-handle.${handleClassMap[dir]}`)) {
        const h = document.createElement('div');
        h.className = `flow-resize-handle ${handleClassMap[dir]}`;
        h.setAttribute('data-flow-nodrag', '');
        h.setAttribute('data-direction', dir);
        element.appendChild(h);
      }
    });

    const onPointerDown = (e: PointerEvent) => {
      const handle = (e.target as HTMLElement).closest('.flow-resize-handle') as HTMLElement | null;
      if (!handle || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const dir = handle.getAttribute('data-direction') || 'se';
      const flowEl = element.closest('[data-flow]') as FlowElement | null;
      const vp = flowEl?.__flowViewport || flowEl?.__nexusFlowViewport;
      const zoom = vp?.zoom || 1;

      const nodeExpr = nodeEl.getAttribute('data-flow-node') || '';
      let nodeState: any = null;
      try { nodeState = runtime.evaluate(nodeEl, nodeExpr); } catch { nodeState = null; }
      if (!nodeState) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const initialPos = nodeState.position ? { ...nodeState.position } : { x: nodeState.x || 0, y: nodeState.y || 0 };
      const initialWidth = nodeState.width || nodeEl.offsetWidth || 176;
      const initialHeight = nodeState.height || nodeEl.offsetHeight || 90;

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;
        let newW = initialWidth;
        let newH = initialHeight;
        let newX = initialPos.x;
        let newY = initialPos.y;

        if (dir.includes('e')) newW = Math.max(80, initialWidth + dx);
        if (dir.includes('w')) {
          const clamped = Math.max(80, initialWidth - dx);
          newX = initialPos.x + (initialWidth - clamped);
          newW = clamped;
        }
        if (dir.includes('s')) newH = Math.max(40, initialHeight + dy);
        if (dir.includes('n')) {
          const clamped = Math.max(40, initialHeight - dy);
          newY = initialPos.y + (initialHeight - clamped);
          newH = clamped;
        }

        nodeState.width = newW;
        nodeState.height = newH;
        if (nodeState.position) {
          nodeState.position.x = newX;
          nodeState.position.y = newY;
        } else {
          nodeState.x = newX;
          nodeState.y = newY;
        }

        if (vp) (vp as any).tick = ((vp as any).tick || 0) + 1;
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    element.addEventListener('pointerdown', onPointerDown);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-minimap: Interactive Canvas Overview & Viewport Scrubber
// ---------------------------------------------------------------------------
export const flowMinimapAttribute: AttributeModule = {
  name: 'flowMinimap',
  attribute: 'flow-minimap',
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    let svg: SVGSVGElement;
    if (element instanceof SVGSVGElement) {
      svg = element;
    } else {
      element.classList.add('flow-minimap');
      let existing = element.querySelector('svg.flow-minimap-svg') as SVGSVGElement | null;
      if (!existing) {
        existing = document.createElementNS(SVG_NS, 'svg');
        existing.setAttribute('class', 'flow-minimap-svg');
        element.appendChild(existing);
      }
      svg = existing;
    }

    const flowEl = element.closest('[data-flow]') as FlowElement | null;

    let isMinimapPanning = false;
    let minimapBounds: DOMRect | null = null;
    let currentViewScale = 1;
    let minX = 0;
    let minY = 0;

    const updatePanFromMinimap = (e: PointerEvent) => {
      if (!minimapBounds || !flowEl) return;
      const vp = flowEl.__flowViewport || flowEl.__nexusFlowViewport;
      if (!vp) return;

      const px = e.clientX - minimapBounds.left;
      const py = e.clientY - minimapBounds.top;
      const flowX = minX + px * currentViewScale;
      const flowY = minY + py * currentViewScale;

      const containerRect = flowEl.getBoundingClientRect();
      vp.x = containerRect.width / 2 - flowX * (vp.zoom || 1);
      vp.y = containerRect.height / 2 - flowY * (vp.zoom || 1);
      (vp as any).tick = ((vp as any).tick || 0) + 1;
    };

    const onMinimapDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      isMinimapPanning = true;
      minimapBounds = svg.getBoundingClientRect();
      updatePanFromMinimap(e);

      window.addEventListener('pointermove', onMinimapMove);
      window.addEventListener('pointerup', onMinimapUp);
    };

    const onMinimapMove = (e: PointerEvent) => {
      if (!isMinimapPanning) return;
      updatePanFromMinimap(e);
    };

    const onMinimapUp = () => {
      if (!isMinimapPanning) return;
      isMinimapPanning = false;
      window.removeEventListener('pointermove', onMinimapMove);
      window.removeEventListener('pointerup', onMinimapUp);
    };

    svg.addEventListener('pointerdown', onMinimapDown);

    const stop = runtime.effect(() => {
      if (!flowEl) return;
      const vp = flowEl.__flowViewport || flowEl.__nexusFlowViewport;
      const _t = (vp as any)?.tick;

      let nodesList: any[] = [];
      try { nodesList = runtime.evaluate(flowEl, 'nodes') as any[] || []; } catch { nodesList = []; }

      const containerRect = flowEl.getBoundingClientRect();
      const z = vp?.zoom || 1;
      const viewBB = {
        x: -(vp?.x || 0) / z,
        y: -(vp?.y || 0) / z,
        width: (containerRect.width || 800) / z,
        height: (containerRect.height || 600) / z
      };

      let bMinX = viewBB.x;
      let bMinY = viewBB.y;
      let bMaxX = viewBB.x + viewBB.width;
      let bMaxY = viewBB.y + viewBB.height;

      nodesList.forEach(n => {
        const p = n.position || n;
        const nx = p.x || 0;
        const ny = p.y || 0;
        const nw = n.w || n.width || 176;
        const nh = n.h || n.height || 90;
        bMinX = Math.min(bMinX, nx);
        bMinY = Math.min(bMinY, ny);
        bMaxX = Math.max(bMaxX, nx + nw);
        bMaxY = Math.max(bMaxY, ny + nh);
      });

      const pad = 40;
      minX = bMinX - pad;
      minY = bMinY - pad;
      const totalW = bMaxX - bMinX + pad * 2;
      const totalH = bMaxY - bMinY + pad * 2;

      svg.setAttribute('viewBox', `${minX} ${minY} ${totalW} ${totalH}`);
      currentViewScale = totalW / (svg.clientWidth || 200);

      let html = '';
      nodesList.forEach(n => {
        const p = n.position || n;
        const nx = p.x || 0;
        const ny = p.y || 0;
        const nw = n.w || n.width || 176;
        const nh = n.h || n.height || 90;
        html += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" class="flow-minimap-node" />`;
      });

      html += `<rect x="${viewBB.x}" y="${viewBB.y}" width="${viewBB.width}" height="${viewBB.height}" class="flow-minimap-lens" />`;
      svg.innerHTML = html;
    });

    return () => {
      stop();
      svg.removeEventListener('pointerdown', onMinimapDown);
      window.removeEventListener('pointermove', onMinimapMove);
      window.removeEventListener('pointerup', onMinimapUp);
    };
  }
};

// ---------------------------------------------------------------------------
// Helper Attribute Modules for Canonical Namespaces
// ---------------------------------------------------------------------------
export const flowSideAttribute: AttributeModule = {
  name: 'flowSide',
  attribute: 'flow-side',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    let side = value.trim();
    if (side) {
      try {
        const resolved = runtime.evaluate(element, side);
        if (typeof resolved === 'string') side = resolved;
      } catch { /* use raw */ }
    }
    if (side) {
      element.setAttribute('data-flow-handle-side', side);
    }
  }
};

export const flowNoDragAttribute: AttributeModule = {
  name: 'flowNoDrag',
  attribute: 'flow-nodrag',
  handle: () => {}
};

export const flowGridAttribute: AttributeModule = {
  name: 'flowGrid',
  attribute: 'flow-grid',
  handle: () => {}
};

export const flowSnapAttribute: AttributeModule = {
  name: 'flowSnap',
  attribute: 'flow-snap',
  handle: () => {}
};

export default flowAttribute;
