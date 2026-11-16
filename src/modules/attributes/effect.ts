import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const effectModule: AttributeModule = {
  name: 'effect',
  attribute: 'effect',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    let isEvaluating = false;
    return runtime.bind(el, value, () => {
      if (isEvaluating) return;
      isEvaluating = true;
      try {
        runtime.evaluate(el, value);
      } finally {
        isEvaluating = false;
      }
    }, { raw: true });
  }
};

export default effectModule;
