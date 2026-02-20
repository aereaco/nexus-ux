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
    if (isDebug()) {
      console.debug(`[localStorageMirror Proxy Get] Key: ${String(key)}`);
    }
    if (typeof key === 'symbol') return Reflect.get(target, key);
    if (key in target) return (target as any)[key];

    if (!keyRefs.has(key)) {
      // Create a custom ref that always reads from localStorage for "Truth-from-Source"
      const r = customRef((track, trigger) => {
        return {
          get() {
            track();
            return getValue(key);
          },
          set(newValue: unknown) {
            const strVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
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
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    const storage = (globalThis as any).localStorage;
    if (storage) storage.setItem(key, strVal);

    // Update local ref if it exists, or create one to ensure future reactivity
    const r = keyRefs.get(key);
    if (r) {
      r.value = value;
    } else {
      // Access it once to create the customRef
      (localStorageMirror as any)[key] = value;
    }
    return true;
  }
});

// Sync with storage events (other tabs)
if (typeof globalThis.window !== 'undefined') {
  globalThis.addEventListener('storage', (e) => {
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
  });
}
