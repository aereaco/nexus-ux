import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const styleModule: AttributeModule = {
  name: 'style',
  attribute: 'style',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const attrs = Array.from(el.attributes).filter(a => a.name.startsWith('data-style-') && a.value === value);
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const propName = attr.name.substring('data-style-'.length);
      if (!propName) return;

      const prop = propName; // CSS property name

      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);

          if (result !== null && result !== undefined && result !== false) {
            el.style.setProperty(prop, String(result));
          } else {
            el.style.removeProperty(prop);
          }
        });
        cleanupFns.push(cleanup);
      } catch (e) {
        initError('style', `Failed to bind style ${prop}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default styleModule;
