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
import { sharedViewport, toFlowCoords, FlowElement, Viewport } from '../attributes/flow.ts';

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

export const flowModule: SpriteModule = {
  name: 'flow',
  key: '$flow',
  sprites: (context: RuntimeContext) => {

    // -----------------------------------------------------------------------
    // Bezier & Orthogonal Path Geometry (xyflow parity)
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

    const handleDirections: Record<Side, { x: number; y: number }> = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      top: { x: 0, y: -1 },
      bottom: { x: 0, y: 1 },
    };

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(b.x - a.x, b.y - a.y);

    const getBend = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, size: number): string => {
      const bendSize = Math.min(dist(a, b) / 2, dist(b, c) / 2, size);
      const { x, y } = b;
      if (bendSize <= 0 || (a.x === x && x === c.x) || (a.y === y && y === c.y)) {
        return `L ${x} ${y}`;
      }
      if (a.y === y) {
        const xDir = a.x < c.x ? -1 : 1;
        const yDir = a.y < c.y ? 1 : -1;
        return `L ${x + bendSize * xDir},${y} Q ${x},${y} ${x},${y + bendSize * yDir}`;
      }
      const xDir = a.x < c.x ? 1 : -1;
      const yDir = a.y < c.y ? -1 : 1;
      return `L ${x},${y + bendSize * yDir} Q ${x},${y} ${x + bendSize * xDir},${y}`;
    };

    /** xyflow smoothstep / step path generator with rounded orthogonal corners. */
    const smoothStepPath = (
      sx: number, sy: number, sSide: Side,
      tx: number, ty: number, tSide: Side,
      borderRadius = 5,
      offset = 20,
      stepPosition = 0.5
    ): { path: string; labelX: number; labelY: number } => {
      const source = { x: sx, y: sy };
      const target = { x: tx, y: ty };
      const sourceDir = handleDirections[sSide];
      const targetDir = handleDirections[tSide];
      const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
      const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };

      const dir = (sSide === 'left' || sSide === 'right')
        ? (sourceGapped.x < targetGapped.x ? { x: 1, y: 0 } : { x: -1, y: 0 })
        : (sourceGapped.y < targetGapped.y ? { x: 0, y: 1 } : { x: 0, y: -1 });
      const dirAccessor: 'x' | 'y' = dir.x !== 0 ? 'x' : 'y';
      const currDir = dir[dirAccessor];

      let points: Array<{ x: number; y: number }> = [];
      let centerX = (sx + tx) / 2;
      let centerY = (sy + ty) / 2;

      if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
        centerX = dirAccessor === 'x' ? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition : (sourceGapped.x + targetGapped.x) / 2;
        centerY = dirAccessor === 'y' ? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition : (sourceGapped.y + targetGapped.y) / 2;
        const isVert = (sourceDir[dirAccessor] === currDir) === (dirAccessor === 'x');
        points = isVert
          ? [{ x: centerX, y: sourceGapped.y }, { x: centerX, y: targetGapped.y }]
          : [{ x: sourceGapped.x, y: centerY }, { x: targetGapped.x, y: centerY }];
      } else {
        const useTargetSource = (dirAccessor === 'x' ? sourceDir.x : sourceDir.y) === currDir;
        points = useTargetSource
          ? [{ x: targetGapped.x, y: sourceGapped.y }]
          : [{ x: sourceGapped.x, y: targetGapped.y }];
      }

      const pathPoints = [source, sourceGapped, ...points, targetGapped, target];
      const deduped: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < pathPoints.length; i++) {
        const p = pathPoints[i];
        const prev = deduped[deduped.length - 1];
        if (!prev || prev.x !== p.x || prev.y !== p.y) deduped.push(p);
      }

      let path = `M ${deduped[0].x} ${deduped[0].y}`;
      for (let i = 1; i < deduped.length - 1; i++) {
        path += ' ' + getBend(deduped[i - 1], deduped[i], deduped[i + 1], borderRadius);
      }
      path += ` L ${deduped[deduped.length - 1].x} ${deduped[deduped.length - 1].y}`;
      return { path, labelX: centerX, labelY: centerY };
    };

    /** Full xyflow bezier: directional control points based on handle sides. */
    const bezierPath = (
      sx: number, sy: number, ssIde: Side,
      tx: number, ty: number, tSide: Side,
      curvature = 0.25
    ): { path: string; labelX: number; labelY: number } => {
      const [scx, scy] = controlWithCurvature(ssIde, sx, sy, tx, ty, curvature);
      const [tcx, tcy] = controlWithCurvature(tSide, tx, ty, sx, sy, curvature);
      const path = `M${sx},${sy} C${scx},${scy} ${tcx},${tcy} ${tx},${ty}`;
      const labelX = sx * 0.125 + scx * 0.375 + tcx * 0.375 + tx * 0.125;
      const labelY = sy * 0.125 + scy * 0.375 + tcy * 0.375 + ty * 0.125;
      return { path, labelX, labelY };
    };

    /** Simple straight line generator. */
    const straightPath = (x1: number, y1: number, x2: number, y2: number) =>
      `M ${x1} ${y1} L ${x2} ${y2}`;

    /** Unified edge geometry generator for bezier, step, smoothstep, and straight lines. */
    const computeEdgePath = (
      type: string,
      sx: number, sy: number, sSide: Side,
      tx: number, ty: number, tSide: Side,
      opts: { curvature?: number; borderRadius?: number; offset?: number; stepPosition?: number } = {}
    ) => {
      if (type === 'straight') return { path: straightPath(sx, sy, tx, ty), labelX: (sx + tx) / 2, labelY: (sy + ty) / 2 };
      if (type === 'step') return smoothStepPath(sx, sy, sSide, tx, ty, tSide, 0, opts.offset ?? 20, opts.stepPosition ?? 0.5);
      if (type === 'smoothstep') return smoothStepPath(sx, sy, sSide, tx, ty, tSide, opts.borderRadius ?? 5, opts.offset ?? 20, opts.stepPosition ?? 0.5);
      return bezierPath(sx, sy, sSide, tx, ty, tSide, opts.curvature ?? 0.25);
    };

    // -----------------------------------------------------------------------
    // Viewport & DOM Coordinates Helpers
    // -----------------------------------------------------------------------
    const flowContainer = (el: Element | null): FlowElement | null =>
      (el?.closest('[data-flow]') as FlowElement) || null;

    const anchorFlow = (el: Element, container: HTMLElement, vp?: Viewport) => {
      const r = el.getBoundingClientRect();
      return toFlowCoords(container, r.left + r.width / 2, r.top + r.height / 2, vp);
    };

    const getVp = (target?: any): { container: FlowElement | null; vp: Viewport | null } => {
      const container = (target instanceof Element ? (flowContainer(target) || document.querySelector('[data-flow]')) : document.querySelector('[data-flow]')) as FlowElement | null;
      return { container, vp: container?.__flowViewport || null };
    };

    const inferSide = (handle: Element, node: Element): Side => {
      const declared = (handle.getAttribute('data-flow-side') || '').toLowerCase();
      if (declared === 'left' || declared === 'right' || declared === 'top' || declared === 'bottom') {
        return declared as Side;
      }
      const h = handle.getBoundingClientRect();
      const n = node.getBoundingClientRect();
      const relX = (h.left + h.width / 2 - n.left) / (n.width || 1);
      const relY = (h.top + h.height / 2 - n.top) / (n.height || 1);
      const dl = relX, dr = 1 - relX, dt = relY, db = 1 - relY;
      const min = Math.min(dl, dr, dt, db);
      return min === dl ? 'left' : min === dr ? 'right' : min === dt ? 'top' : 'bottom';
    };

    const findNode = (id: string, container?: HTMLElement | null): HTMLElement | null => {
      if (!id) return null;
      let el = document.getElementById(id) || document.getElementById(`node-${id}`);
      if (el) return el;
      if (id.startsWith('node-')) {
        el = document.getElementById(id.slice(5));
        if (el) return el;
      }
      return ((container || document).querySelector(`[data-id="${id}"], [data-node-id="${id}"]`) as HTMLElement | null);
    };

    const findHandle = (node: HTMLElement, role: 'source' | 'target'): HTMLElement | null => {
      const real = (sel: string) =>
        Array.from(node.querySelectorAll<HTMLElement>(sel))
          .find(el => !(el as any)[IS_TEMPLATE_KEY] && !el.hasAttribute('data-for')) || null;
      return real(`[data-flow-handle="${role}"]`)
        || real(`[data-flow-handle-type="${role}"]`)
        || real('[data-flow-handle]');
    };

    const resolveNodeEndpoint = (node: any, handleId: string | undefined, defaultType: 'source' | 'target', defaultSide: Side) => {
      const p = node.position || node;
      const pos = { x: Number(p.x) || 0, y: Number(p.y) || 0 };
      const w = Number(node.width || node.w) || 192;
      const h = Number(node.height || node.h) || 90;
      let handle: any = null;
      let side: Side = defaultSide;
      if (Array.isArray(node.handles) && node.handles.length > 0) {
        handle = handleId
          ? node.handles.find((item: any) => item.id === handleId)
          : node.handles.find((item: any) => item.type === defaultType) || node.handles[0];
        if (handle?.side) side = handle.side;
      }
      const sameSide = (node.handles || []).filter((item: any) => (item.side || (item.type === 'source' ? 'right' : 'left')) === side);
      const idx = Math.max(0, sameSide.indexOf(handle));
      const count = Math.max(1, sameSide.length);
      const fraction = count === 1 ? 0.5 : (idx + 1) / (count + 1);

      let pt: { x: number; y: number };
      if (side === 'left') pt = { x: pos.x, y: pos.y + h * fraction };
      else if (side === 'right') pt = { x: pos.x + w, y: pos.y + h * fraction };
      else if (side === 'top') pt = { x: pos.x + w * fraction, y: pos.y };
      else pt = { x: pos.x + w * fraction, y: pos.y + h };

      return { pt, side };
    };

    const $flow = {
      /** Screen coordinates -> flow-space (public, xyflow pointToRendererPoint). */
      screenToFlow: (container: HTMLElement, x: number, y: number, state?: Viewport) =>
        toFlowCoords(container, x, y, state),

      /** Bounding box of a node collection in flow-space (supports parentId sub-flows). */
      getBounds: (nodes: any[]) => {
        if (!nodes || nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        const nodeMap = new Map<string, any>();
        nodes.forEach(n => { if (n.id) nodeMap.set(String(n.id), n); });

        const getAbsolutePos = (n: any): { x: number; y: number } => {
          const p = n.position || n;
          let x = p.x || 0;
          let y = p.y || 0;
          if (n.parentId && nodeMap.has(String(n.parentId))) {
            const parentPos = getAbsolutePos(nodeMap.get(String(n.parentId)));
            x += parentPos.x;
            y += parentPos.y;
          }
          return { x, y };
        };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
          const abs = getAbsolutePos(n);
          const w = n.w || n.width || 160, h = n.h || n.height || 90;
          minX = Math.min(minX, abs.x); minY = Math.min(minY, abs.y);
          maxX = Math.max(maxX, abs.x + w); maxY = Math.max(maxY, abs.y + h);
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

      /** Zoom in on canvas viewport */
      zoomIn: (target?: any, delta = 0.2) => {
        const { vp } = getVp(target);
        if (vp) vp.zoom = Math.min(4, (vp.zoom || 1) + delta);
      },

      /** Zoom out on canvas viewport */
      zoomOut: (target?: any, delta = 0.2) => {
        const { vp } = getVp(target);
        if (vp) vp.zoom = Math.max(0.2, (vp.zoom || 1) - delta);
      },

      /** Reset canvas viewport position and zoom */
      reset: (target?: any) => {
        const { vp } = getVp(target);
        if (vp) { vp.x = 0; vp.y = 0; vp.zoom = 1; }
      },

      /** Fit canvas view to current nodes */
      fit: (target?: any, nodes?: any[], padding = 40) => {
        const { container, vp } = getVp(target);
        if (!container || !vp) return;
        let list = nodes;
        if (!list || list.length === 0) {
          try { list = context.evaluate(container, 'nodes') as any[]; } catch {}
        }
        if (list && list.length > 0) $flow.fitView(container, vp, list, padding);
      },

      /** Return SVG marker URL reference for arrowhead ends */
      marker: (type: 'arrow' | 'arrowclosed' = 'arrow') =>
        `url(#flow-${type === 'arrowclosed' ? 'arrow-closed' : 'arrow'})`,

      /**
       * Edge path string between two nodes computed in flow-space.
       * Fast-path: computes endpoints directly from reactive node proxies in memory
       * (Zero-Copy ZCZS, zero DOM reflows). Fallback: reads DOM node geometry.
       */
      edge: (
        sourceId: string,
        targetId: string,
        options: {
          type?: string;
          curvature?: number;
          borderRadius?: number;
          offset?: number;
          stepPosition?: number;
          container?: HTMLElement;
          nodeMap?: Map<string, any> | Record<string, any>;
          nodes?: any[];
          sourceHandle?: string;
          targetHandle?: string;
        } = {}
      ): any => {
        let nodeA: any = null;
        let nodeB: any = null;

        if (options.nodeMap) {
          if (options.nodeMap instanceof Map) {
            nodeA = options.nodeMap.get(String(sourceId));
            nodeB = options.nodeMap.get(String(targetId));
          } else {
            nodeA = (options.nodeMap as Record<string, any>)[String(sourceId)];
            nodeB = (options.nodeMap as Record<string, any>)[String(targetId)];
          }
        } else if (Array.isArray(options.nodes)) {
          nodeA = options.nodes.find((n: any) => String(n.id) === String(sourceId));
          nodeB = options.nodes.find((n: any) => String(n.id) === String(targetId));
        }

        let s: { x: number; y: number } | null = null;
        let t: { x: number; y: number } | null = null;
        let sSide: Side = 'right';
        let tSide: Side = 'left';

        // Fast-path: Calculate purely from in-memory reactive node proxies (Zero-Copy ZCZS)
        if (nodeA && nodeB) {
          const epA = resolveNodeEndpoint(nodeA, options.sourceHandle, 'source', 'right');
          const epB = resolveNodeEndpoint(nodeB, options.targetHandle, 'target', 'left');
          s = epA.pt; sSide = epA.side;
          t = epB.pt; tSide = epB.side;
        }

        // Fallback: If not in memory map, query DOM (backwards-compatibility)
        if (!s || !t) {
          const a = findNode(sourceId, options.container);
          const b = findNode(targetId, options.container);
          if (!a || !b) return '';
          const container = options.container || flowContainer(a) || flowContainer(b);
          if (!container) return '';
          const vp = sharedViewport(a);

          const srcHandle = findHandle(a, 'source');
          const tgtHandle = findHandle(b, 'target');

          s = anchorFlow(srcHandle || a, container, vp);
          t = anchorFlow(tgtHandle || b, container, vp);

          sSide = srcHandle ? inferSide(srcHandle, a) : 'right';
          tSide = tgtHandle ? inferSide(tgtHandle, b) : 'left';
        }

        const res = computeEdgePath(options.type || 'bezier', s.x, s.y, sSide, t.x, t.y, tSide, options);
        return {
          d: res.path,
          labelX: res.labelX,
          labelY: res.labelY,
          sourceX: s.x,
          sourceY: s.y,
          targetX: t.x,
          targetY: t.y,
          sourceSide: sSide,
          targetSide: tSide,
          toString() { return this.d; },
          valueOf() { return this.d; }
        };
      },

      /**
       * Reactive edge attached to two live DOM elements. Returns a reactive
       * `{ d, labelX, labelY }` computed on demand.
       */
      connect: (elA: HTMLElement, elB: HTMLElement, options: { type?: string; curvature?: number; borderRadius?: number } = {}) => {
        const pathData = reactive({ d: '', labelX: 0, labelY: 0 });
        const update = () => {
          if (!elA || !elB || typeof elA.getBoundingClientRect !== 'function') return;
          const container = flowContainer(elA) || flowContainer(elB);
          if (!container) return;
          const vp = sharedViewport(elA);
          const s = anchorFlow(elA, container, vp);
          const t = anchorFlow(elB, container, vp);
          const sSide = inferSide(elA, elA.parentElement || elA);
          const tSide = inferSide(elB, elB.parentElement || elB);
          const res = computeEdgePath(options.type || 'bezier', s.x, s.y, sSide, t.x, t.y, tSide, options);
          pathData.d = res.path;
          pathData.labelX = res.labelX;
          pathData.labelY = res.labelY;
        };
        update();
        return pathData;
      }
    };

    // Expose on context so nested sprites (fitView) can self-reference.
    (context as any).$flow = $flow;
    return $flow;
  }
};

export default flowModule;
