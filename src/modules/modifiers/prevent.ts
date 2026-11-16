/**
 * Nexus-UX Prevent Modifier
 *
 * Standard event modifier that calls `event.preventDefault()` before
 * executing the handler. AlpineJS parity modifier.
 *
 * Behavior:
 *   - When wrapping an event listener: calls preventDefault() then forwards
 *   - When intercepting pipeline: passes payload through unchanged
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`_`) not an intent modifier (`-`).
 *   Used as: `data-on-click_prevent`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Event object is mutated in-place; no cloning.
 *   - Zero-serialization: Handler is wrapped in a closure by reference.
 *
 * Coordination:
 *   - on.ts applies this modifier during event listener construction
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Dual-mode: event listener wrapper AND pipeline interceptor
 */

import { ModifierModule } from '../../engine/modules.ts';
import { createGuardModifier } from '../../engine/utils/modifier.ts';

export const preventModifier: ModifierModule = createGuardModifier('prevent', (fn) => (e) => {
  e.preventDefault();
  return fn(e);
});

export default preventModifier;
