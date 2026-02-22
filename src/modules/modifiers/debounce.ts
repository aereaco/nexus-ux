import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

export const debounceModifier: ModifierModule = {
  name: 'debounce',
  handle: (payload: any, _el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
    let timeout: number | undefined;

    if (typeof payload === 'function') {
      return (e: Event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => payload(e), wait);
      };
    }

    // Generic pipeline execution (e.g. data-class:debounce-500)
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
