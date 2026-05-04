import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * data-drag: Native HTML5 Drag payload generator.
 *
 * Makes an element draggable and stores a ZCZS (Zero-Copy Zero-Serialization)
 * memory pointer in globalThis._dragState on dragstart. The actual drop-zone
 * logic and array mutation is handled by data-teleport:drop (teleport.ts).
 */
export const dragAttribute: AttributeModule = {
  name: 'drag',
  attribute: 'drag',
  handle: (element: HTMLElement, _value: string, runtime: RuntimeContext) => {
    // Enable Native HTML5 Drag and Drop
    element.setAttribute('draggable', 'true');
    element.style.userSelect = 'none';

    const onDragStart = (e: DragEvent) => {
      try {
        const sourceContainer = element.parentElement;
        if (!sourceContainer) {
          e.preventDefault();
          return;
        }

        // Resolve the reactive list by climbing the DOM tree to find the
        // nearest ancestor with data-teleport:drop. This handles nested layouts
        // where data-drag items aren't direct children of the drop zone.
        const dropZone = element.closest('[data-teleport\\:drop]') as HTMLElement | null;
        let sourceList: any[] | null = null;

        if (dropZone) {
          const moveExpr = dropZone.getAttribute('data-teleport:drop');
          if (moveExpr) {
            try {
              const result = runtime.evaluate(dropZone, moveExpr);
              if (Array.isArray(result)) {
                sourceList = result;
              } else {
                console.warn('[drag] Expression did not evaluate to an array:', moveExpr);
              }
            } catch (err) {
              console.warn('[drag] Failed to evaluate source list:', err);
            }
          }
        } else {
          console.warn('[drag] No drop zone found for draggable element');
        }

        // Calculate initial index among draggable siblings within the resolved drop zone
        // Using querySelectorAll with ownership check allows data-drag items to be nested
        // inside layout wrappers while ignoring items belonging to sub-drop-zones.
        const siblingContainer = dropZone || sourceContainer;
        const siblings = Array.from(siblingContainer.querySelectorAll('[data-drag]')).filter(
          c => (c.closest('[data-teleport\\:drop]') === dropZone || !dropZone) && 
               (c as HTMLElement).style.display !== 'none' &&
               !c.hasAttribute('data-ux-template')
        );
        const initialIndex = siblings.indexOf(element);

        // ZCZS: Store raw memory reference in global heap pointer
        (globalThis as any)._dragState = {
          fromIndex: initialIndex,
          sourceContainer: siblingContainer,
          element,
          sourceList
        };

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

    const onDragEnd = (_e: DragEvent) => {
      element.style.opacity = '';
      element.classList.remove('dragging');
      (globalThis as any)._dragState = null; // Clear ZCZS memory pointer
    };

    element.addEventListener('dragstart', onDragStart);
    element.addEventListener('dragend', onDragEnd);

    return () => {
      element.removeEventListener('dragstart', onDragStart);
      element.removeEventListener('dragend', onDragEnd);
    };
  }
};

export default dragAttribute;
