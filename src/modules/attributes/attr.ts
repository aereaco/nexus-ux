import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

/**
 * data-attr:[name]="expression"
 * Binds a dynamic expression to an element attribute.
 */
const attrModule: AttributeModule = {
  name: 'attr',
  attribute: 'attr',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Look for all data-attr:* attributes with the same value (expression)
    const attrs = Array.from(el.attributes).filter(a => 
      (a.name.startsWith('data-attr:') || a.name.startsWith('data-attr-') || a.name.startsWith(':')) && a.value === value
    );
    
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const attrName = parsed.argument;

      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          runtime.log(`[Nexus Attr] Evaluating "${value}" for ${attrName} ->`, result);
          if (result === null || result === undefined || result === false) {
            el.removeAttribute(attrName);
          } else {
            el.setAttribute(attrName, String(result));
          }
        });
        cleanupFns.push(cleanup);
      } catch (e) {
        initError('attr', `Failed to bind attribute ${attrName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default attrModule;
