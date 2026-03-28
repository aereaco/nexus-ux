import { getDataStack } from '../../engine/scope.ts';
import { registerScopeProvider } from '../../engine/scope.ts';

/**
 * Unified Selector Sprite $(...)
 * Enables context-aware DOM traversal and returns reactive element proxies.
 *
 * Registered as a scope provider so expressions can use $(selector) to
 * traverse the DOM relative to the current element.
 */
export interface NexusCollection extends Array<any> { [key: string]: any }

export function resolveSelector(contextEl: HTMLElement, selector: string | HTMLElement): HTMLElement | NexusCollection | null {
  if (!selector) return null;
  if (typeof selector !== 'string') return createReactiveElementProxy(selector);

  let current: HTMLElement | null = contextEl;
  let targetSelector = '';

  // Handle Combinators
  if (selector.startsWith('^')) {
    const match = selector.match(/^\^([.#a-zA-Z0-9_-]+)(.*)/);
    if (match) {
      current = contextEl.closest(match[1]);
      targetSelector = match[2].trim();
    }
  } else if (selector.startsWith('-')) {
    const match = selector.match(/^-([.#a-zA-Z0-9_-]+)(.*)/);
    if (match) {
      const sel = match[1];
      const rest = match[2];
      current = contextEl.previousElementSibling as HTMLElement;
      while (current && sel && !current.matches(sel)) {
        current = current.previousElementSibling as HTMLElement;
      }
      targetSelector = rest.trim();
    }
  } else if (selector.startsWith('+')) {
    const match = selector.match(/^\+([.#a-zA-Z0-9_-]+)(.*)/);
    if (match) {
      const sel = match[1];
      const rest = match[2];
      current = contextEl.nextElementSibling as HTMLElement;
      while (current && sel && !current.matches(sel)) {
        current = current.nextElementSibling as HTMLElement;
      }
      targetSelector = rest.trim();
    }
  } else if (selector.startsWith('~')) {
    const match = selector.match(/^~([.#a-zA-Z0-9_-]+)(.*)/);
    if (match) {
      const sel = match[1];
      const rest = match[2];
      current = contextEl.parentElement?.querySelector(sel) as HTMLElement;
      targetSelector = rest.trim();
    }
  } else if (selector.startsWith('>')) {
    current = contextEl.querySelector(selector) as HTMLElement;
    targetSelector = '';
  } else if (selector.startsWith('*')) {
    current = document.querySelector(selector.substring(1).trim()) as HTMLElement;
    targetSelector = '';
  } else {
    // Standard search: try descendants first, then fallback to global (HTMX parity)
    const items = Array.from(contextEl.querySelectorAll(selector));
    if (items.length > 0) return createNexusCollection(items as HTMLElement[]);
    return createNexusCollection(Array.from(document.querySelectorAll(selector)) as HTMLElement[]);
  }

  // Refine child search if combinators left a target
  if (current && targetSelector) {
    const refined = Array.from(current.querySelectorAll(targetSelector)) as HTMLElement[];
    return createNexusCollection(refined);
  }

  if (!current) return createNexusCollection([]);

  const root = current || document;
  const cleanSelector = selector.replace(/^[*^>~+-]/, '').trim() || '*';
  const results = Array.from(root.querySelectorAll(cleanSelector)) as HTMLElement[];
  
  return createNexusCollection(results);
}

/**
 * Creates a proxy for a DOM element that prioritizes its reactive signal state.
 */
// The Contextual Selector ($) is now registered centrally in src/index.ts
// to ensure it's available at engine ignition and avoid circular dependencies.

function createNexusCollection(elements: HTMLElement[]): NexusCollection {
  const proxies = elements.map(el => createReactiveElementProxy(el));
  
  return new Proxy(proxies, {
    get(target, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      
      // 1. Array properties/methods (forEach, map, length, [0], etc.)
      const val = (target as any)[key];
      if (val !== undefined) {
        return typeof val === 'function' ? val.bind(target) : val;
      }

      // 2. Smart Singleton Forwarding: If key doesn't exist on Array, forward to first element
      if (target.length > 0) {
        const head = target[0];
        const headVal = head[key];
        return typeof headVal === 'function' ? headVal.bind(head) : headVal;
      }

      return undefined;
    },
    set(target, key, value, receiver) {
      if (typeof key === 'symbol') return Reflect.set(target, key, value, receiver);

      // 1. Array index assignment
      if (!isNaN(Number(key))) {
        target[Number(key)] = value;
        return true;
      }

      // 2. Smart Singleton Forwarding: Mutate first element (or you could broadcast here)
      if (target.length > 0) {
        target[0][key] = value;
        return true;
      }

      return false;
    }
  });
}

function createReactiveElementProxy(el: HTMLElement): any {
  return new Proxy(el, {
    get(target: any, key: string | symbol) {
      if (typeof key === 'symbol') return target[key];

      // 1. Check if it's a DOM property/method first (to allow el.focus() etc.)
      const val = target[key];
      if (val !== undefined) {
        return typeof val === 'function' ? val.bind(target) : val;
      }

      // 2. Check reactive data stack
      const stack = getDataStack(target);
      for (const data of stack) {
        if (key in data) return (data as any)[key];
      }

      return undefined;
    },
    set(target: any, key: string | symbol, value: any) {
      if (typeof key === 'symbol') {
        target[key] = value;
        return true;
      }

      // 1. Check reactive data stack for writing
      const stack = getDataStack(target);
      for (const data of stack) {
        if (key in data) {
          (data as any)[key] = value;
          return true;
        }
      }

      // 2. Fallback to DOM property
      target[key] = value;
      return true;
    }
  });
}
