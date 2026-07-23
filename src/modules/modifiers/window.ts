import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const windowModifier: ModifierModule = {
  name: 'window',
  handle: (_payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    return _payload;
  }
};

export default windowModifier;
