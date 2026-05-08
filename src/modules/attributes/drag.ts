import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * DragReorderEngine — In-List Real-Time Reordering for Nexus-UX
 */
interface DragReorderContext<T> {
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

class DragReorderEngine<T> {
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
    this.repositionPlaceholder(toIndex);

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

  private isValidDraggableChild(child: HTMLElement): boolean {
    if (child === this.ghostEl || child === this.placeholderEl) return false;
    if (child === this.activeDrag?.element) return false;
    if (child.hasAttribute('data-ux-template')) return false;
    if (getComputedStyle(child).display === 'none') return false;
    if (child.draggable !== true) return false;
    const dz = child.closest('[data-teleport\\:drop]');
    return dz === this.ctx.container || !dz;
  }

  private getDraggableChildren(): HTMLElement[] {
    const children: HTMLElement[] = [];
    const container = this.ctx.container;
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

  private executeReorder(fromIndex: number, toIndex: number): void {
    const { item } = this.activeDrag!;
    this.ctx.updateList((list) => {
      const cur = list.indexOf(item);
      if (cur === -1) return;
      list.splice(cur, 1);
      list.splice(toIndex, 0, item);
    });

    this.activeDrag!.index = toIndex;
    this.ctx.onReorder?.(this.ctx.getList(), fromIndex, toIndex);
  }
}

function buildReorderContext<T>(
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

/**
 * Calculate the index of an element among its draggable siblings.
 * Uses DOM traversal (like SortableJS `index()`), not array indexOf.
 * Ensures identity-based tracking survives DOM mutations.
 */
function calculateDraggableIndex(
  element: HTMLElement,
  sourceDropZone: HTMLElement | null
): number {
  let index = 0;
  let sibling = element.previousElementSibling;
  
  while (sibling) {
    if (sibling.nodeName.toUpperCase() !== 'TEMPLATE') {
      const hasDataDrag = sibling.hasAttribute('data-drag');
      const isDraggable = (sibling as HTMLElement).draggable === true;
      const style = getComputedStyle(sibling);
      const isHidden = style.display === 'none';
      const isTemplate = sibling.hasAttribute('data-ux-template');
      const siblingDropZone = sibling.closest('[data-teleport\\:drop]') as HTMLElement | null;
      const correctZone = sourceDropZone ? siblingDropZone === sourceDropZone : !siblingDropZone;
      
      if (hasDataDrag && isDraggable && !isHidden && !isTemplate && correctZone) {
        index++;
      }
    }
    sibling = sibling.previousElementSibling;
  }
  
  return index;
}

export const dragAttribute: AttributeModule = {
  name: 'drag',
  attribute: 'drag',
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    element.setAttribute('draggable', 'true');
    element.style.userSelect = 'none';

    let reorderEngine: DragReorderEngine<any> | null = null;
    let dropZoneDragOverListener: ((e: DragEvent) => void) | null = null;
    let sourceDropZone: HTMLElement | null = null;

    const detectReorder = (zone: HTMLElement | null): boolean => {
      if (!zone) return false;
      return zone.hasAttribute('data-drag-reorder') || element.hasAttribute('data-drag-reorder');
    };

    const onDragStart = (e: DragEvent) => {
      try {
        const sourceContainer = element.parentElement;
        if (!sourceContainer) {
          e.preventDefault();
          return;
        }

        sourceDropZone = element.closest('[data-teleport\\:drop]') as HTMLElement | null;
        let sourceList: any[] | null = null;

        if (sourceDropZone) {
          const moveExpr = sourceDropZone.getAttribute('data-teleport:drop');
          if (moveExpr) {
            try {
              const result = runtime.evaluate(sourceDropZone, moveExpr);
              if (Array.isArray(result)) {
                sourceList = result;
              }
            } catch (err) {
              console.warn('[drag] Failed to evaluate source list:', err);
            }
          }
        }

        const siblingContainer = sourceDropZone || sourceContainer;
        const initialIndex = calculateDraggableIndex(element, sourceDropZone);

        const dragState: Record<string, unknown> = {
           fromIndex: initialIndex,
           sourceContainer: siblingContainer,
           element,
           sourceList
        };
        (globalThis as any)._dragState = dragState;

        const globalSignals = runtime.globalSignals() as any;

        if ((window as any)._nexusDebugDrag) {
          console.log('[drag] Drag started', {
            element: element.tagName,
            fromIndex: initialIndex,
            sourceDropZone: sourceDropZone?.tagName,
            sourceListIsArray: Array.isArray(sourceList),
            sourceListLength: sourceList?.length
          });
        }

        if (detectReorder(sourceDropZone) && Array.isArray(sourceList)) {
          if (!sourceDropZone) return;
          const listExpr = sourceDropZone.getAttribute('data-teleport:drop')!;
          const direction = (sourceDropZone.getAttribute('data-drag-direction') as 'vertical' | 'horizontal') || 'vertical';
          const animDuration = parseInt(sourceDropZone.getAttribute('data-drag-animation') || '150', 10);

          const ctx = buildReorderContext(sourceDropZone, listExpr, runtime, {
            direction,
            animationDuration: animDuration,
            onAutoScroll: async (delta) => {
              if (sourceDropZone) {
                sourceDropZone.scrollBy({ left: delta.x, top: delta.y, behavior: 'smooth' });
                return true;
              }
              return false;
            },
            onReorder: (list, oldIdx, newIdx) => {
              globalSignals['drag:reorder'] = { list, oldIndex: oldIdx, newIndex: newIdx };
            }
          });

          reorderEngine = new DragReorderEngine(ctx);
          dragState.reorderEngine = reorderEngine;
          reorderEngine.startDrag({ element, sourceList, fromIndex: initialIndex }, e);

          dropZoneDragOverListener = (ev: DragEvent) => {
            if (reorderEngine && ev.clientX && ev.clientY) {
              reorderEngine.updateDrag(ev.clientX, ev.clientY, ev);
              globalSignals['drag:move'] = { element, x: ev.clientX, y: ev.clientY, originalEvent: ev };
            }
          };
          sourceDropZone.addEventListener('dragover', dropZoneDragOverListener);
        }

        globalSignals['drag:start'] = { element, originalEvent: e, fromIndex: initialIndex, sourceList };

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', '');
        }

        requestAnimationFrame(() => {
          element.style.opacity = '0.3';
          element.classList.add('dragging');
        });
      } catch (err) {
        runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, 'drag-start');
        e.preventDefault();
      }
    };

    const onDragEnd = (e: DragEvent) => {
      if (reorderEngine) {
        reorderEngine.endDrag(e);
        reorderEngine = null;
      }
      if (sourceDropZone && dropZoneDragOverListener) {
        sourceDropZone.removeEventListener('dragover', dropZoneDragOverListener);
        dropZoneDragOverListener = null;
      }

      element.style.opacity = '';
      element.classList.remove('dragging');

      const globalSignals = runtime.globalSignals() as any;
      globalSignals['drag:end'] = {
        element,
        originalEvent: e,
        cancelled: e.dataTransfer?.dropEffect === 'none'
      };

      (globalThis as any)._dragState = null;
    };

    element.addEventListener('dragstart', onDragStart);
    element.addEventListener('dragend', onDragEnd);

    return () => {
      element.removeEventListener('dragstart', onDragStart);
      element.removeEventListener('dragend', onDragEnd);
      if (sourceDropZone && dropZoneDragOverListener) {
        sourceDropZone.removeEventListener('dragover', dropZoneDragOverListener);
      }
    };
  }
};

export default dragAttribute;