import { shallowRef, customRef, Ref } from '../../engine/reactivity.ts';

// Cache of reactive refs for keys
const keyRefs: Map<string, Ref<unknown>> = new Map();

// Helper to get raw value
const getValue = (key: string) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    try {
      return JSON.parse(item!);
    } catch {
      return item; // return string if not valid JSON
    }
  } catch {
    return null;
  }
};

// Create a reactive proxy
export const localStorageMirror = new Proxy({}, {
  get(target, key: string) {
    if (typeof key === 'symbol') return Reflect.get(target, key);

    if (!keyRefs.has(key)) {
      // Create a custom ref that reads from localStorage
      const r = customRef((track: () => void, trigger: () => void) => {

        return {
          get() {
            track();
            return getValue(key);
          },
          set(newValue: unknown) {
            const strVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, strVal);
            trigger();

            // Also trigger 'storage' event simulation for local syncing if needed?
            // Standard storage event only fires on other tabs. 
            // But since we set it, we know it changed.
          }
        };
      });
      keyRefs.set(key, r);
      // Wait, customRef returns the ref object. 
      // I need to store the *ref* so I can reuse it?
      // Actually implementation of customRef returns a Ref object.
      // But I want to return the *value* here if accessed directly?
      // "Declarative (HTML) ... el.dataset.signal ... access Mode: Imperative: el.dataset.signal"
      // "Expression: _localStorage.key" -> evaluates to value.
      // If I return a Ref, the Evaluator might utilize it?
      // Evaluator accesses globalSignals.
      // If _localStorage is a Proxy, accessing .key calls this get.
      // If I return a Ref, usage `_localStorage.count + 1` fails if Ref is an object.
      // I MUST return the value OR use a mechanism where the Proxy *is* the reactive object?
      // If I allow `reactive` to wrap this Proxy?
      // standard `reactive` wraps target.

      // Alternative: Use a dedicated 'ref' and return .value
      // BUT tracking dependency needs to happen here.

      // Let's rely on caching a Vue Ref and returning .value?
      // But getting .value tracks it.
      // So:
      // const r = ref(getValue(key));
      // keyRefs.set(key, r);
      // return r.value;
    }

    // Wait, if I return r.value, next time I must return r.value again.
    // If I stored 'r' in map.
    const r = keyRefs.get(key);
    if (r && 'value' in r) return r.value; // It is a ref

    // If not created yet:
    // We need a ref that we can manually trigger from storage event.
    // simple `ref` works.
    const newRef = shallowRef(getValue(key));
    keyRefs.set(key, newRef);
    return newRef.value;
  },
  set(_target, key: string, value: unknown) {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, strVal);

    // Update local ref
    const r = keyRefs.get(key);
    if (r) {
      r.value = value;
    } else {
      const newRef = shallowRef(value);
      keyRefs.set(key, newRef);
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
