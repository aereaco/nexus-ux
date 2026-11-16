import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const showModule: AttributeModule = {
  name: 'show',
  attribute: 'show',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const originalDisplay = el.style.display === 'none' ? '' : el.style.display;
    return runtime.bind(el, value, result => {
      if (typeof HTMLDialogElement !== 'undefined' && el instanceof HTMLDialogElement) {
        if (result) {
          if (!el.open && typeof el.showModal === 'function') {
            try { el.showModal(); } catch { el.setAttribute('open', ''); }
          }
        } else if (el.open && typeof el.close === 'function') {
          el.close();
        }
        return;
      }

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
