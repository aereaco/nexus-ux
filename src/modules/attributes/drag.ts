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

      // Resolve the reactive list from the teleport drop zone on the parent
      const moveExpr = sourceContainer.getAttribute('data-teleport:drop');
      let sourceList = null;
      if (moveExpr) {
        try {
          sourceList = runtime.evaluate(sourceContainer, moveExpr);
        } catch { /* Source list may not be directly on the parent */ }
      }

      // Calculate initial index among draggable siblings
      const siblings = Array.from(sourceContainer.children).filter(
        c => c.hasAttribute('data-drag') && (c as HTMLElement).style.display !== 'none'
      );
      const initialIndex = siblings.indexOf(element);

      // ZCZS: Store raw memory reference in global heap pointer
      (globalThis as any)._dragState = { 
        fromIndex: initialIndex, 
        sourceContainer, 
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
