import { customRef, Ref } from '../../engine/reactivity.ts';

/**
 * _sessionStorage Mirror
 * 
 * Reactive Proxy wrapper around window.sessionStorage.
 * Same pattern as _localStorage but per-tab (no cross-tab sync).
 * 
 * Usage in directives:
 *   _sessionStorage['key']              — reactive read
 *   _sessionStorage['key'] = 'value'    — reactive write
 *   _sessionStorage.getItem('key')      — explicit read
 *   _sessionStorage.setItem('key', 'v') — explicit write
 *   _sessionStorage.removeItem('key')   — explicit remove
 *   _sessionStorage.clear()             — clear all
 */

// Cache of reactive refs for keys
const keyRefs: Map<string, Ref<unknown>> = new Map();

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

// Helper to get raw value from sessionStorage
const getValue = (key: string) => {
  const storage = (globalThis as any).sessionStorage;
  if (typeof storage === 'undefined' || storage === null) {
    return null;
  }
  try {
    const val = storage.getItem(key);

    if (val === 'null') {
      if (isDebug()) console.debug(`[sessionStorageMirror] GET: '${key}' received string "null", treating as null`);
      return null;
    }

    if (isDebug()) {
      console.debug(`[sessionStorageMirror] GET: '${key}' -> ${val === null ? 'null' : (typeof val === 'string' ? '"' + val.substring(0, 50) + '"' : val)}`);
    }
    return val;
  } catch (e) {
    if (isDebug()) console.error(`[sessionStorageMirror] GET Error for '${key}':`, e);
    return null;
  }
};

const sessionStorageMirrorTarget = {
  getItem: (key: string) => getValue(key),
  setItem: (key: string, value: string) => {
    const storage = (globalThis as any).sessionStorage;
    if (isDebug()) console.debug(`[sessionStorageMirror] SET: '${key}' = ${value}`);
    if (storage) {
      try {
        storage.setItem(key, value);
      } catch (e) {
        if (isDebug()) console.error(`[sessionStorageMirror] SET Error for '${key}':`, e);
      }
    }
    const r = keyRefs.get(key);
    if (r) r.value = value;
  },
  removeItem: (key: string) => {
    const storage = (globalThis as any).sessionStorage;
    if (isDebug()) console.debug(`[sessionStorageMirror] REMOVE: '${key}'`);
    if (storage) {
      try {
        storage.removeItem(key);
      } catch (e) {
        if (isDebug()) console.error(`[sessionStorageMirror] REMOVE Error for '${key}':`, e);
      }
    }
    const r = keyRefs.get(key);
    if (r) r.value = null;
  },
  clear: () => {
    const storage = (globalThis as any).sessionStorage;
    if (isDebug()) console.debug(`[sessionStorageMirror] CLEAR`);
    if (storage) {
      try {
        storage.clear();
      } catch (e) {
        if (isDebug()) console.error(`[sessionStorageMirror] CLEAR Error:`, e);
      }
    }
    keyRefs.forEach(r => r.value = null);
  }
};

// Create a reactive proxy
export const sessionStorageMirror = new Proxy(sessionStorageMirrorTarget as any, {
  get(target, key: string) {
    if (isDebug()) {
      console.debug(`[sessionStorageMirror Proxy Get] Key: ${String(key)}`);
    }
    if (typeof key === 'symbol') return Reflect.get(target, key);
    if (key in target) return (target as any)[key];

    if (!keyRefs.has(key)) {
      // Create a custom ref that always reads from sessionStorage for "Truth-from-Source"
      const r = customRef((track, trigger) => {
        return {
          get() {
            track();
            return getValue(key);
          },
          set(newValue: unknown) {
            const strVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
            const storage = (globalThis as any).sessionStorage;
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
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    const storage = (globalThis as any).sessionStorage;
    if (storage) storage.setItem(key, strVal);

    // Update local ref if it exists, or create one to ensure future reactivity
    const r = keyRefs.get(key);
    if (r) {
      r.value = value;
    } else {
      // Access it once to create the customRef
      (sessionStorageMirror as any)[key] = value;
    }
    return true;
  }
});

// Note: sessionStorage does NOT fire 'storage' events across tabs (it's per-tab).
// No cross-tab sync listener needed — this is by design.
