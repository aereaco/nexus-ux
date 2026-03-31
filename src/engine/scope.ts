import { DATA_STACK_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';

/**
 * Retrieves the data stack associated with a given HTMLElement.
 * The data stack is an array of reactive objects, where each object represents
 * a scope (e.g., from a `data-signal` attribute) in the element's ancestry.
 * The most local scope is at the beginning of the array.
 */
export function getDataStack(element: HTMLElement | Text | Comment | Element): Record<string, unknown>[] {
  const node = element as NexusEnhancedElement;
  if (node[DATA_STACK_KEY]) {
    return node[DATA_STACK_KEY]!;
  }

  if (typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot) {
    return getDataStack(node.host as HTMLElement); // Recursively get from host
  }

  const parent = node.parentElement || node.parentNode;
  if (!parent) {
    return [];
  }

  if (parent instanceof HTMLElement) {
     return getDataStack(parent);
  }
  
  // Handle DocumentFragment (e.g. within templates)
  if (parent instanceof DocumentFragment || (typeof ShadowRoot !== 'undefined' && parent instanceof ShadowRoot)) {
    // If it's a template fragment, we might need a way to reach the template element itself?
    // In our `for.ts`, we add the scope to the fragment's children directly.
    // If we're inside a child of one of those children, we need to climb up.
    return getDataStack(parent as any);
  }
  
  if (parent instanceof Element) {
     return getDataStack(parent as Element);
  }

  return [];
}

/**
 * Adds a new data scope to a node's data stack.
 */
export function addScopeToNode(element: HTMLElement, data: Record<string, unknown>, referenceNode?: HTMLElement): () => void {
  const node = element as NexusEnhancedElement;
  const parentStack = getDataStack(referenceNode || element);
  node[DATA_STACK_KEY] = [data, ...parentStack];
  
  if (document.documentElement.hasAttribute('data-debug')) {
    console.log(`[Nexus Scope] Added scope to <${element.tagName}>. New stack depth: ${node[DATA_STACK_KEY].length}`);
  }

  return () => {
    if (node[DATA_STACK_KEY]) {
      node[DATA_STACK_KEY] = node[DATA_STACK_KEY]!.filter((item: Record<string, unknown>) => item !== data);
    }
  };
}

/**
 * Checks if a node has an associated data stack.
 */
export function hasScope(element: HTMLElement): boolean {
  return !!(element as NexusEnhancedElement)[DATA_STACK_KEY];
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
  if (trimmed.startsWith('({') || trimmed.startsWith('{')) {
     // Robust regex for identifying keys in object literals (standard, single-quoted, double-quoted)
     const keyMatches = expression.matchAll(/['"]?([a-zA-Z_$][\w$]*)['"]?\s*:/g);
     for (const match of keyMatches) {
       ghostKeys.push(match[1]);
     }
     
     // Improved Type Inference for ZCZS pre-allocation
     ghostKeys.forEach((key) => {
       const valueRegex = new RegExp(`['"]?${key}['"]?\\s*:\\s*([^,}\\s]*)`, 'g');
       const valueMatch = valueRegex.exec(expression);
       
       if (valueMatch && valueMatch[1]) {
         const valToken = valueMatch[1].trim();
         if (valToken.startsWith('true') || valToken.startsWith('false')) typeHints[key] = 'boolean';
         else if (/^-?\d/.test(valToken)) typeHints[key] = 'number';
         else if (/^['"`]/.test(valToken)) typeHints[key] = 'string';
         else if (valToken.startsWith('[') || valToken.startsWith('{')) typeHints[key] = 'object';
       }
     });
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
    has(_, key) { return Reflect.has(stateRef.value, key); },
    get(_, key) { return Reflect.get(stateRef.value, key); },
    set(_, key, value) { 
      const res = Reflect.set(stateRef.value, key, value);
      if (onSet) onSet(key as string, value);
      if (onTrigger) onTrigger();
      return res;
    },
    ownKeys() { return Reflect.ownKeys(stateRef.value); },
    getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(stateRef.value, key); }
  });
}
