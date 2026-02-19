import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';

const classModule: AttributeModule = {
  name: 'class',
  attribute: 'class',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const attrs = Array.from(el.attributes).filter(a => 
      (a.name.startsWith('data-class:') || a.name.startsWith('data-class-')) && a.value === value
    );
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const className = parsed.argument;

      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          if (result) {
            el.classList.add(className);
          } else {
            el.classList.remove(className);
          }
        });
        cleanupFns.push(cleanup);
      } catch (e) {
        initError('class', `Failed to bind class ${className}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default classModule;
