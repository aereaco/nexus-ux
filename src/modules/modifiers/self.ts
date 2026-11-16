/**
 * Nexus-UX Self Modifier
 *
 * Ensures the event handler only fires when the event target is the bound
 * element itself, not a child element. AlpineJS parity modifier.
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`_`) not an intent modifier (`-`).
 *   Used as: `data-on-click_self`
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
import { createGuardModifier } from '../../engine/utils/modifier.ts';

export const selfModifier: ModifierModule = createGuardModifier('self', (fn, el) => (e) => {
  if (e.target === el) return fn(e);
});

export default selfModifier;
