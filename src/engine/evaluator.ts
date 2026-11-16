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
import { evaluationError, syntaxError, toError } from './debug.ts';
import {
  registerScopeProvider,
  getElementScope,
  getIndexedDBProxy,
  type IndexedDBStoreOperations
} from './scope.ts';

export { getIndexedDBProxy, type IndexedDBStoreOperations };

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

let currentEvalDepth = 0;
const MAX_EVAL_DEPTH = 50;


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
function replaceScopeRules(expr: string): string {
  if (!expr.includes('@')) return expr;
  let out = '';
  let i = 0;
  let inQuote: string | null = null;
  let escape = false;

  while (i < expr.length) {
    const ch = expr[i];
    if (escape) {
      out += ch;
      escape = false;
      i++;
      continue;
    }
    if (inQuote) {
      out += ch;
      if (ch === '\\') escape = true;
      else if (ch === inQuote) inQuote = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inQuote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '@') {
      const rest = expr.slice(i);
      const header = /^@(\w+)\s*\(/.exec(rest);
      if (header) {
        const name = header[1];
        let j = i + header[0].length;
        let parenDepth = 1;
        let q: string | null = null;
        let esc = false;
        while (j < expr.length && parenDepth > 0) {
          const c = expr[j];
          if (esc) { esc = false; j++; continue; }
          if (q) {
            if (c === '\\') esc = true;
            else if (c === q) q = null;
            j++;
            continue;
          }
          if (c === "'" || c === '"' || c === '`') q = c;
          else if (c === '(') parenDepth++;
          else if (c === ')') parenDepth--;
          j++;
        }
        if (parenDepth === 0) {
          const rawArg = expr.slice(i + header[0].length, j - 1);
          let k = j;
          while (k < expr.length && /\s/.test(expr[k])) k++;
          if (expr[k] === '{') {
            k++;
            const bodyStart = k;
            let braceDepth = 1;
            let bq: string | null = null;
            let besc = false;
            while (k < expr.length && braceDepth > 0) {
              const c = expr[k];
              if (besc) { besc = false; k++; continue; }
              if (bq) {
                if (c === '\\') besc = true;
                else if (c === bq) bq = null;
                k++;
                continue;
              }
              if (c === "'" || c === '"' || c === '`') bq = c;
              else if (c === '{') braceDepth++;
              else if (c === '}') braceDepth--;
              k++;
            }
            if (braceDepth === 0) {
              let safeArg = rawArg.trim();
              if ((safeArg.startsWith("'") && safeArg.endsWith("'")) || (safeArg.startsWith('"') && safeArg.endsWith('"'))) {
                safeArg = safeArg.slice(1, -1);
              }
              safeArg = safeArg.replace(/`/g, '\\`');
              const innerBody = replaceScopeRules(expr.slice(bodyStart, k - 1).trim());
              out += `_scopes.${name}(\`${safeArg}\`, () => { return ${innerBody} })`;
              i = k;
              continue;
            }
          }
        }
      }
    }

    out += ch;
    i++;
  }
  return out;
}

function replaceGlobalShorthand(expr: string): string {
  if (!expr.includes('#')) return expr;
  let out = '';
  let i = 0;
  let inQuote: string | null = null;
  let escape = false;
  const templateBraceDepths: number[] = [];
  let braceDepth = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (escape) {
      out += ch;
      escape = false;
      i++;
      continue;
    }
    if (inQuote) {
      out += ch;
      if (ch === '\\') {
        escape = true;
      } else if (inQuote === '`' && ch === '$' && expr[i + 1] === '{') {
        out += '{';
        i += 2;
        templateBraceDepths.push(braceDepth);
        braceDepth++;
        inQuote = null;
        continue;
      } else if (ch === inQuote) {
        inQuote = null;
      }
      i++;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inQuote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '{') {
      braceDepth++;
      out += ch;
      i++;
      continue;
    }
    if (ch === '}') {
      braceDepth--;
      out += ch;
      if (templateBraceDepths.length > 0 && templateBraceDepths[templateBraceDepths.length - 1] === braceDepth) {
        templateBraceDepths.pop();
        inQuote = '`';
      }
      i++;
      continue;
    }

    if (ch === '#') {
      const prev = i > 0 ? expr[i - 1] : '';
      if (!prev || !/[a-zA-Z0-9_$]/.test(prev)) {
        const match = /^#([a-zA-Z_$][\w$]*)/.exec(expr.slice(i));
        if (match) {
          out += `__global.${match[1]}`;
          i += match[0].length;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }
  return out;
}

function preProcessExpression(expression: string): string {
  let processed = expression;

  // 1. @ Scope Rules (@rule(...) { ... }) with balanced brace & string awareness
  if (processed.includes('@')) {
    processed = replaceScopeRules(processed);
  }

  // 2. # Global Signals (#name -> __global.name) outside string literals
  if (processed.includes('#')) {
    processed = replaceGlobalShorthand(processed);
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


import { getEvalFrame, advanceEvalFrame } from './scheduler.ts';
export { getEvalFrame, advanceEvalFrame };

// Module-level compiled expression cache (Alpine.js & Vue compiler parity) with LRU eviction
const MAX_COMPILED_CACHE_SIZE = 2048;
const compiledExpressionCache = new Map<string, Function>();

export function getCompiledExpressionCacheSize(): number {
  return compiledExpressionCache.size;
}

export function clearExpressionCache(): void {
  compiledExpressionCache.clear();
}

export function evaluateLater(
  el: Element | Text | Comment,
  expression: string,
  runtime: RuntimeContext,
  initialExtras: Record<string, unknown> = {}
): (receiver: (value: unknown) => void, callExtras?: Record<string, unknown>) => void {
  const processedExpression = preProcessExpression(expression);
  const scope = getElementScope(el, runtime, initialExtras);

  // Check compilation cache first for O(1) instantaneous reuse
  let func = compiledExpressionCache.get(processedExpression);

  if (func) {
    // Refresh LRU order by deleting and re-inserting
    compiledExpressionCache.delete(processedExpression);
    compiledExpressionCache.set(processedExpression, func);
  } else {
    const diagnostic = validateExpression(expression, el);
    if (diagnostic) {
      syntaxError(
        diagnostic.element ? diagnostic.element.tagName.toLowerCase() : 'unknown',
        expression,
        `${diagnostic.message}\n💡 Suggestion: ${diagnostic.suggestion}`,
        el instanceof HTMLElement ? el : undefined
      );
    }

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

    // Evict oldest entry if at capacity before caching
    if (compiledExpressionCache.size >= MAX_COMPILED_CACHE_SIZE) {
      const oldestKey = compiledExpressionCache.keys().next().value;
      if (oldestKey !== undefined) {
        compiledExpressionCache.delete(oldestKey);
      }
    }
    compiledExpressionCache.set(processedExpression, func);
  }

  return (receiver: (value: unknown) => void, callExtras: Record<string, unknown> = {}) => {
    if (currentEvalDepth > MAX_EVAL_DEPTH) {
      console.warn(`[Nexus Loop Guard] Stopped runaway evaluation at depth ${currentEvalDepth} for expression: "${expression}"`);
      receiver(undefined);
      return;
    }

    currentEvalDepth++;
    advanceEvalFrame();
    try {
      const currentScope = callExtras && Object.keys(callExtras).length > 0
        ? Object.assign(Object.create(scope), callExtras)
        : scope;

      const result = func.call(el, currentScope);
      if (typeof result === 'function') {
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
        evaluationError(expression, toError(e), el as HTMLElement);
      }
    } finally {
      currentEvalDepth--;
    }
  };
}
