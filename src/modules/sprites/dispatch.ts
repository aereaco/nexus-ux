import { RuntimeContext } from '../../engine/composition.ts';

export function dispatchSprite(_runtime: RuntimeContext) {
  return (_name: string, _detail?: unknown) => {
    // We need the current element to dispatch from.
    // If this function is called from an expression, how do we get 'el'?
    // The evaluator could bind 'this' to 'el'?
    // Or we pass 'el' as first arg? usage: $dispatch('event')
    // Standard in Alpine/others: $dispatch('event', detail).
    // It uses the current element context.

    // Problem: 'this' binding in Proxy/with block.
    // Evaluator should bind sprites to el?

    throw new Error('$dispatch must be implemented via evaluator context to access current element');
  };
}

// Actually, $dispatch is usually provided by the `localActions` or `localSignals` 
// which has access to `el`.
// We will implement `dispatch` as a local action generator.
// But here we are defining GLOBAL sprites.
// So this file might just export the logic.

export const createDispatch = (el: HTMLElement) => (name: string, detail?: unknown) => {
  el.dispatchEvent(new CustomEvent(name, {
    bubbles: true,
    cancelable: true,
    detail
  }));
};
