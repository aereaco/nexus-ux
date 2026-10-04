import { TIMER_MAP_KEY } from '../consts.ts';
import { RuntimeContext } from '../composition.ts';

export interface TimerRecord {
  timer: number | null;
  fn?: () => void;
  cleanup?: () => void;
  last?: number;
}

/**
 * Access or initialize the per-element timer map for async modifiers.
 */
export function getTimerMap<T = TimerRecord>(el: HTMLElement): Map<string, T> {
  let map = (el as any)[TIMER_MAP_KEY];
  if (!map) {
    map = new Map<string, T>();
    (el as any)[TIMER_MAP_KEY] = map;
  }
  return map;
}

/**
 * Parses modifier command arguments of the form command or command(targetSelector).
 * E.g. cancel, cancel(#other), reset, flush(.list)
 */
export function parseCommandArg(arg: string): { command?: string; targetSelector?: string } {
  if (!arg) return {};
  const trimmed = arg.trim();
  const match = trimmed.match(/^([a-zA-Z]+)(?:\((.*)\))?$/i);
  if (match) {
    return {
      command: match[1].toLowerCase(),
      targetSelector: match[2]?.trim()
    };
  }
  return {};
}

/**
 * Resolves static or dynamic (#signal) duration numbers from modifier argument string.
 */
export function resolveTimerDuration(
  runtime: RuntimeContext,
  el: HTMLElement,
  arg: string,
  defaultDuration: number
): number {
  if (!arg) return defaultDuration;
  if (arg.startsWith('#')) {
    const val = runtime.evaluate(el, arg);
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isNaN(num) ? defaultDuration : num;
  }
  return parseInt(arg, 10) || defaultDuration;
}

export function clearTimer(rec?: TimerRecord | null): void {
  if (rec) {
    if (rec.cleanup) {
      rec.cleanup();
      rec.cleanup = undefined;
    }
    if (typeof rec.timer === 'number') {
      clearTimeout(rec.timer);
      rec.timer = null;
    }
  }
}

export type TimerExecutor = (
  run: () => void,
  wait: number,
  el: HTMLElement,
  record: TimerRecord,
  map: Map<string, TimerRecord>
) => void;

/**
 * Higher-order modifier factory that standardizes cancel, flush, target-resolution,
 * dynamic wait calculation, and dual-mode (event vs Promise) modifier dispatch.
 */
export function createTimerModifier(
  name: string,
  defaultDuration: number,
  executor: TimerExecutor,
  options?: {
    supportsFlush?: boolean;
    supportsNonFunctionPromise?: boolean;
    onCancel?: (target: HTMLElement, map: Map<string, TimerRecord>) => void;
  }
): any {
  return {
    name,
    handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
      const cmd = parseCommandArg(arg);

      // Handle Cancel / Reset Commands
      if (cmd.command === 'cancel' || cmd.command === 'reset') {
        const handleCancel = () => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            if (options?.onCancel) {
              options.onCancel(target, map);
            } else {
              const rec = map.get(name);
              if (rec) {
                clearTimer(rec);
                map.delete(name);
              }
            }
          });
        };

        if (typeof payload === 'function') {
          return (e: Event) => {
            handleCancel();
            return payload(e);
          };
        }
        return (...args: any[]) => {
          handleCancel();
          return typeof payload === 'function' ? payload(...args) : payload;
        };
      }

      // Handle Flush Commands (runs pending scheduled execution immediately)
      if (options?.supportsFlush && cmd.command === 'flush') {
        const handleFlush = () => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            const rec = map.get(name);
            if (rec) {
              clearTimer(rec);
              map.delete(name);
              if (rec.fn) rec.fn();
            }
          });
        };

        if (typeof payload === 'function') {
          return (e: Event) => {
            handleFlush();
            return payload(e);
          };
        }
        return (...args: any[]) => {
          handleFlush();
          return typeof payload === 'function' ? payload(...args) : payload;
        };
      }

      const wait = resolveTimerDuration(runtime, el, arg, defaultDuration);

      if (typeof payload === 'function') {
        return (e: Event) => {
          const map = getTimerMap(el);
          const rec = map.get(name) || { timer: null };
          executor(() => payload(e), wait, el, rec, map);
        };
      }

      if (options?.supportsNonFunctionPromise) {
        return (...args: any[]) => {
          return new Promise((resolve) => {
            const map = getTimerMap(el);
            const rec = map.get(name) || { timer: null };
            executor(
              () => resolve(typeof payload === 'function' ? payload(...args) : payload),
              wait,
              el,
              rec,
              map
            );
          });
        };
      }

      return payload;
    }
  };
}
