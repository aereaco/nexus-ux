import { getDataStack } from './scope.ts';

/**
 * Unified Selector Sprite $(...)
 * Enables context-aware DOM traversal and returns reactive element proxies.
 */
export function resolveSelector(contextEl: HTMLElement, selector: string | HTMLElement): any {
  if (!selector) return null;
  // If a raw DOM node was passed instead of a string, wrap it and return immediately.
  if (typeof selector !== 'string') return createReactiveElementProxy(selector);

  let current: HTMLElement | null = contextEl;
  let targetSelector = selector;

  // Handle Combinators
  if (selector.startsWith('^')) {
    // Ancestor: $(^.card)
    const match = selector.match(/^\^([.#a-zA-Z0-9_-]+)(.*)/);
    if (match) {
      current = contextEl.closest(match[1]);
      targetSelector = match[2].trim();
    }
  } else if (selector.startsWith('-')) {
    // Previous Matching Sibling: $(- .item)
    const [_, sel, rest] = selector.match(/^-([.#a-zA-Z0-9_-]+)(.*)/) || [null, '', ''];
    current = contextEl.previousElementSibling as HTMLElement;
    while (current && sel && !current.matches(sel)) {
      current = current.previousElementSibling as HTMLElement;
    }
    targetSelector = rest.trim();
  } else if (selector.startsWith('+')) {
    // Next Matching Sibling: $(+ .item)
    const [_, sel, rest] = selector.match(/^\+([.#a-zA-Z0-9_-]+)(.*)/) || [null, '', ''];
    current = contextEl.nextElementSibling as HTMLElement;
    while (current && sel && !current.matches(sel)) {
      current = current.nextElementSibling as HTMLElement;
    }
    targetSelector = rest.trim();
  } else if (selector.startsWith('~')) {
    // Any Matching Sibling: $(~ .item)
    const [_, sel, rest] = selector.match(/^~([.#a-zA-Z0-9_-]+)(.*)/) || [null, '', ''];
    current = contextEl.parentElement?.querySelector(sel) as HTMLElement;
    targetSelector = rest.trim();
  } else if (selector.startsWith('>')) {
    // Child
    current = contextEl.querySelector(selector) as HTMLElement;
    targetSelector = '';
  } else if (selector.startsWith('*')) {
    // Global Scan
    current = document.querySelector(selector.substring(1).trim()) as HTMLElement;
    targetSelector = '';
  } else {
    // Standard local child search, falling back to global document search (HTMX parity)
    current = contextEl.querySelector(selector) as HTMLElement;
    if (!current && typeof document !== 'undefined') {
      current = document.querySelector(selector) as HTMLElement;
    }
    targetSelector = '';
  }

  // If we have a remaining selector, refine the search
  if (current && targetSelector) {
    current = current.querySelector(targetSelector);
  }

  if (!current) return null;

  // Wrap in a Reactive Proxy
  return createReactiveElementProxy(current);
}

/**
 * Creates a proxy for a DOM element that prioritizes its reactive signal state.
 */
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
