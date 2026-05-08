import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DragReorderEngine, buildReorderContext } from '../../lib/drag-reorder.ts';

/**
 * Calculate the index of an element among its draggable siblings.
 * Uses DOM traversal (like SortableJS `index()`), not array indexOf.
 * Ensures identity-based tracking that survives DOM mutations.
 */
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

    // Resolve if reorder is enabled on draggable or its drop zone
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
        
        // Use SortableJS-style index calculation
        const initialIndex = calculateDraggableIndex(element, sourceDropZone);

        const dragState: Record<string, unknown> = {
           fromIndex: initialIndex,
           sourceContainer: siblingContainer,
           element,
           sourceList
         };
         (globalThis as any)._dragState = dragState;

         const globalSignals = runtime.globalSignals() as any;

         // DEBUG
         if ((window as any)._nexusDebugDrag) {
           console.log('[drag] Drag started', {
             element: element.tagName,
             fromIndex: initialIndex,
             sourceDropZone: sourceDropZone?.tagName,
             sourceListIsArray: Array.isArray(sourceList),
             sourceListLength: sourceList?.length
           });
         }

          // Initialize in-list reorder engine if enabled
          if (detectReorder(sourceDropZone) && Array.isArray(sourceList)) {
            if (!sourceDropZone) return; // safety guard, should not happen
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

            // Initialize engine at drag start
            reorderEngine.startDrag({ element, sourceList, fromIndex: initialIndex }, e);

            // Attach dragover to the drop zone for live updates
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
