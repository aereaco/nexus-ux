import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { format } from '../sprites/mask.ts';

/**
 * data-mask Directive
 * 
 * Applies a real-time mask to an input element.
 * 
 * Usage:
 * <input data-mask="'(999) 999-9999'" ...>
 */
export const maskModule: AttributeModule = {
  name: 'mask',
  handle(el: HTMLElement, value: string, runtime: RuntimeContext) {
    if (!(el instanceof HTMLInputElement)) {
      runtime.warn('data-mask only supported on <input> elements.', el);
      return;
    }

    let lastValue = el.value;

    const onInput = () => {
      const template = runtime.evaluate(el, value) as string;
      if (!template) return;

      const cursor = el.selectionStart;
      const unformatted = el.value;

      // Don't format if deleting (simplified logic for now)
      if (lastValue.length > unformatted.length) {
        lastValue = unformatted;
        return;
      }

      const formatted = format(unformatted, template);
      el.value = formatted;
      lastValue = formatted;

      // Restoration of cursor position (simplified)
      if (cursor !== null) {
        const newPos = format(unformatted.slice(0, cursor), template).length;
        el.setSelectionRange(newPos, newPos);
      }
    };

    el.addEventListener('input', onInput);
    
    // Initial format
    onInput();

    return () => {
      el.removeEventListener('input', onInput);
    };
  }
};

export default maskModule;
