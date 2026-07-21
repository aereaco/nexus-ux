import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

export const delayModifier: ModifierModule = {
  name: 'delay',
  handle: (payload: any, _el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;

    if (typeof payload === 'function') {
      return (e: Event) => {
        setTimeout(() => payload(e), wait);
      };
    }

    return (...args: any[]) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(typeof payload === 'function' ? payload(...args) : payload);
        }, wait);
      });
    };
  }
};

export default delayModifier;
