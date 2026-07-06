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
 * Tier 1 — Direct property access.
 * Creates a reactive heap-backed ref for any API whose properties are readable/writable
 * via standard property access (window, localStorage, sessionStorage, navigator, etc.).
 *
 * Structural detection: APIs implementing the Storage interface (getItem + setItem)
 * are string-coercing by spec — objects are always JSON-serialized before writing.
 * All other APIs receive the raw value via Reflect.set.
 */
function createHeapBackedRef<T>(
  target: any,
  prop: string,
  heapKey: string,
  globalSignals: Record<string, unknown>,
  scheduler: RuntimeContext['scheduler']
): Ref<T> {
  // Structural: APIs with getItem+setItem follow the Storage interface (string-coercing).
  // No name checks — any API with this shape gets the same serialization treatment.
  const isStringCoercingAPI = typeof target?.getItem === 'function' &&
                               typeof target?.setItem === 'function';

  if (!heap.has(heapKey)) {
    let initial = undefined;
    try {
      initial = isStringCoercingAPI ? target.getItem(prop) : target[prop];
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
      
      try {
        if (isStringCoercingAPI) {
          const strValue = (newValue && typeof newValue === 'object')
            ? JSON.stringify(toRaw(newValue))
            : String(newValue);
          target.setItem(prop, strValue);
        } else {
          if (newValue && typeof newValue === 'object') {
            Reflect.set(target, prop, newValue);
          } else {
            Reflect.set(target, prop, newValue);
          }
        }
      } catch (e) {
        console.warn(`[Nexus Mirror] Dynamic write failed for ${prop}:`, e);
      }
      
      trigger();
    }
  }));
}

// ─── Three-Tier Capability Detection ───────────────────────────────────────────
//
// Protocol is detected once per mirror target by inspecting the structural
// signature of the API object. No name checks are performed anywhere.
//
// Tier 1 — Direct:      standard property access (window, localStorage, navigator…)
// Tier 2 — Async KV:    .get(key)/.set(key, val) async protocol (Map-like APIs)
// Tier 3 — DB Factory:  .open()/.deleteDatabase() factory protocol (IDBFactory-like APIs)

/** Cached IDB connections keyed by factory instance (WeakMap avoids leaks). */
const idbConnectionCache = new WeakMap<object, Promise<IDBDatabase>>();

/**
 * Detects the access protocol of a mirror target from its structural signature.
 * Purely capability-based — no API name checks.
 */
function detectAccessProtocol(target: any): 'direct' | 'async-kv' | 'db-factory' {
  // Tier 3: has open() + deleteDatabase() — structural IDBFactory-like signature
  if (typeof target?.open === 'function' && typeof target?.deleteDatabase === 'function') {
    return 'db-factory';
  }
  // Tier 2: has get() + set() but NOT getItem (which marks synchronous Storage — Tier 1)
  if (typeof target?.get === 'function' && typeof target?.set === 'function' &&
      typeof target?.getItem !== 'function') {
    return 'async-kv';
  }
  // Tier 1: direct property access
  return 'direct';
}

/**
 * Opens (or reuses) a factory connection and ensures the 'kv' object store exists.
 * The database is named by location.origin (environment-derived, zero hardcoding).
 * All mirrors sharing the same factory instance share one connection.
 */
function openFactoryConnection(factory: object): Promise<IDBDatabase> {
  const cached = idbConnectionCache.get(factory);
  if (cached) return cached;

  const dbName = typeof location !== 'undefined' ? location.origin : 'nexus-ux';
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = (factory as any).open(dbName, 1);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = (e: any) => {
      idbConnectionCache.delete(factory); // allow retry on failure
      reject(e.target.error);
    };
  });

  idbConnectionCache.set(factory, promise);
  return promise;
}

/**
 * Tier 3 — Database factory ref.
 * Heap is the source of truth; IDB is the persistence backend.
 * Writes update the heap synchronously (UI never waits), then persist to IDB async.
 * The kvKey is namespaced as `mirrorName:prop` so all factory mirrors coexist
 * in a single 'kv' object store without version collisions.
 */
function createDBFactoryRef<T>(
  factory: object,
  mirrorName: string,
  prop: string,
  heapKey: string,
  scheduler: RuntimeContext['scheduler']
): Ref<T> {
  const kvKey = `${mirrorName}:${prop}`;
  if (!heap.has(heapKey)) heap.set(heapKey, undefined);

  let _trigger: (() => void) | null = null;

  // Async hydration: fire-and-forget read, triggers reactive update on resolve
  openFactoryConnection(factory)
    .then(db => new Promise<any>((resolve, reject) => {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(kvKey);
      req.onsuccess = (e: any) => resolve(e.target.result);
      req.onerror = (e: any) => reject(e.target.error);
    }))
    .then(value => {
      if (heap.get(heapKey) === undefined) {
        heap.set(heapKey, value !== undefined ? value : null);
        _trigger?.();
      }
    })
    .catch(e => console.warn(`[Nexus Mirror] DB factory read failed for ${kvKey}:`, e));

  return customRef<T>((track, trigger) => {
    _trigger = trigger; // captured synchronously before any async resolves
    return {
      get() { track(); return heap.get(heapKey) as T; },
      set(newValue) {
        heap.set(heapKey, newValue);
        // Async write — heap is already updated, UI reactive immediately
        openFactoryConnection(factory)
          .then(db => new Promise<void>((resolve, reject) => {
            const req = db.transaction('kv', 'readwrite').objectStore('kv').put(toRaw(newValue), kvKey);
            req.onsuccess = () => resolve();
            req.onerror = (e: any) => reject(e.target.error);
          }))
          .catch(e => console.warn(`[Nexus Mirror] DB factory write failed for ${kvKey}:`, e));
        trigger();
      }
    };
  });
}

/**
 * Tier 2 — Async key-value ref.
 * For APIs exposing .get(key)/.set(key, value) (Map-like, Cache-like, custom async stores).
 * Same heap-first pattern: writes are synchronous to heap, async to the backing store.
 */
function createAsyncKVRef<T>(
  target: any,
  prop: string,
  heapKey: string,
  scheduler: RuntimeContext['scheduler']
): Ref<T> {
  if (!heap.has(heapKey)) heap.set(heapKey, undefined);

  let _trigger: (() => void) | null = null;

  Promise.resolve(target.get(prop))
    .then(value => {
      if (heap.get(heapKey) === undefined) {
        heap.set(heapKey, value !== undefined ? value : null);
        _trigger?.();
      }
    })
    .catch(e => console.warn(`[Nexus Mirror] Async KV read failed for ${prop}:`, e));

  return customRef<T>((track, trigger) => {
    _trigger = trigger;
    return {
      get() { track(); return heap.get(heapKey) as T; },
      set(newValue) {
        heap.set(heapKey, newValue);
        Promise.resolve(target.set(prop, toRaw(newValue)))
          .catch(e => console.warn(`[Nexus Mirror] Async KV write failed for ${prop}:`, e));
        trigger();
      }
    };
  });
}

function getObjectMirror(
  target: any,
  name: string,
  globalSignals: Record<string, unknown>,
  scheduler: RuntimeContext['scheduler']
): any {
  const localCache = new Map<string, Ref<any>>();
  const protocol = detectAccessProtocol(target);

  function getOrCreateRef(prop: string): Ref<any> {
    if (localCache.has(prop)) return localCache.get(prop)!;
    const heapKey = `${name}.${prop}`;
    let ref: Ref<any>;
    switch (protocol) {
      case 'db-factory':
        ref = createDBFactoryRef(target, name, prop, heapKey, scheduler);
        break;
      case 'async-kv':
        ref = createAsyncKVRef(target, prop, heapKey, scheduler);
        break;
      default:
        ref = createHeapBackedRef(target, prop, heapKey, globalSignals, scheduler);
    }
    localCache.set(prop, ref);
    return ref;
  }

  return new Proxy(target, {
    get(t, prop: string | symbol) {
      if (typeof prop === 'string') {
        const value = getOrCreateRef(prop).value;
        if (typeof value === 'function') return value.bind(t);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return getObjectMirror(value, `${name}_${prop}`, globalSignals, scheduler);
        }
        return value;
      }
      return Reflect.get(t, prop);
    },
    set(_t, prop, value, _receiver) {
      if (typeof prop === 'string') {
        getOrCreateRef(prop).value = value;
        return true;
      }
      return Reflect.set(_t, prop, value, _receiver);
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

  const enhanced = element as any;
  if (!enhanced[CLEANUP_FUNCTIONS_KEY]) {
    enhanced[CLEANUP_FUNCTIONS_KEY] = new Map();
  }
  const cleanupMap = enhanced[CLEANUP_FUNCTIONS_KEY];
  if (cleanupMap instanceof Map) {
    const key = `disconnect-${Math.random().toString(36).slice(2)}`;
    cleanupMap.set(key, disconnect);
  } else if (Array.isArray(cleanupMap)) {
    cleanupMap.push(disconnect);
  }
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