/**
 * Nexus-UX Flow Sprite `$flow`
 *
 * High-performance coordinate math and graph orchestration for node-link
 * diagrams. Ported faithfully from xyflow (React/Svelte Flow) so edges use
 * the same side-aware, curvature-based bezier geometry that gives the
 * polished, directional look — while staying declarative and reactive.
 *
 * Capabilities:
 *   - Bezier path generation with handle side awareness
 *   - Viewport transform (pan/zoom) math
 *   - Node positioning and edge routing
 *   - Reactive graph state management
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Geometry calculations operate on plain objects.
 *   - Zero-serialization: No intermediate serialization of graph state.
 *
 * Coordination:
 *   - ModuleCoordinator registers via registerSpriteModule
 *   - drag.ts integrates flow for drag-drop node positioning
 *   - svg.ts integrates flow for SVG edge rendering
 *
 * Nexus-UX Innovation Preserved:
 *   - Declarative graph state management
 *   - Reactive node/edge binding
 *   - xyflow-compatible bezier geometry
 */

import { SpriteModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';
import { IS_TEMPLATE_KEY } from '../../engine/consts.ts';

/**
 * $flow Sprite.
 *
 * High-performance coordinate math and graph orchestration for node-link
 * diagrams. Ported faithfully from xyflow (React/Svelte Flow) so edges use the
 * same side-aware, curvature-based bezier geometry that gives the polished,
 * directional look — while staying declarative and reactive for Nexus-UX.
 */

/** xyflow handle sides. */
type Side = 'left' | 'right' | 'top' | 'bottom';

interface Viewport { x: number; y: number; zoom: number }

export const flowModule: SpriteModule = {
  name: 'flow',
  key: '$flow',
  sprites: (context: RuntimeContext) => {

    // -----------------------------------------------------------------------
    // Bezier geometry (xyflow parity: getBezierPath + getControlWithCurvature)
    // -----------------------------------------------------------------------
    const calculateControlOffset = (distance: number, curvature: number): number =>
      distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);

    const controlWithCurvature = (
      side: Side, x1: number, y1: number, x2: number, y2: number, c: number
    ): [number, number] => {
      switch (side) {
        case 'left': return [x1 - calculateControlOffset(x1 - x2, c), y1];
        case 'right': return [x1 + calculateControlOffset(x2 - x1, c), y1];
        case 'top': return [x1, y1 - calculateControlOffset(y1 - y2, c)];
        case 'bottom': return [x1, y1 + calculateControlOffset(y2 - y1, c)];
      }
    };

    /** Full xyflow bezier: directional control points based on handle sides. */
    const bezierPath = (
      sx: number, sy: number, ssIde: Side,
      tx: number, ty: number, tSide: Side,
      curvature = 0.25
    ): string => {
      const [scx, scy] = controlWithCurvature(ssIde, sx, sy, tx, ty, curvature);
      const [tcx, tcy] = controlWithCurvature(tSide, tx, ty, sx, sy, curvature);
      return `M${sx},${sy} C${scx},${scy} ${tcx},${tcy} ${tx},${ty}`;
    };

    /** Simple generators (kept for non-bezier edge types). */
    const straightPath = (x1: number, y1: number, x2: number, y2: number) =>
      `M ${x1} ${y1} L ${x2} ${y2}`;
    const stepPath = (x1: number, y1: number, x2: number, y2: number) => {
      const mx = x1 + (x2 - x1) / 2;
      return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
    };

    // -----------------------------------------------------------------------
    // Viewport / coordinate helpers
    // -----------------------------------------------------------------------
    /** The shared viewport state stashed on a [data-flow] element by the directive. */
    const viewportOf = (el: Element | null): Viewport => {
      const flow = el?.closest('[data-flow]') as (HTMLElement & { __nexusFlowViewport?: Viewport }) | null;
      const vp = flow?.__nexusFlowViewport;
      return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
    };

    const flowContainer = (el: Element | null): HTMLElement | null =>
      (el?.closest('[data-flow]') as HTMLElement) || null;

    /** Convert a screen point to flow-space coordinates (pointToRendererPoint). */
    const screenToFlow = (clientX: number, clientY: number, container: HTMLElement, vp: Viewport) => {
      const r = container.getBoundingClientRect();
      return {
        x: (clientX - r.left - vp.x) / vp.zoom,
        y: (clientY - r.top - vp.y) / vp.zoom
      };
    };

    /** Center of an element in flow-space. */
    const anchorFlow = (el: Element, container: HTMLElement, vp: Viewport) => {
      const r = el.getBoundingClientRect();
      return screenToFlow(r.left + r.width / 2, r.top + r.height / 2, container, vp);
    };

    /**
     * Infer the xyflow handle side from geometry: compare the handle center to
     * the node's bounding box. This keeps the HTML free of extra bookkeeping —
     * any handle placed on an edge of the card resolves to the right Position.
     */
    const inferSide = (handle: Element, node: Element): Side => {
      const declared = (handle.getAttribute('data-flow-side') || '').toLowerCase();
      if (declared === 'left' || declared === 'right' || declared === 'top' || declared === 'bottom') {
        return declared as Side;
      }
      const h = handle.getBoundingClientRect();
      const n = node.getBoundingClientRect();
      const hx = h.left + h.width / 2;
      const hy = h.top + h.height / 2;
      const relX = (hx - n.left) / (n.width || 1);
      const relY = (hy - n.top) / (n.height || 1);
      // Distance to each edge (0 = on that edge).
      const dl = relX, dr = 1 - relX, dt = relY, db = 1 - relY;
      const min = Math.min(dl, dr, dt, db);
      if (min === dl) return 'left';
      if (min === dr) return 'right';
      if (min === dt) return 'top';
      return 'bottom';
    };

    /** Find the best handle element on a node for a given role. */
    const findHandle = (node: HTMLElement, role: 'source' | 'target'): HTMLElement | null => {
      // Exclude data-for template clones (hidden, not real geometry).
      const real = (sel: string) =>
        Array.from(node.querySelectorAll<HTMLElement>(sel))
          .find(el => !(el as any)[IS_TEMPLATE_KEY] && !el.hasAttribute('data-for')) || null;
      return real(`[data-flow-handle="${role}"]`) || real('[data-flow-handle]');
    };

    const $flow = {
      /** Screen coordinates -> flow-space (public, xyflow pointToRendererPoint). */
      screenToFlow: (container: HTMLElement, x: number, y: number, state: Viewport) =>
        screenToFlow(x, y, container, state),

      /** Bounding box of a node collection in flow-space. */
      getBounds: (nodes: any[]) => {
        if (!nodes || nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
          const p = n.position || n;
          const x = p.x || 0, y = p.y || 0, w = n.w || n.width || 160, h = n.h || n.height || 90;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      },

      /** Center + zoom the viewport to fit all nodes (mutates viewport state). */
      fitView: (container: HTMLElement, state: Viewport, nodes: any[], padding = 40) => {
        const bounds = $flow.getBounds(nodes);
        if (bounds.w <= 0 || bounds.h <= 0) return;
        const rect = container.getBoundingClientRect();
        const zoom = Math.min(
          (rect.width - padding * 2) / bounds.w,
          (rect.height - padding * 2) / bounds.h,
          1.5
        );
        state.x = (rect.width - bounds.w * zoom) / 2 - bounds.x * zoom;
        state.y = (rect.height - bounds.h * zoom) / 2 - bounds.y * zoom;
        state.zoom = zoom;
      },

      /**
       * Synchronous edge path string between two nodes (by DOM id), computed in
       * flow-space so it is independent of the current pan/zoom. The edges SVG
       * lives inside the transformed viewport, so this flow-space `d` renders
       * correctly and stays attached to handles as the canvas pans/zooms.
       *
       * Uses the real xyflow directional bezier anchored at the source/target
       * handle elements, inferring each handle's side from its geometry.
       */
      edge: (
        sourceId: string,
        targetId: string,
        options: { type?: string; curvature?: number; container?: HTMLElement } = {}
      ): string => {
        const a = document.getElementById(sourceId);
        const b = document.getElementById(targetId);
        if (!a || !b) return '';
        const container = options.container || flowContainer(a) || flowContainer(b);
        if (!container) return '';
        const vp = viewportOf(a);

        const srcHandle = findHandle(a, 'source');
        const tgtHandle = findHandle(b, 'target');

        const sAnchor = srcHandle || a;
        const tAnchor = tgtHandle || b;
        const s = anchorFlow(sAnchor, container, vp);
        const t = anchorFlow(tAnchor, container, vp);

        const type = options.type || 'bezier';
        if (type === 'straight') return straightPath(s.x, s.y, t.x, t.y);
        if (type === 'step') return stepPath(s.x, s.y, t.x, t.y);

        const sSide: Side = srcHandle ? inferSide(srcHandle, a) : 'right';
        const tSide: Side = tgtHandle ? inferSide(tgtHandle, b) : 'left';
        return bezierPath(s.x, s.y, sSide, t.x, t.y, tSide, options.curvature ?? 0.25);
      },

      /**
       * Reactive edge attached to two live DOM elements. Returns a reactive
       * `{ d }` that self-updates every frame — used for the connection preview
       * and any imperative edge rendering.
       */
      connect: (elA: HTMLElement, elB: HTMLElement, options: { type?: string; curvature?: number } = {}) => {
        const pathData = reactive({ d: '' });
        const update = () => {
          if (!elA || !elB || typeof elA.getBoundingClientRect !== 'function') return;
          const container = flowContainer(elA) || flowContainer(elB);
          if (!container) return;
          const vp = viewportOf(elA);
          const s = anchorFlow(elA, container, vp);
          const t = anchorFlow(elB, container, vp);
          const type = options.type || 'bezier';
          if (type === 'straight') { pathData.d = straightPath(s.x, s.y, t.x, t.y); return; }
          if (type === 'step') { pathData.d = stepPath(s.x, s.y, t.x, t.y); return; }
          pathData.d = bezierPath(
            s.x, s.y, inferSide(elA, elA.parentElement || elA),
            t.x, t.y, inferSide(elB, elB.parentElement || elB),
            options.curvature ?? 0.25
          );
        };
        const ticker = () => { update(); requestAnimationFrame(ticker); };
        ticker();
        return pathData;
      }
    };

    // Expose on context so nested sprites (fitView) can self-reference.
    (context as any).$flow = $flow;
    return $flow;
  }
};

export default flowModule;
