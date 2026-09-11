/**
 * Nexus-UX Scope Resolution Engine
 *
 * Manages the data stack (scope chain) and scope providers for expression
 * evaluation. Every HTMLElement can carry a stack of reactive scope objects,
 * and scope providers inject additional namespaces (like $, $animate) into
 * the evaluation context.
 *
 * Data Stack:
 *   The data stack is an array of reactive objects attached to each element
 * via DATA_STACK_KEY. The most local scope is at index 0. When evaluating
 * an expression, the stack is walked from local to global to resolve
 * property access.
 *
 * Scope Providers:
 *   Named functions registered via registerScopeProvider() that inject
 *   namespaces into the evaluation Proxy. Examples: '$' (selector),
 *   '$animate' (animation), '$predictive' (quadtree predictive engine).
 *
 * ZCZS Role:
 *   - Zero-copy: Scope objects are shared by reference; no cloning.
 *   - Zero-serialization: The data stack is a live array of live objects.
 *
 * Coordination:
 *   - evaluator.ts uses getDataStack() for live scope resolution.
 *   - index.ts registers built-in scope providers ($, $animate).
 *   - ModuleCoordinator uses addScopeToNode() for component scoping.
 *
 * Nexus-UX Innovations Preserved:
 *   - Live scope resolution via Proxy with data stack precedence
 *   - Scope provider injection for dynamic namespaces
 *   - Shadow DOM boundary traversal for isolated contexts
 */

import { DATA_STACK_KEY, LOCAL_SCOPES_KEY } from './consts.ts';
import { NexusEnhancedElement, track, trigger } from './reactivity.ts';

/**
 * Retrieves the data stack associated with a given HTMLElement by dynamically
 * traversing ancestors in the live DOM hierarchy (Zero-Copy Zero-Serialization).
 * Local scopes on the immediate element appear first, followed by ancestor scopes,
 * ending with root/host scopes.
 */
export function getDataStack(element: HTMLElement | Text | Comment | Element): Record<string, unknown>[] {
  const stack: Record<string, unknown>[] = [];
  let curr: Node | null = element;

  while (curr) {
    const enhanced = curr as unknown as NexusEnhancedElement;

    // 1. If explicit legacy/cloned DATA_STACK_KEY is attached (e.g. Teleport or Draggable clone), include it
    if (enhanced[DATA_STACK_KEY] && enhanced[DATA_STACK_KEY]!.length > 0) {
      stack.push(...enhanced[DATA_STACK_KEY]!);
      break;
    }

    // 2. Add local scopes declared directly on this element
    if (enhanced[LOCAL_SCOPES_KEY] && enhanced[LOCAL_SCOPES_KEY]!.length > 0) {
      stack.push(...enhanced[LOCAL_SCOPES_KEY]!);
    }

    // 3. Ascend to parent / ShadowRoot boundary
    if (typeof ShadowRoot !== 'undefined' && curr instanceof ShadowRoot) {
      curr = curr.host;
    } else {
      const parent: Node | null = curr.parentElement || curr.parentNode || (curr as any).__scopeParent;
      if (typeof ShadowRoot !== 'undefined' && parent instanceof ShadowRoot) {
        const shadow = parent as unknown as NexusEnhancedElement;
        if (shadow[LOCAL_SCOPES_KEY] && shadow[LOCAL_SCOPES_KEY]!.length > 0) {
          stack.push(...shadow[LOCAL_SCOPES_KEY]!);
        } else if (shadow[DATA_STACK_KEY] && shadow[DATA_STACK_KEY]!.length > 0) {
          stack.push(...shadow[DATA_STACK_KEY]!);
        }
        curr = (parent as ShadowRoot).host;
      } else if (parent instanceof DocumentFragment) {
        curr = (parent as any).host || (curr as any).__scopeParent || null;
      } else {
        curr = parent;
      }
    }
  }

  return stack;
}

/**
 * Adds a new data scope to a node's local scopes (ZCZS live reference).
 */
export function addScopeToNode(element: Element, data: Record<string, unknown>, referenceNode?: Element): () => void {
  const node = element as NexusEnhancedElement;
  if (!node[LOCAL_SCOPES_KEY]) {
    node[LOCAL_SCOPES_KEY] = [];
  }
  node[LOCAL_SCOPES_KEY]!.unshift(data);
  if (referenceNode && !node.parentElement) {
    (node as any).__scopeParent = referenceNode;
  }

  return () => {
    if (node[LOCAL_SCOPES_KEY]) {
      node[LOCAL_SCOPES_KEY] = node[LOCAL_SCOPES_KEY]!.filter((item) => item !== data);
      if (node[LOCAL_SCOPES_KEY]!.length === 0) {
        delete node[LOCAL_SCOPES_KEY];
      }
    }
  };
}

/**
 * Checks if a node has any associated local or explicit data scopes.
 */
export function hasScope(element: HTMLElement): boolean {
  const node = element as NexusEnhancedElement;
  return !!(node[LOCAL_SCOPES_KEY]?.length || node[DATA_STACK_KEY]?.length);
}

/**
 * Disposes a list of cleanup functions (executing each safely and clearing the list)
 * or removes scope tracking keys from an element.
 */
export function disposeScope(target?: Element | (() => void)[]): void {
  if (Array.isArray(target)) {
    for (const fn of target) {
      try {
        fn();
      } catch (err) {
        console.error('Error disposing scope:', err);
      }
    }
    target.length = 0;
    return;
  }
  if (target) {
    const node = target as NexusEnhancedElement;
    if (node[LOCAL_SCOPES_KEY]) {
      delete node[LOCAL_SCOPES_KEY];
    }
    if (node[DATA_STACK_KEY]) {
      delete node[DATA_STACK_KEY];
    }
  }
}

// ---------------------------------------------------------------------------
// Scope Provider Registry
// ---------------------------------------------------------------------------
// Allows sprites to register themselves as scope providers that the evaluator
// queries at evaluation time. Providers receive the current element and runtime
// context, enabling both static providers (e.g. $global) and context-aware
// providers (e.g. $el, $dispatch).
// ---------------------------------------------------------------------------

import type { RuntimeContext } from './composition.ts';

/**
 * A scope provider resolves a value given the current element and runtime context.
 */
export type ScopeProvider = (el: Element | Text | Comment, runtime: RuntimeContext) => unknown;

const scopeProviderRegistry = new Map<string, ScopeProvider>();

/**
 * Registers a scope provider under the given key.
 * Sprites call this during module initialization to make themselves
 * available in expression evaluation scope.
 */
export function registerScopeProvider(key: string, provider: ScopeProvider): void {
  scopeProviderRegistry.set(key, provider);
}

/**
 * Returns true if a scope provider is registered for the given key.
 */
export function hasScopeProvider(key: string): boolean {
  return scopeProviderRegistry.has(key);
}

/**
 * Resolves a scope provider for the given key, passing the current element
 * and runtime context to the provider function.
 */
export function resolveScopeProvider(key: string, el: Element | Text | Comment, runtime: RuntimeContext): unknown {
  const provider = scopeProviderRegistry.get(key);
  return provider ? provider(el, runtime) : undefined;
}

/**
 * Parses an object literal expression to identify "ghost keys" and infer their types.
 * Ghost keys are used for pre-allocating ZCZS heap slots.
 */
export function parseGhostKeys(expression: string): {
  ghostKeys: string[];
  typeHints: Record<string, 'number' | 'boolean' | 'string' | 'object'>
} {
  const ghostKeys: string[] = [];
  const typeHints: Record<string, 'number' | 'boolean' | 'string' | 'object'> = {};

  const trimmed = expression.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('({')) return { ghostKeys, typeHints };

  const start = trimmed.indexOf('{');
  let i = start + 1;
  const len = trimmed.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(trimmed[i])) i++;

    // Parse key
    let key = '';
    if (trimmed[i] === '"' || trimmed[i] === "'") {
      const quote = trimmed[i++];
      while (i < len && trimmed[i] !== quote) key += trimmed[i++];
      i++; // closing quote
    } else {
      while (i < len && /[\w$]/.test(trimmed[i])) key += trimmed[i++];
    }

    if (!key) break;

    // Skip whitespace and colon
    while (i < len && /[\s:]/.test(trimmed[i])) i++;

    // Parse value with full nesting + string awareness
    let value = '';
    let depth = 0;
    let inString: string | null = null;

    while (i < len) {
      const ch = trimmed[i];

      if (inString) {
        if (ch === '\\') {
          value += ch + (trimmed[i + 1] || '');
          i += 2;
          continue;
        }
        if (ch === inString) inString = null;
        value += ch; i++;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') { inString = ch; value += ch; i++; continue; }
      if (ch === '{' || ch === '[' || ch === '(') { depth++; value += ch; i++; continue; }
      if (ch === '}' || ch === ']' || ch === ')') {
        if (depth === 0) break; // end of object
        depth--;
        value += ch; i++;
        continue;
      }
      if (ch === ',' && depth === 0) { i++; break; }
      value += ch; i++;
    }

    const valToken = value.trim();
    if (key) {
      ghostKeys.push(key);
      if (valToken.startsWith('true') || valToken.startsWith('false')) typeHints[key] = 'boolean';
      else if (/^-?\d/.test(valToken)) typeHints[key] = 'number';
      else if (/^['"`]/.test(valToken)) typeHints[key] = 'string';
      else if (valToken.startsWith('[') || valToken.startsWith('{')) typeHints[key] = 'object';
    }
  }

  return { ghostKeys, typeHints };
}

/**
 * Creates a reactive proxy for a state object to be used as a scope.
 */
export function createScopeProxy(
  stateRef: { value: Record<string, unknown> },
  onSet?: (key: string, value: unknown) => void,
  onTrigger?: () => void
): Record<string, unknown> {
  return new Proxy({}, {
    has(_, key) { 
      const target = stateRef.value;
      if (typeof key === 'string') track(target, key);
      return Reflect.has(target, key); 
    },
    get(_, key) { 
      const target = stateRef.value;
      if (typeof key === 'string') track(target, key);
      return Reflect.get(target, key); 
    },
    set(_, key, value) {
      const target = stateRef.value;
      const res = Reflect.set(target, key, value);
      if (typeof key === 'string') trigger(target, key);
      if (onSet) onSet(key as string, value);
      if (onTrigger) onTrigger();
      return res;
    },
    ownKeys() { 
      const target = stateRef.value;
      track(target, Symbol.for('iterate'));
      return Reflect.ownKeys(target); 
    },
    getOwnPropertyDescriptor(_, key) { 
      const target = stateRef.value;
      return Reflect.getOwnPropertyDescriptor(target, key); 
    }
  });
}

// ============================================================================
// Unified Native IndexedDB Reactive Proxy & Native API Scope
// ============================================================================

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
          req.onsuccess = () => {
            db.close();
            resolve(req.result || []);
          };
          req.onerror = () => {
            db.close();
            resolve([]);
          };
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
          req.onerror = () => {
            db.close();
            resolve([]);
          };
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
          req.onsuccess = () => {
            db.close();
            resolve(req.result ?? null);
          };
          req.onerror = () => {
            db.close();
            resolve(null);
          };
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
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
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
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
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
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
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

/**
 * Assembles the native API scope covering window, document, navigator,
 * screen, localStorage, sessionStorage, indexedDB, and any globalThis properties.
 */
export function buildNativeApiScope(_runtime?: RuntimeContext): Record<string, unknown> {
  return new Proxy({}, {
    has(_, key) {
      return typeof key === 'string' && (key === 'indexedDB' || key in globalThis);
    },
    get(_, key) {
      if (typeof key !== 'string') return undefined;
      if (key === 'indexedDB' && typeof indexedDB !== 'undefined') {
        return getIndexedDBProxy();
      }
      if (key in globalThis) {
        const val = (globalThis as any)[key];
        return typeof val === 'function' ? wrapGlobalFunction(val, globalThis) : val;
      }
      return undefined;
    }
  });
}

