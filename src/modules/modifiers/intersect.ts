import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const intersectModifier: ModifierModule = {
  name: 'intersect',
  handle: (payload: any, el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const triggerOnLeave = arg === 'leave';
    const triggerOnce = arg === 'once';

    // 1. Event Handler Synthesis (If stacked on an event listener)
    if (typeof payload === 'function') {
      return (...args: any[]) => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if ((!triggerOnLeave && entry.isIntersecting) || (triggerOnLeave && !entry.isIntersecting)) {
              if (triggerOnce) observer.disconnect();
              payload(...args, entry);
            }
          });
        });
        observer.observe(el);
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
      return new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if ((!triggerOnLeave && entry.isIntersecting) || (triggerOnLeave && !entry.isIntersecting)) {
              if (triggerOnce) observer.disconnect();
              else observer.unobserve(el); // Fire once per evaluation demand
              
              // Proceed with standard evaluation now that it is visible
              resolve(evaluate(evalEl, expr, extras));
            }
          });
        });
        observer.observe(el);
      });
    };
  }
};

export default intersectModifier;
