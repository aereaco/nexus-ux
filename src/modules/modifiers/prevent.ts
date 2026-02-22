import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const preventModifier: ModifierModule = {
  name: 'prevent',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    // If wrapping an event listener function
    if (typeof payload === 'function') {
      return (e: Event) => {
        e.preventDefault();
        return payload(e);
      };
    }
    // Generic pipeline interception
    return payload;
  }
};

export default preventModifier;
