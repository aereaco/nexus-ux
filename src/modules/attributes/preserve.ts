import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DATA_PRESERVE_ATTR } from '../../engine/consts.ts';

const preserveModule: AttributeModule = {
  name: 'preserve',
  attribute: 'preserve',
  handle: (el: HTMLElement, _value: string, _runtime: RuntimeContext): (() => void) | void => {
    // Just mark the element. The morph engine checks for this attribute.
    el.setAttribute(DATA_PRESERVE_ATTR, 'true');

    // If value is provided, we might want to stash it or use it for ID matching?
    // Idiomorph uses ID matching by default if IDs match.
    // data-preserve="true" forces it.

    return () => {
      // cleanup?
    };
  }
};

export default preserveModule;
