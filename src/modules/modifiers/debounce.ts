/**
 * Nexus-UX Debounce Modifier
 *
 * Delays handler execution until after a specified wait time has elapsed
 * since the last invocation. Supports static and dynamic wait times.
 *
 * Argument Syntax:
 *   - `_debounce` — uses DEFAULT_DEBOUNCE_TIME (250ms)
 *   - `_debounce-500` — static 500ms delay
 *   - `_debounce-#delay` — dynamic delay from signal/expression
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
import { 
  getTimerMap, 
  parseCommandArg, 
  resolveTimerDuration,
  clearTimer 
} from '../../engine/utils/timer.ts';
import { resolveTargetElements } from '../sprites/selector.ts';

export const debounceModifier: ModifierModule = {
  name: 'debounce',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    const cmd = parseCommandArg(arg);

    if (cmd.command === 'cancel') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            const rec = map.get('debounce');
            if (rec) {
              clearTimer(rec);
              map.delete('debounce');
            }
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getTimerMap(target);
          const rec = map.get('debounce');
          if (rec) {
            clearTimer(rec);
            map.delete('debounce');
          }
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (cmd.command === 'flush') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            const rec = map.get('debounce');
            if (rec) {
              clearTimer(rec);
              map.delete('debounce');
              if (rec.fn) rec.fn();
            }
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getTimerMap(target);
          const rec = map.get('debounce');
          if (rec) {
            clearTimer(rec);
            map.delete('debounce');
            if (rec.fn) rec.fn();
          }
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
        const map = getTimerMap(el);
        const existing = map.get('debounce');
        if (existing) clearTimer(existing);

        const runner = () => {
          map.delete('debounce');
          payload(e);
        };

        const timer = setTimeout(runner, wait);
        map.set('debounce', { timer, fn: runner });
      };
    }

    return (...args: any[]) => {
      return new Promise((resolve) => {
        const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
        const map = getTimerMap(el);
        const existing = map.get('debounce');
        if (existing) clearTimer(existing);

        const runner = () => {
          map.delete('debounce');
          resolve(typeof payload === 'function' ? payload(...args) : payload);
        };

        const timer = setTimeout(runner, wait);
        map.set('debounce', { timer, fn: runner });
      });
    };
  }
};

export default debounceModifier;
