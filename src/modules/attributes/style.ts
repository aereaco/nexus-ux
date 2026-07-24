import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';

const styleModule: AttributeModule = {
  name: 'style',
  attribute: 'style',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    const parsed = parsedAttr || runtime.parseAttribute('data-style', runtime, el);
    if (!parsed || parsed.argument) return;

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, value);
        runtime.reconcileStyle(el, result);
      });
      return cleanup;
    } catch (e) {
      initError('style', `Failed to reconcile style: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default styleModule;
