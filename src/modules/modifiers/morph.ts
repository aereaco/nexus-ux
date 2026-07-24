/**
 * Nexus-UX Morph Modifier
 *
 * Pipeline modifier that automatically morphs the target element with the
 * result of an expression evaluation. When the expression returns a string,
 * it is treated as HTML and morphed into the target element.
 *
 * Argument Syntax:
 *   - `:morph` — morph the bound element itself
 *   - `:morph-selector` — morph the element matching the selector
 *
 * ZCZS Guarantees:
 *   - Zero-copy: HTML string is passed directly to morphDOM; no parsing.
 *   - Zero-serialization: Promise results are handled by reference.
 *
 * Coordination:
 *   - reconciler.ts provides morphDOM for DOM updates
 *   - sprites/selector.ts provides resolveSelector for target resolution
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - interceptPipeline for evaluation wrapping
 *   - Promise-aware morphing for async expressions
 *   - Selector-based target resolution
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { morphDOM } from '../../engine/reconciler.ts';
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
        const realTarget = Array.isArray(target) ? target[0] : target;
        if (realTarget) morphDOM(realTarget as Element, htmlString);
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
