import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const assertModule: AttributeModule = {
  name: 'assert',
  attribute: 'assert',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Evaluate immediately
    try {
      const result = runtime.evaluate(el, value);
      if (!result) {
        const msg = `Assertion failed: "${value}" evaluated to falsy value based on ${result}`;
        console.error(msg, el);
        initError('assert', msg, el, value);
      }
    } catch (e) {
      initError('assert', `Assertion error: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default assertModule;
