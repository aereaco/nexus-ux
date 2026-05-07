import { shallowRef, type Ref } from './reactivity.ts';
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
function getObjectMirror(
  target: any,
  name: string,
  globalSignals: Record<string, unknown>,
  scheduler: RuntimeContext['scheduler']
): any {
  const localCache = new Map<string, Ref<any>>();
  
  return new Proxy(target, {
    get(t, prop: string | symbol) {
      if (typeof prop === 'string') {
        if (!localCache.has(prop)) {
          localCache.set(prop, shallowRef((t as any)[prop]));
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
    set(t, prop, value) {
      const success = Reflect.set(t, prop, value);
      if (success && localCache.has(prop as string)) {
        localCache.get(prop as string)!.value = value;
      }
      return success;
    }
  });
}

/**
 * Registry for shared observer instances (IntersectionObserver, ResizeObserver)
 */
const singletonRegistry = new Map<
  string,
  { observer: any; callbacks: WeakMap<HTMLElement, Set<Function>> }
>();

/**
 * Manages shared IntersectionObserver / ResizeObserver instances.
 * Bare invocation routes to singleton registry for multiplexing.
 */
function registerToSingletonObserver(
  name: 'IntersectionObserver' | 'ResizeObserver',
  callback: Function,
  scheduler: RuntimeContext['scheduler'],
  element: HTMLElement
): () => void {
  let entry = singletonRegistry.get(name);
  if (!entry) {
    const RealCtor = (globalThis as any)[name];
    const observer = new RealCtor((entries: any[]) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const cbs = entry.callbacks?.get(el);
        if (cbs) {
          cbs.forEach((cb: Function) => scheduler.enqueueEffect(() => cb(entry)));
        }
      }
    });
    entry = { observer, callbacks: new WeakMap() };
    singletonRegistry.set(name, entry);
  }

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
      if (name === 'IntersectionObserver' || name === 'ResizeObserver') {
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