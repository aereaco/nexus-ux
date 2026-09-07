import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';

const htmlModule: AttributeModule = {
  name: 'html',
  attribute: 'html',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      let lastContent: unknown = Symbol();
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const content = runtime.evaluate(el, value);
        if (content !== lastContent) {
          lastContent = content;
          const html = content === undefined || content === null ? '' : String(content);
          el.innerHTML = html;
          Array.from(el.children).forEach(child => {
            if (child instanceof HTMLElement || child instanceof SVGElement) {
              runtime.processElement(child as HTMLElement, true);
            }
          });
        }
      });
      return cleanup;
    } catch (e) {
      initError('html', `Failed to bind html: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default htmlModule;