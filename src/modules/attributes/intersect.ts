import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * data-on-intersect="expression"
 * Fires when the element enters or leaves the viewport.
 * Provides $isIntersecting and $ratio extras.
 */
const intersectModule: AttributeModule = {
  name: 'intersect',
  attribute: 'on-intersect',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          runtime.evaluate(el, expression, {
            $evt: entry,
            $isIntersecting: entry.isIntersecting,
            $ratio: entry.intersectionRatio,
            $entry: entry
          });
        });
      });

      observer.observe(el);
      return () => observer.disconnect();
    } catch (e) {
      reportError(new Error(`IntersectionObserver error: ${e}`), el);
    }
  }
};

export default intersectModule;
