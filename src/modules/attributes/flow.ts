import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

interface Viewport { x: number; y: number; zoom: number }
type FlowElement = HTMLElement & { __nexusFlowViewport?: Viewport; __flowViewport?: Viewport };

/** Elements that must not initiate a canvas pan when pressed. */
const NO_PAN = '[data-flow-node],[data-flow-handle],[data-flow-nodrag],button,a,input,textarea,select,label';

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
  opacity: 0.7;
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

// Ensure styles are adopted synchronously at load time if running in browser
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
// data-flow: Root Canvas Directive
// ---------------------------------------------------------------------------
export const flowAttribute: AttributeModule = {
  name: 'flow',
  attribute: 'flow',
  handle: (element: FlowElement, value: string, runtime: RuntimeContext, parsedAttr?: any) => {
    // Re-entrancy guard: if invoked on an inner viewport pane, ensure styles and exit
    if (element.hasAttribute('data-flow-viewport') || parsedAttr?.argument === 'viewport') {
      ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
      return;
    }

    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    // Resolve configuration and viewport state.
    // Value could be:
    // - empty/undefined
    // - JSON config: { grid: 20 }
    // - explicit viewport object: { x: 0, y: 0, zoom: 1 } or signal expression
    let config: any = {};
    if (value && value.trim()) {
      try {
        config = runtime.evaluate(element, value);
      } catch {
        config = {};
      }
    }

    const isViewportObj = config && typeof config === 'object' && !Array.isArray(config)
      && ('zoom' in config || 'x' in config || 'y' in config);

    let state: Viewport;
    if (isViewportObj) {
      state = config;
    } else {
      // Check if a 'viewport' signal already exists in element's scope
      let inScopeVp: any = null;
      try {
        inScopeVp = runtime.evaluate(element, 'viewport');
      } catch { /* ignore */ }
      if (inScopeVp && typeof inScopeVp === 'object' && ('zoom' in inScopeVp || 'x' in inScopeVp || 'y' in inScopeVp)) {
        state = inScopeVp;
      } else {
        state = reactive({ x: 0, y: 0, zoom: 1, tick: 0 });
      }
    }

    if (state.zoom === undefined) state.zoom = 1;
    if (state.x === undefined) state.x = 0;
    if (state.y === undefined) state.y = 0;
    if ((state as any).tick === undefined) (state as any).tick = 0;

    // Viewport resolution: locate existing viewport or first child container
    const content = (element.querySelector('[data-flow-viewport], .flow-viewport') as HTMLElement | null)
      || (element.firstElementChild as HTMLElement | null)
      || element;

    // Publish for descendant directives ($flow, nodes, handles) so they read
    // the SAME live object instead of re-evaluating the attribute expression.
    element.__flowViewport = state;
    element.__nexusFlowViewport = state;

    const gridAttr = element.getAttribute('data-flow-grid');
    const gridSize = config?.grid ?? (gridAttr !== null ? (parseFloat(gridAttr) || 0) : 0);

    // --- Panning (xyflow panOnDrag): drag the empty pane to move the canvas ---
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    const canPan = (e: PointerEvent): boolean => {
      // Middle button or alt+left always pans; plain left pans only from the
      // empty canvas (not from nodes, handles, or interactive controls).
      if (e.button === 1) return true;
      if (e.button === 0 && e.altKey) return true;
      if (e.button === 0) return !(e.target as HTMLElement).closest(NO_PAN);
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!canPan(e)) return;
      isPanning = true;
      startX = e.clientX - state.x;
      startY = e.clientY - state.y;
      try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning) return;
      state.x = e.clientX - startX;
      state.y = e.clientY - startY;
      (state as any).tick = ((state as any).tick || 0) + 1;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPanning) return;
      isPanning = false;
      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.cursor = '';
    };

    // --- Zooming (xyflow zoomOnScroll + zoomOnPinch), cursor-anchored ---------
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const factor = Math.exp(-e.deltaY * 0.0015);
      const prevZoom = state.zoom || 1;
      const nextZoom = Math.min(Math.max(prevZoom * factor, MIN_ZOOM), MAX_ZOOM);
      if (nextZoom === prevZoom) return;

      // Keep the flow point under the cursor fixed (pointToRendererPoint).
      const fx = (px - state.x) / prevZoom;
      const fy = (py - state.y) / prevZoom;
      state.x = px - fx * nextZoom;
      state.y = py - fy * nextZoom;
      state.zoom = nextZoom;
      (state as any).tick = ((state as any).tick || 0) + 1;
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    // Post-layout settle: bump tick across several initial frames so edge paths recompute once real geometry is available.
    let settleFrames = 0;
    const settle = () => {
      (state as any).tick = ((state as any).tick || 0) + 1;
      if (++settleFrames < 24) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);

    const stop = runtime.effect(() => {
      const zoom = state.zoom || 1;
      const x = state.x || 0;
      const y = state.y || 0;

      // The viewport: ONE transformed layer holding nodes + edges
      if (content !== element && !content.hasAttribute('data-flow-viewport')) {
        content.setAttribute('data-flow-viewport', '');
      }
      content.style.transformOrigin = '0 0';
      content.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

      // The grid: background pattern scaled by zoom and offset by pan
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
      delete element.__flowViewport;
      delete element.__nexusFlowViewport;
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-node: Spatial Node Directive
// ---------------------------------------------------------------------------
export const flowNodeAttribute: AttributeModule = {
  name: 'flowNode',
  attribute: 'flow-node',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
    const nodeState = runtime.evaluate(element, value) as any;
    if (!nodeState || typeof nodeState !== 'object') return;

    const readPos = () => {
      const p = nodeState.position;
      return p
        ? { x: p.x || 0, y: p.y || 0 }
        : { x: nodeState.x || 0, y: nodeState.y || 0 };
    };
    const writePos = (x: number, y: number) => {
      if (nodeState.position) { nodeState.position.x = x; nodeState.position.y = y; }
      else { nodeState.x = x; nodeState.y = y; }
    };

    // Snap grid: node opt-in via data-flow-snap, else the viewport grid (px).
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
    let initialX = 0;
    let initialY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      // Divide by live zoom so the node tracks the cursor 1:1 on screen.
      const flowEl = element.closest('[data-flow]') as FlowElement | null;
      const vp = flowEl?.__flowViewport || flowEl?.__nexusFlowViewport;
      const zoom = vp?.zoom || 1;
      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      const snapped = snapPoint(initialX + dx, initialY + dy, resolveSnap());
      writePos(snapped.x, snapped.y);

      // Crucial: bump viewport.tick on every drag frame so edges track the node at 60fps!
      if (vp) {
        (vp as any).tick = ((vp as any).tick || 0) + 1;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.zIndex = '';
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.altKey) return;
      // Never drag from ports or interactive controls.
      if ((e.target as HTMLElement).closest(
        '[data-flow-handle],[data-flow-nodrag],button,a,input,textarea,select,label'
      )) return;
      e.stopPropagation();
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const p = readPos();
      initialX = p.x;
      initialY = p.y;
      try { element.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.zIndex = '1000';

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    element.addEventListener('pointerdown', onPointerDown);

    const stop = runtime.effect(() => {
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      const p = readPos();
      const s = snapPoint(p.x, p.y, resolveSnap());
      element.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
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
// data-flow-handle: Port Directive (connection dragging)
// ---------------------------------------------------------------------------
export const flowHandleAttribute: AttributeModule = {
  name: 'flowHandle',
  attribute: 'flow-handle',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);

    // Resolve kind ('source' or 'target')
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
      const expr = (svg?.getAttribute('data-flow-edges-expr'))
        || (svg?.getAttribute('data-flow-edges'))
        || 'edges';
      try {
        const arr = runtime.evaluate(vp, expr) as any;
        return Array.isArray(arr) ? arr : null;
      } catch {
        return null;
      }
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
            if (vpState) {
              (vpState as any).tick = ((vpState as any).tick || 0) + 1;
            }
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
// data-flow-edges: Edge Overlay Directive (Automated SVG wiring)
// ---------------------------------------------------------------------------
export const flowEdgesAttribute: AttributeModule = {
  name: 'flowEdges',
  attribute: 'flow-edges',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    ensureFlowStyles(element.getRootNode() as Document | ShadowRoot);
    const expr = value.trim() || 'edges';
    element.setAttribute('data-flow-edges-expr', expr);

    // Ensure the edges SVG lives INSIDE the transformed viewport so edge paths,
    // expressed in flow-space, scale and pan together with the nodes.
    const flowEl = element.closest('[data-flow]') as FlowElement | null;
    const content = flowEl?.querySelector('[data-flow-viewport], .flow-viewport') as HTMLElement | null;
    if (content && element.parentElement !== content) {
      content.insertBefore(element, content.firstChild);
    }

    // Check if the developer provided an explicit template or path inside <svg data-flow-edges>
    const hasCustomTemplate = element.querySelector('template, path[data-for], path[data-effect]');
    if (hasCustomTemplate) {
      // Developer provides custom edge template; leave rendering to template
      return;
    }

    // Automated edge rendering (Option 2):
    const stop = runtime.effect(() => {
      const currentFlow = element.closest('[data-flow]') as FlowElement | null;
      const vp = currentFlow?.__flowViewport || currentFlow?.__nexusFlowViewport;
      // Read reactive tick to re-run whenever any node moves or viewport pans
      const _t = (vp as any)?.tick;

      let edgeList: any[] = [];
      try {
        const evaluated = runtime.evaluate(element, expr);
        if (Array.isArray(evaluated)) edgeList = evaluated;
      } catch { /* ignore */ }

      const existingPaths = new Map<string, SVGPathElement>();
      element.querySelectorAll('path[data-edge-key]').forEach((p) => {
        existingPaths.set(p.getAttribute('data-edge-key')!, p as SVGPathElement);
      });

      const activeKeys = new Set<string>();

      edgeList.forEach((edge) => {
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

        const d = (runtime as any).$flow?.edge?.(srcId, tgtId, {
          type: edge.type || 'bezier',
          curvature: edge.curvature,
          container: currentFlow || undefined
        }) || '';

        if (d) {
          pathEl.setAttribute('d', d);
        }
      });

      // Remove obsolete paths
      existingPaths.forEach((pathEl, key) => {
        if (!activeKeys.has(key)) {
          pathEl.remove();
        }
      });
    });

    return () => {
      stop();
      element.removeAttribute('data-flow-edges-expr');
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
