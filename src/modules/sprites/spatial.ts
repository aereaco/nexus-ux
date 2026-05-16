import { SpriteModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { buildReorderContext, DragReorderEngine } from '../attributes/drag.ts';

/**
 * $spatial Sprite.
 * Provides high-level spatial indexing and interactive drag engines.
 * 
 * Includes:
 * - Quadtree queries (nearest, query)
 * - Canvas Engine (xyFlow-style absolute drag)
 * - Sortable Engine (SortableJS-style reordering)
 */

interface CanvasNode {
  id: string;
  position: { x: number; y: number };
  [key: string]: unknown;
}

interface CanvasContext {
  container: HTMLElement;
  listExpr: string;
  snapGrid?: [number, number];
  handleSelector?: string;
  onDragStart?: (node: CanvasNode, event: PointerEvent) => void;
  onDrag?: (node: CanvasNode, x: number, y: number) => void;
  onDragEnd?: (node: CanvasNode) => void;
}

/**
 * SpatialCanvasEngine — xyFlow-inspired absolute positioning drag engine.
 * 
 * Key design decisions (ported from xyFlow XYDrag.ts):
 * 1. NO pointer capture — use document-level listeners for reliable tracking
 *    (matches d3-drag behavior which listens on window/document)
 * 2. Bound handlers stored as instance properties for proper cleanup
 * 3. Reactive state mutation drives DOM updates — no direct style writes
 *    that would conflict with data-bind-style reconciliation
 */
class SpatialCanvasEngine {
  private activeDrag: {
    node: CanvasNode;
    element: HTMLElement;
    startPos: { x: number; y: number };
    startNodePos: { x: number; y: number };
  } | null = null;

  // Store bound references for proper removeEventListener cleanup
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;

  constructor(private ctx: CanvasContext, private runtime: RuntimeContext) {
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.init();
  }

  private init() {
    // Delegation: pointerdown on the container catches all child node clicks
    this.ctx.container.addEventListener("pointerdown", this.boundPointerDown);
    // Document-level tracking (NOT pointer capture) for reliable drag
    // This mirrors xyFlow's d3-drag pattern which uses window/document listeners
    document.addEventListener("pointermove", this.boundPointerMove);
    document.addEventListener("pointerup", this.boundPointerUp);
    document.addEventListener("pointercancel", this.boundPointerUp);

    if (this.runtime.isDevMode) {
      console.log(`[Spatial Canvas] Engine initialized on <${this.ctx.container.tagName}>, listExpr: "${this.ctx.listExpr}"`);
    }
  }

  private onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const nodeElement = target.closest('[data-drag]') as HTMLElement;
    
    if (!nodeElement || !this.ctx.container.contains(nodeElement)) {
       if (this.runtime.isDevMode) console.log("[Spatial] PointerDown on container, no [data-drag] node found.");
       return;
    }

    if (this.ctx.handleSelector && !target.closest(this.ctx.handleSelector)) return;

    const nodeIdExpr = nodeElement.getAttribute('data-drag');
    if (!nodeIdExpr) return;

    // Evaluate the expression (e.g. "node.id") relative to the child element 
    // to resolve the reactive value from its data-for scope.
    const nodeId = this.runtime.evaluate(nodeElement, nodeIdExpr);
    
    // Resolve the list from the container's scope
    const result = this.runtime.evaluate(this.ctx.container, this.ctx.listExpr);
    const list = Array.isArray(result) ? result : [];
    const node = list.find((n) => String(n.id) === String(nodeId));
    
    if (!node) {
       if (this.runtime.isDevMode) {
         console.warn(`[Spatial] Node ID "${nodeId}" (from expr "${nodeIdExpr}") not found. List:`, list);
       }
       return;
    }

    if (this.runtime.isDevMode) {
      console.log(`[Spatial] Drag start: node ${nodeId} at (${node.position.x}, ${node.position.y})`);
    }

    // Prevent text selection during drag
    e.preventDefault();

    this.activeDrag = {
      node,
      element: nodeElement,
      startPos: { x: e.clientX, y: e.clientY },
      startNodePos: { x: node.position.x, y: node.position.y }
    };

    nodeElement.style.zIndex = '1000';
    this.ctx.onDragStart?.(node, e);
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.activeDrag) return;

    const dx = e.clientX - this.activeDrag.startPos.x;
    const dy = e.clientY - this.activeDrag.startPos.y;
    let x = this.activeDrag.startNodePos.x + dx;
    let y = this.activeDrag.startNodePos.y + dy;

    // Snap grid (matches xyFlow snapGrid behavior)
    if (this.ctx.snapGrid) {
      const [gx, gy] = this.ctx.snapGrid;
      x = Math.round(x / gx) * gx;
      y = Math.round(y / gy) * gy;
    }

    // Update the reactive store — this triggers the data-bind-style effect
    // which will reconcile the transform. This is the ZCZS-correct path:
    // mutation → reactivity trigger → effect → reconcileStyle → DOM update
    const node = this.activeDrag.node;
    node.position.x = x;
    node.position.y = y;

    this.ctx.onDrag?.(node, x, y);
  }

  private onPointerUp(_e: PointerEvent) {
    if (!this.activeDrag) return;

    if (this.runtime.isDevMode) {
      const n = this.activeDrag.node;
      console.log(`[Spatial] Drag end: node ${n.id} at (${n.position.x}, ${n.position.y})`);
    }

    this.activeDrag.element.style.zIndex = '';
    this.ctx.onDragEnd?.(this.activeDrag.node);
    this.activeDrag = null;
  }

  public destroy() {
    this.ctx.container.removeEventListener("pointerdown", this.boundPointerDown);
    document.removeEventListener("pointermove", this.boundPointerMove);
    document.removeEventListener("pointerup", this.boundPointerUp);
    document.removeEventListener("pointercancel", this.boundPointerUp);
  }
}

// ---------------------------------------------------------------------------
// SpatialSortableEngine — SortableJS-style list reordering
// ---------------------------------------------------------------------------
class SpatialSortableEngine {
  private reorderEngine: DragReorderEngine<unknown> | null = null;
  constructor(private ctx: Record<string, unknown>, private runtime: RuntimeContext) {
    const container = ctx.container as HTMLElement;
    const listExpr = ctx.listExpr as string;
    const context = buildReorderContext(container, listExpr, runtime, {
      direction: (ctx.direction as string) || 'vertical',
      animationDuration: (ctx.animationDuration as number) ?? 150,
      onReorder: (list, oldIdx, newIdx) => {
        runtime.globalSignals()["drag:reorder"] = { list, oldIndex: oldIdx, newIndex: newIdx };
      }
    });
    this.reorderEngine = new DragReorderEngine(context);
  }
  public destroy() { this.reorderEngine = null; }
}

// ---------------------------------------------------------------------------
// $spatial Sprite Module Export
// ---------------------------------------------------------------------------
export const spatialModule: SpriteModule = {
  name: 'spatial',
  key: '$spatial',
  sprites: (context: RuntimeContext) => {
    const getTree = () => (context as Record<string, unknown>).predictive 
      ? ((context as Record<string, unknown>).predictive as Record<string, unknown>)?.quadtree 
      : undefined;
    const canvasEngines = new Map<HTMLElement, SpatialCanvasEngine>();
    const sortableEngines = new Map<HTMLElement, SpatialSortableEngine>();

    return {
      // --- Quadtree Queries ---
      update: (el: HTMLElement) => {
        const tree = getTree() as { insert: (el: HTMLElement, x: number, y: number) => void } | undefined;
        if (!tree) return;
        const rect = el.getBoundingClientRect();
        tree.insert(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
      },
      query: (x: number, y: number, w: number, h: number) => {
        const tree = getTree() as { query: (bounds: Record<string, number>, arr: unknown[]) => unknown[] } | undefined;
        return tree ? tree.query({ x, y, w: w / 2, h: h / 2 }, []) : [];
      },
      nearest: (x: number, y: number) => {
        const tree = getTree() as { query: (bounds: Record<string, number>, arr: HTMLElement[]) => HTMLElement[] } | undefined;
        if (!tree) return null;
        const results = tree.query({ x, y, w: 50, h: 50 }, []);
        let nearest: HTMLElement | null = null;
        let minDist = Infinity;
        for (const el of results) {
          const rect = el.getBoundingClientRect();
          const dist = Math.sqrt((x - (rect.left + rect.width / 2)) ** 2 + (y - (rect.top + rect.height / 2)) ** 2);
          if (dist < minDist) { minDist = dist; nearest = el; }
        }
        return nearest;
      },

      // --- Drag Engines ---
      canvas: (container: HTMLElement, listExpr: string, options?: Record<string, unknown>) => {
        if (canvasEngines.has(container)) canvasEngines.get(container)!.destroy();
        const engine = new SpatialCanvasEngine({ container, listExpr, ...options } as CanvasContext, context);
        canvasEngines.set(container, engine);
        return engine;
      },
      sortable: (container: HTMLElement, listExpr: string, options?: Record<string, unknown>) => {
        if (sortableEngines.has(container)) sortableEngines.get(container)!.destroy();
        const engine = new SpatialSortableEngine({ container, listExpr, ...options }, context);
        sortableEngines.set(container, engine);
        return engine;
      },
      destroy: (container: HTMLElement) => {
        canvasEngines.get(container)?.destroy();
        sortableEngines.get(container)?.destroy();
        canvasEngines.delete(container);
        sortableEngines.delete(container);
      }
    };
  }
};

export default spatialModule;
