import { ObserverModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

export interface PerformanceObserverDetail {
  entry: PerformanceEntry;
  elementType: string;
  elementId: string;
}

const performanceObserverModule: ObserverModule = {
  name: 'performanceObserver',
  observerType: 'PerformanceObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      if (typeof PerformanceObserver === 'undefined') {
        // reportError(new Error('PerformanceObserver not available'), el);
        // Optional, maybe just return.
        return;
      }

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          context.scheduler.enqueueEffect(() => {
            const event = new CustomEvent(`${CUSTOM_EVENT_PREFIX}performance-entry`, {
              bubbles: true,
              cancelable: false,
              detail: {
                entry,
                elementType: el.tagName,
                elementId: el.id
              } as PerformanceObserverDetail
            });
            el.dispatchEvent(event);
          });
        });
      });

      // Observe all supported types
      // Type 'string[]' is not assignable to type 'readonly string[]' or vice versa?
      // PerformanceObserver.supportedEntryTypes is readonly string[].
      // observe expects string[].

      const entryTypes = PerformanceObserver.supportedEntryTypes ? Array.from(PerformanceObserver.supportedEntryTypes) : ['mark', 'measure'];
      observer.observe({ entryTypes });

      return () => observer.disconnect();

    } catch (e) {
      reportError(new Error(`Failed to init PerformanceObserver: ${e instanceof Error ? e.message : String(e)}`), el);
    }
  },
};

export default performanceObserverModule;
