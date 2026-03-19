import { customRef, Ref } from '../../engine/reactivity.ts';

/**
 * _indexedDB Mirror
 * 
 * Reactive nested Proxy wrapper around IndexedDB.
 * First level selects the object store, second level provides
 * reactive key-value access with auto-fetch on first read.
 * 
 * Pattern matches _localStorage exactly:
 *   _indexedDB.storeName.key              — reactive read (auto-fetches from IDB)
 *   _indexedDB.storeName.key = value      — reactive write + async IDB persist
 *   _indexedDB.storeName.delete(key)      — explicit delete
 *   _indexedDB.storeName.list(prefix?)    — list keys (returns reactive container)
 *   _indexedDB.storeName.clear()          — clear all entries in store
 */

const DB_NAME = 'nexus-store';

// Per-store, per-key reactive ref cache
const storeRefs = new Map<string, Map<string, Ref<unknown>>>();

// Track known object stores and current DB version
const knownStores = new Set<string>();
let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

/**
 * Opens (or reopens) the database, ensuring the requested store exists.
 */
function openDB(storeName: string): Promise<IDBDatabase> {
  // Fast path: DB already open and store exists
  if (dbInstance && knownStores.has(storeName)) {
    return Promise.resolve(dbInstance);
  }

  // If we're already opening with this store, reuse the promise
  if (dbOpenPromise && knownStores.has(storeName)) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
    // Close existing connection before version change
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }

    // Determine version — increment if we need a new store
    const needsNewStore = !knownStores.has(storeName);
    // Read current version from a temporary open if needed
    const tempOpen = indexedDB.open(DB_NAME);
    tempOpen.onsuccess = () => {
      const currentVersion = tempOpen.result.version;
      // Track existing stores
      for (let i = 0; i < tempOpen.result.objectStoreNames.length; i++) {
        knownStores.add(tempOpen.result.objectStoreNames[i]);
      }
      tempOpen.result.close();

      // If store already exists, just open normally
      if (tempOpen.result.objectStoreNames.contains(storeName)) {
        knownStores.add(storeName);
        const openReq = indexedDB.open(DB_NAME, currentVersion);
        openReq.onsuccess = () => {
          dbInstance = openReq.result;
          resolve(dbInstance);
        };
        openReq.onerror = () => reject(openReq.error);
        return;
      }

      // Need to create the store — version bump required
      const newVersion = needsNewStore ? currentVersion + 1 : currentVersion;
      const upgradeReq = indexedDB.open(DB_NAME, newVersion);
      upgradeReq.onupgradeneeded = () => {
        const db = upgradeReq.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
        // Also ensure all previously known stores exist
        for (const name of knownStores) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name);
          }
        }
      };
      upgradeReq.onsuccess = () => {
        dbInstance = upgradeReq.result;
        knownStores.add(storeName);
        resolve(dbInstance);
      };
      upgradeReq.onerror = () => reject(upgradeReq.error);
    };
    tempOpen.onerror = () => {
      // First time opening — create with version 1
      const createReq = indexedDB.open(DB_NAME, 1);
      createReq.onupgradeneeded = () => {
        createReq.result.createObjectStore(storeName);
      };
      createReq.onsuccess = () => {
        dbInstance = createReq.result;
        knownStores.add(storeName);
        resolve(dbInstance);
      };
      createReq.onerror = () => reject(createReq.error);
    };
  });

  return dbOpenPromise;
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(storeName: string, key: string): Promise<unknown> {
  const db = await openDB(storeName);
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return idbRequest(store.get(key));
}

async function idbSet(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB(storeName);
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await idbRequest(store.put(value, key));
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB(storeName);
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await idbRequest(store.delete(key));
}

async function idbList(storeName: string, prefix?: string): Promise<string[]> {
  const db = await openDB(storeName);
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const allKeys = await idbRequest(store.getAllKeys()) as string[];
  if (prefix) {
    return allKeys.filter(k => typeof k === 'string' && k.startsWith(prefix));
  }
  return allKeys.filter(k => typeof k === 'string');
}

async function idbClear(storeName: string): Promise<void> {
  const db = await openDB(storeName);
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await idbRequest(store.clear());
}

/**
 * Gets (or creates) the reactive ref cache map for a given store.
 */
function getStoreCache(storeName: string): Map<string, Ref<unknown>> {
  if (!storeRefs.has(storeName)) {
    storeRefs.set(storeName, new Map());
  }
  return storeRefs.get(storeName)!;
}

/**
 * Creates a store-level proxy that provides reactive key-value access.
 * Property reads auto-fetch from IDB; writes persist to IDB.
 * Methods: list(prefix?), delete(key), clear()
 */
function createStoreProxy(storeName: string) {
  const cache = getStoreCache(storeName);

  let keysTrigger: (() => void) | null = null;
  let isDirty = true;
  const keysRef = customRef((track, trigger) => {
    keysTrigger = () => {
      isDirty = true;
      trigger();
    };
    let currentKeys: string[] = [];

    return {
      get() {
        track();
        if (isDirty) {
          isDirty = false;
          idbList(storeName).then(keys => {
            currentKeys = keys;
            trigger();
          }).catch(e => {
            if (isDebug()) console.error(`[_indexedDB] keys fetch error:`, e);
          });
        }
        return currentKeys;
      },
      set() {}
    };
  });

  const storeTarget = {
    /**
     * List all keys in this store, optionally filtered by prefix.
     * Returns a Promise resolving to an array of keys.
     */
    list(prefix?: string): Promise<string[]> {
      return idbList(storeName, prefix).catch(e => {
        if (isDebug()) console.error(`[_indexedDB] list error for '${storeName}':`, e);
        return [];
      });
    },

    /**
     * Delete a key from this store.
     */
    delete(key: string): void {
      idbDelete(storeName, key)
        .then(() => {
          // Update the reactive ref if it exists
          const r = cache.get(key);
          if (r) r.value = undefined;
          if (keysTrigger) keysTrigger(); // Invalidate keys cache
          if (isDebug()) console.debug(`[_indexedDB] DELETE: '${storeName}/${key}'`);
        })
        .catch(e => {
          if (isDebug()) console.error(`[_indexedDB] delete error for '${storeName}/${key}':`, e);
        });
    },

    /**
     * Clear all entries in this store.
     */
    clear(): void {
      idbClear(storeName)
        .then(() => {
          // Reset all cached refs
          cache.forEach(r => r.value = undefined);
          if (keysTrigger) keysTrigger(); // Invalidate keys cache
          if (isDebug()) console.debug(`[_indexedDB] CLEAR: '${storeName}'`);
        })
        .catch(e => {
          if (isDebug()) console.error(`[_indexedDB] clear error for '${storeName}':`, e);
        });
    }
  };

  return new Proxy(storeTarget as any, {
    get(target, key: string) {
      if (typeof key === 'symbol') return Reflect.get(target, key);

      // Reactive pseudo-property for listing store keys natively
      if (key === 'keys') return keysRef.value;

      // Return methods if they exist on the target
      if (key in target) return (target as any)[key];

      // Reactive property access — auto-fetch from IDB
      if (!cache.has(key)) {
        const r = customRef((track, trigger) => {
          // Kick off the async fetch immediately
          let currentValue: unknown = undefined;
          idbGet(storeName, key)
            .then(val => {
              currentValue = val ?? undefined;
              if (isDebug()) console.debug(`[_indexedDB] GET: '${storeName}/${key}' ->`, currentValue);
              trigger();
            })
            .catch(e => {
              if (isDebug()) console.error(`[_indexedDB] GET error for '${storeName}/${key}':`, e);
            });

          return {
            get() {
              track();
              return currentValue;
            },
            set(newValue: unknown) {
              currentValue = newValue;
              // Async persist to IDB
              idbSet(storeName, key, newValue)
                .then(() => {
                  if (isDebug()) console.debug(`[_indexedDB] SET: '${storeName}/${key}' =`, newValue);
                })
                .catch(e => {
                  if (isDebug()) console.error(`[_indexedDB] SET error for '${storeName}/${key}':`, e);
                });
              trigger();
            }
          };
        });
        cache.set(key, r);
      }

      const r = cache.get(key);
      return r ? r.value : undefined;
    },

    set(_target, key: string, value: unknown) {
      if (typeof key === 'symbol') return false;

      // Update existing ref or create one
      const r = cache.get(key);
      if (r) {
        const isNew = r.value === undefined && value !== undefined;
        r.value = value;
        if (isNew && keysTrigger) keysTrigger();
      } else {
        // Access it once through the global mirror to safely provision the customRef
        void indexedDBMirror[storeName][key];
        const newRef = cache.get(key);
        if (newRef) {
          newRef.value = value;
          if (keysTrigger) keysTrigger();
        }
      }
      return true;
    }
  });
}

// Store proxy cache — one proxy per store name
const storeProxies = new Map<string, ReturnType<typeof createStoreProxy>>();

/**
 * Top-level _indexedDB proxy.
 * First-level property access selects the object store.
 * Returns a store proxy that provides reactive key-value access.
 */
export const indexedDBMirror = new Proxy({} as any, {
  get(_target, storeName: string) {
    if (typeof storeName === 'symbol') return undefined;

    if (!storeProxies.has(storeName)) {
      storeProxies.set(storeName, createStoreProxy(storeName));
    }
    return storeProxies.get(storeName);
  }
});

if (typeof window !== 'undefined') {
  (window as any)._indexedDB = indexedDBMirror;
}
