import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { morphDOM } from '../../engine/morph.ts';

export const morphModifier: ModifierModule = {
  name: 'morph',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    // If wrapping an event handler payload
    if (typeof payload === 'function') {
      return async (...args: any[]) => {
        const result = await payload(...args);
        if (typeof result === 'string') {
          const target = arg ? (runtime as any).$(arg) : el;
          if (target) morphDOM(target, result);
        }
        return result;
      };
    }
    return payload; // Pass down the pipeline
  },
  interceptPipeline: (evaluate, element, arg, runtime) => {
    // Wrap the core evaluator explicitly
    return (evalEl, expression, extras) => {
      const result = evaluate(evalEl, expression, extras);
      
      const applyMorph = (htmlString: string) => {
        const target = arg ? (runtime as any).$(arg) : element;
        if (target) morphDOM(target, htmlString);
      };

      if (result instanceof Promise) {
        return result.then((res) => {
          if (typeof res === 'string') applyMorph(res);
          return res;
        });
      } else if (typeof result === 'string') {
        applyMorph(result);
      }
      return result;
    };
  }
};

export default morphModifier;
