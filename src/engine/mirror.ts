import { shallowRef, type Ref, heap, customRef, toRaw } from './reactivity.ts';
import type { RuntimeContext } from './composition.ts';
import { CLEANUP_FUNCTIONS_KEY } from './consts.ts';

/**
 * Unified Mirror Proxy Cache
 * Caches reactive references to window sub-properties lazily on-demand.
 * Memory allocated = strictly proportional to exact properties tracked by templates.
 */
const mirrorCache = new Map<string, Ref<any>>();
const activeListeners = new Set<string>();

/**
 * Lazily attach specific event listeners only when the DOM tracks a property
 * that mathematically requires them for synchronization.
 */
function attachListenerIfNeeded(prop: string) {
  if (activeListeners.has(prop)) return;

  const update = () => {
    if (mirrorCache.has(prop)) {
      mirrorCache.get(prop)!.value = (globalThis.window as any)[prop];
    }
  };

  switch (prop) {
    case 'innerWidth':
    case 'innerHeight':
    case 'outerWidth':
    case 'outerHeight':
    case 'screenX':
    case 'screenY':
    case 'scrollX':
    case 'scrollY':
    case 'devicePixelRatio':
      window.addEventListener('resize', update, { passive: true });
      window.addEventListener('scroll', update, { passive: true });
      activeListeners.add(prop);
      break;
    
    case 'localStorage':
    case 'sessionStorage':
      window.addEventListener('storage', update);
      activeListeners.add(prop);
      break;
      
    case 'location':
    case 'navigation':
      if ('navigation' in window) {
        (window as any).navigation.addEventListener('currententrychange', update);
      } else {
        window.addEventListener('popstate', update);
        window.addEventListener('hashchange', update);
      }
      activeListeners.add(prop);
      break;
      
    case 'navigator':
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      activeListeners.add(prop);
      break;
      
    case 'matchMedia':
      break;
  }
}

/**
 * Reuses existing mirrorCache + attachListenerIfNeeded pattern.
 * Creates a reactive shallow proxy for any global object (window, navigator, localStorage, etc.)
 */
function createHeapBackedRef<T>(
  target: any,
  prop: string,
  heapKey: string,
  globalSignals: Record<string, unknown>,
  scheduler: RuntimeContext['scheduler']
): Ref<T> {
  if (!heap.has(heapKey)) {
    let initial = undefined;
    try {
      initial = target[prop];
    } catch {
      // Ignore initial read failure
    }
    
    // Dynamic JSON Reader: Recognize JSON strings dynamically
    if (typeof initial === 'string') {
      const trimmed = initial.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          initial = JSON.parse(trimmed);
        } catch {
          // Keep raw string
        }
      }
    }
    heap.set(heapKey, initial);
  }

  return customRef((track, trigger) => ({
    get() {
      track();
      return heap.get(heapKey) as T;
    },
    set(newValue) {
      heap.set(heapKey, newValue);
      
      // Dynamic Coercion Writer: Detect if host API coerces object to string
      try {
        if (newValue && typeof newValue === 'object') {
          // Try raw write first
          Reflect.set(target, prop, newValue);
          
          // Verify if coerced
          const stored = target[prop];
          if (typeof stored === 'string' && (stored === '[object Object]' || stored === '')) {
            // Coerced! Overwrite with JSON-serialized string
            Reflect.set(target, prop, JSON.stringify(toRaw(newValue)));
          }
        } else {
          Reflect.set(target, prop, newValue);
        }
      } catch (e) {
        console.warn(`[Nexus Mirror] Dynamic write failed for ${prop}:`, e);
      }
      
      trigger();
    }
  }));
}

function getObjectMirror(
  target: any,
  name: string,
  globalSignals: Record<string, unknown>,
  scheduler: RuntimeContext['scheduler']
): any {
  const localCache = new Map<string, Ref<any>>();
  const isStorage = name === 'localStorage' || name === 'sessionStorage';
  
  return new Proxy(target, {
    get(t, prop: string | symbol) {
      if (typeof prop === 'string') {
        const heapKey = `${name}.${prop}`;
        if (!localCache.has(prop)) {
          localCache.set(
            prop,
            createHeapBackedRef(t, prop, heapKey, globalSignals, scheduler)
          );
        }
        
        const value = localCache.get(prop)!.value;
        if (typeof value === 'function') {
          return value.bind(t);
        }
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return getObjectMirror(value, `${name}_${String(prop)}`, globalSignals, scheduler);
        }
        return value;
      }
      return Reflect.get(t, prop);
    },
    set(t, prop, value, receiver) {
      if (typeof prop === 'string') {
        const heapKey = `${name}.${prop}`;
        if (!localCache.has(prop)) {
          localCache.set(
            prop,
            createHeapBackedRef(t, prop, heapKey, globalSignals, scheduler)
          );
        }
        localCache.get(prop)!.value = value;
        return true;
      }
      return Reflect.set(t, prop, value, receiver);
    }
  });
}

/**
 * Registry for shared observer instances.
 * Supports both element-based observers (IntersectionObserver, ResizeObserver, MutationObserver)
 * and global observers (PerformanceObserver).
 */
const singletonRegistry = new Map<
  string,
  { observer: any; callbacks: Map<HTMLElement, Set<Function>>; globalCallbacks?: Set<Function> }
>();

/**
 * Check if an observer type is element-based (intersects viewport/resizes/mutates elements).
 */
function isElementBasedObserver(name: string): boolean {
  return ['IntersectionObserver', 'ResizeObserver', 'MutationObserver'].includes(name);
}

/**
 * Manages shared observer instances for multiplexing.
 * Bare invocation routes to singleton registry for sharing across elements.
 * Works with: IntersectionObserver, ResizeObserver, MutationObserver, PerformanceObserver
 */
function registerToSingletonObserver(
  name: 'IntersectionObserver' | 'ResizeObserver' | 'MutationObserver' | 'PerformanceObserver',
  callback: Function,
  scheduler: RuntimeContext['scheduler'],
  element: HTMLElement
): () => void {
  let entry = singletonRegistry.get(name);
  if (!entry) {
    const RealCtor = (globalThis as any)[name];
    const isElementBased = isElementBasedObserver(name);
    const entryCallbacks = new Map<HTMLElement, Set<Function>>();
    let entryGlobalCallbacks: Set<Function> | undefined;
    
    const observer = new RealCtor((entries: any[]) => {
      for (const obsEntry of entries) {
        // Element-based observers have per-target callbacks
        // Global observers (PerformanceObserver) have single callback
        if (isElementBased && obsEntry.target) {
          const cbs = entryCallbacks.get(obsEntry.target as HTMLElement);
          if (cbs) {
            cbs.forEach((cb: Function) => scheduler.enqueueEffect(() => cb(obsEntry)));
          }
        } else {
          // Global observer (PerformanceObserver) - all callbacks receive all entries
          entryGlobalCallbacks?.forEach((cb: Function) => 
            scheduler.enqueueEffect(() => cb(entries))
          );
        }
      }
    });
    entry = { observer, callbacks: entryCallbacks, globalCallbacks: entryGlobalCallbacks };
    singletonRegistry.set(name, entry);
    
    if (!isElementBased) {
      entry.globalCallbacks = new Set();
      // Global observers auto-start observing
      observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
    }
  }

  if (isElementBasedObserver(name)) {
    let cbs = entry.callbacks.get(element);
    if (!cbs) {
      cbs = new Set();
      entry.callbacks.set(element, cbs);
      entry.observer.observe(element);
    }
    cbs.add(callback);

    return () => {
      cbs?.delete(callback);
      if (cbs?.size === 0) {
        entry.callbacks.delete(element);
        entry.observer.unobserve(element);
      }
    };
  } else {
    // Global observer (PerformanceObserver)
    if (!entry.globalCallbacks) {
      entry.globalCallbacks = new Set();
    }
    entry.globalCallbacks.add(callback);

    return () => {
      entry.globalCallbacks?.delete(callback);
      if (entry.globalCallbacks?.size === 0) {
        entry.globalCallbacks = undefined;
      }
    };
  }
}

/**
 * Registry for shared stream instances (WebSocket, BroadcastChannel, Worker)
 */
const streamRegistry = new Map<string, { stream: any; listeners: Set<Function>; ownerCount: number }>();

/**
 * Manages shared WebSocket / BroadcastChannel / Worker instances.
 */
function registerToStreamMultiplexer(name: string, urlOrName: string, callback: Function, scheduler: RuntimeContext['scheduler']): () => void {
  const cacheKey = `${name}:${urlOrName}`;
  let entry = streamRegistry.get(cacheKey);

  if (!entry) {
    const RealCtor = (globalThis as any)[name];
    const stream = new RealCtor(urlOrName);
    const newEntry: { stream: any; listeners: Set<Function>; ownerCount: number } = { 
      stream, 
      listeners: new Set<Function>(), 
      ownerCount: 0 
    };
    entry = newEntry;
    
    stream.onmessage = (msg: any) => {
      entry!.listeners.forEach(cb => scheduler.enqueueEffect(() => cb(msg)));
    };
    streamRegistry.set(cacheKey, entry);
  }

  entry!.listeners.add(callback);
  entry!.ownerCount++;

  return () => {
    entry!.listeners.delete(callback);
    entry!.ownerCount--;
    if (entry!.ownerCount === 0) {
      if (typeof entry!.stream.close === 'function') entry!.stream.close();
      if (typeof entry!.stream.terminate === 'function') entry!.stream.terminate();
      streamRegistry.delete(cacheKey);
    }
  };
}

/**
 * Wires constructor instances into element cleanup lifecycle.
 */
function attachAutoCleanup(instance: any, element: HTMLElement) {
  const disconnect = () => {
    if (typeof instance.disconnect === 'function') {
      instance.disconnect();
    }
  };

  const existing: (() => void)[] = (element as any)[CLEANUP_FUNCTIONS_KEY] || [];
  existing.push(disconnect);
  (element as any)[CLEANUP_FUNCTIONS_KEY] = existing;
}

/**
 * Dynamic mirror generator - the traffic controller routing proxy traps
 * to the appropriate helpers based on invocation pattern (bare vs new).
 */
export function generateDynamicMirror(name: string, target: any, runtime: RuntimeContext, element?: HTMLElement) {
  const { scheduler } = runtime;

  if (typeof target !== 'function') {
    return getObjectMirror(target, name, runtime.globalSignals(), scheduler);
  }

  return new Proxy(target, {
    construct(_ctor, args) {
      const instance = new (target as any)(...args);
      if (element) {
        attachAutoCleanup(instance, element);
      }
      return getObjectMirror(instance, name, runtime.globalSignals(), scheduler);
    },
    apply(_ctor, _thisArg, args) {
      if (name === 'IntersectionObserver' || name === 'ResizeObserver' || 
          name === 'MutationObserver' || name === 'PerformanceObserver') {
        if (element) {
          return registerToSingletonObserver(name, args[0], scheduler, element);
        }
      }
      if (name === 'WebSocket' || name === 'Worker' || name === 'BroadcastChannel') {
        return registerToStreamMultiplexer(name, args[0], args[1], scheduler);
      }
      return Reflect.apply(target, globalThis, args);
    }
  });
}

/**
 * @deprecated Use generateDynamicMirror instead.
 * Kept for backward compatibility during transition.
 */
export const MirrorProxy = typeof window !== 'undefined' ? new Proxy(globalThis.window, {
  get(target, prop) {
    if (typeof prop === 'string') {
      if (!mirrorCache.has(prop)) {
        mirrorCache.set(prop, shallowRef((target as any)[prop]));
        attachListenerIfNeeded(prop);
      }
      
      const v = mirrorCache.get(prop)!.value;
      return typeof v === 'function' ? v.bind(target) : v;
    }
    return Reflect.get(target, prop);
  },
  set(target, prop, value) {
    if (typeof prop === 'string') {
      const success = Reflect.set(target, prop, value);
      if (success && mirrorCache.has(prop)) {
        mirrorCache.get(prop)!.value = value;
      }
      return success;
    }
    return Reflect.set(target, prop, value);
  }
}) : {};