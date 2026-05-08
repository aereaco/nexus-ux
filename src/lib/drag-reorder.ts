/**
 * DragReorderEngine — In-List Real-Time Reordering for Nexus-UX
 */

import type { RuntimeContext } from '../engine/composition.ts';

export interface DragReorderContext<T> {
  getList: () => T[];
  updateList: (mutate: (list: T[]) => void) => void;
  container: HTMLElement;
  direction?: 'vertical' | 'horizontal';
  edgeScrollThreshold?: number;
  autoScrollSpeed?: number;
  animationDuration?: number;
  onReorder?: (list: T[], oldIndex: number, newIndex: number) => void;
  onAutoScroll?: (delta: { x: number; y: number }) => void | Promise<boolean>;
}

interface DragItemInfo<T> {
  item: T;
  element: HTMLElement;
  index: number;
}

export class DragReorderEngine<T> {
  private ctx: DragReorderContext<T>;
  private activeDrag: DragItemInfo<T> | null = null;
  private ghostEl: HTMLElement | null = null;
  private placeholderEl: HTMLElement | null = null;
  private containerBounds: DOMRect | null = null;
  private currentToIndex: number = -1;

  constructor(ctx: DragReorderContext<T>) {
    this.ctx = ctx;
  }

  startDrag(dragState: { element: HTMLElement; sourceList: T[]; fromIndex: number }, _event: Event): void {
    const { element, sourceList, fromIndex } = dragState;
    const item = sourceList[fromIndex];
    if (item === undefined) return;

    const list = this.ctx.getList();
    const currentIndex = list.indexOf(item);
    if (currentIndex === -1) return;

    this.activeDrag = { item, element, index: currentIndex };
    this.currentToIndex = currentIndex;

    if ((globalThis as any)._nexusDebugDrag) {
      console.log('[drag-reorder] startDrag', { currentIndex, item });
    }

    this.ghostEl = this.createGhost(element);
    document.body.appendChild(this.ghostEl);
    this.positionGhost(element, _event);

    this.placeholderEl = this.createPlaceholder(element);
    const parent = element.parentElement;
    if (parent) {
      parent.insertBefore(this.placeholderEl, element);
      element.style.visibility = 'hidden';
    }

    this.containerBounds = this.ctx.container.getBoundingClientRect();
    this.ctx.onReorder?.(list, currentIndex, currentIndex);
  }

  updateDrag(clientX: number, clientY: number, _event: Event): void {
    if (!this.activeDrag || !this.ghostEl) return;

    this.positionGhostAt(clientX, clientY);
    this.containerBounds = this.ctx.container.getBoundingClientRect();
    this.maybeAutoScroll(clientX, clientY);

    const toIndex = this.calculateInsertIndex(clientX, clientY);
    if (toIndex === -1) return;

    this.currentToIndex = toIndex;
    const fromIndex = this.activeDrag.index;
    if (toIndex !== fromIndex) {
      this.executeReorder(fromIndex, toIndex);
    }
    // Keep placeholder visually in sync
    this.repositionPlaceholder(toIndex);

    // DEBUG
    if ((globalThis as any)._nexusDebugDrag) {
      console.log('[drag-reorder] updateDrag', { fromIndex, toIndex, active: !!this.activeDrag });
    }
  }

  endDrag(_event: Event): void {
    this.cleanupGhost();
    this.activeDrag = null;
    this.ghostEl = null;
    this.placeholderEl = null;
    this.currentToIndex = -1;
  }

  getFinalToIndex(): number {
    return this.currentToIndex;
  }

  // ─── Ghost / Placeholder ──────────────────────────────────────────────────

  private createGhost(sourceEl: HTMLElement): HTMLElement {
    const ghost = sourceEl.cloneNode(true) as HTMLElement;
    ghost.classList.add('nexus-drag-ghost');
    Object.assign(ghost.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      opacity: '0.85',
      zIndex: '999999',
      transform: 'translate3d(0,0,0) scale(1.03)',
      transition: `transform 0.15s ease-out, opacity 0.15s ease-out`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    });
    const rect = sourceEl.getBoundingClientRect();
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    return ghost;
  }

  private createPlaceholder(sourceEl: HTMLElement): HTMLElement {
    const ph = document.createElement('div');
    ph.classList.add('nexus-drag-placeholder');
    const rect = sourceEl.getBoundingClientRect();
    ph.style.width = rect.width + 'px';
    ph.style.height = rect.height + 'px';
    const computed = window.getComputedStyle(sourceEl);
    ph.style.display = computed.display;
    ph.style.margin = computed.margin;
    ph.style.padding = computed.padding;
    ph.style.border = computed.border;
    return ph;
  }

  private positionGhost(sourceEl: HTMLElement, _event: Event): void {
    if (!this.ghostEl) return;
    const rect = sourceEl.getBoundingClientRect();
    this.ghostEl.style.left = rect.left + 'px';
    this.ghostEl.style.top = rect.top + 'px';
  }

  private positionGhostAt(x: number, y: number): void {
    if (!this.ghostEl) return;
    const offsetX = 15, offsetY = 15;
    this.ghostEl.style.transform = `translate3d(${x + offsetX}px, ${y + offsetY}px, 0) scale(1.03)`;
  }

  // ─── Hit-Testing ──────────────────────────────────────────────────────────

  /**
   * Check if a child element is a valid draggable item.
   * Mirrors the filtering logic from calculateDraggableIndex in drag.ts
   */
  private isValidDraggableChild(child: HTMLElement): boolean {
    if (child === this.ghostEl || child === this.placeholderEl) return false;
    if (child === this.activeDrag?.element) return false;
    if (child.hasAttribute('data-ux-template')) return false;
    if (getComputedStyle(child).display === 'none') return false;
    // draggable property on HTMLElement is boolean; must be true
    if (child.draggable !== true) return false;
    const dz = child.closest('[data-teleport\\:drop]');
    return dz === this.ctx.container || !dz;
  }

  private getDraggableChildren(): HTMLElement[] {
    const children: HTMLElement[] = [];
    const container = this.ctx.container;
    // Use direct children iteration (like SortableJS container.children) 
    // to avoid including nested drop zone items
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (this.isValidDraggableChild(child)) {
        children.push(child);
      }
    }
    return children;
  }

  private calculateInsertIndex(clientX: number, clientY: number): number {
    if (!this.activeDrag) return -1;
    const { direction = 'vertical' } = this.ctx;

    const children = this.getDraggableChildren();
    if (children.length === 0) return 0;

    let closest = children.length;
    let minDist = Infinity;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const rect = child.getBoundingClientRect();
      const isVert = direction === 'vertical';
      const dist = isVert
        ? clientY - (rect.top + rect.height / 2)
        : clientX - (rect.left + rect.width / 2);
      const ad = Math.abs(dist);
      if (ad < minDist) {
        minDist = ad;
        closest = i;
      }
    }

    if (closest >= children.length) return children.length;

    const ref = children[closest];
    const r = ref.getBoundingClientRect();
    if (direction === 'vertical') {
      if (clientY > r.top + r.height / 2) closest++;
    } else {
      if (clientX > r.left + r.width / 2) closest++;
    }

    return Math.max(0, Math.min(closest, children.length));
  }

  // ─── Placeholder Positioning ───────────────────────────────────────────────

  private repositionPlaceholder(toIndex: number): void {
    if (!this.placeholderEl || !this.ctx.container) return;
    const children = this.getDraggableChildren();
    if (toIndex >= children.length) {
      this.ctx.container.appendChild(this.placeholderEl);
    } else {
      const ref = children[toIndex];
      this.ctx.container.insertBefore(this.placeholderEl, ref);
    }
   }

  // ─── Auto-Scroll ──────────────────────────────────────────────────────────

  private maybeAutoScroll(clientX: number, clientY: number): void {
    const { onAutoScroll, edgeScrollThreshold = 40, autoScrollSpeed = 15 } = this.ctx;
    if (!onAutoScroll || !this.containerBounds) return;

    const { left, top, width, height } = this.containerBounds;
    const dl = clientX - left;
    const dr = left + width - clientX;
    const dt = clientY - top;
    const db = top + height - clientY;

    let dx = 0, dy = 0;
    if (dl < edgeScrollThreshold) dx = -autoScrollSpeed * (1 - dl / edgeScrollThreshold);
    else if (dr < edgeScrollThreshold) dx = autoScrollSpeed * (1 - dr / edgeScrollThreshold);
    if (dt < edgeScrollThreshold) dy = -autoScrollSpeed * (1 - dt / edgeScrollThreshold);
    else if (db < edgeScrollThreshold) dy = autoScrollSpeed * (1 - db / edgeScrollThreshold);

    if (dx !== 0 || dy !== 0) {
      onAutoScroll({ x: dx, y: dy });
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private cleanupGhost(): void {
    if (this.ghostEl && this.ghostEl.parentNode) {
      this.ghostEl.remove();
      this.ghostEl = null;
    }
    if (this.placeholderEl && this.placeholderEl.parentNode) {
      this.placeholderEl.remove();
      this.placeholderEl = null;
    }
    if (this.activeDrag) {
      this.activeDrag.element.style.visibility = '';
    }
  }

  // ─── Mutation ─────────────────────────────────────────────────────────────

  private executeReorder(fromIndex: number, toIndex: number): void {
    const { item } = this.activeDrag!;
    this.ctx.updateList((list) => {
      const cur = list.indexOf(item);
      if (cur === -1) return;
      // Remove the item from its current position
      list.splice(cur, 1);
      // Insert at the final target index (toIndex already accounts for removal offset)
      list.splice(toIndex, 0, item);
    });

    this.activeDrag!.index = toIndex;
    this.ctx.onReorder?.(this.ctx.getList(), fromIndex, toIndex);
  }
}

/**
 * Builds a DragReorderContext.
 */
export function buildReorderContext<T>(
  container: HTMLElement,
  listExpr: string,
  runtime: RuntimeContext,
  options?: {
    direction?: 'vertical' | 'horizontal';
    animationDuration?: number;
    edgeScrollThreshold?: number;
    autoScrollSpeed?: number;
    onReorder?: (list: T[], oldIndex: number, newIndex: number) => void;
    onAutoScroll?: (delta: { x: number; y: number }) => void | Promise<boolean>;
  }
): DragReorderContext<T> {
  // ZCZS: getList returns the current reactive array pointer each call (zero-copy)
  const getList = (): T[] => {
    try {
      const result = runtime.evaluate(container, listExpr);
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  };

  return {
    getList,
    updateList: (mutate) => {
      const list = getList();
      mutate(list);
    },
    container,
    direction: options?.direction,
    edgeScrollThreshold: options?.edgeScrollThreshold ?? 40,
    autoScrollSpeed: options?.autoScrollSpeed ?? 15,
    animationDuration: options?.animationDuration ?? 150,
    onReorder: options?.onReorder,
    onAutoScroll: options?.onAutoScroll,
  };
}
