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

import { CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, DATA_STACK_KEY, MARKER_KEY } from './consts.ts';

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
  [CLEANUP_FUNCTIONS_KEY]?: Map<string, () => void>;
  [DATA_STACK_KEY]?: Record<string, unknown>[];
  [MARKER_KEY]?: number;
}

/**
 * Value-Pooling Reactive Core implementation.
 * Eliminates GC pressure by reusing effect records and tracker objects.
 */

let effectIdCounter = 0;


/**
 * Creates a reactive effect that is automatically stopped when the associated HTMLElement is removed from the DOM.
 */
export function elementBoundEffect(
  el: HTMLElement,
  effectCallback: () => void,
  options?: ReactiveEffectOptions
): [ReactiveEffectRunner<void>, () => void] {

  // Wrap the callback to catch Suspense Promises thrown by network proxies
  const suspenseWrappedCallback = () => {
    try {
      effectCallback();
    } catch (err) {
      if (err instanceof Promise) {
        // Deep Suspense Proxy tripped. Suspend this specific effect and resume when resolved.
        if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> suspended pending network resolution.`);
        err.finally(() => {
          if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> resumed.`);
          if (runner) runner();
        });
      } else {
        throw err; // Standard error, bubble up
      }
    }
  };

  let runner: ReactiveEffectRunner<void>;
  try {
    runner = effect(suspenseWrappedCallback, options);
  } catch (e) {
    console.error(`[Reactivity Error] effect() failed for <${el.tagName}>:`, e);
    throw e;
  }

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
  };

  if (!enhancedEl[CLEANUP_FUNCTIONS_KEY]) {
    enhancedEl[CLEANUP_FUNCTIONS_KEY] = new Map();
  }
  // Use monotonic counter to avoid key collision after cleanup+re-add cycles.
  const cleanupKey = `effect-${effectIdCounter++}`;
  enhancedEl[CLEANUP_FUNCTIONS_KEY].set(cleanupKey, cleanup);

  return [runner, cleanup];
}
