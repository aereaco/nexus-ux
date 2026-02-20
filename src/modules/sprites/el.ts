import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $el sprite: returns the current element.
 * Usage: $el.textContent = 'foo'
 */
export function elSprite(_runtime: RuntimeContext) {
  // This is tricky because $el depends on the context of execution (which element).
  // The evaluator handles $el specially by passing it in the scope or extras.
  // So this sprite factory might not be needed if evaluator handles it?
  // BUT! If we want it in the global scope def (globalSignals),
  // it needs to be a function or getter?
  // Actually, $el is context-dependent, so it CANNOT be a global static value.
  // It must be provided by the evaluator's local scope override.

  // However, for consistency, we might export a helper?
  // No, evaluator.ts provides $el in the scope proxy.

  // We'll keep this file for documentation or if we need a global helper function version.
  return null;
}
