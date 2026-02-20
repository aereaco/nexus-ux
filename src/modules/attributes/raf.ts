import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * data-on-raf="expression"
 * Fires on every RequestAnimationFrame.
 * Provides $time and $delta extras.
 */
const rafModule: AttributeModule = {
  name: 'raf',
  attribute: 'on-raf',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let frame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      try {
        runtime.evaluate(el, expression, {
          $time: time,
          $delta: delta
        });
      } catch (e) {
        reportError(new Error(`RAF error: ${e}`), el);
        return; // Stop on error?
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }
};

export default rafModule;
