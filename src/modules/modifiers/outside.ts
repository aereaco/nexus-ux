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
 *   - Zero-serialization: Pure handler wrapper; no side-effect listener leaks.
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const outsideModifier: ModifierModule = {
  name: 'outside',
  handle: (payload: any, el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
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
