import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const htmlModule: AttributeModule = {
  name: 'html',
  attribute: 'html',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    let lastContent: unknown = Symbol();
    return runtime.bind(el, value, content => {
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
  }
};

export default htmlModule;