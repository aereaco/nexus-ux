/**
 * Nexus-UX Hold Modifier (:hold)
 *
 * Delays event handler execution until the element is held down for a specified duration (default 500ms).
 * Cancels automatically if released (pointerup, touchend) or moved away (pointerleave, touchcancel) before wait.
 *
 * Usage:
 *   `data-on-pointerdown:hold="expression"` — default 500ms hold
 *   `data-on-pointerdown:hold-750="expression"` — 750ms hold
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Timer references are tracked directly in closure.
 *   - Zero-serialization: Clean event listener wrappers without string serialization.
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const holdModifier: ModifierModule = {
  name: 'hold',
  handle: (payload: any, _el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const wait = parseInt(arg, 10) || 500;

    if (typeof payload === 'function') {
      return (e: Event) => {
        let timer: any = setTimeout(() => {
          cleanup();
          payload(e);
        }, wait);

        const cleanup = () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          window.removeEventListener('pointerup', cleanup);
          window.removeEventListener('pointercancel', cleanup);
          window.removeEventListener('pointerleave', cleanup);
          window.removeEventListener('touchend', cleanup);
          window.removeEventListener('touchcancel', cleanup);
        };

        window.addEventListener('pointerup', cleanup, { once: true });
        window.addEventListener('pointercancel', cleanup, { once: true });
        window.addEventListener('pointerleave', cleanup, { once: true });
        window.addEventListener('touchend', cleanup, { once: true });
        window.addEventListener('touchcancel', cleanup, { once: true });
      };
    }

    return payload;
  }
};

export default holdModifier;
