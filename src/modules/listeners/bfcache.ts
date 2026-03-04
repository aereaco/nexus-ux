import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * bfcache Listener
 * 
 * Listens for Back/Forward Cache (bfcache) transitions using the
 * `pageshow` and `pagehide` events. Dispatches custom events when
 * the page is restored from bfcache, enabling reactive updates
 * for stale data.
 * 
 * When a page is restored from bfcache, data may be stale. This
 * listener dispatches a 'bfcache:restore' event so that other listeners
 * and directives can refresh their state.
 */
const bfcacheListener: ListenerModule = {
  name: 'bfcache',
  event: 'pageshow',

  listen(element: HTMLElement, runtime: RuntimeContext): (() => void) | void {
    if (typeof globalThis.window === 'undefined') return;

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        if (runtime.isDevMode) {
          runtime.debug('[bfcache] Page restored from bfcache, dispatching bfcache:restore');
        }
        element.dispatchEvent(new CustomEvent('bfcache:restore', {
          bubbles: true,
          detail: {
            timestamp: Date.now(),
            persisted: true
          }
        }));
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (runtime.isDevMode) {
        runtime.debug(`[bfcache] pagehide - persisted: ${event.persisted}`);
      }
      element.dispatchEvent(new CustomEvent('bfcache:freeze', {
        bubbles: true,
        detail: {
          timestamp: Date.now(),
          persisted: event.persisted
        }
      }));
    };

    // Also handle the newer `freeze` and `resume` events where supported
    const handleFreeze = () => {
      if (runtime.isDevMode) {
        runtime.debug('[bfcache] Page frozen');
      }
      element.dispatchEvent(new CustomEvent('bfcache:freeze', {
        bubbles: true,
        detail: { timestamp: Date.now() }
      }));
    };

    const handleResume = () => {
      if (runtime.isDevMode) {
        runtime.debug('[bfcache] Page resumed from freeze');
      }
      element.dispatchEvent(new CustomEvent('bfcache:restore', {
        bubbles: true,
        detail: { timestamp: Date.now(), fromFreeze: true }
      }));
    };

    globalThis.addEventListener('pageshow', handlePageShow);
    globalThis.addEventListener('pagehide', handlePageHide);
    
    // freeze/resume are newer APIs, add only if supported
    if ('onfreeze' in document) {
      document.addEventListener('freeze', handleFreeze);
      document.addEventListener('resume', handleResume);
    }

    // Return cleanup function
    return () => {
      globalThis.removeEventListener('pageshow', handlePageShow);
      globalThis.removeEventListener('pagehide', handlePageHide);
      if ('onfreeze' in document) {
        document.removeEventListener('freeze', handleFreeze);
        document.removeEventListener('resume', handleResume);
      }
    };
  }
};

export default bfcacheListener;
