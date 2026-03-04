import { customRef, Ref } from '../../engine/reactivity.ts';

/**
 * _storage Mirror
 * 
 * Reactive wrapper around the Storage Manager API (navigator.storage).
 * Exposes storage quota and usage as reactive read-only properties,
 * with methods for persistence management.
 * 
 * Usage in directives:
 *   _storage.usage          — bytes used (reactive, auto-updates)
 *   _storage.quota          — bytes available (reactive)
 *   _storage.persisted      — whether storage is persistent (reactive)
 *   _storage.estimate()     — force re-poll
 *   _storage.persist()      — request persistent storage
 */

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

// Reactive refs for storage properties
let usageRef: Ref<number> | null = null;
let quotaRef: Ref<number> | null = null;
let persistedRef: Ref<boolean> | null = null;

/**
 * Poll the Storage Manager API and update reactive refs.
 */
async function pollEstimate(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    if (isDebug()) console.debug('[_storage] StorageManager API not available');
    return;
  }
  
  try {
    const est = await navigator.storage.estimate();
    if (isDebug()) {
      console.debug(`[_storage] estimate: usage=${est.usage}, quota=${est.quota}`);
    }
    if (usageRef) usageRef.value = est.usage ?? 0;
    if (quotaRef) quotaRef.value = est.quota ?? 0;
  } catch (e) {
    if (isDebug()) console.error('[_storage] estimate error:', e);
  }
}

/**
 * Check persistence status.
 */
async function checkPersisted(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return;
  
  try {
    const result = await navigator.storage.persisted();
    if (persistedRef) persistedRef.value = result;
    if (isDebug()) console.debug(`[_storage] persisted: ${result}`);
  } catch (e) {
    if (isDebug()) console.error('[_storage] persisted check error:', e);
  }
}

// Build reactive refs
function ensureRefs() {
  if (!usageRef) {
    usageRef = customRef((track, trigger) => {
      let val = 0;
      return {
        get() { track(); return val; },
        set(v: number) { val = v; trigger(); }
      };
    });
  }
  if (!quotaRef) {
    quotaRef = customRef((track, trigger) => {
      let val = 0;
      return {
        get() { track(); return val; },
        set(v: number) { val = v; trigger(); }
      };
    });
  }
  if (!persistedRef) {
    persistedRef = customRef((track, trigger) => {
      let val = false;
      return {
        get() { track(); return val; },
        set(v: boolean) { val = v; trigger(); }
      };
    });
  }
}

const storageMirrorTarget = {
  /**
   * Force re-poll the storage estimate.
   */
  estimate(): void {
    pollEstimate();
  },
  
  /**
   * Request persistent storage from the browser.
   * Updates the `persisted` reactive property when resolved.
   */
  persist(): void {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    
    navigator.storage.persist()
      .then(granted => {
        if (persistedRef) persistedRef.value = granted;
        if (isDebug()) console.debug(`[_storage] persist request: ${granted ? 'granted' : 'denied'}`);
        // Re-poll estimate after persistence change
        pollEstimate();
      })
      .catch(e => {
        if (isDebug()) console.error('[_storage] persist error:', e);
      });
  }
};

// Create reactive proxy
export const storageMirror = new Proxy(storageMirrorTarget as any, {
  get(target, key: string) {
    if (typeof key === 'symbol') return Reflect.get(target, key);
    
    // Return methods
    if (key in target) return (target as any)[key];
    
    // Ensure refs are initialized
    ensureRefs();
    
    // Reactive property reads
    switch (key) {
      case 'usage':
        return usageRef!.value;
      case 'quota':
        return quotaRef!.value;
      case 'persisted':
        return persistedRef!.value;
      default:
        return undefined;
    }
  },
  set() {
    // Read-only mirror — writes are not allowed
    if (isDebug()) console.warn('[_storage] Storage mirror properties are read-only');
    return false;
  }
});

// Auto-poll on init and periodically
if (typeof globalThis.window !== 'undefined') {
  ensureRefs();
  
  // Initial poll
  pollEstimate();
  checkPersisted();
  
  // Re-poll on storage events (when other storage APIs write data)
  const onStorage = () => { pollEstimate(); };
  globalThis.addEventListener('storage', onStorage);
  
  // Periodic re-poll every 30 seconds
  const intervalId = setInterval(() => {
    pollEstimate();
  }, 30_000);

  // deno-lint-ignore no-explicit-any
  (storageMirror as any).__dispose = () => {
    globalThis.removeEventListener('storage', onStorage);
    clearInterval(intervalId);
  };
}

