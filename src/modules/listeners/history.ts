import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

const historyModule: ListenerModule = {
  name: 'history',
  event: 'popstate',
  listen: (_el: HTMLElement, context: RuntimeContext) => {
    // _el is likely window/document/root.
    // We attach to window.
    const handler = (event: Event) => {
      try {
        if (event instanceof PopStateEvent) {
          const route = globalThis.location.pathname + globalThis.location.search;
          context.setGlobalSignal('route', route);
          // Route params parsing could happen here or in a computed signal.
          console.log(`[Nexus History] Route changed: ${route}`);
        }
      } catch (e) {
        reportError(new Error(`History listener error: ${e instanceof Error ? e.message : String(e)}`), document.body);
      }
    };

    globalThis.addEventListener('popstate', handler);
    return () => globalThis.removeEventListener('popstate', handler);
  }
};

export default historyModule;
