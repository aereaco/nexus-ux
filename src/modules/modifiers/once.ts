import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const onceModifier: ModifierModule = {
  name: 'once',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    let fired = false;
    if (typeof payload === 'function') {
      return (e: Event) => {
        if (!fired) {
          fired = true;
          return payload(e);
        }
      };
    }
    // Generic pipeline execution tracking
    return (...args: any[]) => {
      if (!fired) {
        fired = true;
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default onceModifier;
