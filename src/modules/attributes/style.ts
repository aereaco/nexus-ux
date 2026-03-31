import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

const styleModule: AttributeModule = {
  name: 'style',
  attribute: 'style',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const attrs = matchAttributes(el, 'style', value);
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || parsed.argument) return; // Skip suffixes (elimination)

      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          runtime.reconcileStyle(el, result);
        });
        cleanupFns.push(cleanup);
      } catch (e) {
        initError('style', `Failed to reconcile style: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default styleModule;
