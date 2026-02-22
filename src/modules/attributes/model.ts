import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

/**
 * `data-model` provides true 2-way data binding parity with Alpine's `x-model`.
 * It automatically wires up the `value` or `checked` DOM properties to the stated Signal
 * while attaching the appropriate `input` or `change` event listener to write back mutations.
 */
const modelModule: AttributeModule = {
  name: 'model',
  attribute: 'model',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    const isInput = el instanceof HTMLInputElement;
    const isSelect = el instanceof HTMLSelectElement;
    const isTextarea = el instanceof HTMLTextAreaElement;

    if (!isInput && !isSelect && !isTextarea) {
      initError('model', 'data-model can only be used on input, select, or textarea elements.', el, expression);
      return;
    }

    const type = (el as HTMLInputElement).type;
    const isCheckbox = isInput && type === 'checkbox';
    const isRadio = isInput && type === 'radio';

    let eventType = 'input';
    if (isCheckbox || isRadio || isSelect) {
      eventType = 'change';
    }

    const cleanupFns: (() => void)[] = [];

    try {
      // 1. DOM -> Signal (Event Listener)
      const inputHandler = (e: Event) => {
        let newValue: unknown;
        const target = e.target as HTMLInputElement;

        if (isCheckbox) {
          newValue = target.checked;
        } else if (isRadio) {
          if (target.checked) {
            newValue = target.value;
          } else {
            return; // Radios only update signal when selected
          }
        } else {
          newValue = target.value;
        }

        // Reverse assignment logic using evaluate
        runtime.evaluate(el, `${expression} = $modelValue`, { $modelValue: newValue });
      };

      el.addEventListener(eventType, inputHandler);
      cleanupFns.push(() => el.removeEventListener(eventType, inputHandler));

      // 2. Signal -> DOM (Reactive Effect)
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, expression);
        const attrValue = result !== undefined && result !== null ? String(result) : '';

        if (isCheckbox) {
          (el as HTMLInputElement).checked = Boolean(result);
        } else if (isRadio) {
          (el as HTMLInputElement).checked = ((el as HTMLInputElement).value === attrValue);
        } else {
          if ('value' in el) {
            (el as HTMLInputElement | HTMLTextAreaElement).value = attrValue;
          }
        }
      });

      cleanupFns.push(cleanup);

    } catch (e) {
      initError('model', `Failed to bind model: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default modelModule;
