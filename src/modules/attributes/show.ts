import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const showModule: AttributeModule = {
  name: 'show',
  attribute: 'show',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const originalDisplay = el.style.display;

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const show = Boolean(runtime.evaluate(el, value));
        el.style.display = show ? originalDisplay : 'none';
      });
      return cleanup;
    } catch (e) {
      initError('show', `Failed to initialize show: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default showModule;
