import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';

const textModule: AttributeModule = {
  name: 'text',
  attribute: 'text',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, value);
        el.textContent = result !== undefined && result !== null ? String(result) : '';
      });
      return cleanup;
    } catch (e) {
      initError('text', `Failed to initialize data-text: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default textModule;
