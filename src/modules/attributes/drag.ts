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
      const sourceContainer = element.parentElement;
      if (!sourceContainer) {
        e.preventDefault();
        return;
      }

      // Resolve the reactive list by climbing the DOM tree to find the
      // nearest ancestor with data-teleport:drop. This handles nested layouts
      // where data-drag items aren't direct children of the drop zone.
      const dropZone = element.closest('[data-teleport\\:drop]') as HTMLElement | null;
      let sourceList = null;
      if (dropZone) {
        const moveExpr = dropZone.getAttribute('data-teleport:drop');
        if (moveExpr) {
          try {
            sourceList = runtime.evaluate(dropZone, moveExpr);
          } catch { /* Source list evaluation failed — will be null */ }
        }
      }

      // Calculate initial index among draggable siblings within the resolved drop zone
      const siblingContainer = dropZone || sourceContainer;
      const siblings = Array.from(siblingContainer.children).filter(
        c => c.hasAttribute('data-drag') && (c as HTMLElement).style.display !== 'none'
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
        // Empty string strictly to initialize HTML5 drag events
        e.dataTransfer.setData('text/plain', '');
      }
      
      requestAnimationFrame(() => {
        element.style.opacity = '0.3';
        element.classList.add('dragging');
      });
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
