import { ObserverModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

export interface IntersectionObserverDetail {
  entry: IntersectionObserverEntry;
  element: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
}

const intersectionObserverModule: ObserverModule = {
  name: 'intersectionObserver',
  observerType: 'IntersectionObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          context.scheduler.enqueueEffect(() => {
            const event = new CustomEvent(`${CUSTOM_EVENT_PREFIX}intersection`, {
              bubbles: true,
              cancelable: false,
              detail: {
                entry,
                element: entry.target,
                isIntersecting: entry.isIntersecting,
                intersectionRatio: entry.intersectionRatio
              } as IntersectionObserverDetail
            });
            entry.target.dispatchEvent(event);
          });
        }
      });

      // We observe the root element?
      // Typically IntersectionObserver needs to observe specific elements.
      // Does this module observe EVERYTHING?
      // No, 2025 observe(el) observes 'el'.
      // But 'el' is passed from initializeModules(root).
      // If we observe 'root', we only get intersection for 'root'.
      // IntersectionObserver usually observes *children* relative to root/viewport.
      // If we want to support lazy loading generic elements, we need to observe them specifically.
      // But this module seems to just enable the observer on the root?
      // Wait, 2025 `observer.observe(el)` called on root means checking if root intersects viewport.

      // If we want `on-intersection` on any element, we need a directive for it?
      // `onIntersect.ts` (Phase 2/5) likely handles specific element observation.
      // This module might be for global intersection handling or just exposed API.
      // 2025 `intersection.ts` exports `intersectionObserverModule`.
      // It's an `ObserverModule`.

      observer.observe(el);
      return () => observer.disconnect();

    } catch (_e) {
      reportError(new Error(`Failed to init IntersectionObserver`), el);
    }
  },
};

export default intersectionObserverModule;
