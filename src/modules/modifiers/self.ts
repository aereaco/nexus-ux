import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const selfModifier: ModifierModule = {
  name: 'self',
  handle: (payload: any, el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        if (e.target === el) return payload(e);
      };
    }
    return payload;
  }
};

export default selfModifier;
