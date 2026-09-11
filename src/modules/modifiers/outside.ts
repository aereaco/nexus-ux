/**
 * Nexus-UX Outside Modifier
 *
 * Ensures the event handler only fires when the click event target is outside
 * the bound element. AlpineJS parity modifier (_outside).
 *
 * Used as: `data-on-click_outside="expression"`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Node containment is checked by reference; no cloning.
 *   - Zero-serialization: Pure handler wrapper; no side-effect listener leaks.
 */

import { ModifierModule } from '../../engine/modules.ts';
import { createGuardModifier } from '../../engine/utils/modifier.ts';

export const outsideModifier: ModifierModule = createGuardModifier('outside', (fn, el) => (e) => {
  if (e.target && !el.contains(e.target as Node)) {
    return fn(e);
  }
});

export default outsideModifier;
