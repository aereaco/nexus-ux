import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const stopModifier: ModifierModule = {
  name: 'stop',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        e.stopPropagation();
        return payload(e);
      };
    }
    return payload; // Passthrough if not an event handler
  }
};

export default stopModifier;
