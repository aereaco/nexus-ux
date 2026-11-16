import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';

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

    // ZCZS: Pre-allocate static extras object to eliminate GC pressure in hot animation frame loop
    const extras = { $time: 0, $delta: 0 };

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      extras.$time = time;
      extras.$delta = delta;

      try {
        runtime.evaluate(el, expression, extras);
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
