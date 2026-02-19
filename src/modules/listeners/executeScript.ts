import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

const executeScriptModule: ListenerModule = {
  name: 'executeScript',
  event: 'execute-script',
  listen: (el: HTMLElement, runtime: RuntimeContext) => {
    const handler = (event: Event) => {
      if (event instanceof CustomEvent && event.detail && typeof event.detail.script === 'string') {
        try {
          // Execute script with access to element and runtime
          new Function('element', 'runtime', event.detail.script)(el, runtime);
        } catch (e) {
          reportError(new Error(`Execute script error: ${e instanceof Error ? e.message : String(e)}`), el);
        }
      }
    };

    el.addEventListener('execute-script', handler);
    return () => el.removeEventListener('execute-script', handler);
  }
};

export default executeScriptModule;
