import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_THROTTLE_TIME } from '../../engine/consts.ts';

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
    const wait = resolveThrottle(runtime, el, arg);
    let last = 0;

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveThrottle(runtime, el, arg);
        const now = performance.now();
        if (now - last > wait) {
          last = now;
          return payload(e);
        }
      };
    }

    return (...args: any[]) => {
      const wait = resolveThrottle(runtime, el, arg);
      const now = performance.now();
      if (now - last > wait) {
        last = now;
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default throttleModifier;
