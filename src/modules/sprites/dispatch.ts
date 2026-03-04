import { registerScopeProvider } from '../../engine/scope.ts';

/**
 * $dispatch Scope Provider Sprite
 * 
 * Dispatches a CustomEvent on the current element.
 * Usage: $dispatch('my-event', { value: count })
 * 
 * Previously a dead sprite stub that threw an error because it couldn't
 * access the current element. Now properly implemented as a context-aware
 * scope provider that receives `el` at evaluation time.
 */
registerScopeProvider('$dispatch', (el) => {
  return (eventName: string, detail?: unknown) => {
    if (!(el instanceof Element)) return;
    el.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    }));
  };
});
