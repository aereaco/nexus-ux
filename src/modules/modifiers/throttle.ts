import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_THROTTLE_TIME, TIMER_MAP_KEY } from '../../engine/consts.ts';
import { resolveTargetElements } from '../sprites/selector.ts';

interface ThrottleRecord {
  last: number;
}

function getThrottleMap(el: HTMLElement): Map<string, ThrottleRecord> {
  let map = (el as any)[TIMER_MAP_KEY];
  if (!map) {
    map = new Map<string, ThrottleRecord>();
    (el as any)[TIMER_MAP_KEY] = map;
  }
  return map;
}

function parseCommandArg(arg: string): { command?: 'cancel' | 'reset'; targetSelector?: string } {
  if (!arg) return {};
  const trimmed = arg.trim();
  const match = trimmed.match(/^(cancel|reset)(?:\((.*)\))?$/i);
  if (match) {
    return {
      command: match[1].toLowerCase() as 'cancel' | 'reset',
      targetSelector: match[2]?.trim()
    };
  }
  return {};
}

function resolveThrottle(runtime: RuntimeContext, el: HTMLElement, arg: string): number {
  if (!arg) return DEFAULT_THROTTLE_TIME;
  if (arg.startsWith('#')) {
    const val = runtime.evaluate(el, arg);
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isNaN(num) ? DEFAULT_THROTTLE_TIME : num;
  }
  return parseInt(arg, 10) || DEFAULT_THROTTLE_TIME;
}

export const throttleModifier: ModifierModule = {
  name: 'throttle',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    const cmd = parseCommandArg(arg);

    if (cmd.command === 'cancel' || cmd.command === 'reset') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getThrottleMap(target);
            map.delete('throttle');
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getThrottleMap(target);
          map.delete('throttle');
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveThrottle(runtime, el, arg);
        const map = getThrottleMap(el);
        const rec = map.get('throttle') || { last: 0 };
        const now = performance.now();
        if (now - rec.last > wait) {
          rec.last = now;
          map.set('throttle', rec);
          return payload(e);
        }
      };
    }

    return (...args: any[]) => {
      const wait = resolveThrottle(runtime, el, arg);
      const map = getThrottleMap(el);
      const rec = map.get('throttle') || { last: 0 };
      const now = performance.now();
      if (now - rec.last > wait) {
        rec.last = now;
        map.set('throttle', rec);
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default throttleModifier;
