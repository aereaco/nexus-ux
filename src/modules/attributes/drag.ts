import { AttributeModule } from "../../engine/modules.ts";
import { RuntimeContext } from "../../engine/composition.ts";

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

  constructor(ctx: DragReorderContext<T>, runtime: RuntimeContext) {
    this.ctx = ctx;
    this.runtime = runtime;
  }

  startDrag(
    dragState: { element: HTMLElement; sourceList: T[]; fromIndex: number },
    _event: Event,
  ): void {
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
    } else {
      this.tapOffsetX = rect.width / 2;
      this.tapOffsetY = rect.height / 2;
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

    this.isSwapMode = this.ctx.swap === true || ((_event as PointerEvent).shiftKey === true);

    this.positionGhostAt(clientX, clientY);
    this.containerBounds = this.ctx.container.getBoundingClientRect();
    this.maybeAutoScroll(clientX, clientY);

    const toIndex = this.calculateInsertIndex(clientX, clientY, _event as DragEvent);
    
    const target = (this.activeDrag as any).lastHoverTarget || null;
    const currentZone = this.currentDropZone || this.ctx.container;
    this.updateHighlight(target, currentZone, clientX, clientY);

    if (toIndex === -1) return;

    this.currentToIndex = toIndex;
    const fromIndex = this.activeDrag.index;
    this.repositionPlaceholder(currentZone, toIndex);

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
    
    // ZCZS: Commit the array mutation ONLY on drop to prevent reactive loops during drag
    if (this.activeDrag && toIndex !== -1 && (toIndex !== fromIndex || this.currentDropZone !== this.ctx.container)) {
        // CRITICAL VDOM FIX: Revert the manual DOM mutation BEFORE updating the array state!
        // This ensures the declarative `data-for` directive reconciles against a clean state.
        const originalNext = (this.activeDrag as any).originalNextSibling;
        const originalParent = (this.activeDrag as any).originalParent;
        if (originalParent && this.placeholderEl) {
            if (originalNext && originalNext.parentNode === originalParent) {
                originalParent.insertBefore(this.placeholderEl, originalNext);
            } else {
                originalParent.appendChild(this.placeholderEl);
            }
        }
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

    ghost.classList.add("sortable-drag");
    if (dragClass) {
      dragClass.split(" ").forEach(c => {
        if (c.trim()) ghost.classList.add(c.trim());
      });
    }
    Object.assign(ghost.style, {
      position: "fixed",
      top: "0",
      left: "0",
      pointerEvents: "none",
      opacity: "0.85",
      zIndex: "999999",
      transform: "translate3d(0,0,0) scale(1.03)",
      transition: `transform 0.15s ease-out, opacity 0.15s ease-out`,
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
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
    // Position ghost so cursor stays at the same relative point it was grabbed
    const ghostX = x - this.tapOffsetX;
    const ghostY = y - this.tapOffsetY;
    this.ghostEl.style.transform = `translate3d(${ghostX}px, ${ghostY}px, 0) scale(1.03)`;
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
    event?: DragEvent,
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

    const { direction = "vertical" } = this.ctx; // TODO: read from dropZone

    // Step 2: Calculate swap direction using SortableJS algorithm
    const swapDirection = this._getSwapDirection(
      event,
      target,
      dropZone,
      direction,
      this.ctx.swapThreshold
    );

    // Step 3: Determine insertion index based on direction
    const children = this.getDraggableChildren(dropZone);
    const targetIndex = children.indexOf(target);

    if (swapDirection === 1) return targetIndex + 1; // insert after target
    if (swapDirection === -1) return targetIndex; // insert before target
    return -1; // no valid insertion point
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

  /**
   * Calculate swap direction for inserting before/after target.
   * Ported from Sortable.js _getSwapDirection (lines 1832-1901).
   *
   * @param event - Drag event (optional for fallback)
   * @param target - Target element
   * @param direction - Container direction (vertical, horizontal, grid)
   * @param swapThreshold - Threshold for safe zone (0-1, default 0.5)
   * @returns -1 (insert before), 0 (no insert), 1 (insert after)
   */
  private _getSwapDirection(
    event: DragEvent | undefined,
    target: HTMLElement,
    dropZone: HTMLElement,
    direction: "vertical" | "horizontal" | "grid",
    swapThreshold: number = 0.5,
  ): -1 | 0 | 1 {
    if (!event) return 0;
    if (target === this.placeholderEl) return 0;

    const targetRect = target.getBoundingClientRect();
    const children = this.getDraggableChildren(dropZone);
    const dragIndex = this.activeDrag ? children.indexOf(this.activeDrag.element) : -1;
    const targetIndex = children.indexOf(target);

    const safeMargin = (1 - swapThreshold) / 2;

    // Cross-container drag logic (where target list does not contain the active drag element)
    if (dragIndex === -1) {
      if (direction === "vertical") {
        return event.clientY < (targetRect.top + targetRect.height / 2) ? -1 : 1;
      }
      if (direction === "horizontal") {
        return event.clientX < (targetRect.left + targetRect.width / 2) ? -1 : 1;
      }
      // Grid cross-container default
      const dx = event.clientX - (targetRect.left + targetRect.width / 2);
      const dy = event.clientY - (targetRect.top + targetRect.height / 2);
      return (Math.abs(dx) > Math.abs(dy) ? dx : dy) < 0 ? -1 : 1;
    }

    // In-list drag logic with 1:1 SortableJS trigger points + built-in hysteresis
    if (direction === "vertical") {
      const clientY = event.clientY;
      if (dragIndex < targetIndex) {
        // Dragging down: swap if cursor passes the safe zone top threshold
        if (clientY > targetRect.top + targetRect.height * safeMargin) {
          return 1;
        }
      } else {
        // Dragging up: swap if cursor passes the safe zone bottom threshold
        if (clientY < targetRect.bottom - targetRect.height * safeMargin) {
          return -1;
        }
      }
      return 0;
    }

    if (direction === "horizontal") {
      const clientX = event.clientX;
      if (dragIndex < targetIndex) {
        // Dragging right
        if (clientX > targetRect.left + targetRect.width * safeMargin) {
          return 1;
        }
      } else {
        // Dragging left
        if (clientX < targetRect.right - targetRect.width * safeMargin) {
          return -1;
        }
      }
      return 0;
    }

    // Grid layout sorting
    if (direction === "grid") {
      const clientX = event.clientX;
      const clientY = event.clientY;

      if (dragIndex < targetIndex) {
        // Dragging forward in grid
        const passX = clientX > targetRect.left + targetRect.width * safeMargin;
        const passY = clientY > targetRect.top + targetRect.height * safeMargin;
        const sameRow = Math.abs(clientY - (targetRect.top + targetRect.height / 2)) < targetRect.height / 2;
        if (sameRow ? passX : passY) {
          return 1;
        }
      } else {
        // Dragging backward in grid
        const passX = clientX < targetRect.right - targetRect.width * safeMargin;
        const passY = clientY < targetRect.bottom - targetRect.height * safeMargin;
        const sameRow = Math.abs(clientY - (targetRect.top + targetRect.height / 2)) < targetRect.height / 2;
        if (sameRow ? passX : passY) {
          return -1;
        }
      }
      return 0;
    }

    return 0;
  }

  private repositionPlaceholder(targetZone: HTMLElement, toIndex: number): void {
    if (!this.placeholderEl || !targetZone) return;

    // Guard: Never insert an element into its own descendant to prevent HierarchyRequestError
    if (this.placeholderEl.contains(targetZone)) return;

    if (this.isSwapMode) {
      this.placeholderEl.style.display = 'none';
      return;
    } else {
      this.placeholderEl.style.display = '';
    }

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
    if (!onAutoScroll || !this.containerBounds) return;

    const { left, top, width, height } = this.containerBounds;
    const dl = clientX - left;
    const dr = left + width - clientX;
    const dt = clientY - top;
    const db = top + height - clientY;

    let dx = 0, dy = 0;
    if (dl < edgeScrollThreshold) {
      dx = -autoScrollSpeed * (1 - dl / edgeScrollThreshold);
    } else if (dr < edgeScrollThreshold) {
      dx = autoScrollSpeed * (1 - dr / edgeScrollThreshold);
    }
    if (dt < edgeScrollThreshold) {
      dy = -autoScrollSpeed * (1 - dt / edgeScrollThreshold);
    } else if (db < edgeScrollThreshold) {
      dy = autoScrollSpeed * (1 - db / edgeScrollThreshold);
    }

    if (dx !== 0 || dy !== 0) {
      onAutoScroll({ x: dx, y: dy });
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
               const isClone = myGroupConfig?.pull === 'clone';

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
                if (removed.index < toIndex) {
                  adjToIndex--;
                }
              }
              
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
          const fallbackOnBody = sourceDropZone.getAttribute("data-drag-fallback-on-body") === "true";
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
                sourceDropZone.scrollBy({ left: delta.x, top: delta.y, behavior: "smooth" });
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
      if (element.getAttribute("draggable") === "false") return;

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

    element.addEventListener("pointerdown", onPointerDown);

    const cleanup = () => {
      element.removeEventListener('pointerdown', onPointerDown);
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
