import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

/**
 * history: bridges native browser back/forward (popstate) to the router.
 *
 * When the Navigation API is available, the router handles back/forward natively,
 * so this listener stays out of the way. When it is not available, it dispatches a
 * `ux-popstate` custom event on `document`, which the router listens for to drive
 * updateRoute(). This keeps a single source of truth for route resolution instead
 * of setting an unused signal.
 */
const historyModule: ListenerModule = {
  name: 'history',
  event: 'popstate',
  listen: (_el: HTMLElement, _context: RuntimeContext) => {
    // The Navigation API supersedes popstate handling in the router.
    if ('navigation' in globalThis) {
      return () => {};
    }

    const popStateEvent = `${CUSTOM_EVENT_PREFIX}popstate`;

    const handler = (event: Event) => {
      try {
        if (event instanceof PopStateEvent) {
          document.dispatchEvent(
            new CustomEvent(popStateEvent, {
              detail: { url: globalThis.location.href, state: event.state },
            }),
          );
        }
      } catch (e) {
        reportError(
          new Error(`History listener error: ${e instanceof Error ? e.message : String(e)}`),
          document.body,
        );
      }
    };

    globalThis.addEventListener('popstate', handler);
    return () => globalThis.removeEventListener('popstate', handler);
  },
};

export default historyModule;
