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
import { DEFAULT_DEBOUNCE_TIME, TIMER_MAP_KEY } from '../../engine/consts.ts';
import { resolveTargetElements } from '../sprites/selector.ts';

interface TimerRecord {
  timer: number;
  fn?: () => void;
}

function getTimerMap(el: HTMLElement): Map<string, TimerRecord> {
  let map = (el as any)[TIMER_MAP_KEY];
  if (!map) {
    map = new Map<string, TimerRecord>();
    (el as any)[TIMER_MAP_KEY] = map;
  }
  return map;
}

function parseCommandArg(arg: string): { command?: 'cancel'; targetSelector?: string } {
  if (!arg) return {};
  const trimmed = arg.trim();
  const match = trimmed.match(/^cancel(?:\((.*)\))?$/i);
  if (match) {
    return {
      command: 'cancel',
      targetSelector: match[1]?.trim()
    };
  }
  return {};
}

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
    const cmd = parseCommandArg(arg);

    if (cmd.command === 'cancel') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            const rec = map.get('delay');
            if (rec) {
              clearTimeout(rec.timer);
              map.delete('delay');
            }
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getTimerMap(target);
          const rec = map.get('delay');
          if (rec) {
            clearTimeout(rec.timer);
            map.delete('delay');
          }
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveDelay(runtime, el, arg);
        const map = getTimerMap(el);
        const existing = map.get('delay');
        if (existing) clearTimeout(existing.timer);

        const runner = () => {
          map.delete('delay');
          payload(e);
        };

        const timer = setTimeout(runner, wait);
        map.set('delay', { timer, fn: runner });
      };
    }

    return (...args: any[]) => {
      return new Promise((resolve) => {
        const wait = resolveDelay(runtime, el, arg);
        const map = getTimerMap(el);
        const existing = map.get('delay');
        if (existing) clearTimeout(existing.timer);

        const runner = () => {
          map.delete('delay');
          resolve(typeof payload === 'function' ? payload(...args) : payload);
        };

        const timer = setTimeout(runner, wait);
        map.set('delay', { timer, fn: runner });
      });
    };
  }
};

export default delayModifier;
