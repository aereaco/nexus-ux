import { ModifierModule } from '../../engine/modules.ts';
import { NexusEnhancedElement } from '../../engine/reactivity.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { CLEANUP_FUNCTIONS_KEY } from '../../engine/consts.ts';

export const intersectModifier: ModifierModule = {
  name: 'intersect',
  handle: (payload: any, el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const triggerOnLeave = arg === 'leave';
    const triggerOnce = arg === 'once';

    // 1. Event Handler Synthesis (If stacked on an event listener)
    if (typeof payload === 'function') {
      return (...args: any[]) => {
        const hashKey = `__intersect_evt_${Date.now()}_${Math.random()}`;
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if ((!triggerOnLeave && entry.isIntersecting) || (triggerOnLeave && !entry.isIntersecting)) {
              if (triggerOnce) {
                observer.disconnect();
                const removals = (el as NexusEnhancedElement)[CLEANUP_FUNCTIONS_KEY];
                if (removals) removals.delete(hashKey);
              }
              payload(...args, entry);
            }
          });
        });
        observer.observe(el);

        const enhancedEl = el as NexusEnhancedElement;
        let removals = enhancedEl[CLEANUP_FUNCTIONS_KEY];
        if (!removals) {
          removals = new Map();
          enhancedEl[CLEANUP_FUNCTIONS_KEY] = removals;
        }
        removals.set(hashKey, () => observer.disconnect());
      };
    }
    return payload;
  },
  interceptPipeline: (evaluate, el, arg, _runtime) => {
    const triggerOnLeave = arg === 'leave';
    const triggerOnce = arg === 'once';

    // 2. Universal Pipeline Interceptor
    // Defers the actual pipeline evaluation execution until visibility is achieved!
    return (evalEl, expr, extras) => {
      const hashKey = `__intersect_pipe_${Date.now()}_${Math.random()}`;
      return new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if ((!triggerOnLeave && entry.isIntersecting) || (triggerOnLeave && !entry.isIntersecting)) {
              if (triggerOnce) {
                observer.disconnect();
                const removals = (el as NexusEnhancedElement)[CLEANUP_FUNCTIONS_KEY];
                if (removals) removals.delete(hashKey);
              } else {
                observer.unobserve(el); // Fire once per evaluation demand
              }
              
              // Proceed with standard evaluation now that it is visible
              resolve(evaluate(evalEl, expr, extras));
            }
          });
        });
        observer.observe(el);

        const enhancedEl = el as NexusEnhancedElement;
        let removals = enhancedEl[CLEANUP_FUNCTIONS_KEY];
        if (!removals) {
          removals = new Map();
          enhancedEl[CLEANUP_FUNCTIONS_KEY] = removals;
        }
        removals.set(hashKey, () => observer.disconnect());
      });
    };
  }
};

export default intersectModifier;
