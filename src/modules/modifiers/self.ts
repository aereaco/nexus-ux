/**
 * Nexus-UX Self Modifier
 *
 * Ensures the event handler only fires when the event target is the bound
 * element itself, not a child element. AlpineJS parity modifier.
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`:`) not an intent modifier (`-`).
 *   Used as: `data-on-click:self`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Event target is compared by reference; no cloning.
 *   - Zero-serialization: Handler is wrapped in closure by reference.
 *
 * Coordination:
 *   - on.ts applies this modifier during event listener construction
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Identity check prevents event bubbling from child elements
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const selfModifier: ModifierModule = {
  name: 'self',
  handle: (payload: any, el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        if (e.target === el) return payload(e);
      };
    }
    return payload;
  }
};

export default selfModifier;
