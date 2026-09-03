/**
 * Nexus-UX Expression Evaluator
 *
 * Evaluates NEG (Nexus Expression Grammar) expressions within directive
 * attributes and computed bindings. This is the runtime engine that turns
 * strings like `#router.route` or `$event.preventDefault()` into live
 * JavaScript execution.
 *
 * NEG Token Handling:
 *   - `#global` → __global.global (bypasses local scope shadowing)
 *   - `$expr` → passed through to Proxy scope (logic prefix)
 *   - `@rule(...) { body }` → _scopes.rule(...) (scope rules)
 *   - Native API tracking for any browser API via Proxy/Reflect
 *   - `&.parent` → context reference (resolved by scope chain)
 *
 * ZCZS Role:
 *   - Zero-copy: Expressions are compiled once into Function instances.
 *   - Zero-serialization: Scope Proxy wraps live objects by reference;
 *     no cloning or serialization occurs during evaluation.
 *
 * Coordination:
 *   - Parser (attributeParser.ts) extracts directive/argument/modifiers.
 *   - Scope (scope.ts) provides data stack and scope providers.
 *   - SelfHeal (agent.ts) captures evaluation errors as crash beacons.
 *
 * Nexus-UX Innovations Preserved:
 *   - Dynamic native API tracking for any browser API
 *   - Live scope resolution via data stack + global signals + providers
 *   - `with(scope)` evaluation for natural property access
 *   - Loop guard preventing runaway recursive evaluation
 */

import { RuntimeContext } from './composition.ts';
import { getSelfHealAgent } from './agent.ts';
import { evaluationError, syntaxError } from './debug.ts';
import { getDataStack, hasScopeProvider, resolveScopeProvider, registerScopeProvider } from './scope.ts';



declare module "./composition.ts" {
  interface RuntimeContext {
    evaluate: (
      el: Element | Text | Comment,
      expression: string,
      extras?: Record<string, unknown>
    ) => unknown;
  }
}

// Register the internal global scope provider statically for # signal parsing
registerScopeProvider('__global', (_, runtime) => runtime.globalSignals());

let shouldAutoEvaluateFunctions = true;
let currentEvalDepth = 0;
const MAX_EVAL_DEPTH = 50;

export function dontAutoEvaluateFunctions<R>(callback: () => R): R {
  const cache = shouldAutoEvaluateFunctions;
  shouldAutoEvaluateFunctions = false;
  try {
    return callback();
  } finally {
    shouldAutoEvaluateFunctions = cache;
  }
}

// ============================================================================
// Unified Native IndexedDB Reactive Proxy
// ============================================================================

const DEFAULT_IDB_DATABASE = 'nexus-store';

export interface IndexedDBStoreOperations {
  all(): Promise<any[]>;
  get(key: string | number): Promise<any>;
  put(item: any, key?: string | number): Promise<void>;
  delete(key: string | number): Promise<void>;
  clear(): Promise<void>;
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
        udb.createObjectStore(storeName, { keyPath: 'id' });
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
        udb.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function createStoreOperations(storeName: string): IndexedDBStoreOperations {
  return {
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
            if (key !== undefined && typeof item === 'object' && item !== null && !(store.keyPath in item)) {
              item[store.keyPath as string] = key;
            }
            store.put(item);
          } else {
            store.put(item, key);
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
}

let cachedIDBProxy: any = null;

export function getIndexedDBProxy(): any {
  if (cachedIDBProxy) return cachedIDBProxy;
  if (typeof indexedDB === 'undefined') return globalThis.indexedDB;

  const storeOpsCache = new Map<string, IndexedDBStoreOperations>();

  cachedIDBProxy = new Proxy(globalThis.indexedDB, {
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


export function evaluate(
  el: Element | Text | Comment,
  expression: string,
  runtime: RuntimeContext,
  extras: Record<string, unknown> = {}
): unknown {
  if (typeof expression !== 'string' || !expression || expression.trim() === '') return {};

  const runner = evaluateLater(el, expression, runtime);
  let res: unknown;
  runner(v => res = v, extras);
  /*
  if (runtime.isDevMode && !expression.startsWith('_')) {
    runtime.debug(`[Evaluator] Result of "${expression}":`, res);
  }
  */
  return res;
}

/**
 * Pre-processes Nexus-UX specific syntax extensions (NEG Grammar).
 * 
 * DESIGN PRINCIPLE: "Zero-Overhead Evaluation" (Spec 1.10)
 * We minimize pre-processing. Only non-native JS characters (like # and @)
 * are transformed once at initialization. Valid JS identifiers like _ and $
 * are handled directly by the Proxy scope.
 */
function preProcessExpression(expression: string): string {
  let processed = expression;

  // 1. @ Scope Rules (@rule(...) { ... })
  if (processed.includes('@')) {
    // Matches @<name>(<args>) { <body> } 
    // Supports nested parentheses inside args via (.*?) bounded to the opening {
    processed = processed.replace(/@(\w+)\s*\((.*?)\)\s*\{([^}]*)\}/g, (_match, name, arg, body) => {
      const safeArg = arg.trim().replace(/`/g, "\\`");
      return `_scopes.${name}(\`${safeArg}\`, () => { return ${body.trim()} })`;
    });
  }

  // 2. # Global Signals (#name -> __global.name)
  // Required because '#' is illegal as an identifier start in native JS.
  // We map it to __global to ensure it bypasses local scope shadowing without
  // colliding with the $ namespace reserved exclusively for predefined sprites.
  if (processed.includes('#')) {
    processed = processed.replace(/(^|[^a-zA-Z0-9_$'"`])#([a-zA-Z_$][\w$]*)/g, '$1__global.$2');
  }

  return processed;
}

export interface UXDiagnostic {
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  element: Element;
  expression: string;
}

function checkBalanced(expr: string): { type: string, expected: string, position: number } | null {
  const stack: { char: string, pos: number }[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  let inString: string | null = null;
  let escape = false;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    if (pairs[char]) {
      stack.push({ char, pos: i });
    } else if (char === '}' || char === ']' || char === ')') {
      const last = stack.pop();
      if (!last || pairs[last.char] !== char) {
        return { type: 'bracket', expected: last ? pairs[last.char] : 'none', position: i };
      }
    }
  }
  if (inString) {
    return { type: 'quote', expected: inString, position: expr.length };
  }
  if (stack.length > 0) {
    const last = stack[stack.length - 1];
    return { type: 'bracket', expected: pairs[last.char], position: last.pos };
  }
  return null;
}

function validateExpression(expression: string, el: Element | Text | Comment): UXDiagnostic | null {
  const trimmed = expression.trim();
  let attrName = '';

  if (el instanceof Element) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.value === expression) {
        attrName = attr.name;
        break;
      }
    }
  }

  // Declarative: data-for syntax check
  if (attrName === 'data-for') {
    if (!trimmed.includes(' in ')) {
      return {
        severity: 'error',
        message: `Invalid data-for syntax: "${trimmed}". Expected "item in items".`,
        suggestion: trimmed.includes(' of ')
          ? `Replace 'of' with 'in': "${trimmed.replace(' of ', ' in ')}"`
          : `Use pattern: "(item, index) in list"`,
        element: el as Element,
        expression: trimmed
      };
    }
  }

  // General: unbalanced brackets/parens/quotes
  const balanced = checkBalanced(trimmed);
  if (balanced) {
    return {
      severity: 'error',
      message: `Unbalanced ${balanced.type} in expression: "${trimmed.substring(0, 60)}..."`,
      suggestion: `Check for missing closing '${balanced.expected}' near position ${balanced.position}`,
      element: el as Element,
      expression: trimmed
    };
  }

  return null;
}


export function evaluateLater(
  el: Element | Text | Comment,
  expression: string,
  runtime: RuntimeContext,
  initialExtras: Record<string, unknown> = {}
): (receiver: (value: unknown) => void, callExtras?: Record<string, unknown>) => void {
  const processedExpression = preProcessExpression(expression);

  const baseScope: Record<string | symbol, unknown> = {
    ...runtime,
    ...initialExtras
  };

  const scope = new Proxy(baseScope, {
    has(target, key): boolean {
      if (key === Symbol.unscopables) return false;
      if (typeof key === 'string') {
        return true; // Always route through proxy get to eliminate ReferenceError log floods
      }
      return false;
    },
    get(target, key): unknown {
      if (key === Symbol.unscopables) return undefined;
      if (typeof key === 'string') {
        // 1. Scope Providers (modular sprites)
        if (hasScopeProvider(key)) return resolveScopeProvider(key, el, runtime);

        // ZCZS: Live Scope Resolution — evaluate relative to exact current DOM position
        const dataStack = getDataStack(el as HTMLElement);

        // 3. Data Stack (Local Scopes) - Should take precedence over globals
        for (const data of dataStack) {
          if (key in data) {
            const val = (data as any)[key];
            return runtime.unref(val);
          }
        }

        // 4. Global Signals
        const globalSignals = runtime.globalSignals();
        if (key in globalSignals) {
          const val = (globalSignals as any)[key];
          return runtime.unref(val);
        }

        // 5. Global Actions
        const globalActions = runtime.globalActions();
        if (key in globalActions) {
          return (globalActions as any)[key];
        }

        // 6. Native IndexedDB Proxy & GlobalThis Fallback
        if (key === 'indexedDB' && typeof indexedDB !== 'undefined') {
          return getIndexedDBProxy();
        }

        if (key in globalThis) {
          const val = (globalThis as any)[key];
          return typeof val === 'function' ? val.bind(globalThis) : val;
        }
      }
      return undefined;
    },
    set(target, key, value): boolean {
      if (typeof key === 'string') {
        const dataStack = getDataStack(el as HTMLElement);

        for (const data of dataStack) {
          if (key in data) {
            (data as any)[key] = value;
            return true;
          }
        }

        const globalSignals = runtime.globalSignals();
        if (key in globalSignals) {
          (globalSignals as any)[key] = value;
          return true;
        }

        // Fallback: If not found in stack, auto-create in the closest reactive local scope
        // or global signals to ensure "virtual" signals can be established on-the-fly.
        if (dataStack.length > 0) {
          (dataStack[0] as any)[key] = value;
          return true;
        }

        if (key in target) {
          (target as any)[key] = value;
          return true;
        }

        // Global fallback
        (globalSignals as any)[key] = value;
        return true;
      }
      return false;
    }
  });

  // Balanced logic for expressions vs statements
  // Expression compilation: uses `new Function` + `with` for runtime expressiveness.
  // IMPORTANT — CSP: this requires `unsafe-eval` in Content-Security-Policy.
  // This is the same trade-off as Alpine.js. A CSP-compatible build would
  // pre-compile expressions at build time (not implemented yet).

  const diagnostic = validateExpression(expression, el);
  if (diagnostic) {
    syntaxError(
      diagnostic.element ? diagnostic.element.tagName.toLowerCase() : 'unknown',
      expression,
      `${diagnostic.message}\n💡 Suggestion: ${diagnostic.suggestion}`,
      el instanceof HTMLElement ? el : undefined
    );
  }

  let func;
  /*
  if (runtime.isDevMode) {
    console.log("Raw Expr:", expression);
    console.log("Processed:", processedExpression);
  }
  */
  try {
    // Try as an expression first
    func = new Function('scope', `with (scope) { return (${processedExpression}) }`);
  } catch (e) {
    if (e instanceof SyntaxError) {
      try {
        // Fallback to statement block (e.g. if/for expressions used in data-effect)
        func = new Function('scope', `with (scope) { ${processedExpression} }`);
      } catch (e2) {
        if (e2 instanceof SyntaxError) {
          syntaxError('eval', expression, e2.message, el instanceof HTMLElement ? el : undefined);
        }
        throw e2;
      }
    } else {
      throw e;
    }
  }

  return (receiver: (value: unknown) => void, callExtras: Record<string, unknown> = {}) => {
    if (currentEvalDepth > MAX_EVAL_DEPTH) {
      console.warn(`[Nexus Loop Guard] Stopped runaway evaluation at depth ${currentEvalDepth} for expression: "${expression}"`);
      receiver(undefined);
      return;
    }

    currentEvalDepth++;
    try {
      const currentScope = new Proxy(callExtras, {
        has(target, key): boolean {
          if (key === Symbol.unscopables) return false;
          if (typeof key === 'string') return (key in target) || (key in scope);
          return (key in target);
        },
        get(target, key): unknown {
          if (key === Symbol.unscopables) return undefined;
          if (typeof key === 'string') {
            if (key in target) return target[key];
            return scope[key];
          }
          return undefined;
        },
        set(target, key, value): boolean {
          if (typeof key === 'string') {
            if (key in target) {
              target[key] = value;
              return true;
            }
            scope[key] = value;
            return true;
          }
          return false;
        }
      });

      const result = func.call(el, currentScope);
      if (shouldAutoEvaluateFunctions && typeof result === 'function') {
        receiver(result.call(el, currentScope));
      } else {
        receiver(result);
      }
    } catch (e) {
      if (e instanceof Promise) throw e; // Rethrow for Suspense support
      if ((e instanceof TypeError && e.message.includes('Cannot read properties of')) || e instanceof ReferenceError) {
        if (runtime.isDevMode) {
          // Agentic Resolution Beacon: Delegate console warnings to the SelfHeal agent
          // to suppress transient resolution noise during initial DOM hydration.
          try {
            getSelfHealAgent().reportResolutionFailure('expression', expression, {
              error: e.message,
              node: el
            });
          } catch (_err) { /* ignore during boot */ }
        }
        receiver(undefined);
      } else {
        console.error(`[Evaluator Error] Expression "${expression}" failed:`, e);
        evaluationError(expression, e instanceof Error ? e : new Error(String(e)), el as HTMLElement);
      }
    } finally {
      currentEvalDepth--;
    }
  };
}
