/**
 * Nexus-UX Browser API Mirror System
 *
 * Generates reactive wrappers for native browser APIs on demand. When an
 * expression references `_fetch()`, `_clipboard`, or any other `_`-prefixed
 * identifier, this module creates a reactive Proxy that mirrors the native
 * API and auto-tracks property changes.
 *
 * Mirror Cache:
 *   Generated mirrors are cached in mirrorCache by property name. Memory
 *   allocation is strictly proportional to the exact properties tracked by
 *   templates -- no eager mirroring.
 *
 * Layout-Metric Coalescing:
 *   Properties like innerWidth, scrollY, and devicePixelRatio are coalesced
 *   to one update per animation frame to prevent reflow feedback loops from
 *   causing synchronous re-renders.
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Mirrors wrap native objects by reference via Proxy.
 *   - Zero-serialization: Reactive refs track native values directly.
 *
 * Coordination:
 *   - evaluator.ts resolves `_` prefixed identifiers through this module.
 *   - scope.ts registers mirror providers into the runtime context.
 *   - ModuleCoordinator.registerMirrorModule() auto-injects mirrors.
 *
 * Nexus-UX Innovations Preserved:
 *   - Dynamic mirror generation for any browser API (not pre-defined list)
 *   - Reactive tracking of native property mutations
 *   - Layout-metric coalescing for reflow stability
 */

import { type Ref, heap, customRef, toRaw, triggerRef } from './reactivity.ts';
import type { RuntimeContext } from './composition.ts';
import { CLEANUP_FUNCTIONS_KEY } from './consts.ts';

const activeListeners = new Set<string>();
const globalRefRegistry = new Set<Ref<any>>();

/**
 * Layout-metric props that can oscillate during reflow (e.g. a scrollbar
 * toggling on fractional DPR changes `innerWidth` by a real pixel). Their
 * `update` is coalesced to one per animation frame so a burst of resize/scroll
 * pulses from a reflow feedback loop cannot synchronously re-render every frame.
 */
const LAYOUT_METRIC_PROPS = new Set([
  'innerWidth',
  'innerHeight',
  'outerWidth',
  'outerHeight',
  'screenX',
  'screenY',
  'scrollX',
  'scrollY',
  'devicePixelRatio'
]);

const rafDirtyProps = new Set<string>();
let rafScheduled = false;

function flushLayoutMetrics() {
  rafScheduled = false;
  rafDirtyProps.clear();
  globalRefRegistry.forEach(ref => triggerRef(ref));
}

/**
 * Lazily attach specific event listeners only when the DOM tracks a property
 * that mathematically requires them for synchronization.
 */
function attachListenerIfNeeded(prop: string) {
  if (activeListeners.has(prop)) return;

  const update = () => {
    globalRefRegistry.forEach(ref => triggerRef(ref));
  };

  const updateCoalesced = () => {
    rafDirtyProps.add(prop);
    if (rafScheduled) return;
    rafScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(flushLayoutMetrics);
    } else {
      queueMicrotask(flushLayoutMetrics);
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
      window.addEventListener('resize', LAYOUT_METRIC_PROPS.has(prop) ? updateCoalesced : update, { passive: true });
      window.addEventListener('scroll', LAYOUT_METRIC_PROPS.has(prop) ? updateCoalesced : update, { passive: true });
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
        (window as any).addEventListener('popstate', update);
        (window as any).addEventListener('hashchange', update);
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
 * Category 1 & 2 — Direct Property and Key-Value Storage reactive ref.
 *
 * Category 1 (Direct Property / Method): Uses Reflect.get/Reflect.set for all
 *   direct property APIs (window, navigator, location, screen, history, etc.)
 * Category 2 (Key-Value Storage): Uses getItem/setItem for W3C Storage APIs
 *   (localStorage, sessionStorage) — Reflect.get cannot access storage keys.
 *
 * The customRef getter calls track() to register the active DOM effect as a
 * reactive subscriber in the Mutation Ownership Tracking engine.
 * The customRef setter calls trigger() to notify all subscribers on mutation.
 */
function createHeapBackedRef<T>(
  target: any,
  prop: string,
  _heapKey: string,
  _globalSignals: Record<string, unknown>,
  _scheduler: RuntimeContext['scheduler']
): Ref<T> {
  const isKVStorage = typeof target?.getItem === 'function'; // Category 2 detection

  return customRef<T>((track, trigger) => ({
    get() {
      track(); // Registers active DOM effect as subscriber in ownership tracker
      const raw = isKVStorage
        ? target.getItem(prop)               // Category 2: W3C Storage spec read
        : Reflect.get(target, prop, target); // Category 1: native property/getter read
      return (raw ?? undefined) as T;
    },
    set(newValue: any) {
      if (isKVStorage) {
        target.setItem(prop, String(newValue)); // Category 2: W3C Storage spec write
      } else {
        Reflect.set(target, prop, newValue, target); // Category 1: native property write
      }
      trigger(); // Notifies all subscribed DOM effects to re-evaluate
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
    globalRefRegistry.add(ref);
    attachListenerIfNeeded(name);
    attachListenerIfNeeded(prop);
    return ref;
  }

  return new Proxy(target, {
    get(t, prop: string | symbol, receiver) {
      if (typeof prop === 'string') {
        // Use Reflect.get to detect Category 3 — native Methods & Functions
        // (setItem, removeItem, clear, pushState, back, getRandomValues, etc.)
        const native = Reflect.get(t, prop, receiver);

        if (typeof native === 'function') {
          // Category 3: wrap method execution to fan-out triggerRef to ALL
          // cached refs in the ownership tracker after any mutation completes.
          return (...args: any[]) => {
            const result = Reflect.apply(native, t, args);
            localCache.forEach(r => triggerRef(r));
            return result;
          };
        }

        // Category 1 & 2 — Properties: reactive read via customRef.
        // getOrCreateRef().value calls track() inside customRef getter,
        // registering the active DOM effect in the ownership tracker.
        return getOrCreateRef(prop).value;
      }
      return Reflect.get(t, prop, receiver);
    },

    set(_t, prop: string | symbol, value, _receiver) {
      if (typeof prop === 'string') {
        // Write through the customRef setter:
        // Category 2 → target.setItem(prop, String(value)) + trigger()
        // Category 1 → Reflect.set(target, prop, value) + trigger()
        // Both paths notify all subscribed DOM effects in the ownership tracker.
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
