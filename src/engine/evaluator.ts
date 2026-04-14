import { RuntimeContext } from './composition.ts';
import { evaluationError } from './errors.ts';
import { getDataStack, hasScopeProvider, resolveScopeProvider, registerScopeProvider } from './scope.ts';

import { MirrorProxy } from './mirror.ts';

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
        if (key.startsWith('_')) return true;
        if (hasScopeProvider(key)) return true;
        const globalSignals = runtime.globalSignals();
        const globalActions = runtime.globalActions();
        return (key in target) || (key in globalSignals) || (key in globalActions) || dataStack.some(data => key in data);
      }
      return false;
    },
    get(target, key): unknown {
      if (key === Symbol.unscopables) return undefined;
      if (typeof key === 'string') {
        // 1. Mirror Proxy (`_` prefix) maps to JIT global browser object listeners
        if (key.startsWith('_')) {
          if (key === '_' || key === '_window') return MirrorProxy;
          const rawKey = key.slice(1);
          return (MirrorProxy as any)[rawKey];
        }

        // 2. Scope Providers (modular sprites)
        if (hasScopeProvider(key)) return resolveScopeProvider(key, el, runtime);

        // 2. Data Stack (Local Scopes) - Should take precedence over globals
        for (const data of dataStack) {
          if (key in data) {
            const val = (data as any)[key];
            // Disable noisy resolution logs to prevent recursive console loops with Proxy values
            // if (runtime.isDevMode) runtime.debug(`[Evaluator] Resolved "${key}" from local stack`);
            return runtime.unref(val);
          }
        }

        // 3. Global Signals
        const globalSignals = runtime.globalSignals();
        if (key in globalSignals) {
          const val = (globalSignals as any)[key];
          // if (runtime.isDevMode) runtime.debug(`[Evaluator] Resolved "${key}" from global signals`);
          return runtime.unref(val);
        }

        // 4. Runtime / Host Context
        if (key in target) {
          const val = (target as any)[key];
          // if (runtime.isDevMode) runtime.debug(`[Evaluator] Resolved "${key}" from runtime`);
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
  let func;
  if (runtime.isDevMode) {
    console.log("Raw Expr:", expression);
    console.log("Processed:", processedExpression);
  }
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
          console.warn(`[Nexus Omni-Safe] Gracefully caught undefined access in expression: "${expression}". Yielding undefined.`);
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
