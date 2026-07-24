/**
 * Nexus-UX Stop Modifier
 *
 * Standard event modifier that calls `event.stopPropagation()` before
 * executing the handler. AlpineJS parity modifier.
 *
 * Behavior:
 *   - When wrapping an event listener: calls stopPropagation() then forwards
 *   - When intercepting pipeline: passes payload through unchanged
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`:`) not an intent modifier (`-`).
 *   Used as: `data-on-click:stop`
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
import { RuntimeContext } from '../../engine/composition.ts';

export const stopModifier: ModifierModule = {
  name: 'stop',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        e.stopPropagation();
        return payload(e);
      };
    }
    return payload; // Passthrough if not an event handler
  }
};

export default stopModifier;
