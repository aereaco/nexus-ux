import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * Universal :zoom Modifier.
 * Injects $zoom delta and origin into the evaluation scope for wheel/pinch events.
 */
export const zoomModifier: ModifierModule = {
  name: 'zoom',
  handle: (_payload: any, _element: HTMLElement, _argument: string, _runtime: RuntimeContext) => {},

  interceptPipeline: (evaluate: RuntimeContext['evaluate'], _element: HTMLElement, _argument: string, _runtime: RuntimeContext) => {
    return (el, expression, extras) => {
      return evaluate(el, expression, {
        ...extras,
        $zoom: (e: WheelEvent | TouchEvent) => {
          if (e instanceof WheelEvent) {
             const delta = e.deltaY;
             return {
               delta: delta > 0 ? 0.9 : 1.1,
               x: e.clientX,
               y: e.clientY
             };
          }
          // Pinch-to-zoom logic can be expanded here
          return { delta: 1, x: 0, y: 0 };
        }
      });
    };
  }
};

export default zoomModifier;
