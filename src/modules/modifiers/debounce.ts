import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

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
    const wait = resolveDebounce(runtime, el, arg);
    let timeout: number | undefined;

    if (typeof payload === 'function') {
      return (e: Event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => payload(e), wait);
      };
    }

    return (...args: any[]) => {
      return new Promise((resolve) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          resolve(typeof payload === 'function' ? payload(...args) : payload);
        }, wait);
      });
    };
  }
};

export default debounceModifier;
