import { shallowRef, type Ref } from './reactivity.ts';

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
      window.addEventListener('popstate', update);
      window.addEventListener('hashchange', update);
      activeListeners.add(prop);
      break;
      
    case 'navigator':
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      activeListeners.add(prop);
      break;
      
    case 'matchMedia':
      // The matchMedia object is a function, not a mutable primitive,
      // but if an observer wants it... handled statically below.
      break;
  }
}

/**
 * Unified Mirror Proxy
 * Replaces 12 bloated 'mirror' modules into a single ZCZS 50-line JIT proxy.
 */
export const MirrorProxy = typeof window !== 'undefined' ? new Proxy(globalThis.window, {
  get(target, prop) {
    if (typeof prop === 'string') {
      // 1. If primitive/state property, cache in reactivity ref
      if (!mirrorCache.has(prop)) {
        mirrorCache.set(prop, shallowRef((target as any)[prop]));
        attachListenerIfNeeded(prop);
      }
      
      const v = mirrorCache.get(prop)!.value;
      // 2. Prevent illegal binding loss for native functions (like matchMedia)
      return typeof v === 'function' ? v.bind(target) : v;
    }
    return Reflect.get(target, prop);
  },
  set(target, prop, value) {
    if (typeof prop === 'string') {
      // Allow two-way bind back to genuine window object
      const success = Reflect.set(target, prop, value);
      if (success && mirrorCache.has(prop)) {
         mirrorCache.get(prop)!.value = value;
      }
      return success;
    }
    return Reflect.set(target, prop, value);
  }
}) : {};
