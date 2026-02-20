import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const htmlModule: AttributeModule = {
  name: 'html',
  attribute: 'html',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const content = runtime.evaluate(el, value);
        el.innerHTML = content === undefined || content === null ? '' : String(content);
      });
      return cleanup;
    } catch (e) {
      initError('html', `Failed to bind html: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default htmlModule;
