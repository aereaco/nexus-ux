import { AttributeModule } from "../../engine/modules.ts";
import { RuntimeContext } from "../../engine/composition.ts";

function getScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const isScrollableY = overflowY === 'auto' || overflowY === 'scroll';
    const isScrollableX = overflowX === 'auto' || overflowX === 'scroll';
    if (isScrollableY || isScrollableX) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

function swapNodes(n1: HTMLElement, n2: HTMLElement) {
  const p1 = n1.parentNode;
  const p2 = n2.parentNode;
  if (!p1 || !p2) return;
  
  const s1 = n1.nextSibling;
  const s2 = n2.nextSibling;
  
  if (s1 === n2) {
    p1.insertBefore(n2, n1);
  } else if (s2 === n1) {
    p2.insertBefore(n1, n2);
  } else {
    p1.insertBefore(n2, s1);
    p2.insertBefore(n1, s2);
  }
}

/**
 * DragReorderEngine — In-List Real-Time Reordering for Nexus-UX
 */
interface DragReorderContext<T> {
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

interface DragItemInfo<T> {
  item: T;
  element: HTMLElement;
  index: number;
}

class DragReorderEngine<T> {
  private ctx: DragReorderContext<T>;
  private runtime: RuntimeContext;
  private activeDrag: DragItemInfo<T> | null = null;
  private ghostEl: HTMLElement | null = null;
  private placeholderEl: HTMLElement | null = null;
  private containerBounds: DOMRect | null = null;
  private currentToIndex: number = -1;
  private currentDropZone: HTMLElement | null = null;
  private multiItems: DragItemInfo<T>[] = [];
  private isSwapMode: boolean = false;
  // SortableJS tapDistance pattern: cursor-to-element offset at drag start
  private tapOffsetX: number = 0;
  private tapOffsetY: number = 0;
  private startClientX: number = 0;
  private startClientY: number = 0;
  private lastTarget: HTMLElement | null = null;
  private lastDirection: number = 0;
  private pastFirstInvertThresh: boolean = false;
  private isCircumstantialInvert: boolean = false;
  private targetMoveDistance: number = 0;
  private targetBeforeFirstSwap: number = 0;
  private originalDOMStates: { container: HTMLElement; childNodes: Node[]; displays: Map<HTMLElement, string> }[] = [];
  private scrollParent: HTMLElement | null = null;
  private scrollParentBounds: DOMRect | null = null;

  constructor(ctx: DragReorderContext<T>, runtime: RuntimeContext) {
    this.ctx = ctx;
    this.runtime = runtime;
  }

  private captureDOMState(container: HTMLElement) {
    if (this.originalDOMStates.some(s => s.container === container)) return;
    const childNodes = Array.from(container.childNodes);
    const displays = new Map<HTMLElement, string>();
    for (const node of childNodes) {
      if (node instanceof HTMLElement) {
        displays.set(node, node.style.display);
      }
    }
    this.originalDOMStates.push({
      container,
      childNodes,
      displays
    });
  }

  startDrag(
    dragState: { element: HTMLElement; sourceList: T[]; fromIndex: number },
    _event: Event,
  ): void {
    this.lastTarget = null;
    this.lastDirection = 0;
    this.pastFirstInvertThresh = false;
    this.isCircumstantialInvert = false;
    this.targetMoveDistance = 0;
    this.targetBeforeFirstSwap = 0;
    this.originalDOMStates = [];
    this.captureDOMState(this.ctx.container);

    this.scrollParent = getScrollParent(this.ctx.container);
    this.scrollParentBounds = this.scrollParent.getBoundingClientRect();

    const { element, sourceList, fromIndex } = dragState;
    const item = sourceList[fromIndex];
    if (item === undefined) return;

    const list = this.ctx.getList();
    const currentIndex = list.indexOf(item);
    if (currentIndex === -1) return;

    this.activeDrag = { item, element, index: currentIndex };
    (this.activeDrag as any).originalNextSibling = element.nextElementSibling;
    (this.activeDrag as any).originalParent = element.parentElement;
    this.currentToIndex = currentIndex;

    const dragItems = (dragState as any).dragItems as T[];
    const dragElements = (dragState as any).dragElements as HTMLElement[];
    const fromIndices = (dragState as any).fromIndices as number[];

    if (dragItems && dragElements && fromIndices && dragItems.length > 1) {
       this.multiItems = dragItems.map((itm, i) => ({
         item: itm,
         element: dragElements[i],
         index: fromIndices[i]
       }));
    } else {
       this.multiItems = [this.activeDrag];
    }

    if ((globalThis as any)._nexusDebugDrag) {
      console.log("[drag-reorder] startDrag", { currentIndex, item });
    }

    // Capture cursor-to-element offset (SortableJS tapDistanceLeft/Top)
    const rect = element.getBoundingClientRect();
    if (_event instanceof DragEvent || (_event as any).clientX !== undefined) {
      const e = _event as DragEvent;
      this.tapOffsetX = e.clientX - rect.left;
      this.tapOffsetY = e.clientY - rect.top;
      this.startClientX = e.clientX;
      this.startClientY = e.clientY;
    } else {
      this.tapOffsetX = rect.width / 2;
      this.tapOffsetY = rect.height / 2;
      this.startClientX = rect.left + rect.width / 2;
      this.startClientY = rect.top + rect.height / 2;
    }

    this.ghostEl = this.createGhost(element, this.ctx.dragClass);
    const fallbackContainer = this.ctx.fallbackOnBody ? document.body : (element.parentElement || document.body);
    fallbackContainer.appendChild(this.ghostEl);
    this.positionGhost(element, _event);

    this.placeholderEl = element;
    this.placeholderEl.classList.add("sortable-ghost");
    if (this.ctx.ghostClass) {
      this.ctx.ghostClass.split(" ").forEach(c => {
        if (c.trim()) this.placeholderEl!.classList.add(c.trim());
      });
    }

    // Hide secondary multi-drag items
    if (this.multiItems.length > 1) {
      for (const m of this.multiItems) {
        if (m.element !== element) {
          m.element.style.display = "none";
        }
      }
    }

    this.containerBounds = this.ctx.container.getBoundingClientRect();
    this.ctx.onReorder?.(list, currentIndex, currentIndex);
  }

  updateDrag(clientX: number, clientY: number, _event: Event): void {
    if (!this.activeDrag || !this.ghostEl) return;

    const fromIndex = this.activeDrag.index;
    this.isSwapMode = this.ctx.swap === true || ((_event as PointerEvent).shiftKey === true);

    this.positionGhostAt(clientX, clientY);
    this.containerBounds = this.ctx.container.getBoundingClientRect();

    const currentZone = this.currentDropZone || this.ctx.container;
    if (this.currentDropZone) {
      this.captureDOMState(this.currentDropZone);
      this.scrollParent = getScrollParent(this.currentDropZone);
    } else {
      this.scrollParent = getScrollParent(this.ctx.container);
    }
    if (this.scrollParent) {
      this.scrollParentBounds = this.scrollParent.getBoundingClientRect();
    }

    this.maybeAutoScroll(clientX, clientY);

    const toIndex = this.calculateInsertIndex(clientX, clientY, _event as PointerEvent | DragEvent);
    
    const target = (this.activeDrag as any).lastHoverTarget || null;
    this.updateHighlight(target, currentZone, clientX, clientY);

    if (toIndex === -1) return;

    this.repositionPlaceholder(currentZone, toIndex);

    // Read live DOM index to keep tracking aligned
    const currentChildren = this.getDraggableChildren(currentZone);
    const liveIndex = currentChildren.indexOf(this.placeholderEl!);
    if (liveIndex !== -1) {
      this.currentToIndex = liveIndex;
    }

    // After DOM insertion, calculate targetMoveDistance (must be done before animation/next frame)
    if (target && this.targetBeforeFirstSwap !== undefined && !this.isCircumstantialInvert) {
      const direction = this._detectDirection(currentZone);
      const vertical = direction === "vertical";
      const side1 = vertical ? 'top' : 'left';
      this.targetMoveDistance = Math.abs(this.targetBeforeFirstSwap - target.getBoundingClientRect()[side1]);
    }

    if ((globalThis as any)._nexusDebugDrag) {
      console.log("[drag-reorder] updateDrag", {
        fromIndex,
        toIndex,
        active: !!this.activeDrag,
      });
    }
  }

  private updateHighlight(target: HTMLElement | null, container: HTMLElement, clientX: number, clientY: number) {
     const beforeClass = container.getAttribute('data-drag-before-class') || 'drop-target-before';
     const afterClass = container.getAttribute('data-drag-after-class') || 'drop-target-after';
     const swapClass = this.ctx.swapClass || 'drop-target-swap';
     
     Array.from(container.querySelectorAll('.' + beforeClass)).forEach(el => el.classList.remove(beforeClass));
     Array.from(container.querySelectorAll('.' + afterClass)).forEach(el => el.classList.remove(afterClass));
     Array.from(container.querySelectorAll('.' + swapClass)).forEach(el => el.classList.remove(swapClass));

     if (!target) return;

     if (this.isSwapMode) {
         target.classList.add(swapClass);
         return;
     }

     const direction = this.ctx.direction || 'vertical';
     const rect = target.getBoundingClientRect();
     let isAfter = false;
     
     if (direction === 'horizontal') {
         isAfter = (clientX - rect.left) > rect.width / 2;
     } else if (direction === 'grid') {
         // Primary X axis, but if very clear Y difference, use Y
         const dx = clientX - (rect.left + rect.width / 2);
         const dy = clientY - (rect.top + rect.height / 2);
         isAfter = Math.abs(dx) > Math.abs(dy) ? dx > 0 : dy > 0;
     } else {
         isAfter = (clientY - rect.top) > rect.height / 2;
     }
     
     target.classList.add(isAfter ? afterClass : beforeClass);
  }

  endDrag(_event: Event): void {
    this.updateHighlight(null, this.ctx.container, 0, 0);
    
    const fromIndex = this.activeDrag?.index ?? -1;
    const toIndex = this.currentToIndex;
    
    // Always revert the manual DOM mutations to ensure clean state before array commit
    if (this.originalDOMStates) {
      for (const state of this.originalDOMStates) {
        while (state.container.firstChild) {
          state.container.removeChild(state.container.firstChild);
        }
        for (const child of state.childNodes) {
          if (child instanceof HTMLElement) {
            const origDisplay = state.displays.get(child);
            if (origDisplay !== undefined) {
              child.style.display = origDisplay;
            }
          }
          state.container.appendChild(child);
        }
      }
    }

    // ZCZS: Commit the array mutation ONLY on drop to prevent reactive loops during drag
    if (this.activeDrag && toIndex !== -1 && (toIndex !== fromIndex || (this.currentDropZone && this.currentDropZone !== this.ctx.container))) {
        this.executeReorder(fromIndex, toIndex);
    }

    this.cleanupGhost();
    this.activeDrag = null;
    this.ghostEl = null;
    this.placeholderEl = null;
    this.currentToIndex = -1;
  }

  getFinalToIndex(): number {
    return this.currentToIndex;
  }

  private createGhost(sourceEl: HTMLElement, dragClass?: string): HTMLElement {
    const ghost = sourceEl.cloneNode(true) as HTMLElement;
    
    // ZCZS Mandate: The ghost is purely visual. Strip all Nexus-UX reactive attributes 
    // to prevent the MutationObserver from compiling it and triggering infinite loops 
    // or out-of-scope expression failures.
    const stripReactiveAttributes = (el: HTMLElement) => {
      const attrsToRemove = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attrName = el.attributes[i].name;
        if (attrName.startsWith('data-') || attrName.startsWith('nexus-')) {
          attrsToRemove.push(attrName);
        }
      }
      attrsToRemove.forEach(attr => el.removeAttribute(attr));
      el.id = '';
      for (let i = 0; i < el.children.length; i++) {
        stripReactiveAttributes(el.children[i] as HTMLElement);
      }
    };
    stripReactiveAttributes(ghost);

    if (this.multiItems.length > 1) {
      const badge = document.createElement("div");
      badge.textContent = String(this.multiItems.length);
      Object.assign(badge.style, {
        position: "absolute",
        top: "-8px",
        right: "-8px",
        background: "var(--fallback-p, oklch(var(--p)))",
        color: "var(--fallback-pc, oklch(var(--pc)))",
        borderRadius: "9999px",
        padding: "2px 8px",
        fontSize: "12px",
        fontWeight: "bold",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        zIndex: "100000",
      });
      ghost.appendChild(badge);
    }

    ghost.classList.add("sortable-drag");
    if (dragClass) {
      dragClass.split(" ").forEach(c => {
        if (c.trim()) ghost.classList.add(c.trim());
      });
    }
    Object.assign(ghost.style, {
      position: "fixed",
      pointerEvents: "none",
      opacity: "0.85",
      zIndex: "999999",
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      transition: "opacity 0.15s ease-out",
    });
    const rect = sourceEl.getBoundingClientRect();
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    return ghost;
  }

  private positionGhost(sourceEl: HTMLElement, _event: Event): void {
    if (!this.ghostEl) return;
    const rect = sourceEl.getBoundingClientRect();
    this.ghostEl.style.left = rect.left + "px";
    this.ghostEl.style.top = rect.top + "px";
  }

  private positionGhostAt(x: number, y: number): void {
    if (!this.ghostEl) return;
    const left = x - this.tapOffsetX;
    const top = y - this.tapOffsetY;
    this.ghostEl.style.left = left + "px";
    this.ghostEl.style.top = top + "px";
  }

  private isValidDraggableChild(child: HTMLElement, targetZone: HTMLElement | null = null): boolean {
    if (child === this.ghostEl) return false;
    if (child.hasAttribute("data-ux-template")) return false;
    if (getComputedStyle(child).display === "none") return false;
    if (!child.hasAttribute("data-drag")) return false;
    const dz = child.closest("[data-teleport\\:drop]") as HTMLElement | null;
    if (targetZone && dz !== targetZone) return false;

    if (dz === this.ctx.container || !dz) {
        if (this.ctx.sort === false) return false;
        return true;
    }

    // ZCZS: gate on filter selector
    const filterSel = this.ctx.container.getAttribute("data-drag-filter");
    if (filterSel) {
      const fs = filterSel.trim();
      if (fs && child.matches(fs)) return false;
    }
    // Check cross-list group
    const myGroup = this.ctx.group;
    if (!myGroup) return false;
    
    const theirGroupName = dz.getAttribute("data-drag-group");
    const myGroupName = typeof myGroup === 'string' ? myGroup : myGroup.name;
    
    if (theirGroupName === myGroupName) {
      const theirPut = dz.getAttribute("data-drag-put");
      if (theirPut === "false") return false;
      
      const myGroupConfig = typeof myGroup === 'object' ? myGroup : null;
      if (myGroupConfig && myGroupConfig.put === false) return false;

      return true;
    }
    return false;
  }

  private getDraggableChildren(container: HTMLElement): HTMLElement[] {
    const children: HTMLElement[] = [];
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (this.isValidDraggableChild(child, container)) {
        children.push(child);
      }
    }
    return children;
  }

  private calculateInsertIndex(
    clientX: number,
    clientY: number,
    event?: PointerEvent | DragEvent,
  ): number {
    if (!this.activeDrag) return -1;

    // Step 1: Find target under cursor
    const targetInfo = this.findTargetUnderCursor(clientX, clientY);
    const target = targetInfo.target;
    const dropZone = targetInfo.zone;
    
    (this.activeDrag as any).lastHoverTarget = target;
    
    if (!dropZone) return -1;

    // Switch active drop zone if changed
    this.currentDropZone = dropZone;

    if (!target) {
       // If no target but valid dropzone (e.g. empty list), index is 0
       return 0;
    }

    if (target === this.placeholderEl) return -1;

    const direction = this._detectDirection(dropZone);
    const vertical = direction === "vertical";
    const targetRect = target.getBoundingClientRect();
    const dragRect = this.placeholderEl!.getBoundingClientRect();

    const differentLevel = this.placeholderEl!.parentNode !== dropZone;
    const differentRowCol = !this._dragElInRowColumn(dragRect, targetRect, vertical);
    const side1 = vertical ? 'top' : 'left';

    const isLastTarget = this.lastTarget === target;

    if (!isLastTarget) {
      this.targetBeforeFirstSwap = targetRect[side1];
      this.pastFirstInvertThresh = false;
      this.isCircumstantialInvert = (!differentRowCol && (this.ctx.swap === true)) || differentLevel;
    }

    const swapThreshold = differentRowCol ? 1 : (this.ctx.swapThreshold ?? 0.5);
    const invertedSwapThreshold = this.ctx.swapThreshold ?? 0.5;

    const swapDirection = this._getSwapDirection(
      event,
      target,
      targetRect,
      vertical,
      swapThreshold,
      invertedSwapThreshold,
      this.isCircumstantialInvert,
      isLastTarget
    );

    if (swapDirection === 0) return -1;

    const children = this.getDraggableChildren(dropZone);
    const dragIndex = children.indexOf(this.placeholderEl!);
    const targetIndex = children.indexOf(target);

    if (this.isSwapMode) {
      this.lastTarget = target;
      this.lastDirection = swapDirection;
      return targetIndex;
    }

    // If dragEl is already beside target: Do not insert
    let checkIndex = dragIndex;
    let sibling: HTMLElement | null = null;
    do {
      checkIndex -= swapDirection;
      sibling = children[checkIndex] || null;
    } while (sibling && (getComputedStyle(sibling).display === 'none' || sibling === this.ghostEl));

    if (sibling === target) {
      return -1;
    }

    this.lastTarget = target;
    this.lastDirection = swapDirection;

    return swapDirection === 1 ? targetIndex + 1 : targetIndex;
  }

  /**
   * Find target element under cursor using quadtree for O(log n) query.
   * Falls back to elementFromPoint if quadtree unavailable.
   */
  private findTargetUnderCursor(
    clientX: number,
    clientY: number,
  ): { target: HTMLElement | null, zone: HTMLElement | null } {
    // ZCZS: Use quadtree from predictive engine for O(log n) query
    const quadtree = (globalThis as any)._nexusQuadtree;
    if (quadtree) {
      const targets = quadtree.queryRadius(clientX, clientY, 20);
      for (const target of targets) {
        if (
          target instanceof HTMLElement && this.isValidDraggableChild(target)
        ) {
          const rect = target.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            const zone = target.closest("[data-teleport\\:drop]") as HTMLElement;
            return { target, zone };
          }
        }
      }
    }

    // Fallback: temporarily hide ghost for accurate element detection
    const ghostDisplay = this.ghostEl?.style.display;
    if (this.ghostEl) this.ghostEl.style.display = "none";

    let target: HTMLElement | null = null;
    let zone: HTMLElement | null = null;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement;
    
    if ((globalThis as any)._nexusDebugDrag) {
       console.log("[drag hit-test] el:", el?.tagName, el?.className);
    }

    if (el) {
      target = el.closest('[data-drag]') as HTMLElement;
      if (target && !this.isValidDraggableChild(target)) {
        target = null;
      }
      if (target) {
        zone = target.closest("[data-teleport\\:drop]") as HTMLElement;
      } else {
        zone = el.closest("[data-teleport\\:drop]") as HTMLElement;
        if (zone) {
            // Check if we can drop into this empty zone
            // Just use a dummy element to test zone compatibility
            const dummy = document.createElement("div");
            dummy.setAttribute("data-drag", "true");
            zone.appendChild(dummy);
            const isValid = this.isValidDraggableChild(dummy, zone);
            zone.removeChild(dummy);
            if (!isValid) zone = null;
        }
      }
    }

    // Restore ghost display
    if (this.ghostEl) this.ghostEl.style.display = ghostDisplay || "";

    return { target, zone };
  }

  private _detectDirection(container: HTMLElement): "vertical" | "horizontal" {
    const direction = this.ctx.direction;
    if (direction === "vertical") return "vertical";
    if (direction === "horizontal") return "horizontal";

    const style = getComputedStyle(container);
    if (style.display === "flex") {
      return (style.flexDirection === "column" || style.flexDirection === "column-reverse")
        ? "vertical" : "horizontal";
    }
    if (style.display === "grid") {
      return (style.gridTemplateColumns.split(" ").length <= 1)
        ? "vertical" : "horizontal";
    }

    const children = this.getDraggableChildren(container);
    if (children.length >= 2) {
      const rect1 = children[0].getBoundingClientRect();
      const rect2 = children[1].getBoundingClientRect();
      return Math.abs(rect1.top - rect2.top) < 4 ? "horizontal" : "vertical";
    }
    return "vertical";
  }

  private _dragElInRowColumn(dragRect: DOMRect, targetRect: DOMRect, vertical: boolean): boolean {
    const dragElS1Opp = vertical ? dragRect.left : dragRect.top;
    const dragElS2Opp = vertical ? dragRect.right : dragRect.bottom;
    const dragElOppLength = vertical ? dragRect.width : dragRect.height;
    const targetS1Opp = vertical ? targetRect.left : targetRect.top;
    const targetS2Opp = vertical ? targetRect.right : targetRect.bottom;
    const targetOppLength = vertical ? targetRect.width : targetRect.height;

    const dragCenter = dragElS1Opp + dragElOppLength / 2;
    const targetCenter = targetS1Opp + targetOppLength / 2;

    const eps = 4;
    return (
      Math.abs(dragElS1Opp - targetS1Opp) < eps ||
      Math.abs(dragElS2Opp - targetS2Opp) < eps ||
      Math.abs(dragCenter - targetCenter) < eps
    );
  }

  private getInsertDirection(target: HTMLElement): -1 | 1 {
    const children = this.getDraggableChildren(this.currentDropZone || this.ctx.container);
    const dragIdx = children.indexOf(this.placeholderEl!);
    const targetIdx = children.indexOf(target);
    return dragIdx < targetIdx ? 1 : -1;
  }

  private _getSwapDirection(
    event: PointerEvent | DragEvent | undefined,
    target: HTMLElement,
    targetRect: DOMRect,
    vertical: boolean,
    swapThreshold: number,
    invertedSwapThreshold: number,
    invertSwap: boolean,
    isLastTarget: boolean,
  ): -1 | 0 | 1 {
    if (!event) return 0;
    const mouseOnAxis = vertical ? event.clientY : event.clientX;
    const targetLength = vertical ? targetRect.height : targetRect.width;
    const targetS1 = vertical ? targetRect.top : targetRect.left;
    const targetS2 = vertical ? targetRect.bottom : targetRect.right;
    let invert = false;

    if (!invertSwap) {
      // Check if target movement causes mouse to move past the end of swapThreshold
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
            return -this.lastDirection as -1 | 0 | 1;
          }
        } else {
          invert = true;
        }
      } else {
        // Regular Threshold
        if (
          mouseOnAxis > targetS1 + (targetLength * (1 - swapThreshold) / 2) &&
          mouseOnAxis < targetS2 - (targetLength * (1 - swapThreshold) / 2)
        ) {
          return this.getInsertDirection(target);
        }
      }
    }

    invert = invert || invertSwap;
    if (invert) {
      if (
        mouseOnAxis < targetS1 + (targetLength * invertedSwapThreshold / 2) ||
        mouseOnAxis > targetS2 - (targetLength * invertedSwapThreshold / 2)
      ) {
        return ((mouseOnAxis > targetS1 + targetLength / 2) ? 1 : -1);
      }
    }

    return 0;
  }

  private repositionPlaceholder(targetZone: HTMLElement, toIndex: number): void {
    if (!this.placeholderEl || !targetZone) return;

    // Guard: Never insert an element into its own descendant to prevent HierarchyRequestError
    if (this.placeholderEl.contains(targetZone)) return;

    const target = (this.activeDrag as any).lastHoverTarget;
    if (this.isSwapMode && target) {
      if (this.placeholderEl.parentNode !== target.parentNode || this.placeholderEl.nextSibling !== target.nextSibling) {
        const oldZone = this.placeholderEl.parentNode as HTMLElement;
        const states = new Map<Element, DOMRect>();
        if (oldZone) this.captureAnimationState(oldZone, states);
        if (targetZone !== oldZone) this.captureAnimationState(targetZone, states);

        swapNodes(this.placeholderEl, target);

        requestAnimationFrame(() => {
          if (oldZone) this.animateAll(oldZone, states, this.ctx.animationDuration ?? 150);
          if (targetZone !== oldZone) this.animateAll(targetZone, states, this.ctx.animationDuration ?? 150);
        });
      }
      return;
    }

    this.placeholderEl.style.display = '';

    const children = this.getDraggableChildren(targetZone);
    const ref = toIndex >= children.length ? null : children[toIndex];

    // Guard: Never insert an element before its own descendant to prevent HierarchyRequestError
    if (ref && this.placeholderEl.contains(ref)) return;

    // ZCZS: Only move if the parent container changed OR if the sibling position within the same container changed
    if (this.placeholderEl.parentNode !== targetZone || (ref === null ? this.placeholderEl.nextSibling !== null : this.placeholderEl.nextSibling !== ref)) {
      const oldZone = this.placeholderEl.parentNode as HTMLElement;
      
      // Capture states before mutation
      const states = new Map<Element, DOMRect>();
      if (oldZone) this.captureAnimationState(oldZone, states);
      if (targetZone !== oldZone) this.captureAnimationState(targetZone, states);

      if (ref) {
        targetZone.insertBefore(this.placeholderEl, ref);
      } else {
        targetZone.appendChild(this.placeholderEl);
      }

      // Animate siblings after mutation
      requestAnimationFrame(() => {
          if (oldZone) this.animateAll(oldZone, states, this.ctx.animationDuration ?? 150);
          if (targetZone !== oldZone) this.animateAll(targetZone, states, this.ctx.animationDuration ?? 150);
      });
    }
  }

  private maybeAutoScroll(clientX: number, clientY: number): void {
    const { onAutoScroll, edgeScrollThreshold = 40, autoScrollSpeed = 15 } =
      this.ctx;
    if (!this.scrollParent || !this.scrollParentBounds) return;

    const { left, top, width, height } = this.scrollParentBounds;
    const dl = clientX - left;
    const dr = left + width - clientX;
    const dt = clientY - top;
    const db = top + height - clientY;

    let dx = 0, dy = 0;
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
      if (onAutoScroll) {
        onAutoScroll({ x: dx, y: dy });
      } else {
        this.scrollParent.scrollBy({ left: dx, top: dy });
      }
    }
  }

  private cleanupGhost(): void {
    if (this.ghostEl && this.ghostEl.parentNode) {
      this.ghostEl.remove();
      this.ghostEl = null;
    }
    if (this.placeholderEl) {
      this.placeholderEl.classList.remove("sortable-ghost");
      if (this.ctx.ghostClass) {
        this.ctx.ghostClass.split(" ").forEach(c => {
          if (c.trim()) this.placeholderEl!.classList.remove(c.trim());
        });
      }
      this.placeholderEl = null;
    }
    // Restore secondary multi-drag items
    if (this.multiItems.length > 1) {
      for (const m of this.multiItems) {
        if (m.element !== this.activeDrag?.element) {
          m.element.style.display = "";
        }
      }
    }
  }

  /**
   * Capture bounding rects of all children before a DOM mutation.
   * Ported from SortableJS AnimationStateManager.captureAnimationState.
   */
  private captureAnimationState(container: HTMLElement = this.ctx.container, states = new Map<Element, DOMRect>()): Map<Element, DOMRect> {
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      if (child === this.ghostEl || child === this.placeholderEl) continue;
      if ((child as HTMLElement).style?.display === 'none') continue;
      states.set(child, child.getBoundingClientRect());
    }
    return states;
  }

  /**
   * FLIP-animate children from their captured positions to their new positions.
   * Ported from SortableJS Animation.js: animate() method.
   */
  private animateAll(container: HTMLElement, prevStates: Map<Element, DOMRect>, duration: number): void {
    // Phase 1: Clear all ongoing animations to get accurate final resting DOM rects
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (child === this.ghostEl || child === this.placeholderEl) continue;
      child.style.transition = '';
      child.style.transform = '';
    }

    // Force repaint after clearing transforms to ensure accurate layout measurement
    // container.offsetWidth; // This is sometimes needed in older browsers, but getBoundingClientRect forces layout anyway

    // Phase 2: Calculate dx/dy and setup initial FLIP transform
    const toAnimate = [];
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (child === this.ghostEl || child === this.placeholderEl) continue;
      
      const fromRect = prevStates.get(child);
      if (!fromRect) continue;

      const toRect = child.getBoundingClientRect();
      const dx = fromRect.left - toRect.left;
      const dy = fromRect.top - toRect.top;
      
      if (dx === 0 && dy === 0) continue;

      // Jump to old position instantly
      child.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      toAnimate.push(child);
    }

    // Phase 3: Force repaint once for all elements, then start transitions
    if (toAnimate.length > 0) {
      container.offsetWidth; // eslint-disable-line @typescript-eslint/no-unused-expressions

      for (const el of toAnimate) {
        el.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        el.style.transform = 'translate3d(0, 0, 0)';

        // Cleanup after animation completes
        const cleanup = () => {
          el.style.transition = '';
          el.style.transform = '';
        };
        el.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, duration + 50); // fallback if transitionend doesn't fire
      }
    }
  }

  private executeReorder(fromIndex: number, toIndex: number): void {
    if (!this.activeDrag) return;
    const isSameZone = !this.currentDropZone || this.currentDropZone === this.ctx.container;
    if (fromIndex === toIndex && isSameZone) return;
    
    // Capture child positions BEFORE mutation (SortableJS FLIP Step 1)
    const prevStates = new Map<Element, DOMRect>();
    this.captureAnimationState(this.ctx.container, prevStates);
    if (this.currentDropZone && this.currentDropZone !== this.ctx.container) {
        this.captureAnimationState(this.currentDropZone, prevStates);
    }

    let adjToIndex = toIndex;
    
    if (!isSameZone && this.currentDropZone) {
       const targetExpr = this.currentDropZone.getAttribute("data-teleport:drop");
       if (targetExpr) {
           const targetList = this.runtime.evaluate(this.currentDropZone, targetExpr) as any[];
           if (Array.isArray(targetList)) {
               const myGroupConfig = typeof this.ctx.group === 'object' ? this.ctx.group : null;
               const isClone = (myGroupConfig?.pull === 'clone') || (this.currentDropZone.getAttribute("data-teleport-mode") === "clone");

               this.ctx.updateList((sourceList) => {
                 const itemsToInsert = this.multiItems.map(m => {
                    try {
                        return isClone ? structuredClone(m.item) : m.item;
                    } catch {
                        return { ...m.item }; // fallback if structuredClone fails on proxies
                    }
                 });
                 
                 if (!isClone) {
                   const toRemove = [...this.multiItems].sort((a,b) => b.index - a.index);
                   for (const removed of toRemove) {
                     sourceList.splice(removed.index, 1);
                   }
                 }
                 
                 // ZCZS Mandate: Mutate target array directly to trigger proxy traps
                 targetList.splice(toIndex, 0, ...itemsToInsert);
               });
           }
       }
    } else {
        this.ctx.updateList((list) => {
          if (this.isSwapMode) {
              // Swap Mode
              const toRemove = [...this.multiItems].sort((a,b) => b.index - a.index);
              for (let i = 0; i < toRemove.length; i++) {
                  const m = toRemove[i];
                  const temp = list[toIndex];
                  list[toIndex] = list[m.index];
                  list[m.index] = temp;
              }
          } else {
              // Shift Mode
              const toRemove = [...this.multiItems].sort((a,b) => b.index - a.index);
              
              for (const removed of toRemove) {
                list.splice(removed.index, 1);
              }
              
              const itemsToInsert = this.multiItems.map(m => m.item);
              list.splice(adjToIndex, 0, ...itemsToInsert);
          }
        });
    }

    for (let i = 0; i < this.multiItems.length; i++) {
       this.multiItems[i].index = adjToIndex + i;
    }
    this.activeDrag!.index = adjToIndex;

    // Animate siblings AFTER mutation (SortableJS FLIP Step 2)
    requestAnimationFrame(() => {
      this.animateAll(this.ctx.container, prevStates, this.ctx.animationDuration ?? 150);
      if (this.currentDropZone && this.currentDropZone !== this.ctx.container) {
          this.animateAll(this.currentDropZone, prevStates, this.ctx.animationDuration ?? 150);
      }
    });

    this.ctx.onReorder?.(this.ctx.getList(), fromIndex, adjToIndex);
  }
}

function buildReorderContext<T>(
  container: HTMLElement,
  listExpr: string,
  runtime: RuntimeContext,
  options?: {
    direction?: "vertical" | "horizontal" | "grid";
    ghostClass?: string;
    dragClass?: string;
    group?: string | { name: string; pull?: "clone" | boolean; put?: boolean; revertClone?: boolean };
    sort?: boolean;
    swap?: boolean;
    swapClass?: string;
    fallbackOnBody?: boolean;
    swapThreshold?: number;
    animationDuration?: number;
    edgeScrollThreshold?: number;
    autoScrollSpeed?: number;
    onReorder?: (list: T[], oldIndex: number, newIndex: number) => void;
    onAutoScroll?: (delta: { x: number; y: number }) => void | Promise<boolean>;
  },
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
    sort: options?.sort !== false, // default true
    swap: options?.swap,
    swapClass: options?.swapClass,
    fallbackOnBody: options?.fallbackOnBody,
    swapThreshold: options?.swapThreshold,
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
  sourceDropZone: HTMLElement | null,
): number {
  let index = 0;
  let sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.nodeName.toUpperCase() !== "TEMPLATE") {
      const hasDataDrag = sibling.hasAttribute("data-drag");
      const el = sibling as HTMLElement;
      const isDraggable = el.hasAttribute("data-drag");
      const style = getComputedStyle(sibling);
      const isHidden = style.display === "none";
      const isTemplate = sibling.hasAttribute("data-ux-template");
      const siblingDropZone = sibling.closest("[data-teleport\\:drop]") as
        | HTMLElement
        | null;
      const correctZone = sourceDropZone
        ? siblingDropZone === sourceDropZone
        : !siblingDropZone;

      if (
        hasDataDrag && isDraggable && !isHidden && !isTemplate && correctZone
      ) {
        index++;
      }
    }
    sibling = sibling.previousElementSibling;
  }

  return index;
}

export { buildReorderContext, DragReorderEngine };

export const dragAttribute: AttributeModule = {
  name: "drag",
  attribute: "drag",
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    // Bug 7: Canvas-mode nodes use pointer events, not HTML5 DnD.
    // data-drag on canvas children is just a marker for the SpatialCanvasEngine.
    const canvasContainer = element.closest('[data-nexus-spatial-canvas]');
    if (canvasContainer) return;

    // Bug 3: Guard against re-initialization from attribute mutations
    // (e.g. data-bind-draggable toggling triggers MutationObserver re-processing)
    if ((element as any).__nexusDragBound) return (element as any).__nexusDragCleanup;
    (element as any).__nexusDragBound = true;

    // Remove HTML5 drag
    element.removeAttribute("draggable");
    if (element.style.userSelect !== "none") {
      element.style.userSelect = "none";
    }
    element.style.touchAction = "none";

    let reorderEngine: DragReorderEngine<any> | null = null;
    let sourceDropZone: HTMLElement | null = null;
    let startEvent: PointerEvent | null = null;
    let dragInitiated = false;

    const detectReorder = (zone: HTMLElement | null): boolean => {
      if (!zone) return false;
      return zone.hasAttribute("data-drag-reorder") ||
        element.hasAttribute("data-drag-reorder") ||
        zone.hasAttribute("data-nexus-spatial-sortable") ||
        element.hasAttribute("data-nexus-spatial-sortable") ||
        zone.getAttribute("data-spatial") === "sortable" ||
        element.getAttribute("data-spatial") === "sortable" ||
        zone.getAttribute("data-teleport-mode") === "swap";
    };

    const startDragSequence = (e: PointerEvent) => {
      try {
        if ((globalThis as any)._dragState) {
          if ((globalThis as any)._nexusDebugDrag) {
            console.warn("[drag] startDragSequence ignored: drag already in progress");
          }
          return;
        }

        const sourceContainer = element.parentElement;
        if (!sourceContainer) return;

        sourceDropZone = element.closest("[data-teleport\\:drop]") as HTMLElement | null;
        let sourceList: any[] | null = null;

        if (sourceDropZone) {
          const moveExpr = sourceDropZone.getAttribute("data-teleport:drop");
          if (moveExpr) {
            try {
              const result = runtime.evaluate(sourceDropZone, moveExpr);
              if (Array.isArray(result)) sourceList = result;
            } catch (err) {
              console.warn("[drag] Failed to evaluate source list:", err);
            }
          }
        }

        const siblingContainer = sourceDropZone || sourceContainer;
        const initialIndex = calculateDraggableIndex(element, sourceDropZone);

        const isMulti = siblingContainer.getAttribute("data-drag-multi") === "true" || element.getAttribute("data-drag-multi") === "true";
        const selectedClass = siblingContainer.getAttribute("data-drag-selected-class") || element.getAttribute("data-drag-selected-class") || "selected";

        let dragElements = [element];
        let fromIndices = [initialIndex];
        let dragItems = [sourceList?.[initialIndex]];

        if (isMulti && element.classList.contains(selectedClass)) {
          dragElements = Array.from(siblingContainer.children).filter(c => c.classList.contains(selectedClass)) as HTMLElement[];
          fromIndices = dragElements.map(el => calculateDraggableIndex(el, sourceDropZone));
          
          const paired = dragElements.map((el, i) => ({ el, idx: fromIndices[i], item: sourceList?.[fromIndices[i]] }));
          paired.sort((a,b) => a.idx - b.idx);
          
          dragElements = paired.map(p => p.el);
          fromIndices = paired.map(p => p.idx);
          dragItems = paired.map(p => p.item);
        }

        const dragState: Record<string, unknown> = {
          fromIndex: initialIndex,
          fromIndices,
          dragItems,
          dragElements,
          sourceContainer: siblingContainer,
          element,
          sourceList,
        };
        (globalThis as any)._dragState = dragState;

        const globalSignals = runtime.globalSignals() as any;

        if ((globalThis as any)._nexusDebugDrag) {
          console.log("[drag] Drag started via PointerEvent", {
            element: element.tagName,
            fromIndex: initialIndex,
          });
        }

        if (detectReorder(sourceDropZone) && Array.isArray(sourceList)) {
          if (!sourceDropZone) return;
          const listExpr = sourceDropZone.getAttribute("data-teleport:drop")!;
          const dragDirection = sourceDropZone.getAttribute("data-drag-direction") || element.getAttribute("data-drag-direction") || "vertical";
          const direction = dragDirection as "vertical" | "horizontal" | "grid" | undefined;
          const ghostClass = sourceDropZone.getAttribute("data-drag-ghost-class") || element.getAttribute("data-drag-ghost-class") || "sortable-ghost";
          const dragClass = sourceDropZone.getAttribute("data-drag-class") || element.getAttribute("data-drag-class") || "sortable-drag";
          const animDuration = parseInt(sourceDropZone.getAttribute("data-drag-animation") || "150", 10);

          const groupName = sourceDropZone.getAttribute("data-drag-group");
          const clone = sourceDropZone.getAttribute("data-drag-clone") === "true" || sourceDropZone.getAttribute("data-teleport-mode") === "clone";
          const put = sourceDropZone.getAttribute("data-drag-put") !== "false";
          const sort = sourceDropZone.getAttribute("data-drag-sort") !== "false";
          const swap = sourceDropZone.getAttribute("data-drag-swap") === "true" || sourceDropZone.getAttribute("data-teleport-mode") === "swap";
          const swapClass = sourceDropZone.getAttribute("data-drag-swap-class") || undefined;
          const fallbackOnBody = sourceDropZone.getAttribute("data-drag-fallback-on-body") !== "false";
          const swapThresholdAttr = sourceDropZone.getAttribute("data-drag-swap-threshold");
          const swapThreshold = swapThresholdAttr ? parseFloat(swapThresholdAttr) : undefined;
          const revertClone = sourceDropZone.getAttribute("data-drag-revert-clone") === "true";

          let groupConfig = undefined;
          if (groupName) {
            groupConfig = {
              name: groupName,
              pull: (clone ? "clone" : true) as "clone" | boolean,
              put: put,
              revertClone: revertClone
            };
          }

          const ctx = buildReorderContext(sourceDropZone, listExpr, runtime, {
            direction,
            ghostClass,
            dragClass,
            animationDuration: animDuration,
            group: groupConfig,
            sort,
            swap,
            swapClass,
            fallbackOnBody,
            swapThreshold,
            onAutoScroll: async (delta) => {
              if (sourceDropZone) {
                const scrollParent = getScrollParent(sourceDropZone);
                scrollParent.scrollBy({ left: delta.x, top: delta.y });
                return true;
              }
              return false;
            },
            onReorder: (list, oldIdx, newIdx) => {
              globalSignals["drag:reorder"] = { list, oldIndex: oldIdx, newIndex: newIdx };
            },
          });

          reorderEngine = new DragReorderEngine(ctx, runtime);
          dragState.reorderEngine = reorderEngine;
          reorderEngine.startDrag({ element, sourceList, fromIndex: initialIndex }, e);
        }

        globalSignals["drag:start"] = {
          element,
          originalEvent: e,
          fromIndex: initialIndex,
          sourceList,
        };

        const chosenClass = sourceContainer.getAttribute("data-drag-chosen-class") || element.getAttribute("data-drag-chosen-class") || "sortable-chosen";
        element.classList.add(chosenClass);

        requestAnimationFrame(() => {
          element.classList.add("dragging");
        });
      } catch (err) {
        runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, "drag-start");
      }
    };

    const endDragSequence = (e: PointerEvent) => {
      if (reorderEngine) {
        reorderEngine.endDrag(e);
        reorderEngine = null;
      }

      const sourceContainer = element.parentElement || sourceDropZone;
      const chosenClass = sourceContainer?.getAttribute("data-drag-chosen-class") || element.getAttribute("data-drag-chosen-class") || "sortable-chosen";
      element.classList.remove("dragging");
      element.classList.remove(chosenClass);

      const globalSignals = runtime.globalSignals() as any;
      globalSignals["drag:end"] = {
        element,
        originalEvent: e,
        cancelled: false,
      };

      (globalThis as any)._dragState = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((globalThis as any)._dragState) return;

      const sourceContainer = element.parentElement;
      if (!sourceContainer) return;
      // ZCZS: Gate on draggable="false" before drag (data-bind-draggable support)
      if (element.getAttribute("draggable") === "false") {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || (target as any).button !== undefined || target.closest("button");
        if (!isInput) {
          e.preventDefault();
        }
        return;
      }

      const target = e.target as HTMLElement;
      const handleSelector = sourceContainer.getAttribute("data-drag-handle") || element.getAttribute("data-drag-handle");
      if (handleSelector && !target.closest(handleSelector)) return;

      const filterSelector = sourceContainer.getAttribute("data-drag-filter") || element.getAttribute("data-drag-filter");
      if (filterSelector) {
        const fs = filterSelector.trim();
        if (!fs) return;
        if (target.closest(fs)) return;
      }

      // Prevent default text selection during pointer interaction
      e.preventDefault();
      e.stopPropagation();

      startEvent = e;
      dragInitiated = false;
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      
      (element as any).__nexusLastPointerTarget = target;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!startEvent) return;
      if ((globalThis as any)._dragState && !dragInitiated) {
        onPointerUp(e);
        return;
      }

      if (!dragInitiated) {
        const dx = e.clientX - startEvent.clientX;
        const dy = e.clientY - startEvent.clientY;
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          dragInitiated = true;
          startDragSequence(startEvent);
        } else {
          return;
        }
      }

      if (dragInitiated && reorderEngine) {
         reorderEngine.updateDrag(e.clientX, e.clientY, e);
         const globalSignals = runtime.globalSignals() as any;
         
         if ((globalThis as any)._dragState) {
            (globalThis as any)._dragState.toIndex = reorderEngine.getFinalToIndex();
            (globalThis as any)._dragState.targetContainer = sourceDropZone;
         }
         
         globalSignals["drag:move"] = {
            element,
            x: e.clientX,
            y: e.clientY,
            originalEvent: e,
         };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);

      if (dragInitiated) endDragSequence(e);
      startEvent = null;
      dragInitiated = false;
    };

    const onDragStart = (e: Event) => {
      e.preventDefault();
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("dragstart", onDragStart);

    const cleanup = () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('dragstart', onDragStart);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      (element as any).__nexusDragBound = false;
      (element as any).__nexusDragCleanup = undefined;
    };
    (element as any).__nexusDragCleanup = cleanup;
    return cleanup;
  },
};

export default dragAttribute;
