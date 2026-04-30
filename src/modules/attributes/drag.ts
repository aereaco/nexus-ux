import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { RUN_EFFECT_RUNNERS_KEY } from '../../engine/consts.ts';

/**
 * data-drag: Native, standalone Drag & Drop sorting engine.
 * Orchestrates reordering logic for any element and integrates with reactive arrays.
 */
export const dragAttribute: AttributeModule = {
  name: 'drag',
  attribute: 'drag',
  handle: (element: HTMLElement, _value: string, _runtime: RuntimeContext) => {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let ghost: HTMLElement | null = null;
    let placeholder: HTMLElement | null = null;

    // 1. Persistent Drag Tracking (Model-Aware)
    const getModel = () => {
      try {
        const item = _runtime.evaluate(element, 'item');
        return (item && typeof item === 'object') ? item : null;
      } catch {
        return null;
      }
    };

    const getCount = () => {
      const model = getModel();
      if (model) return parseInt((model as any)._nexus_drag_count) || 0;
      return parseInt((element as any)._nexus_drag_count) || 0;
    };

    const incrementCount = () => {
      const current = getCount();
      const next = current + 1;
      const model = getModel();
      
      if (model) {
        (model as any)._nexus_drag_count = next;
      }
      (element as any)._nexus_drag_count = next;
      element.setAttribute('data-drag-count', next.toString());
      
      _runtime.debug?.(`[Nexus Drag] Incrementing count: ${current} -> ${next}`, element);
      
      // Force reactivity pulse
      if ((element as any)[RUN_EFFECT_RUNNERS_KEY]) {
        (element as any)[RUN_EFFECT_RUNNERS_KEY]();
      }
    };

    // 2. Parse Limit from data-drag:limit="N"
    const getLimit = (el: HTMLElement) => {
      const attrs = Array.from(el.attributes);
      // Find the specific attribute that defines the limit
      const limitAttr = attrs.find(a => {
        const p = _runtime.parseAttribute(a.name, _runtime, el);
        return (p?.directive === 'drag' || p?.directive === 'drag-handle') && p?.argument === 'limit';
      });

      if (limitAttr) {
        const val = parseInt(limitAttr.value);
        return isNaN(val) ? Infinity : val;
      }
      return Infinity;
    };

    const onPointerDown = (e: PointerEvent) => {
      // Check limits on both item and handle
      const itemLimit = getLimit(element);
      const handleEl = (e.target as HTMLElement).closest('[data-drag-handle]') as HTMLElement | null;
      const handleLimit = handleEl ? getLimit(handleEl) : Infinity;
      const effectiveLimit = Math.min(itemLimit, handleLimit);
      const currentCount = getCount();

      _runtime.debug?.(`[Nexus Drag] Attempting drag. Count: ${currentCount}, Limit: ${effectiveLimit}`);

      if (currentCount >= effectiveLimit) {
        _runtime.warn(`[Nexus Drag] Limit reached (${effectiveLimit}) for element`, element);
        return;
      }

      // Handle drag handle requirement
      if (element.querySelector('[data-drag-handle]') && !handleEl) return;
      if (e.button !== 0) return;

      const rect = element.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      element.setPointerCapture(e.pointerId);

      // 3. Create Placeholder
      placeholder = element.cloneNode(true) as HTMLElement;
      placeholder.style.opacity = '0.2';
      placeholder.style.pointerEvents = 'none';
      placeholder.style.filter = 'grayscale(1)';
      placeholder.style.border = '2px dashed rgba(0,0,0,0.1)';
      
      Array.from(placeholder.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') || attr.name.startsWith(':') || attr.name.startsWith('@')) {
          placeholder!.removeAttribute(attr.name);
        }
      });
      
      // 4. Create Ghost (Premium Glassmorphism)
      ghost = element.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.top = `${rect.top}px`;
      ghost.style.left = `${rect.left}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.margin = '0';
      ghost.style.zIndex = '10000';
      ghost.style.pointerEvents = 'none';
      ghost.style.backdropFilter = 'blur(12px)';
      ghost.style.background = 'rgba(255, 255, 255, 0.05)';
      ghost.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      ghost.style.boxShadow = '0 30px 60px -12px rgba(0, 0, 0, 0.6)';
      ghost.style.opacity = '1';
      ghost.style.transform = 'scale(1.02)';
      ghost.style.borderRadius = getComputedStyle(element).borderRadius;
      
      Array.from(ghost.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') || attr.name.startsWith(':') || attr.name.startsWith('@')) {
          ghost!.removeAttribute(attr.name);
        }
      });
      
      document.body.appendChild(ghost);
      element.parentNode?.insertBefore(placeholder, element);
      
      // Fix Phantom Space
      element.style.display = 'none';

      element.dispatchEvent(new CustomEvent('nexus:drag-start', { detail: { event: e } }));
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !ghost || !placeholder) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.02)`;

      const parent = placeholder.parentNode;
      if (!parent) return;

      // Find the element currently under the pointer
      const overEl = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      // Look for ANY sibling with a drag attribute, matching current scope
      const item = overEl?.closest('[data-drag], [data-drag-handle]');
      
      if (item && item !== placeholder && item.parentNode === parent) {
        const itemRect = item.getBoundingClientRect();
        const isAfter = e.clientY > itemRect.top + itemRect.height / 2;
        
        if (isAfter) {
          parent.insertBefore(placeholder, item.nextSibling);
        } else {
          parent.insertBefore(placeholder, item);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      
      try {
        if (ghost && placeholder && placeholder.parentNode) {
          const parent = placeholder.parentNode;
          const finalIndex = Array.from(parent.children).indexOf(placeholder);
          const initialIndex = Array.from(parent.children).indexOf(element);

          parent.insertBefore(element, placeholder);
          parent.removeChild(placeholder);
          
          if (finalIndex !== initialIndex) {
            incrementCount();
            const detail = { from: initialIndex, to: finalIndex, count: getCount() };
            
            // Defer dispatch to ensure it happens after engine re-initialization
            requestAnimationFrame(() => {
              element.dispatchEvent(new CustomEvent('nexus:drag-end', { bubbles: true, detail }));
              window.dispatchEvent(new CustomEvent('nexus:drag-end', { detail }));
              _runtime.debug?.(`[Nexus Drag] Dispatched nexus:drag-end with count ${detail.count}`);
            });
          }
        }
      } finally {
        isDragging = false;
        if (element.hasPointerCapture(e.pointerId)) {
          element.releasePointerCapture(e.pointerId);
        }
        if (ghost && ghost.parentNode) document.body.removeChild(ghost);
        element.style.display = '';
        ghost = null;
        placeholder = null;
      }
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
    };
  }
};

export default dragAttribute;
