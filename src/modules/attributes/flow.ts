import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

interface Viewport { x: number; y: number; zoom: number }
type FlowElement = HTMLElement & { __nexusFlowViewport?: Viewport };

/** Elements that must not initiate a canvas pan when pressed. */
const NO_PAN = '[data-flow-node],[data-flow-handle],[data-flow-nodrag],button,a,input,textarea,select,label';

/** Read the shared, live viewport state a [data-flow] element publishes. */
const sharedViewport = (el: Element | null): Viewport => {
  const flow = el?.closest('[data-flow]') as FlowElement | null;
  const vp = flow?.__nexusFlowViewport;
  return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
};

// ---------------------------------------------------------------------------
// data-flow: Root Viewport / Pane Directive
// ---------------------------------------------------------------------------
export const flowAttribute: AttributeModule = {
  name: 'flow',
  attribute: 'flow',
  handle: (element: FlowElement, value: string, runtime: RuntimeContext) => {
    // Resolve viewport state. If the expression already yields a viewport-like
    // object ({x,y,zoom}) use it directly (declarative, shared with the page).
    // Otherwise (e.g. `data-flow="nodes"`) create an internal reactive one.
    const evaluated = runtime.evaluate(element, value) as any;
    const isViewport = evaluated && typeof evaluated === 'object' && !Array.isArray(evaluated)
      && ('zoom' in evaluated || 'x' in evaluated || 'y' in evaluated);
    const state: Viewport = isViewport
      ? evaluated
      : reactive({ x: 0, y: 0, zoom: 1 });
    if (state.zoom === undefined) state.zoom = 1;
    if (state.x === undefined) state.x = 0;
    if (state.y === undefined) state.y = 0;

    // Publish for descendant directives ($flow, nodes, handles) so they read
    // the SAME live object instead of re-evaluating the attribute expression.
    element.__nexusFlowViewport = state;
    element.classList.add('nexus-flow', 'nexus-flow-pane');

    const gridAttr = element.getAttribute('data-flow-grid');
    const gridSize = gridAttr !== null ? (parseFloat(gridAttr) || 0) : 0;

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
      element.setPointerCapture(e.pointerId);
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning) return;
      state.x = e.clientX - startX;
      state.y = e.clientY - startY;
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
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    // Post-layout settle: edge paths are measured from node/handle DOM, which is
    // not fully laid out on first paint (handles depend on async utility-class
    // styling). Bumping a reactive `tick` on the viewport across several frames
    // lets edge effects (which read viewport.tick) recompute once real geometry
    // is available. A ResizeObserver keeps edges correct through late reflows.
    if ((state as any).tick === undefined) (state as any).tick = 0;
    let settleFrames = 0;
    const settle = () => {
      (state as any).tick++;
      if (++settleFrames < 24) requestAnimationFrame(settle);
      else if (settleFrames === 24) setTimeout(() => (state as any).tick++, 350);
    };
    requestAnimationFrame(settle);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      const contentEl = element.querySelector('.nexus-flow-content') as HTMLElement | null;
      if (contentEl) {
        ro = new ResizeObserver(() => { (state as any).tick++; });
        ro.observe(contentEl);
      }
    }

    const stop = runtime.effect(() => {
      const zoom = state.zoom || 1;
      const x = state.x || 0;
      const y = state.y || 0;

      // The viewport: ONE transformed layer holding nodes + edges, so both
      // scale together automatically (xyflow Viewport.svelte).
      const content = element.querySelector('.nexus-flow-content') as HTMLElement || element;
      content.classList.add('nexus-flow-viewport');
      content.style.transformOrigin = '0 0';
      content.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

      // The grid: a separate, untransformed layer whose pattern is scaled by
      // zoom and offset by the pan (xyflow Background.svelte). Driven from the
      // same viewport state, so grid and nodes scale symmetrically.
      if (gridSize > 0 && element.style.backgroundImage) {
        const scaled = gridSize * zoom;
        element.style.backgroundSize = `${scaled}px ${scaled}px`;
        element.style.backgroundPosition = `${x}px ${y}px`;
      }
    });

    return () => {
      stop();
      if (ro) ro.disconnect();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('wheel', onWheel);
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
      element.setPointerCapture(e.pointerId);
      element.style.zIndex = '1000';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      // Divide by live zoom so the node tracks the cursor 1:1 on screen.
      const zoom = sharedViewport(element).zoom;
      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      const snapped = snapPoint(initialX + dx, initialY + dy, resolveSnap());
      writePos(snapped.x, snapped.y);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      element.style.zIndex = '';
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);

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
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
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
    // The value may be a literal ("source") or an expression ("handle.type")
    // resolved against the element scope. Resolve it, defaulting to 'source'.
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
    element.setAttribute('data-nexus-flow-handle', kind);
    element.classList.add('nexus-flow-handle');

    const viewport = () => element.closest('[data-flow]') as HTMLElement | null;

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
      const expr = (svg?.getAttribute('data-nexus-flow-edges-expr'))
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
        || srcNode?.getAttribute('data-bind-id')
        || element.id
        || '';
      const start = anchorFlow(element);

      const preview = document.createElementNS(SVG_NS, 'path');
      preview.setAttribute('class', 'nexus-flow-edge nexus-flow-edge-preview');
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
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        preview.remove();
        const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const targetNode = target?.closest('[data-flow-node]') as HTMLElement | null;
        const tgtId = targetNode?.id || targetNode?.getAttribute('data-bind-id') || '';
        if (tgtId && tgtId !== srcId) {
          const edges = edgesArray();
          if (edges && !edges.some((ed: any) => ed.source === srcId && ed.target === tgtId)) {
            edges.push({ source: srcId, target: tgtId });
          }
        }
      };

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    };

    element.addEventListener('pointerdown', onPointerDown);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
    };
  }
};

// ---------------------------------------------------------------------------
// data-flow-edges: Edge Overlay Directive
// ---------------------------------------------------------------------------
export const flowEdgesAttribute: AttributeModule = {
  name: 'flowEdges',
  attribute: 'flow-edges',
  handle: (element: HTMLElement, value: string) => {
    const expr = value.trim() || 'edges';
    element.setAttribute('data-nexus-flow-edges-expr', expr);
    element.classList.add('nexus-flow-edges', 'absolute', 'inset-0', 'overflow-visible', 'pointer-events-none');

    // Ensure the edges SVG lives INSIDE the transformed viewport so edge paths,
    // expressed in flow-space, scale and pan together with the nodes.
    const flowEl = element.closest('[data-flow]') as HTMLElement | null;
    const content = flowEl?.querySelector('.nexus-flow-content') as HTMLElement | null;
    if (content && element.parentElement !== content) {
      content.appendChild(element);
    }

    return () => {
      element.removeAttribute('data-nexus-flow-edges-expr');
    };
  }
};

export default flowAttribute;
