import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const effectModule: AttributeModule = {
  name: 'effect',
  attribute: 'effect',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        runtime.evaluate(el, value);
      });
      return cleanup;
    } catch (e) {
      initError('effect', `Failed to run effect: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default effectModule;
