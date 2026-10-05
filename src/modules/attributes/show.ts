import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const showModule: AttributeModule = {
  name: 'show',
  attribute: 'show',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const originalDisplay = el.style.display === 'none' ? '' : el.style.display;
    return runtime.bind(el, value, result => {
      if (result) {
        if (originalDisplay) {
          el.style.display = originalDisplay;
        } else {
          el.style.removeProperty('display');
        }
      } else {
        el.style.display = 'none';
      }
    });
  }
};

export default showModule;
