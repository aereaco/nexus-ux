import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

const classModule: AttributeModule = {
  name: 'class',
  attribute: 'class',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const attrs = matchAttributes(el, 'class', value);
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed) return;

      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          
          if (parsed.argument) {
             // Handle suffixed class binding (e.g. data-class-active="isActive")
             if (result) {
               el.classList.add(parsed.argument);
             } else {
               el.classList.remove(parsed.argument);
             }
          } else {
             // Handle standard class binding
             runtime.reconcileClass(el, result);
          }
        });
        cleanupFns.push(cleanup);
      } catch (e) {
        initError('class', `Failed to reconcile class: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default classModule;
