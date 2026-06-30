import { AttributeModule } from "../../engine/modules.ts";
import { RuntimeContext } from "../../engine/composition.ts";
import { flip } from "../sprites/animate.ts";
import { getDataStack } from "../../engine/scope.ts";

// Helper to find scrollable parent container
function getScrollParent(el: HTMLElement): HTMLElement {
  let current: HTMLElement | null = el;
  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const isScrollableY = overflowY === 'auto' || overflowY === 'scroll';
    const isScrollableX = overflowX === 'auto' || overflowX === 'scroll';
    if (isScrollableY || isScrollableX) {
      return current;
    }
    current = current.parentElement;
  }
  return document.documentElement;
}

export interface DragReorderContext<T> {
  getList: () => T[];
  updateList: (mutate: (list: T[]) => void) => void;
  container: HTMLElement;
  direction?: "vertical" | "horizontal" | "grid";
  ghostClass?: string;
  dragClass?: string;
  group?: string | { name: string; pull?: "clone" | boolean; put?: boolean; revertClone?: boolean };
  sort?: boolean;
  swap?: boolean;
  swapClass?: string;
  fallbackOnBody?: boolean;
  swapThreshold?: number;
  edgeScrollThreshold?: number;
  autoScrollSpeed?: number;
  animationDuration?: number;
  onReorder?: (list: T[], oldIndex: number, newIndex: number) => void;
  onAutoScroll?: (delta: { x: number; y: number }) => void | Promise<boolean>;
}

export interface SortableOptions {
  animation?: number;
  ghostClass?: string;
  dragClass?: string;
  chosenClass?: string;
  fallbackOnBody?: boolean;
  swapThreshold?: number;
  invertedSwapThreshold?: number;
  invertSwap?: boolean;
  direction?: 'vertical' | 'horizontal' | 'grid';
  handle?: string;
  filter?: string;
  draggable?: string;
  multiDrag?: boolean;
  selectedClass?: string;
  swap?: boolean;
  swapClass?: string;
  group?: string | { name: string; pull?: 'clone' | boolean; put?: boolean; revertClone?: boolean };
  sort?: boolean;
  onStart?: (evt: any) => void;
  onEnd?: (evt: any) => void;
}

// ---------------------------------------------------------------------------
// Pure TypeScript Sortable Engine
// ---------------------------------------------------------------------------
export class Sortable {
  static active: Sortable | null = null;
  static ghost: HTMLElement | null = null;
  static clone: HTMLElement | null = null;

  public el: HTMLElement;
  public options: SortableOptions;

  private _pointerDownBound: (e: PointerEvent) => void;
  private _pointerMoveBound: (e: PointerEvent) => void;
  private _pointerUpBound: (e: PointerEvent) => void;
  private _touchStartBound: (e: TouchEvent) => void;

  private dragEl: HTMLElement | null = null;
  private parentEl: HTMLElement | null = null;
  private nextEl: HTMLElement | null = null;
  private lastTarget: HTMLElement | null = null;
  private lastDirection = 0;
  private pastFirstInvertThresh = false;
  private isCircumstantialInvert = false;
  private targetMoveDistance = 0;
  private targetBeforeFirstSwap?: number;

  private tapEvt: PointerEvent | null = null;
  private dragStarted = false;
  private multiDragElements: HTMLElement[] = [];
  private originalIndices = new Map<HTMLElement, number>();

  private scrollParent: HTMLElement | null = null;
  private _lastActiveItemScope: any = null;
  private _lastSourceItemScope: any = null;
  private scrollParentBounds: DOMRect | null = null;

  constructor(el: HTMLElement, options: SortableOptions) {
    this.el = el;
    this.options = {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      chosenClass: 'sortable-chosen',
      selectedClass: 'sortable-selected',
      swapClass: 'sortable-swap-highlight',
      fallbackOnBody: true,
      swapThreshold: 1,
      invertedSwapThreshold: 1,
      invertSwap: false,
      draggable: '[data-drag]',
      sort: true,
      ...options,
    };

    this._pointerDownBound = this._onPointerDown.bind(this);
    this._pointerMoveBound = this._onPointerMove.bind(this);
    this._pointerUpBound = this._onPointerUp.bind(this);

    this._touchStartBound = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const dragEl = target.closest(this.options.draggable!) as HTMLElement | null;
      if (dragEl && this.el.contains(dragEl)) {
        const closestContainer = dragEl.closest('[data-drag-container]');
        if (closestContainer !== this.el) return;
        if (dragEl.getAttribute('draggable') === 'false') return;
        if (this.options.handle && !target.closest(this.options.handle)) return;
        if (this.options.filter && target.closest(this.options.filter)) return;

        const tagName = target.tagName.toUpperCase();
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tagName)) return;

        e.preventDefault();
      }
    };

    this.el.addEventListener('pointerdown', this._pointerDownBound);
    this.el.addEventListener('touchstart', this._touchStartBound, { passive: false });
  }

  public destroy() {
    this.el.removeEventListener('pointerdown', this._pointerDownBound);
    this.el.removeEventListener('touchstart', this._touchStartBound);
    this._cleanupDragListeners();
  }

  private _onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // Only left click
    if (Sortable.active) return;

    const target = e.target as HTMLElement;
    const dragEl = target.closest(this.options.draggable!) as HTMLElement | null;
    if (!dragEl || !this.el.contains(dragEl)) return;

    // Bubbling Gating: ensure the closest Sortable container is this.el
    const closestSortableContainer = dragEl.closest('[data-drag-container]');
    if (closestSortableContainer !== this.el) {
      return; // Let the nested Sortable handle it!
    }

    if (dragEl.getAttribute('draggable') === 'false') {
      return;
    }

    // Handle Selector
    if (this.options.handle && !target.closest(this.options.handle)) return;

    // Filter Selector
    if (this.options.filter) {
      if (target.closest(this.options.filter)) {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    this.dragEl = dragEl;
    this.tapEvt = e;
    this.dragStarted = false;

    document.addEventListener('pointermove', this._pointerMoveBound);
    document.addEventListener('pointerup', this._pointerUpBound);
    document.addEventListener('pointercancel', this._pointerUpBound);
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this.tapEvt || !this.dragEl) return;

    const dx = e.clientX - this.tapEvt.clientX;
    const dy = e.clientY - this.tapEvt.clientY;

    if (!this.dragStarted) {
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        this._startDrag(e);
      }
      return;
    }

    // Move ghost
    if (Sortable.ghost) {
      Sortable.ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    // Autoscroll
    this._maybeAutoScroll(e.clientX, e.clientY);

    // Hit-testing
    this._onDragOver(e);
  }

  private _startDrag(e: PointerEvent) {
    this.dragStarted = true;
    Sortable.active = this;
    this.parentEl = this.dragEl!.parentElement;
    this.nextEl = this.dragEl!.nextElementSibling as HTMLElement | null;

    if (this.parentEl) {
      const stack = getDataStack(this.parentEl);
      this._lastSourceItemScope = stack.find(s => s && 'item' in s && s.item && typeof s.item === 'object') as any;
    }

    // Capture starting indices of draggable elements only
    this.originalIndices.clear();
    let draggableIdx = 0;
    Array.from(this.el.children).forEach((child: any) => {
      if (child.matches(this.options.draggable!)) {
        child.sortableIndex = draggableIdx;
        this.originalIndices.set(child, draggableIdx);
        draggableIdx++;
      }
    });

    // Populate MultiDrag items list if multiDrag is active
    if (this.options.multiDrag) {
      // If the clicked element is already selected, gather all selected elements in the container
      if (this.dragEl!.classList.contains(this.options.selectedClass!)) {
        this.multiDragElements = Array.from(this.el.children).filter(c =>
          (c as HTMLElement).matches(this.options.draggable!) && c.classList.contains(this.options.selectedClass!)
        ) as HTMLElement[];
      } else {
        // Clear other selections in data model and select this one
        Array.from(this.el.children).forEach((c: any) => {
          const stack = getDataStack(c);
          const scope = stack.find(s => s && 'item' in s && s.item && typeof s.item === 'object') as any;
          if (scope && scope.item) {
            scope.item.selected = (c === this.dragEl);
          }
        });
        this.multiDragElements = [this.dragEl!];
      }
    }

    // Handle Clone
    const pull = typeof this.options.group === 'object' && this.options.group.pull === 'clone';
    if (pull) {
      Sortable.clone = this.dragEl!.cloneNode(true) as HTMLElement;
      this.dragEl!.parentNode!.insertBefore(Sortable.clone, this.dragEl!);
    }

    // Create ghost
    const rect = this.dragEl!.getBoundingClientRect();
    Sortable.ghost = this.dragEl!.cloneNode(true) as HTMLElement;
    Sortable.ghost.style.position = 'fixed';
    Sortable.ghost.style.top = `${rect.top}px`;
    Sortable.ghost.style.left = `${rect.left}px`;
    Sortable.ghost.style.width = `${rect.width}px`;
    Sortable.ghost.style.height = `${rect.height}px`;
    Sortable.ghost.style.opacity = '0.8';
    Sortable.ghost.style.pointerEvents = 'none';
    Sortable.ghost.style.zIndex = '100000';
    Sortable.ghost.classList.add(this.options.ghostClass!);
    document.body.appendChild(Sortable.ghost);

    // Add chosen class
    this.dragEl!.classList.add(this.options.chosenClass!);
    this.dragEl!.classList.add(this.options.dragClass!);

    // Fold MultiDrag items
    if (this.options.multiDrag && this.multiDragElements.length > 0) {
      this.multiDragElements.forEach(el => {
        if (el !== this.dragEl) {
          el.style.display = 'none';
        }
      });
    }

    // Setup scroll parent
    this.scrollParent = getScrollParent(this.el);
    this.scrollParentBounds = this.scrollParent.getBoundingClientRect();

    if (this.options.onStart) {
      this.options.onStart({
        item: this.dragEl,
        oldIndex: this.originalIndices.get(this.dragEl!),
        originalEvent: e,
      });
    }
  }

  private _onDragOver(e: PointerEvent) {
    if (!this.dragEl) return;

    // Boundary detection for source container empty placeholder
    if (this.parentEl && this._lastSourceItemScope && this._lastSourceItemScope.item) {
      if (this.dragEl.parentElement !== this.parentEl) {
        (this._lastSourceItemScope.item as any).isDraggedOut = true;
      } else {
        const rect = this.parentEl.getBoundingClientRect();
        const isOutside = (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
        (this._lastSourceItemScope.item as any).isDraggedOut = isOutside;
      }
    }

    // Find closest container target
    const target = this._findTargetUnderCursor(e.clientX, e.clientY);
    if (!target || target === this.dragEl) {
      this._clearDragOverState();
      return;
    }

    // Circular containment prevention
    if (this.dragEl.contains(target)) {
      this._clearDragOverState();
      return;
    }

    const targetParent = target.hasAttribute('data-drag-container') ? target : target.closest('[data-drag-container]') as HTMLElement | null;
    if (!targetParent) {
      this._clearDragOverState();
      return;
    }

    let targetSortable: Sortable | null = null;
    const reorderEngine = (targetParent as any).__sortable;
    if (reorderEngine && reorderEngine.sortable) {
      targetSortable = reorderEngine.sortable;
    }

    const isSameContainer = targetParent === this.el;
    if (!isSameContainer) {
      if (!targetSortable || !this._canPullPut(targetSortable)) {
        this._clearDragOverState();
        return; // Pull/Put not allowed between groups
      }
    }

    this._updateDragOverState(targetParent, e);

    if (target.hasAttribute('data-drag-container')) {
      // Dragged over an empty container: append directly!
      if (this.dragEl.parentElement !== target) {
        const srcBefore = this._captureRects(this.dragEl.parentElement!);
        const destBefore = this._captureRects(target);

        target.appendChild(this.dragEl);

        this._animateShift(this.dragEl.parentElement!, srcBefore);
        this._animateShift(target, destBefore);
      }
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const dragRect = this.dragEl.getBoundingClientRect();
    const vertical = this._detectDirection(targetParent) === 'vertical';

    const differentLevel = this.dragEl.parentNode !== targetParent;
    const differentRowCol = !this._dragElInRowColumn(dragRect, targetRect, vertical);
    const side1 = vertical ? 'top' : 'left';

    if (this.lastTarget !== target) {
      this.targetBeforeFirstSwap = targetRect[side1];
      this.pastFirstInvertThresh = false;
      this.isCircumstantialInvert = (!differentRowCol && this.options.invertSwap) || differentLevel;
    }

    const direction = this._getSwapDirection(
      e,
      target,
      targetRect,
      vertical,
      differentRowCol ? 1 : this.options.swapThreshold!,
      this.options.invertedSwapThreshold!,
      this.isCircumstantialInvert,
      this.lastTarget === target
    );

    if (direction !== 0) {
      // Check if already beside target
      let sibling: HTMLElement | null = null;
      let dragIndex = Array.from(this.dragEl.parentElement!.children).indexOf(this.dragEl);
      if (dragIndex !== -1) {
        do {
          dragIndex -= direction;
          sibling = this.dragEl.parentElement!.children[dragIndex] as HTMLElement | null;
        } while (sibling && (getComputedStyle(sibling).display === 'none' || sibling === Sortable.ghost));
      }
      if (sibling === target) {
        return;
      }

      this.lastTarget = target;
      this.lastDirection = direction;

      // Capture before states
      const srcBefore = this._captureRects(this.dragEl.parentElement!);
      const destBefore = isSameContainer ? srcBefore : this._captureRects(targetParent);

      // Perform reorder mutation in DOM
      if (this.options.swap) {
        this._swapNodes(this.dragEl, target);
      } else {
        const nextSibling = target.nextElementSibling;
        const after = direction === 1;
        if (after && !nextSibling) {
          targetParent.appendChild(this.dragEl);
        } else {
          targetParent.insertBefore(this.dragEl, after ? nextSibling : target);
        }
      }

      // Animate shifts in both containers
      this._animateShift(this.dragEl.parentElement!, srcBefore);
      if (!isSameContainer) {
        this._animateShift(targetParent, destBefore);
      }

      // Recalculate targetMoveDistance
      if (this.targetBeforeFirstSwap !== undefined && !this.isCircumstantialInvert) {
        const newTargetRect = target.getBoundingClientRect();
        this.targetMoveDistance = Math.abs(this.targetBeforeFirstSwap - newTargetRect[side1]);
      }
    }
  }

  private _onPointerUp(e: PointerEvent) {
    this._cleanupDragListeners();

    if (this.dragEl) {
      if (this.dragStarted) {
        // Remove classes
        this.dragEl.classList.remove(this.options.chosenClass!);
        this.dragEl.classList.remove(this.options.dragClass!);

        // Restore MultiDrag elements visibility
        if (this.options.multiDrag && this.multiDragElements.length > 0) {
          this.multiDragElements.forEach(el => {
            el.style.display = '';
          });
        }

        // Remove clone
        if (Sortable.clone) {
          Sortable.clone.parentNode?.removeChild(Sortable.clone);
          Sortable.clone = null;
        }

        // Remove ghost
        if (Sortable.ghost) {
          Sortable.ghost.parentNode?.removeChild(Sortable.ghost);
          Sortable.ghost = null;
        }

        // Compute finalIndex relative to the actual dropped target container, excluding templates/selected elements
        const finalIndex = Array.from(this.dragEl.parentElement!.children)
          .filter(c => (c as HTMLElement).matches(this.options.draggable!) && (c === this.dragEl || !this.multiDragElements.includes(c as HTMLElement)))
          .indexOf(this.dragEl);

        const oldIndex = this.originalIndices.get(this.dragEl);

        // De-select MultiDrag items in the data model before triggering list mutations
        if (this.options.multiDrag) {
          this.multiDragElements.forEach((el: any) => {
            const stack = getDataStack(el);
            const scope = stack.find(s => s && 'item' in s && s.item && typeof s.item === 'object') as any;
            if (scope && scope.item) {
              scope.item.selected = false;
            }
          });
        }

        if (this.options.onEnd) {
          this.options.onEnd({
            item: this.dragEl,
            from: this.parentEl,
            to: this.dragEl.parentElement,
            oldIndex,
            newIndex: finalIndex,
            originalEvent: e,
            items: [...this.multiDragElements],
            oldIndicies: this.multiDragElements.map(el => ({
              multiDragElement: el,
              index: this.originalIndices.get(el) ?? -1,
            })),
          });
        }

        if (this.options.multiDrag) {
          this.multiDragElements = [];
        }
      } else {
        // A simple tap/click occurred without dragging: toggle selection!
        if (this.options.multiDrag) {
          const stack = getDataStack(this.dragEl);
          const scope = stack.find(s => s && 'item' in s && s.item && typeof s.item === 'object') as any;
          if (scope && scope.item) {
            scope.item.selected = !scope.item.selected;
          }
        }
      }
    }

    this._clearDragOverState();

    if (this._lastSourceItemScope && this._lastSourceItemScope.item) {
      (this._lastSourceItemScope.item as any).isDraggedOut = false;
      this._lastSourceItemScope = null;
    }

    Sortable.active = null;
    this.dragEl = null;
    this.tapEvt = null;
    this.dragStarted = false;
  }

  private _cleanupDragListeners() {
    document.removeEventListener('pointermove', this._pointerMoveBound);
    document.removeEventListener('pointerup', this._pointerUpBound);
    document.removeEventListener('pointercancel', this._pointerUpBound);
  }

  private _clearDragOverState() {
    if (this._lastActiveItemScope && this._lastActiveItemScope.item) {
      (this._lastActiveItemScope.item as any).isDragOver = false;
      this._lastActiveItemScope = null;
    }
  }

  private _updateDragOverState(targetParent: HTMLElement, e: PointerEvent) {
    const stack = getDataStack(targetParent);
    const targetItemScope = stack.find(s => s && 'item' in s && s.item && typeof s.item === 'object') as any;
    
    if (this._lastActiveItemScope !== targetItemScope) {
      this._clearDragOverState();
      this._lastActiveItemScope = targetItemScope || null;
    }

    if (targetItemScope && targetItemScope.item) {
      const rect = targetParent.getBoundingClientRect();
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      (targetItemScope.item as any).isDragOver = isInside;
    }
  }

  private _findTargetUnderCursor(clientX: number, clientY: number): HTMLElement | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;

    // 1. Check if hovering over a container first
    const container = el.closest('[data-drag-container]') as HTMLElement | null;
    if (container) {
      console.log("[Drag] Element under cursor:", el, "Container:", container, "sortable:", (container as any).__sortable);
    }

    if (container && (container as any).__sortable) {
      const children = Array.from(container.children).filter(c =>
        c.nodeName.toUpperCase() !== 'TEMPLATE' &&
        c !== this.dragEl &&
        c !== Sortable.ghost &&
        !(c as HTMLElement).classList.contains('sortable-ghost')
      ) as HTMLElement[];

      // If the container is empty, it takes priority as the drop target!
      if (children.length === 0) {
        return container;
      }
    }

    // 2. Fallback to closest item if container is not empty
    const dragItem = el.closest(this.options.draggable!) as HTMLElement | null;
    if (dragItem) return dragItem;

    // 3. Fallback to container's last child if container is populated
    if (container && (container as any).__sortable) {
      const children = Array.from(container.children).filter(c =>
        c.nodeName.toUpperCase() !== 'TEMPLATE' &&
        c !== this.dragEl &&
        c !== Sortable.ghost &&
        !(c as HTMLElement).classList.contains('sortable-ghost')
      ) as HTMLElement[];

      return children[children.length - 1];
    }
    return null;
  }

  private _detectDirection(container: HTMLElement): 'vertical' | 'horizontal' {
    if (this.options.direction) return this.options.direction === 'grid' ? 'vertical' : this.options.direction;
    const style = getComputedStyle(container);
    if (style.display === 'flex') {
      return (style.flexDirection === 'column' || style.flexDirection === 'column-reverse') ? 'vertical' : 'horizontal';
    }
    if (style.display === 'grid') {
      return (style.gridTemplateColumns.split(' ').length <= 1) ? 'vertical' : 'horizontal';
    }
    const children = Array.from(container.children).filter(c => c.nodeName.toUpperCase() !== 'TEMPLATE') as HTMLElement[];
    if (children.length >= 2) {
      const rect1 = children[0].getBoundingClientRect();
      const rect2 = children[1].getBoundingClientRect();
      return Math.abs(rect1.top - rect2.top) < 4 ? 'horizontal' : 'vertical';
    }
    return 'vertical';
  }

  private _dragElInRowColumn(dragRect: DOMRect, targetRect: DOMRect, vertical: boolean): boolean {
    const dragElS1Opp = vertical ? dragRect.left : dragRect.top;
    const dragElS2Opp = vertical ? dragRect.right : dragRect.bottom;
    const dragElOppLength = vertical ? dragRect.width : dragRect.height;
    const targetS1Opp = vertical ? targetRect.left : targetRect.top;
    const targetS2Opp = vertical ? targetRect.right : targetRect.bottom;
    const targetOppLength = vertical ? targetRect.width : targetRect.height;

    return (
      dragElS1Opp === targetS1Opp ||
      dragElS2Opp === targetS2Opp ||
      (dragElS1Opp + dragElOppLength / 2) === (targetS1Opp + targetOppLength / 2)
    );
  }

  private _getSwapDirection(
    evt: PointerEvent,
    target: HTMLElement,
    targetRect: DOMRect,
    vertical: boolean,
    swapThreshold: number,
    invertedSwapThreshold: number,
    invertSwap: boolean,
    isLastTarget: boolean
  ): number {
    const mouseOnAxis = vertical ? evt.clientY : evt.clientX;
    const targetLength = vertical ? targetRect.height : targetRect.width;
    const targetS1 = vertical ? targetRect.top : targetRect.left;
    const targetS2 = vertical ? targetRect.bottom : targetRect.right;
    let invert = false;

    if (!invertSwap) {
      if (isLastTarget && this.targetMoveDistance < targetLength * swapThreshold) {
        if (!this.pastFirstInvertThresh &&
          (this.lastDirection === 1 ?
            (mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2) :
            (mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)
          )
        ) {
          this.pastFirstInvertThresh = true;
        }

        if (!this.pastFirstInvertThresh) {
          if (this.lastDirection === 1 ?
            (mouseOnAxis < targetS1 + this.targetMoveDistance) :
            (mouseOnAxis > targetS2 - this.targetMoveDistance)
          ) {
            return -this.lastDirection;
          }
        } else {
          invert = true;
        }
      } else {
        if (
          mouseOnAxis > targetS1 + (targetLength * (1 - swapThreshold) / 2) &&
          mouseOnAxis < targetS2 - (targetLength * (1 - swapThreshold) / 2)
        ) {
          return this._getInsertDirection(evt, target, targetRect, vertical);
        }
      }
    }

    invert = invert || invertSwap;
    if (invert) {
      if (
        mouseOnAxis < targetS1 + (targetLength * invertedSwapThreshold / 2) ||
        mouseOnAxis > targetS2 - (targetLength * invertedSwapThreshold / 2)
      ) {
        return (mouseOnAxis > targetS1 + targetLength / 2) ? 1 : -1;
      }
    }

    return 0;
  }

  private _getInsertDirection(evt: PointerEvent, target: HTMLElement, targetRect: DOMRect, vertical: boolean): number {
    const mouseOnAxis = vertical ? evt.clientY : evt.clientX;
    const targetS1 = vertical ? targetRect.top : targetRect.left;
    const targetLength = vertical ? targetRect.height : targetRect.width;
    return (mouseOnAxis > targetS1 + targetLength / 2) ? 1 : -1;
  }

  private _swapNodes(n1: HTMLElement, n2: HTMLElement) {
    const p1 = n1.parentNode;
    const p2 = n2.parentNode;
    if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;

    const children = Array.from(p1.children);
    const i1 = children.indexOf(n1);
    const i2 = children.indexOf(n2);

    if (p1.isEqualNode(p2) && i1 < i2) {
      p1.insertBefore(n2, children[i1]);
      p2.insertBefore(n1, children[i2 + 1] || null);
    } else {
      p1.insertBefore(n2, children[i1]);
      p2.insertBefore(n1, children[i2] || null);
    }
  }

  private _maybeAutoScroll(clientX: number, clientY: number) {
    if (!this.scrollParent || !this.scrollParentBounds) return;
    const { left, top, width, height } = this.scrollParentBounds;
    const edgeScrollThreshold = 40;
    const autoScrollSpeed = 15;

    const dl = clientX - left;
    const dr = (left + width) - clientX;
    const dt = clientY - top;
    const db = (top + height) - clientY;

    let dx = 0;
    let dy = 0;

    const canScrollLeft = this.scrollParent.scrollLeft > 0;
    const canScrollRight = this.scrollParent.scrollLeft < (this.scrollParent.scrollWidth - this.scrollParent.clientWidth);
    const canScrollTop = this.scrollParent.scrollTop > 0;
    const canScrollBottom = this.scrollParent.scrollTop < (this.scrollParent.scrollHeight - this.scrollParent.clientHeight);

    if (dl < edgeScrollThreshold && canScrollLeft) {
      dx = -autoScrollSpeed * (1 - dl / edgeScrollThreshold);
    } else if (dr < edgeScrollThreshold && canScrollRight) {
      dx = autoScrollSpeed * (1 - dr / edgeScrollThreshold);
    }

    if (dt < edgeScrollThreshold && canScrollTop) {
      dy = -autoScrollSpeed * (1 - dt / edgeScrollThreshold);
    } else if (db < edgeScrollThreshold && canScrollBottom) {
      dy = autoScrollSpeed * (1 - db / edgeScrollThreshold);
    }

    if (dx !== 0 || dy !== 0) {
      this.scrollParent.scrollBy({ left: dx, top: dy });
    }
  }

  private _canPullPut(toSortable: Sortable): boolean {
    const fromGroup = this.options.group;
    const toGroup = toSortable.options.group;
    if (!fromGroup || !toGroup) return false;

    const fromName = typeof fromGroup === 'object' ? fromGroup.name : fromGroup;
    const toName = typeof toGroup === 'object' ? toGroup.name : toGroup;

    if (fromName && toName && fromName === toName) {
      const fromPull = typeof fromGroup === 'object' && fromGroup.pull !== undefined ? fromGroup.pull : true;
      const toPut = typeof toGroup === 'object' && toGroup.put !== undefined ? toGroup.put : true;
      return !!fromPull && !!toPut;
    }
    return false;
  }

  private _captureRects(container: HTMLElement): Map<HTMLElement, DOMRect> {
    const rects = new Map<HTMLElement, DOMRect>();
    Array.from(container.children).forEach((child: any) => {
      if (child.nodeName.toUpperCase() !== 'TEMPLATE') {
        rects.set(child, child.getBoundingClientRect());
      }
    });
    return rects;
  }

  private _animateShift(container: HTMLElement, beforeRects: Map<HTMLElement, DOMRect>) {
    Array.from(container.children).forEach((child: any) => {
      if (child.nodeName.toUpperCase() === 'TEMPLATE' || child === this.dragEl) return;
      const beforeRect = beforeRects.get(child);
      if (!beforeRect) return;

      const afterRect = child.getBoundingClientRect();
      const dx = beforeRect.left - afterRect.left;
      const dy = beforeRect.top - afterRect.top;

      if (dx !== 0 || dy !== 0) {
        child.style.transition = 'none';
        child.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        child.offsetHeight; // force repaint
        child.style.transition = `transform ${this.options.animation}ms ease-out`;
        child.style.transform = 'translate3d(0, 0, 0)';

        const clean = () => {
          child.style.transition = '';
          child.style.transform = '';
        };
        child.addEventListener('transitionend', clean, { once: true });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Nexus-UX Compatibility Wrappers
// ---------------------------------------------------------------------------
export class DragReorderEngine<T> {
  public sortable: Sortable | null = null;
  private finalToIndex = -1;

  constructor(private ctx: DragReorderContext<T>, private runtime?: RuntimeContext) {
    if (this.ctx.container) {
      this.init();
    }
  }

  private init() {
    const container = this.ctx.container;
    const isMulti = container.getAttribute("data-drag-multi") === "true";
    const selectedClass = container.getAttribute("data-drag-selected-class") || "sortable-selected";
    const swap = container.hasAttribute("data-drag-swap") || container.getAttribute("data-drag-swap") === "true";
    const swapClass = container.getAttribute("data-drag-swap-class") || "sortable-swap-highlight";

    const groupAttr = container.getAttribute("data-drag-group");
    let group: any = undefined;
    if (groupAttr) {
      group = { name: groupAttr };
      // Parse custom data-drag-pull and data-drag-put configuration
      const pullAttr = container.getAttribute("data-drag-pull");
      const pull = pullAttr !== "false" ? (container.hasAttribute("data-drag-clone") || container.getAttribute("data-drag-clone") === "true" ? "clone" : true) : false;
      const put = container.getAttribute("data-drag-put") !== "false";
      const revertClone = container.getAttribute("data-drag-revert-clone") === "true";
      group.pull = pull;
      group.put = put;
      group.revertClone = revertClone;
    }

    const directionAttr = container.getAttribute("data-drag-direction");
    const direction = directionAttr === "grid" ? undefined : (directionAttr as "vertical" | "horizontal" | undefined);

    // Auto-enable invertSwap and 0.65 threshold for nested group
    const isNested = groupAttr === "nested";
    const swapThresholdAttr = container.getAttribute("data-drag-swap-threshold");
    const swapThreshold = swapThresholdAttr ? parseFloat(swapThresholdAttr) : (isNested ? 0.65 : 1);

    const invertSwapAttr = container.getAttribute("data-drag-invert-swap");
    const invertSwap = invertSwapAttr === "true" || isNested;

    this.sortable = new Sortable(container, {
      animation: this.ctx.animationDuration ?? 150,
      ghostClass: this.ctx.ghostClass ?? "sortable-ghost",
      dragClass: this.ctx.dragClass ?? "sortable-drag",
      fallbackOnBody: this.ctx.fallbackOnBody !== false,
      swapThreshold,
      invertSwap,
      direction,
      handle: container.getAttribute("data-drag-handle") || undefined,
      filter: container.getAttribute("data-drag-filter") || undefined,
      draggable: "[data-drag]",
      multiDrag: isMulti,
      selectedClass,
      swap,
      swapClass,
      group,
      sort: this.ctx.sort !== false,
      onStart: (evt) => {
        const globalSignals = this.runtime?.globalSignals() as any;
        if (globalSignals) {
          globalSignals["drag:start"] = {
            element: evt.item,
            originalEvent: evt.originalEvent,
            fromIndex: evt.oldIndex,
          };
        }
      },
      onEnd: (evt) => {
        this.finalToIndex = evt.newIndex;

        const globalSignals = this.runtime?.globalSignals() as any;
        if (globalSignals) {
          globalSignals["drag:end"] = {
            element: evt.item,
            originalEvent: evt.originalEvent,
            cancelled: false,
          };
        }

        const fromContainer = evt.from;
        const toContainer = evt.to;
        const fromExpr = fromContainer.getAttribute("data-drag-container") || fromContainer.getAttribute("data-teleport:drop");
        const toExpr = toContainer.getAttribute("data-drag-container") || toContainer.getAttribute("data-teleport:drop");

        if (!fromExpr || !this.runtime) return;

        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        const isMultiDrag = isMulti && evt.items && evt.items.length > 0;

        // Perform reactive list mutations wrapped inside `flip`
        const childrenToAnimate = Array.from(toContainer.children) as HTMLElement[];
        const flipFn = (this.runtime.sprites as any)?.$animate?.flip || flip;

        // Setup MultiDrag unfolding transition starting layout
        if (isMultiDrag && evt.items.length > 1) {
          const dragRect = evt.item.getBoundingClientRect();
          evt.items.forEach((item: HTMLElement) => {
            if (item !== evt.item) {
              const r = item.getBoundingClientRect();
              const dx = dragRect.left - r.left;
              const dy = dragRect.top - r.top;
              item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            }
          });
        }

        if (toContainer !== fromContainer && toExpr) {
          // Cross-container drag
          const targetList = this.runtime.evaluate(toContainer, toExpr) as any[];
          const sourceList = this.runtime.evaluate(fromContainer, fromExpr) as any[];
          if (Array.isArray(targetList) && Array.isArray(sourceList)) {
            const isClone = (group?.pull === 'clone') || (toContainer.hasAttribute("data-drag-clone") || toContainer.getAttribute("data-drag-clone") === "true");

            let itemsToInsert: any[] = [];
            let indicesToRemove: number[] = [];

            if (isMultiDrag) {
              const sortedIndices = (evt.oldIndicies || []).slice().sort((a: any, b: any) => b.index - a.index);
              const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a: any, b: any) => a.index - b.index);
              itemsToInsert = sortedOldAsc.map((x: any) => {
                const item = sourceList[x.index];
                return isClone ? { ...item, id: `${item.id}-clone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` } : item;
              });
              if (!isClone) {
                indicesToRemove = sortedIndices.map((x: any) => x.index);
              }
            } else {
              const item = sourceList[oldIndex];
              itemsToInsert = [isClone ? { ...item, id: `${item.id}-clone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` } : item];
              if (!isClone) {
                indicesToRemove = [oldIndex];
              }
            }

            // --- CLONE DOM RESTORATION START ---
            if (isClone) {
              // 1. Remove the clone placeholder element created by Sortable inside fromContainer
              if (Sortable.clone && Sortable.clone.parentNode) {
                Sortable.clone.parentNode.removeChild(Sortable.clone);
                Sortable.clone = null;
              }

              // 2. Put the original dragged elements back into fromContainer at their original indices
              if (isMultiDrag) {
                const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a: any, b: any) => a.index - b.index);
                sortedOldAsc.forEach((x: any) => {
                  const el = x.multiDragElement;
                  const sib = fromContainer.children[x.index];
                  if (sib) {
                    fromContainer.insertBefore(el, sib);
                  } else {
                    fromContainer.appendChild(el);
                  }
                });
              } else {
                const sib = fromContainer.children[oldIndex];
                if (sib) {
                  fromContainer.insertBefore(evt.item, sib);
                } else {
                  fromContainer.appendChild(evt.item);
                }
              }

              // 3. Remove the dragged elements from the target toContainer DOM (since they will be reactively re-created)
              if (isMultiDrag) {
                evt.items.forEach((item: HTMLElement) => {
                  if (item.parentNode === toContainer) {
                    toContainer.removeChild(item);
                  }
                });
              } else {
                if (evt.item.parentNode === toContainer) {
                  toContainer.removeChild(evt.item);
                }
              }
            }
            // --- CLONE DOM RESTORATION END ---

            if (isClone) {
              this.ctx.updateList((src) => {
                targetList.splice(newIndex, 0, ...itemsToInsert);
              });
            } else {
              flipFn(childrenToAnimate, () => {
                this.ctx.updateList((src) => {
                  for (const idx of indicesToRemove) {
                    src.splice(idx, 1);
                  }
                  targetList.splice(newIndex, 0, ...itemsToInsert);
                });
              }, { duration: this.ctx.animationDuration ?? 150 });
            }
          }
        } else {
          // Intra-container drag
          const sourceList = this.runtime.evaluate(fromContainer, fromExpr) as any[];
          if (Array.isArray(sourceList)) {
            flipFn(childrenToAnimate, () => {
              this.ctx.updateList((list) => {
                if (swap) {
                  if (isMultiDrag) {
                    const oldInd = evt.oldIndicies || [];
                    const newInd = evt.newIndicies || [];
                    for (let i = 0; i < oldInd.length; i++) {
                      const oIdx = oldInd[i].index;
                      const nIdx = newInd[i].index;
                      if (oIdx !== -1 && nIdx !== -1) {
                        const temp = list[nIdx];
                        list[nIdx] = list[oIdx];
                        list[oIdx] = temp;
                      }
                    }
                  } else {
                    const temp = list[newIndex];
                    list[newIndex] = list[oldIndex];
                    list[oldIndex] = temp;
                  }
                } else {
                  if (isMultiDrag) {
                    const sortedOldDesc = (evt.oldIndicies || []).slice().sort((a: any, b: any) => b.index - a.index);
                    const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a: any, b: any) => a.index - b.index);
                    const itemsToInsert = sortedOldAsc.map((x: any) => sourceList[x.index]);
                    for (const x of sortedOldDesc) {
                      list.splice(x.index, 1);
                    }
                    list.splice(newIndex, 0, ...itemsToInsert);
                  } else {
                    const [moved] = list.splice(oldIndex, 1);
                    list.splice(newIndex, 0, moved);
                  }
                }
              });
            }, { duration: this.ctx.animationDuration ?? 150 });
          }
        }
      }
    });
  }

  public startDrag() { }
  public updateDrag() { }
  public endDrag() { }
  public getFinalToIndex(): number {
    return this.finalToIndex;
  }
}

export function buildReorderContext<T>(
  container: HTMLElement,
  listExpr: string,
  runtime: RuntimeContext,
  options?: any
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
    ghostClass: options?.ghostClass,
    dragClass: options?.dragClass,
    group: options?.group,
    sort: options?.sort !== false,
    swap: options?.swap,
    swapClass: options?.swapClass,
    fallbackOnBody: options?.fallbackOnBody,
    swapThreshold: options?.swapThreshold,
    edgeScrollThreshold: options?.edgeScrollThreshold ?? 40,
    autoScrollSpeed: options?.autoScrollSpeed ?? 15,
    animationDuration: options?.animationDuration ?? 150,
    onReorder: options?.onReorder,
  };
}

// ---------------------------------------------------------------------------
// Nexus-UX Directive Bindings
// ---------------------------------------------------------------------------
export const dragAttribute: AttributeModule = {
  name: "drag",
  attribute: "drag",
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    const canvasContainer = element.closest('[data-nexus-spatial-canvas]');
    if (canvasContainer) return;

    if ((element as any).__nexusDragBound) return (element as any).__nexusDragCleanup;
    (element as any).__nexusDragBound = true;

    const isContainer = element.hasAttribute('data-drag-container') || element.hasAttribute('data-teleport:drop');
    const container = isContainer ? element : element.parentElement;
    if (!container) return;

    let cleanupEffect: (() => void) | undefined = undefined;

    // Use runtime elementBoundEffect for automatic cleanup
    const [_, stopEffect] = runtime.elementBoundEffect(container, () => {
      const threshExpr = container.getAttribute("data-bind-data-drag-swap-threshold") ||
        container.getAttribute("data-bind:data-drag-swap-threshold");

      const engine = (container as any).__sortable;
      if (engine && engine.sortable && threshExpr) {
        const val = runtime.evaluate(container, threshExpr);
        if (val !== undefined && val !== null) {
          engine.sortable.options.swapThreshold = Number(val);
        }
      }

      if (!(container as any).__sortable) {
        try {
          const listExpr = container.getAttribute("data-drag-container") || container.getAttribute("data-teleport:drop") || "";
          const ctx = buildReorderContext(container, listExpr, runtime);
          const engine = new DragReorderEngine(ctx, runtime);
          (container as any).__sortable = engine;

          // Cleanup engine ONLY when container itself leaves DOM
          runtime.onEffectCleanup(() => {
            if (engine.sortable) {
              engine.sortable.destroy();
            }
            delete (container as any).__sortable;
          });
        } catch (err) {
          runtime.reportError(err instanceof Error ? err : new Error(String(err)), container, "drag-init");
        }
      }
    });

    cleanupEffect = () => {
      stopEffect();
      delete (element as any).__nexusDragBound;
      delete (element as any).__nexusDragCleanup;
    };

    (element as any).__nexusDragCleanup = cleanupEffect;
    return cleanupEffect;
  },
};

export default dragAttribute;
