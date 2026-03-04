import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { morphDOM } from '../../engine/morph.ts';
import { resolveSelector } from '../sprites/selector.ts';

export const morphModifier: ModifierModule = {
  name: 'morph',
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    // The morphing assignment is mathematically managed by interceptPipeline natively.
    return payload; 
  },
  interceptPipeline: (evaluate, element, arg, runtime) => {
    // Wrap the core evaluator explicitly
    return (evalEl, expression, extras) => {
      const result = evaluate(evalEl, expression, extras);
      
      const applyMorph = (htmlString: string) => {
        const target = arg ? resolveSelector(element, arg) : element;
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
