import { RuntimeContext } from './composition.ts';
import { DATA_STACK_KEY } from './consts.ts';
import { evaluationError } from './errors.ts';
import { resolveSelector } from './selector.ts';
import { getDataStack } from './scope.ts';

declare module "./composition.ts" {
  interface RuntimeContext {
    evaluate: (
      el: HTMLElement,
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
  el: HTMLElement,
  expression: string,
  runtime: RuntimeContext,
  extras: Record<string, unknown> = {}
): unknown {
  if (!expression || expression.trim() === '') return {};

  let result: unknown;
  const runner = evaluateLater(el, expression, runtime);
  runner(value => result = value, extras);
  return result;
}

/**
 * Pre-processes Nexus-UX specific syntax extensions (NEG Grammar).
 * 
 * Transformations:
 * 1. @rule(arg) { body } -> _scopes.rule("arg", () => { return body })
 * 2. #signal -> $global.signal
 * 3. _mirror -> $global._mirror
 * 4. $sprite -> $global.$sprite (if not followed by '(' which is for Selector $)
 */
function preProcessExpression(expression: string): string {
  let processed = expression;

  // 1. @ Scope Rules
  if (processed.includes('@')) {
    processed = processed.replace(/@(\w+)\(([^)]*)\)\s*\{([^}]*)\}/g, (_match, name, arg, body) => {
      const safeArg = arg.trim().replace(/'/g, "\\'").replace(/"/g, '\\"');
      return `_scopes.${name}("${safeArg}", () => { return ${body.trim()} })`;
    });
  }

  // 2. # Global Signals
  if (processed.includes('#')) {
    processed = processed.replace(/#([a-zA-Z_$][\w$]*)/g, '$global.$1');
  }

  // 3. _ Env Mirrors
  // We use a lookbehind/lookahead check or just rely on the uncommon _ prefix at start of tokens
  processed = processed.replace(/(^|[^a-zA-Z0-9_$])_([a-zA-Z_$][\w$]*)/g, '$1$global._$2');

  // 4. $ Sprites (if they don't look like Selector calls)
  // $(...) is the selector. $sql is a sprite.
  // Transform $word only if not followed by '(' or if it's a known sprite?
  // Spec says $ is "Logic / Selector". 
  // We'll transform $word -> $global.$word, but leave $() alone.
  processed = processed.replace(/(^|[^a-zA-Z0-9_$])\$([a-zA-Z_$][\w$]+)(?!\()/g, '$1$global.$\$2');

  return processed;
}

export function evaluateLater(
  el: HTMLElement,
  expression: string,
  runtime: RuntimeContext,
  initialExtras: Record<string, unknown> = {}
): (receiver: (value: unknown) => void, callExtras?: Record<string, unknown>) => void {
  const dataStack = getDataStack(el);
  const processedExpression = preProcessExpression(expression);

  const baseScope: Record<string | symbol, unknown> = {
    ...runtime,
    $el: el,
    $global: runtime.globalSignals(),
    $: (selector: string) => resolveSelector(el, selector),
    ...initialExtras
  };

  const scope = new Proxy(baseScope, {
    has(target, key): boolean {
      if (key === Symbol.unscopables) return false;
      if (typeof key === 'string') {
        const globalSignals = runtime.globalSignals();
        return (key in target) || (key in globalSignals) || dataStack.some(data => key in data);
      }
      return false;
    },
    get(target, key): unknown {
      if (key === Symbol.unscopables) return undefined;
      if (typeof key === 'string') {
        if (key in target) return (target as any)[key];

        const globalSignals = runtime.globalSignals();
        if (key in globalSignals) return (globalSignals as any)[key];

        for (const data of dataStack) {
          if (key in data) return (data as any)[key];
        }
        
        // Final fallback: check for common globals if not already in target
        if (key === 'JSON') return JSON;
        if (key === 'Math') return Math;
        if (key === 'Date') return Date;
        if (key === 'console') return console;
        if (key === 'window') return window;
        if (key === 'document') return document;
        if (key === 'localStorage') return localStorage;
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
      evaluationError(expression, e instanceof Error ? e : new Error(String(e)), el);
    }
  };
}
