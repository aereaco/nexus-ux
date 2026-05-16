import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';
import { DATA_STACK_KEY } from '../../engine/consts.ts';
import { DragReorderEngine, buildReorderContext } from './drag.ts';

/**
 * data-teleport: Dual-mode teleportation engine.
 *
 * Mode 1 — Data Teleportation (Drop Zone for Drag & Drop):
 *   <div data-teleport:drop="listExpression">
 *   The :drop modifier turns the element into a native HTML5 drop zone.
 *
 *   Optional data-teleport-mode attribute:
 *     "move"  (default) — splice item from source, insert into target
 *     "clone" — copy item into target without removing from source
 *     "swap"  — swap items at source and target indices
 *
 *   In-list reordering: when the drop zone has data-drag-reorder and the
 *   source and target lists are the same, the reordering is handled live by
 *   the DragReorderEngine during dragover; onDrop becomes a no-op.
 */
export const teleportAttribute: AttributeModule = {
  name: 'teleport',
  attribute: 'teleport',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext, parsed?: ParsedAttribute) => {
    const modifiers = parsed?.modifiers ?? [];

    // =========================================================================
    // Mode 1: Data Teleportation (Drop Zone for Drag & Drop)
    // =========================================================================
    if (modifiers.includes('drop')) {
      const mode = element.getAttribute('data-teleport-mode') || 'move';

      const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = mode === 'clone' ? 'copy' : 'move';
        }
      };

      const onDrop = (e: DragEvent) => {
        try {
          e.preventDefault();
          e.stopPropagation();

          const dragState = (globalThis as any)._dragState;
          if (!dragState) {
            console.warn('[teleport] No drag state — was the source dragged?');
            return;
          }

          const { fromIndex, sourceContainer, element: draggedEl, sourceList, reorderEngine } = dragState;

          // Validate sourceList is an array (ZCZS contract)
          if (!Array.isArray(sourceList)) {
            console.warn('[teleport] sourceList is not an array - check expression evaluation');
            return;
          }

          const targetList = runtime.evaluate(element, value);
          if (!Array.isArray(targetList)) {
            console.warn('[teleport] targetList expression did not evaluate to an array');
            return;
          }

          const isSameList = sourceList === targetList;
          let toIndex: number;

          // If in-list reorder engine is active on same list, it already mutated the array.
          // Use its final index and skip mutation.
          if (reorderEngine && isSameList) {
            toIndex = reorderEngine.getFinalToIndex();
            if (toIndex === -1) {
              console.warn('[teleport] Reorder engine active but no final index available');
              return;
            }
          } else {
            // Determine drop target using precise DOM-based list of valid draggable children
            const dropTarget = (e.target as HTMLElement).closest('[data-drag]');
            
            // Build the list of valid draggable children using direct children iteration (SortableJS style)
            const draggableChildren: HTMLElement[] = [];
            for (let i = 0; i < element.children.length; i++) {
              const child = element.children[i] as HTMLElement;
              if (child.hasAttribute('data-drag') &&
                  (child.getAttribute('draggable') === 'true') &&
                  getComputedStyle(child).display !== 'none' &&
                  !child.hasAttribute('data-ux-template') &&
                  child.closest('[data-teleport\\:drop]') === element) {
                draggableChildren.push(child);
              }
            }

            if (dropTarget && draggableChildren.includes(dropTarget as HTMLElement)) {
              toIndex = draggableChildren.indexOf(dropTarget as HTMLElement);
              // Adjust toIndex based on cursor position (drop after half-point)
              const rect = dropTarget.getBoundingClientRect();
              const cursorY = e.clientY - rect.top;
              if (cursorY > rect.height / 2) {
                toIndex += 1;
              }
            } else {
              toIndex = draggableChildren.length;
            }
          }

          const doMutate = () => {
            try {
              // Skip mutation if in-list reorder already handled it
              if (reorderEngine && isSameList) {
                return;
              }

              if (mode === 'clone') {
                const item = sourceList[fromIndex];
                if (item !== undefined) {
                  targetList.splice(toIndex, 0, { ...item });
                }
              } else if (mode === 'swap') {
                if (sourceList !== targetList) return;
                if (fromIndex === toIndex) return;
                const tmp = sourceList[fromIndex];
                sourceList[fromIndex] = targetList[toIndex];
                targetList[toIndex] = tmp;
              } else {
                // Move mode
                if (sourceList === targetList) {
                  // Same list - in-list reorder (should have been handled by reorderEngine, but fallback)
                  if (fromIndex === toIndex) return;
                  const [item] = sourceList.splice(fromIndex, 1);
                  const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
                  sourceList.splice(insertIndex, 0, item);
                } else {
                  // Cross-container move of same array (two containers, one array)
                  const [item] = sourceList.splice(fromIndex, 1);
                  if (item !== undefined) {
                    targetList.splice(toIndex, 0, item);
                  }
                }
              }
            } catch (err) {
              runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, 'teleport-mutate');
            }
          };

          if ('startViewTransition' in document && doMutate) {
            (document as any).startViewTransition(doMutate);
          } else {
            doMutate();
          }

          // Emit drop signal after mutation
          runtime.globalSignals()['drag:drop'] = {
            sourceList, targetList, fromIndex, toIndex, mode,
            item: targetList[toIndex]
          };
        } catch (err) {
          runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, 'teleport-drop');
        }
      };

      element.addEventListener('dragover', onDragOver);
      element.addEventListener('drop', onDrop);

      return () => {
        element.removeEventListener('dragover', onDragOver);
        element.removeEventListener('drop', onDrop);
      };
    }

    // =========================================================================
    // Mode 2: DOM Teleportation (Alpine x-teleport style)
    // =========================================================================
    if (element.tagName.toLowerCase() !== 'template') {
      runtime.warn?.('[Teleport] DOM teleportation should be used on <template> tags.', element);
    }

    const targetSelector = value.trim();
    if (!targetSelector) return;

    // Clone the element/template content
    let clone: HTMLElement;
    if (element.tagName.toLowerCase() === 'template') {
      clone = ((element as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
    } else {
      clone = element.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-teleport');
    }

    // Pass data stack reference for ZCZS scope continuity
    if ((element as any)[DATA_STACK_KEY]) {
      (clone as any)[DATA_STACK_KEY] = (element as any)[DATA_STACK_KEY];
    }

    const placeInDom = () => {
      const target = document.querySelector(targetSelector);
      if (!target) {
        runtime.warn?.(`[Teleport] Target "${targetSelector}" not found.`);
        return;
      }

      if (modifiers.includes('prepend')) {
        target.insertBefore(clone, target.firstChild);
      } else {
        target.appendChild(clone);
      }
    };

    placeInDom();

    // Initialize reactive directives on the teleported clone
    runtime.processElement?.(clone);

    return () => {
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    };
  }
};

export default teleportAttribute;
