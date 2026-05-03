import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';
import { DATA_STACK_KEY } from '../../engine/consts.ts';

/**
 * data-teleport: Dual-mode teleportation engine.
 * 
 * Mode 1 — DOM Teleportation (Alpine x-teleport style):
 *   <template data-teleport="body">...</template>
 *   Clones the template content and appends it to the target selector.
 * 
 * Mode 2 — Data Teleportation (Drop Zone for Drag & Drop):
 *   <div data-teleport:drop="list1">
 *   The :drop modifier turns the element into a native HTML5 drop zone.
 *   On native `drop`, it reads the ZCZS global memory pointer and
 *   mutates the reactive array directly in memory.
 * 
 *   Optional data-teleport-mode attribute:
 *     "move"  (default) — splice item from source, insert into target
 *     "clone" — copy item into target without removing from source
 *     "swap"  — swap items at source and target indices
 */
export const teleportAttribute: AttributeModule = {
  name: 'teleport',
  attribute: 'teleport',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext, parsed?: ParsedAttribute) => {
    const modifiers = parsed?.modifiers ?? [];
    
    // =========================================================================
    // Mode 1: Data Teleportation (Drop Zone for Drag & Drop)
    // Activated by the :drop modifier → data-teleport:drop="listExpression"
    // =========================================================================
    if (modifiers.includes('drop')) {
      const mode = element.getAttribute('data-teleport-mode') || 'move';
      
      const onDragOver = (e: DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = mode === 'clone' ? 'copy' : 'move';
        }
      };

      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // ZCZS: Retrieve raw references from the global memory pointer
        const dragState = (globalThis as any)._dragState;
        if (!dragState) return;

        const { fromIndex, sourceContainer, sourceList } = dragState;

        // Determine drop index by finding which child the drop landed on
        const dropTarget = (e.target as HTMLElement).closest('[data-drag]');
        const draggableChildren = Array.from(element.children).filter(
          c => c.hasAttribute('data-drag') && 
               (c as HTMLElement).style.display !== 'none' &&
               !c.hasAttribute('data-ux-template')
        );
        let toIndex = dropTarget ? draggableChildren.indexOf(dropTarget) : draggableChildren.length;
        
        // Refine index based on cursor position (above/below midpoint)
        if (dropTarget) {
          const rect = dropTarget.getBoundingClientRect();
          if (e.clientY > rect.top + rect.height / 2) {
            toIndex += 1;
          }
        }
        
        if (toIndex === -1) toIndex = draggableChildren.length;

        try {
          const targetList = runtime.evaluate(element, value) as any[];

          if (Array.isArray(sourceList) && Array.isArray(targetList)) {
            const doMutate = () => {
              if (mode === 'clone') {
                // Clone: copy item without removing from source
                const item = sourceList[fromIndex];
                targetList.splice(toIndex, 0, { ...item });
              } else if (mode === 'swap') {
                // Swap: exchange items at indices (same list only)
                if (sourceList !== targetList) return;
                const tmp = sourceList[fromIndex];
                sourceList[fromIndex] = targetList[toIndex];
                targetList[toIndex] = tmp;
              } else {
                // Default: Move
                if (sourceList === targetList) {
                  if (fromIndex === toIndex) return;
                  const [item] = sourceList.splice(fromIndex, 1);
                  const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
                  sourceList.splice(insertIndex, 0, item);
                } else {
                  const [item] = sourceList.splice(fromIndex, 1);
                  targetList.splice(toIndex, 0, item);
                }
              }
            };

            if ('startViewTransition' in document) {
              (document as any).startViewTransition(() => doMutate());
            } else {
              doMutate();
            }
          }
        } catch (err) {
          runtime.warn?.('[Teleport] Failed to mutate array:', err);
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
    // Activated by base usage → data-teleport="selector"
    // =========================================================================
    if (element.tagName.toLowerCase() !== 'template') {
      runtime.warn?.('[Teleport] DOM teleportation should be used on <template> tags.', element);
    }

    const targetSelector = value.trim();
    if (!targetSelector) return;

    // Clone the element/template content
    let clone: HTMLElement;
    if (element.tagName.toLowerCase() === 'template') {
      clone = (element as HTMLTemplateElement).content.cloneNode(true).firstElementChild as HTMLElement;
    } else {
      clone = element.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-teleport'); // prevent infinite loop
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
