/**
 * Nexus-UX Debounce Modifier
 *
 * Delays handler execution until after a specified wait time has elapsed
 * since the last invocation. Supports static and dynamic wait times.
 *
 * Argument Syntax:
 *   - `:debounce` — uses DEFAULT_DEBOUNCE_TIME (250ms)
 *   - `:debounce-500` — static 500ms delay
 *   - `:debounce-#delay` — dynamic delay from signal/expression
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

function parseCommandArg(arg: string): { command?: 'cancel' | 'flush'; targetSelector?: string } {
  if (!arg) return {};
  const trimmed = arg.trim();
  const match = trimmed.match(/^(cancel|flush)(?:\((.*)\))?$/i);
  if (match) {
    return {
      command: match[1].toLowerCase() as 'cancel' | 'flush',
      targetSelector: match[2]?.trim()
    };
  }
  return {};
}

function resolveDebounce(runtime: RuntimeContext, el: HTMLElement, arg: string): number {
  if (!arg) return DEFAULT_DEBOUNCE_TIME;
  if (arg.startsWith('#')) {
    const val = runtime.evaluate(el, arg);
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isNaN(num) ? DEFAULT_DEBOUNCE_TIME : num;
  }
  return parseInt(arg, 10) || DEFAULT_DEBOUNCE_TIME;
}

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
              clearTimeout(rec.timer);
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
            clearTimeout(rec.timer);
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
              clearTimeout(rec.timer);
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
            clearTimeout(rec.timer);
            map.delete('debounce');
            if (rec.fn) rec.fn();
          }
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveDebounce(runtime, el, arg);
        const map = getTimerMap(el);
        const existing = map.get('debounce');
        if (existing) clearTimeout(existing.timer);

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
        const wait = resolveDebounce(runtime, el, arg);
        const map = getTimerMap(el);
        const existing = map.get('debounce');
        if (existing) clearTimeout(existing.timer);

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
