import { ObserverModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

export interface ResizeObserverDetail {
  entry: ResizeObserverEntry;
  element: Element;
  contentRect: DOMRectReadOnly;
}

const resizeObserverModule: ObserverModule = {
  name: 'resizeObserver',
  observerType: 'ResizeObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          context.scheduler.enqueueEffect(() => {
            const event = new CustomEvent(`${CUSTOM_EVENT_PREFIX}resize`, {
              bubbles: true,
              cancelable: false,
              detail: {
                entry,
                element: entry.target,
                contentRect: entry.contentRect
              } as ResizeObserverDetail
            });
            entry.target.dispatchEvent(event);
          });
        }
      });

      observer.observe(el);
      return () => observer.disconnect();

    } catch (e) {
      reportError(new Error(`Failed to init ResizeObserver: ${e instanceof Error ? e.message : String(e)}`), el);
    }
  },
};

export default resizeObserverModule;
