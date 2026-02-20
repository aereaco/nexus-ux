import { RuntimeContext } from './composition.ts';
import { evaluationError } from './errors.ts';
import { resolveSelector } from './selector.ts';
import { getDataStack } from './scope.ts';

declare module "./composition.ts" {
  interface RuntimeContext {
    evaluate: (
      el: Element | Text | Comment,
      expression: string,
      extras?: Record<string, unknown>
    ) => unknown;
  }
}

let shouldAutoEvaluateFunctions = true;

export function dontAutoEvaluateFunctions<R>(callback: () => R): R {
  const cache = shouldAutoEvaluateFunctions;
  shouldAutoEvaluateFunctions = false;
  try {
    return callback();
  } finally {
    shouldAutoEvaluateFunctions = cache;
  }
}

export function evaluate(
  el: Element | Text | Comment,
  expression: string,
  runtime: RuntimeContext,
  extras: Record<string, unknown> = {}
): unknown {
  if (!expression || expression.trim() === '') return {};

  const runner = evaluateLater(el, expression, runtime);
  let res: unknown;
  runner(v => res = v, extras);
  if (runtime.isDevMode && !expression.startsWith('_')) {
    runtime.debug(`[Evaluator] Result of "${expression}":`, res);
  }
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
    processed = processed.replace(/@(\w+)\(([^)]*)\)\s*\{([^}]*)\}/g, (_match, name, arg, body) => {
      const safeArg = arg.trim().replace(/'/g, "\\'").replace(/"/g, '\\"');
      return `_scopes.${name}("${safeArg}", () => { return ${body.trim()} })`;
    });
  }

  // 2. # Global Signals (#name -> $global.name)
  // Required because '#' is illegal as an identifier start in native JS.
  // We map it to $global to ensure it bypasses local scope shadowing.
  if (processed.includes('#')) {
    processed = processed.replace(/(^|[^a-zA-Z0-9_$])#([a-zA-Z_$][\w$]*)/g, '$1$global.$2');
  }

  return processed;
}

const MAGIC_KEYS = new Set(['$global', '$actions', '$el', '$']);

export function evaluateLater(
  el: Element | Text | Comment,
  expression: string,
  runtime: RuntimeContext,
  initialExtras: Record<string, unknown> = {}
): (receiver: (value: unknown) => void, callExtras?: Record<string, unknown>) => void {
  const dataStack = getDataStack(el as HTMLElement);
  const processedExpression = preProcessExpression(expression);

  const baseScope: Record<string | symbol, unknown> = {
    ...runtime,
    ...initialExtras
  };

  const scope = new Proxy(baseScope, {
    has(target, key): boolean {
      if (key === Symbol.unscopables) return false;
      if (typeof key === 'string') {
        if (MAGIC_KEYS.has(key)) return true;
        const globalSignals = runtime.globalSignals();
        const globalActions = runtime.globalActions();
        return (key in target) || (key in globalSignals) || (key in globalActions) || dataStack.some(data => key in data);
      }
      return false;
    },
    get(target, key): unknown {
      if (key === Symbol.unscopables) return undefined;
      if (typeof key === 'string') {
        const globalSignals = runtime.globalSignals();
        
        // 1. Explicit Magic Keys
        if (key === '$global') return globalSignals;
        if (key === '$actions') return runtime.globalActions();
        if (key === '$el') return el;
        if (key === '$') return (selector: string) => resolveSelector(el as any, selector);

        // 2. Data Stack (Local Scopes) - Should take precedence over globals
        for (const data of dataStack) {
          if (key in data) {
            const val = (data as any)[key];
            if (runtime.isDevMode) runtime.debug(`[Evaluator] Resolved "${key}" from local stack ->`, val);
            return runtime.unref(val);
          }
        }

        // 3. Global Signals
        if (key in globalSignals) {
          const val = (globalSignals as any)[key];
          if (runtime.isDevMode) runtime.debug(`[Evaluator] Resolved "${key}" from global signals ->`, val);
          return runtime.unref(val);
        }

        // 4. Runtime / Host Context
        if (key in target) {
          const val = (target as any)[key];
          // runtime.debug(`[Evaluator] Resolved "${key}" from runtime ->`, val);
          return runtime.unref(val);
        }

        // 5. Global Actions
        const globalActions = runtime.globalActions();
        if (key in globalActions) {
           return (globalActions as any)[key];
        }
      }
      return undefined;
    },
    set(target, key, value): boolean {
      if (typeof key === 'string') {
        const globalSignals = runtime.globalSignals();
        if (key in globalSignals) {
          (globalSignals as any)[key] = value;
          return true;
        }

        for (const data of dataStack) {
          if (key in data) {
            (data as any)[key] = value;
            return true;
          }
        }
        if (key in target) {
          (target as any)[key] = value;
          return true;
        }
      }
      return false;
    }
  });

  // Balanced logic for expressions vs statements
  let func;
  try {
    // Try as an expression first
    func = new Function('scope', `with (scope) { return (${processedExpression}) }`);
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Fallback to statement block
      func = new Function('scope', `with (scope) { ${processedExpression} }`);
    } else {
      throw e;
    }
  }

  return (receiver: (value: unknown) => void, callExtras: Record<string, unknown> = {}) => {
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

      const result = func(currentScope);
      if (shouldAutoEvaluateFunctions && typeof result === 'function') {
        receiver(result.call(currentScope));
      } else {
        receiver(result);
      }
    } catch (e) {
      console.error(`[Evaluator Error] Expression "${expression}" failed:`, e);
      evaluationError(expression, e instanceof Error ? e : new Error(String(e)), el as HTMLElement);
    }
  };
}
