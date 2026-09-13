/**
 * Nexus-UX Reflect Proxy Engine
 *
 * Provides reactive, zero-copy, zero-serialization (ZCZS) proxies for native
 * browser Web APIs (localStorage, sessionStorage, indexedDB, fetch, and global host objects).
 *
 * Architectural Mandates:
 *   - Zero-Copy Zero-Serialization: Direct memory references, no JSON serialization across boundaries.
 *   - Dual Compatibility: Full support for both direct property access and standard Web API methods.
 *   - Deterministic Lifecycle: Clean, cached proxy instances tied to runtime contexts.
 */

import type { RuntimeContext } from './composition.ts';
import { track, trigger } from './reactivity.ts';

// ---------------------------------------------------------------------------
// Reactive Web Storage (localStorage / sessionStorage)
// ---------------------------------------------------------------------------

function createStorageProxy(storage: Storage): Storage {
  const ITERATE_KEY = Symbol.for('iterate');

  return new Proxy(storage, {
    has(target, prop) {
      if (typeof prop === 'string') {
        if (prop in target || typeof (target as any)[prop] === 'function') return true;
        return target.getItem(prop) !== null;
      }
      return Reflect.has(target, prop);
    },

    get(target, prop) {
      if (prop === Symbol.unscopables) return undefined;

      if (typeof prop === 'string') {
        // Standard Storage methods wrapped with reactivity
        if (prop === 'getItem') {
          return (key: string) => {
            track(storage, key);
            return target.getItem(key);
          };
        }
        if (prop === 'setItem') {
          return (key: string, value: unknown) => {
            const strVal = String(value);
            target.setItem(key, strVal);
            trigger(storage, key);
          };
        }
        if (prop === 'removeItem') {
          return (key: string) => {
            target.removeItem(key);
            trigger(storage, key);
          };
        }
        if (prop === 'clear') {
          return () => {
            target.clear();
            trigger(storage, ITERATE_KEY);
          };
        }
        if (prop === 'key') {
          return (index: number) => target.key(index);
        }
        if (prop === 'length') {
          track(storage, 'length');
          return target.length;
        }

        // Direct property read (e.g. localStorage.collapsed)
        track(storage, prop);
        const item = target.getItem(prop);
        if (item !== null) return item;
        if (prop in target) return (target as any)[prop];
        return undefined;
      }

      return Reflect.get(target, prop);
    },

    set(target, prop, value) {
      if (typeof prop === 'string') {
        // Prevent overwriting standard Storage methods
        if (typeof (Storage.prototype as any)[prop] === 'function') {
          return false;
        }
        target.setItem(prop, String(value));
        trigger(storage, prop);
        return true;
      }
      return Reflect.set(target, prop, value);
    },

    deleteProperty(target, prop) {
      if (typeof prop === 'string') {
        target.removeItem(prop);
        trigger(storage, prop);
        return true;
      }
      return Reflect.deleteProperty(target, prop);
    },

    ownKeys(target) {
      track(storage, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  });
}

// Multi-tab storage event synchronization
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (typeof localStorage !== 'undefined') {
      if (e.key) {
        trigger(localStorage, e.key);
      } else {
        trigger(localStorage, Symbol.for('iterate'));
      }
    }
  });
}

export const reactiveLocalStorage: Storage | undefined =
  typeof localStorage !== 'undefined' ? createStorageProxy(localStorage) : undefined;

export const reactiveSessionStorage: Storage | undefined =
  typeof sessionStorage !== 'undefined' ? createStorageProxy(sessionStorage) : undefined;

// ---------------------------------------------------------------------------
// Reactive IndexedDB Store Operations & Proxy
// ---------------------------------------------------------------------------

export const DEFAULT_IDB_DATABASE = 'nexus-store';

export interface IndexedDBStoreOperations {
  all(): Promise<any[]>;
  keys(prefix?: string): Promise<string[]>;
  list(prefix?: string): Promise<string[]>;
  get(key: string | number): Promise<any>;
  put(item: any, key?: string | number): Promise<void>;
  delete(key: string | number): Promise<void>;
  clear(): Promise<void>;
  [key: string]: any;
}

async function openAndEnsureStore(storeName: string): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not supported in this environment');
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DEFAULT_IDB_DATABASE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const udb = (e.target as IDBOpenDBRequest).result;
      if (!udb.objectStoreNames.contains(storeName)) {
        udb.createObjectStore(storeName);
      }
    };
  });

  if (db.objectStoreNames.contains(storeName)) {
    return db;
  }

  const nextVersion = db.version + 1;
  db.close();

  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DEFAULT_IDB_DATABASE, nextVersion);
    req.onupgradeneeded = (e) => {
      const udb = (e.target as IDBOpenDBRequest).result;
      if (!udb.objectStoreNames.contains(storeName)) {
        udb.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createStoreOperations(storeName: string): IndexedDBStoreOperations {
  const baseOps: IndexedDBStoreOperations = {
    async all(): Promise<any[]> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => { db.close(); resolve(req.result || []); };
          req.onerror = () => { db.close(); resolve([]); };
        } catch {
          db.close();
          resolve([]);
        }
      });
    },

    async keys(prefix?: string): Promise<string[]> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAllKeys();
          req.onsuccess = () => {
            db.close();
            const rawKeys = (req.result || []).map(String);
            resolve(prefix ? rawKeys.filter(k => k.startsWith(prefix)) : rawKeys);
          };
          req.onerror = () => { db.close(); resolve([]); };
        } catch {
          db.close();
          resolve([]);
        }
      });
    },

    async list(prefix?: string): Promise<string[]> {
      return baseOps.keys(prefix);
    },

    async get(key: string | number): Promise<any> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(key);
          req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
          req.onerror = () => { db.close(); resolve(null); };
        } catch {
          db.close();
          resolve(null);
        }
      });
    },

    async put(item: any, key?: string | number): Promise<void> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          if (store.keyPath) {
            if (key !== undefined && typeof item === 'object' && item !== null && typeof store.keyPath === 'string' && !(store.keyPath in item)) {
              item[store.keyPath] = key;
            }
            store.put(item);
          } else {
            if (key !== undefined) {
              store.put(item, key);
            } else {
              store.put(item);
            }
          }
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        } catch (e) {
          db.close();
          reject(e);
        }
      });
    },

    async delete(key: string | number): Promise<void> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.delete(key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        } catch (e) {
          db.close();
          reject(e);
        }
      });
    },

    async clear(): Promise<void> {
      const db = await openAndEnsureStore(storeName);
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        } catch (e) {
          db.close();
          reject(e);
        }
      });
    }
  };

  return new Proxy(baseOps, {
    set(target, prop, value) {
      if (typeof prop === 'string' && !(prop in target)) {
        target.put(value, prop);
        return true;
      }
      (target as any)[prop] = value;
      return true;
    }
  });
}

let cachedIDBProxy: any = null;

export function getIndexedDBProxy(): any {
  if (cachedIDBProxy) return cachedIDBProxy;
  if (typeof indexedDB === 'undefined') return (globalThis as any).indexedDB;

  const storeOpsCache = new Map<string, IndexedDBStoreOperations>();

  cachedIDBProxy = new Proxy((globalThis as any).indexedDB, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'symbol' || prop in target) {
        const val = (target as any)[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
      if (typeof prop === 'string') {
        if (!storeOpsCache.has(prop)) {
          storeOpsCache.set(prop, createStoreOperations(prop));
        }
        return storeOpsCache.get(prop)!;
      }
      return undefined;
    }
  });

  return cachedIDBProxy;
}

// ---------------------------------------------------------------------------
// Global Host Function Wrapper
// ---------------------------------------------------------------------------

const globalFnProxyCache = new WeakMap<Function, Function>();

export function wrapGlobalFunction(fn: Function, globalContext: any): Function {
  let proxy = globalFnProxyCache.get(fn);
  if (!proxy) {
    proxy = new Proxy(fn, {
      apply(target, thisArg, args) {
        return Reflect.apply(target, thisArg == null || thisArg === proxy ? globalContext : thisArg, args);
      },
      construct(target, args, newTarget) {
        return Reflect.construct(target, args, newTarget === proxy ? target : newTarget);
      },
      get(target, prop) {
        if (prop === 'prototype') return (target as any).prototype;
        const val = Reflect.get(target, prop);
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
    globalFnProxyCache.set(fn, proxy);
  }
  return proxy;
}

// ---------------------------------------------------------------------------
// Authoritative Reflect Proxy Factory
// ---------------------------------------------------------------------------

const elementReflectProxyCache = new WeakMap<Element, Record<string, unknown>>();
let defaultReflectProxy: Record<string, unknown> | null = null;

export function createReflectProxy(_runtime?: RuntimeContext, el?: Element): Record<string, unknown> {
  if (el && elementReflectProxyCache.has(el)) {
    return elementReflectProxyCache.get(el)!;
  }
  if (!el && defaultReflectProxy) {
    return defaultReflectProxy;
  }

  const proxy = new Proxy({}, {
    has(_, key) {
      if (typeof key !== 'string') return false;
      return (
        key === 'localStorage' ||
        key === 'sessionStorage' ||
        key === 'indexedDB' ||
        key === 'fetch' ||
        key in globalThis
      );
    },

    get(_, key) {
      if (typeof key !== 'string') return undefined;

      if (key === 'localStorage') {
        return reactiveLocalStorage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
      }
      if (key === 'sessionStorage') {
        return reactiveSessionStorage || (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
      }
      if (key === 'indexedDB') {
        return getIndexedDBProxy();
      }
      if (key === 'fetch') {
        return typeof globalThis.fetch === 'function'
          ? wrapGlobalFunction(globalThis.fetch, globalThis)
          : undefined;
      }
      if (key in globalThis) {
        const val = (globalThis as any)[key];
        return typeof val === 'function' ? wrapGlobalFunction(val, globalThis) : val;
      }

      return undefined;
    },

    set(_, key, value) {
      if (typeof key === 'string' && key in globalThis) {
        (globalThis as any)[key] = value;
        return true;
      }
      return false;
    }
  });

  if (el) {
    elementReflectProxyCache.set(el, proxy);
  } else {
    defaultReflectProxy = proxy;
  }

  return proxy;
}
