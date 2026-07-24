/**
 * Nexus-UX Delay Modifier
 *
 * Delays handler execution by a fixed wait time. Unlike debounce, delay
 * always fires after the specified time regardless of subsequent calls.
 *
 * Argument Syntax:
 *   - `:delay` — uses DEFAULT_DEBOUNCE_TIME (250ms)
 *   - `:delay-500` — static 500ms delay
 *   - `:delay-#ms` — dynamic delay from signal/expression
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Timeout IDs are stored by reference; no cloning.
 *   - Zero-serialization: Handler is wrapped in closure; no serialization.
 *
 * Coordination:
 *   - on.ts applies this modifier during event listener construction
 *   - consts.ts provides DEFAULT_DEBOUNCE_TIME
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Dynamic wait time via expression evaluation
 *   - Support for both event and non-event payloads
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

function resolveDelay(runtime: RuntimeContext, el: HTMLElement, arg: string): number {
  if (!arg) return DEFAULT_DEBOUNCE_TIME;
  if (arg.startsWith('#')) {
    const val = runtime.evaluate(el, arg);
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isNaN(num) ? DEFAULT_DEBOUNCE_TIME : num;
  }
  return parseInt(arg, 10) || DEFAULT_DEBOUNCE_TIME;
}

export const delayModifier: ModifierModule = {
  name: 'delay',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        setTimeout(() => payload(e), resolveDelay(runtime, el, arg));
      };
    }

    return (...args: any[]) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(typeof payload === 'function' ? payload(...args) : payload);
        }, resolveDelay(runtime, el, arg));
      });
    };
  }
};

export default delayModifier;
