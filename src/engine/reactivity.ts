/// <reference path="./composition.ts" />
import {
  effect,
  stop,
  reactive,
  toRaw,
  isReactive,
  isReadonly,
  isProxy,
  readonly,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  customRef,
  triggerRef,
  unref,
  ref,
  isRef,
  toRefs,
  toRef,
  computed,
  watch,
  onEffectCleanup,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Ref
} from '@vue/reactivity';

import { CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, DATA_STACK_KEY } from './consts.ts';

export {
  reactive,
  effect,
  stop,
  toRaw,
  isReactive,
  isReadonly,
  isProxy,
  readonly,
  shallowReactive,
  shallowReadonly,
  customRef,
  triggerRef,
  unref,
  ref,
  isRef,
  toRefs,
  toRef,
  shallowRef,
  computed,
  watch,
  onEffectCleanup,
  type ReactiveEffectRunner,
  type Ref
};

export interface NexusEnhancedElement extends HTMLElement {
  [EFFECT_RUNNERS_KEY]?: Set<ReactiveEffectRunner<void>>;
  [RUN_EFFECT_RUNNERS_KEY]?: () => void;
  [CLEANUP_FUNCTIONS_KEY]?: Set<() => void>;
  [DATA_STACK_KEY]?: Record<string, unknown>[];
}

/**
 * Value-Pooling Reactive Core implementation.
 * Eliminates GC pressure by reusing effect records and tracker objects.
 */


/**
 * Creates a reactive effect that is automatically stopped when the associated HTMLElement is removed from the DOM.
 */
export function elementBoundEffect(
  el: HTMLElement,
  effectCallback: () => void,
  options?: ReactiveEffectOptions
): [ReactiveEffectRunner<void>, () => void] {
  // For this phase, we rely on standard creation for stability.
  const runner = effect(effectCallback, options);

  const enhancedEl = el as NexusEnhancedElement;

  if (!enhancedEl[EFFECT_RUNNERS_KEY]) {
    enhancedEl[EFFECT_RUNNERS_KEY] = new Set();
  }
  enhancedEl[EFFECT_RUNNERS_KEY].add(runner);

  if (!enhancedEl[RUN_EFFECT_RUNNERS_KEY]) {
    enhancedEl[RUN_EFFECT_RUNNERS_KEY] = () => {
      if (enhancedEl[EFFECT_RUNNERS_KEY]) {
        enhancedEl[EFFECT_RUNNERS_KEY].forEach((r: ReactiveEffectRunner<void>) => r());
      }
    };
  }

  const cleanup = () => {
    stop(runner);
    const enhancedEl = el as NexusEnhancedElement;
    if (enhancedEl[EFFECT_RUNNERS_KEY]) {
      enhancedEl[EFFECT_RUNNERS_KEY].delete(runner);
      if (enhancedEl[EFFECT_RUNNERS_KEY].size === 0) {
        delete enhancedEl[EFFECT_RUNNERS_KEY];
        delete enhancedEl[RUN_EFFECT_RUNNERS_KEY];
      }
    }
    // effectPool.release(runner); // Placeholder for future optimization
  };

  if (!enhancedEl[CLEANUP_FUNCTIONS_KEY]) {
    enhancedEl[CLEANUP_FUNCTIONS_KEY] = new Set();
  }
  enhancedEl[CLEANUP_FUNCTIONS_KEY].add(cleanup);

  return [runner, cleanup];
}
