import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const refModule: AttributeModule = {
  name: 'ref',
  attribute: 'ref',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    if (!value) return;

    // Register the element in the runtime's refs map
    runtime.refs[value] = el;

    return () => {
      // Cleanup: remove from refs map if this element is still the one registered
      if (runtime.refs[value] === el) {
        delete runtime.refs[value];
      }
    };
  }
};

export default refModule;
