/**
 * Nexus-UX Outside Modifier
 *
 * Ensures the event handler only fires when the click event target is outside
 * the bound element. AlpineJS parity modifier (:outside).
 *
 * Used as: `data-on-click:outside="expression"`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Node containment is checked by reference; no cloning.
 *   - Zero-serialization: Event handler is wrapped in closure by reference.
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { CLEANUP_FUNCTIONS_KEY } from '../../engine/consts.ts';

export const outsideModifier: ModifierModule = {
  name: 'outside',
  handle: (payload: any, el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      const documentListener = (e: Event) => {
        if (e.target && !el.contains(e.target as Node)) {
          payload(e);
        }
      };

      // Register document-level click listener with capture phase for reliable detection
      document.addEventListener('click', documentListener, true);

      // Register cleanup function on element so it unbinds when element is removed
      const enhanced = el as any;
      if (!enhanced[CLEANUP_FUNCTIONS_KEY]) {
        enhanced[CLEANUP_FUNCTIONS_KEY] = [];
      }
      enhanced[CLEANUP_FUNCTIONS_KEY].push(() => {
        document.removeEventListener('click', documentListener, true);
      });

      // Filter element's direct event callbacks
      return (e: Event) => {
        if (e.target && !el.contains(e.target as Node)) {
          return payload(e);
        }
      };
    }
    return payload;
  }
};

export default outsideModifier;
