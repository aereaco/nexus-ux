import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * Universal :drag Modifier.
 * Injects delta ($dx, $dy) and absolute ($x, $y) pointer coordinates into the evaluation scope.
 * Automatically handles pointer capture for robust off-element tracking.
 */
export const dragModifier: ModifierModule = {
  name: 'drag',
  handle: (_payload: any, _element: HTMLElement, _argument: string, _runtime: RuntimeContext) => {
     // No-op for direct handle call
  },

  interceptPipeline: (evaluate: RuntimeContext['evaluate'], element: HTMLElement, _argument: string, _runtime: RuntimeContext) => {
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    return (el, expression, extras) => {
      // Injects $drag helper into the evaluation scope
      return evaluate(el, expression, {
        ...extras,
        $drag: {
           start: (e: PointerEvent) => {
             element.setPointerCapture(e.pointerId);
             startX = e.clientX;
             startY = e.clientY;
             isDragging = true;
           },
           move: (e: PointerEvent) => {
             if (!isDragging) return null;
             return {
                dx: e.clientX - startX,
                dy: e.clientY - startY,
                x: e.clientX,
                y: e.clientY
             };
           },
           stop: (e: PointerEvent) => {
             isDragging = false;
             element.releasePointerCapture(e.pointerId);
           }
        }
      });
    };
  }
};

export default dragModifier;
