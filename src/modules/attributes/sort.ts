import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { flip } from '../sprites/animate.ts';

/**
 * data-sort Directive (Nexus-UX Native)
 * 
 * A high-performance, touch-ready sorting directive with SortableJS feature parity.
 * Features: PointerEvents support, Ghosting, Drag Handles, Grouping, FLIP Animations.
 */

interface SortOptions {
  group?: string;
  handle?: string;
  ghostClass: string;
  dragClass: string;
  filter?: string;
  animation: number; // ms
}

const activeDrags = new Set<HTMLElement>();

export const sortModule: AttributeModule = {
  name: 'sort',
  handle(container: HTMLElement, expression: string, runtime: RuntimeContext) {
    const modifiers = runtime.parseAttribute('data-sort', runtime, container).modifiers || [];
    
    // Config
    const config: SortOptions = {
      group: container.getAttribute('data-sort:group') || undefined,
      handle: container.getAttribute('data-sort:handle') || undefined,
      ghostClass: 'nexus-sort-ghost',
      dragClass: 'nexus-sort-drag',
      animation: 150,
    };

    let dragEl: HTMLElement | null = null;
    let ghostEl: HTMLElement | null = null;
    let initialIndex = -1;
    let startY = 0;
    let startX = 0;
    let initialRects: Map<HTMLElement, DOMRect> = new Map();

    const getItems = () => Array.from(container.children).filter(el => {
      // Filter out utility elements or those marked to ignore
      if (el.tagName === 'TEMPLATE' || el.tagName === 'SCRIPT' || el.nodeType !== 1) return false;
      if (el.hasAttribute('data-sort-ignore')) return false;
      return true;
    }) as HTMLElement[];

    const onPointerDown = (e: PointerEvent) => {
      if (runtime.isDevMode) runtime.debug(`[Sort] PointerDown on`, e.target);
      if (e.button !== 0) return; // Only left click

      const target = (e.target as HTMLElement).closest('*') as HTMLElement;
      if (!target) return;

      // Check handle
      if (config.handle) {
        const handle = target.closest(config.handle);
        if (!handle || !container.contains(handle)) return;
      }

      // Don't drag if clicking buttons, inputs, or other interactive elements
      if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(target.tagName)) return;
      if (target.closest('.actions')) return; // Also ignore actions wrapper

      // Find item
      const item = target.closest(':scope > *') as HTMLElement;
      if (!item || item.parentElement !== container || item.hasAttribute('data-sort-ignore')) return;

      dragEl = item;
      initialIndex = getItems().indexOf(dragEl);
      startX = e.clientX;
      startY = e.clientY;

      container.setPointerCapture(e.pointerId);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerup', onPointerUp);
      container.addEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragEl) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Start drag threshold
      if (!ghostEl && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        startDrag(e);
      }

      if (ghostEl) {
        ghostEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        
        // Detect hit
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest(':scope > *') as HTMLElement;
        if (hit && hit !== dragEl && hit.parentElement === container && !hit.hasAttribute('data-sort-ignore')) {
          reorder(hit);
        }
      }
    };

    const startDrag = (_e: PointerEvent) => {
      if (!dragEl) return;

      // Create Ghost
      ghostEl = dragEl.cloneNode(true) as HTMLElement;
      const rect = dragEl.getBoundingClientRect();
      
      Object.assign(ghostEl.style, {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: '1000',
        pointerEvents: 'none',
        opacity: '0.8',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        margin: '0',
      });

      ghostEl.classList.add(config.ghostClass);
      document.body.appendChild(ghostEl);

      dragEl.classList.add(config.dragClass);
      dragEl.style.opacity = '0.3';
      
      activeDrags.add(container);
    };

    const reorder = (hit: HTMLElement) => {
      if (!dragEl) return;

      const items = getItems();
      const dragIdx = items.indexOf(dragEl);
      const hitIdx = items.indexOf(hit);

      // Capture rects for transition
      const flipTargets = items.filter(el => el !== ghostEl);
      
      flip(flipTargets, () => {
        if (dragIdx < hitIdx) {
          hit.after(dragEl!);
        } else {
          hit.before(dragEl!);
        }
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      container.releasePointerCapture(e.pointerId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);

      if (ghostEl) {
        ghostEl.remove();
        ghostEl = null;
      }

      if (dragEl) {
        dragEl.classList.remove(config.dragClass);
        dragEl.style.opacity = '';

        const newIndex = getItems().indexOf(dragEl);
        if (newIndex !== initialIndex) {
          // Sync with data
          if (expression) {
            // Evaluates with $item (key/id) and $newIndex, $oldIndex
            runtime.evaluate(container, expression, {
              $item: dragEl.dataset.key || dragEl.dataset.id || initialIndex,
              $newIndex: newIndex,
              $oldIndex: initialIndex,
              $from: initialIndex,
              $to: newIndex
            });
          }
        }
        dragEl = null;
      }

      activeDrags.delete(container);
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.style.userSelect = 'none';
    container.style.touchAction = 'none';

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      activeDrags.delete(container);
    };
  }
};

export default sortModule;
