import { customRef, Ref, shallowRef as _shallowRef } from '../../engine/reactivity.ts';

// Cache of reactive refs for keys
const keyRefs: Map<string, Ref<unknown>> = new Map();

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

// Helper to get raw value
const getValue = (key: string) => {
  const storage = (globalThis as any).localStorage;
  if (typeof storage === 'undefined' || storage === null) {
    return null;
  }
  try {
    const val = storage.getItem(key);
    
    // Safety: Handle string "null" which can happen if someone does localStorage.setItem(k, JSON.stringify(null))
    if (val === 'null') {
      if (isDebug()) console.debug(`[localStorageMirror] STORAGE GET: '${key}' received string "null", treating as null`);
      return null;
    }

    if (isDebug()) {
      console.debug(`[localStorageMirror] STORAGE GET: '${key}' -> ${val === null ? 'null' : (typeof val === 'string' ? '"' + val.substring(0, 50) + '"' : val)}`);
    }
    return val;
  } catch (e) {
    if (isDebug()) console.error(`[localStorageMirror] STORAGE GET Error for '${key}':`, e);
    return null;
  }
};

const localStorageMirrorTarget = {
  getItem: (key: string) => getValue(key),
  setItem: (key: string, value: string) => {
    const storage = (globalThis as any).localStorage;
    if (isDebug()) console.debug(`[localStorageMirror] STORAGE SET: '${key}' = ${value}`);
    if (storage) {
      try {
        storage.setItem(key, value);
      } catch (e) {
        if (isDebug()) console.error(`[localStorageMirror] STORAGE SET Error for '${key}':`, e);
      }
    }
    const r = keyRefs.get(key);
    if (r) r.value = value;
  },
  removeItem: (key: string) => {
    const storage = (globalThis as any).localStorage;
    if (isDebug()) console.debug(`[localStorageMirror] STORAGE REMOVE: '${key}'`);
    if (storage) {
      try {
        storage.removeItem(key);
      } catch (e) {
        if (isDebug()) console.error(`[localStorageMirror] STORAGE REMOVE Error for '${key}':`, e);
      }
    }
    const r = keyRefs.get(key);
    if (r) r.value = null;
  },
  clear: () => {
    const storage = (globalThis as any).localStorage;
    if (isDebug()) console.debug(`[localStorageMirror] STORAGE CLEAR`);
    if (storage) {
      try {
        storage.clear();
      } catch (e) {
        if (isDebug()) console.error(`[localStorageMirror] STORAGE CLEAR Error:`, e);
      }
    }
    keyRefs.forEach(r => r.value = null);
  }
};

// Create a reactive proxy
export const localStorageMirror = new Proxy(localStorageMirrorTarget as any, {
  get(target, key: string) {
    if (typeof key === 'symbol') return Reflect.get(target, key);
    if (key in target) return (target as any)[key];

    if (!keyRefs.has(key)) {
      if (isDebug()) console.debug(`[localStorageMirror] Initializing reactive key: '${key}'`);
      // Create a custom ref that always reads from localStorage for "Truth-from-Source"
      const r = customRef((track, trigger) => {
        return {
          get() {
            track();
            const val = getValue(key);
            return val;
          },
          set(newValue: unknown) {
            const strVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
            if (isDebug()) console.debug(`[localStorageMirror] Reactive SET for '${key}':`, strVal.substring(0, 50));
            const storage = (globalThis as any).localStorage;
            if (storage) storage.setItem(key, strVal);
            trigger();
          }
        };
      });
      keyRefs.set(key, r);
    }

    const r = keyRefs.get(key);
    return r ? r.value : undefined;
  },
  set(_target, key: string, value: unknown) {
    if (isDebug()) console.debug(`[localStorageMirror Proxy Set] Key: ${key}`);
    
    // 1. Ensure ref exists
    let r = keyRefs.get(key);
    if (!r) {
      // Triggering property access on the proxy itself will hit the GET trap and create the ref safely
      void (localStorageMirror as any)[key]; 
      r = keyRefs.get(key);
    }

    // 2. Delegate to ref (the customRef setter handles serialization and storage.setItem)
    if (r) {
       r.value = value;
    }
    
    return true;
  }
});

// Sync with storage events (other tabs)
let _localStorageCleanup: (() => void) | null = null;

export function onGlobalInit() {
  if (typeof globalThis.window !== 'undefined') {
    const onStorageEvent = (e: StorageEvent) => {
      if (e.key) {
        const r = keyRefs.get(e.key);
        if (r) {
          r.value = getValue(e.key);
        }
      } else {
        // Clear all?
        keyRefs.forEach((r, k) => {
          r.value = getValue(k);
        });
      }
    };
    globalThis.addEventListener('storage', onStorageEvent);
    _localStorageCleanup = () => globalThis.removeEventListener('storage', onStorageEvent);
  }
}

/** Tear down storage listener — for testing or micro-frontend teardown. */
export function dispose() { if (_localStorageCleanup) _localStorageCleanup(); }

if (typeof window !== 'undefined') {
  (window as any)._localStorage = localStorageMirror;
}
