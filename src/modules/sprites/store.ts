import { RuntimeContext } from '../../engine/composition.ts';

// Global store instance (could be part of runtime context, but singleton for now)
const _globalStore: Record<string, unknown> = {};

export function storeSprite(runtime: RuntimeContext) {
  // If not reactive yet, make it reactive?
  // Or return a proxy to it?
  // Usually $store is a global reactive object.

  // We reuse the globalSignals logic or separate store?
  const ctx = runtime as RuntimeContext & { __store?: Record<string, unknown> };
  if (!ctx.__store) {
    // Basic reactive store concept
    // In Vue/reactive implementations, we'd make this object reactive
    ctx.__store = runtime.reactive ? runtime.reactive(_globalStore) : _globalStore;
  }
  return ctx.__store;
}

export default function(runtime: RuntimeContext) {
  return {
    $store: storeSprite(runtime)
  };
}
