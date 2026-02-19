import { DATA_STACK_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';

/**
 * Retrieves the data stack associated with a given HTMLElement.
 * The data stack is an array of reactive objects, where each object represents
 * a scope (e.g., from a `data-signal` attribute) in the element's ancestry.
 * The most local scope is at the beginning of the array.
 */
export function getDataStack(element: HTMLElement): Record<string, unknown>[] {
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
  
  // document or other node
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
