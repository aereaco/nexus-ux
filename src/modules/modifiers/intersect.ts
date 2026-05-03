import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { CLEANUP_FUNCTIONS_KEY } from '../../engine/consts.ts';
import { attachObserver } from '../../engine/observers.ts';

export const intersectModifier: ModifierModule = {
  name: 'intersect',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    const triggerOnLeave = arg === 'leave';
    const triggerOnce = arg === 'once';

    // Delegate observation to engine's centralized intersection observer
    const observerCleanup = attachObserver('intersection', el, runtime);

    const shouldTrigger = (isIntersecting: boolean) =>
      (!triggerOnLeave && isIntersecting) || (triggerOnLeave && !isIntersecting);

    // Event-wrapper mode: payload is a function
    if (typeof payload === 'function') {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (shouldTrigger(detail.isIntersecting)) {
          if (triggerOnce) cleanup();
          payload(e, detail);
        }
      };

      el.addEventListener('ux-intersection', handler);

      const cleanupFns: (() => void)[] = [() => el.removeEventListener('ux-intersection', handler)];
      if (observerCleanup) cleanupFns.push(observerCleanup);

      return () => cleanupFns.forEach(fn => fn());
    }

    // Pipeline-interceptor mode: returns Promise
    return (evalEl: Element, expr: string, extras?: Record<string, unknown>) => {
      return new Promise((resolve) => {
        const handler = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (shouldTrigger(detail.isIntersecting)) {
            if (triggerOnce) {
              observerCleanup?.();
            } else {
              el.removeEventListener('ux-intersection', handler);
            }
            resolve(runtime.evaluate(evalEl, expr, extras));
          }
        };
        el.addEventListener('ux-intersection', handler);
      });
    };
  }
};

export default intersectModifier;
