import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

export const throttleModifier: ModifierModule = {
  name: 'throttle',
  handle: (payload: any, _el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
    let last = 0;

    if (typeof payload === 'function') {
      return (e: Event) => {
        const now = performance.now();
        if (now - last > wait) {
          last = now;
          return payload(e);
        }
      };
    }

    return (...args: any[]) => {
      const now = performance.now();
      if (now - last > wait) {
        last = now;
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default throttleModifier;
