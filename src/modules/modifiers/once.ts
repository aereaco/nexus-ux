/**
 * Nexus-UX Once Modifier
 *
 * Ensures the handler executes only once per element. Subsequent invocations
 * are silently discarded.
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`:`) not an intent modifier (`-`).
 *   Used as: `data-on-click:once`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Closure captures fired flag by reference; no cloning.
 *   - Zero-serialization: Handler state is a simple boolean.
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

export const onceModifier: ModifierModule = {
  name: 'once',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    let fired = false;
    if (typeof payload === 'function') {
      return (e: Event) => {
        if (!fired) {
          fired = true;
          return payload(e);
        }
      };
    }
    // Generic pipeline execution tracking
    return (...args: any[]) => {
      if (!fired) {
        fired = true;
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default onceModifier;
