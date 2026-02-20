import { RuntimeContext } from '../../engine/composition.ts';

export function watchSprite(runtime: RuntimeContext) {
  return (expressionOrFn: (() => unknown) | unknown, callback: (val: unknown, oldVal?: unknown) => void) => {
    // Since we are in an expression, 'expressionOrFn' is already evaluated?
    // Usage: $watch(source, callback)
    // If source is a reactive object/ref, we watch it.
    // If it's a value, we can't watch it unless passed as a lambda.

    // Spec usually: $watch('prop', val => ...) or pass a signal.

    if (typeof expressionOrFn === 'function') {
      // It's a getter?
      return runtime.watch(expressionOrFn, callback);
    } else {
      // It's a reactive object?
      return runtime.watch(() => expressionOrFn, callback);
    }
  };
}
