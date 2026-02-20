import { STATE } from '../consts.ts';

/**
 * Deterministic Hash Generator.
 * Used for stable identification and high-performance attribute monitoring.
 */
export class Hash {
  #value = 0;
  #prefix: string;

  constructor(prefix = STATE) {
    this.#prefix = prefix;
  }

  /**
   * Incorporates a value into the hash.
   */
  with(x: number | string | boolean): Hash {
    if (typeof x === 'string') {
      for (const c of x.split('')) {
        this.with(c.charCodeAt(0));
      }
    } else if (typeof x === 'boolean') {
      this.with(1 << (x ? 7 : 3));
    } else {
      // DJB2 hash algorithm (favored by Dan Bernstein)
      this.#value = (this.#value * 33) ^ x;
    }
    return this;
  }

  get value() {
    return this.#value;
  }

  /**
   * Returns the hash as a base36 string prefixed with the state key.
   */
  get string() {
    return this.#prefix + Math.abs(this.#value).toString(36);
  }
}

/**
 * Generates a stable unique ID for an element based on its position in the DOM.
 * Essential for garbage-free tracking and stable morphing in lists.
 */
export function elUniqId(el: Element): string {
  if (el.id) return el.id;
  
  // Prioritize Nexus-UX specific stable keys for lists/loops
  const key = (el as HTMLElement).getAttribute('data-ux-id') || (el as HTMLElement).getAttribute('data-key') || (el as HTMLElement).getAttribute('data-id');
  if (key) {
    const hash = new Hash();
    hash.with(el.tagName).with(key);
    return hash.string;
  }

  const hash = new Hash();

  let currentEl: Element | null = el;
  while (currentEl) {
    hash.with(currentEl.tagName || '');
    if (currentEl.id) {
      hash.with(currentEl.id);
      break;
    }
    const p: Node | null = currentEl?.parentNode || null;
    if (p && (p instanceof Element || p instanceof DocumentFragment || (typeof ShadowRoot !== 'undefined' && p instanceof ShadowRoot))) {
      const children = (p as any).children || [];
      if (children.length > 0) {
        hash.with(Array.from(children).indexOf(currentEl));
      }
    }

    currentEl = (p instanceof Element) ? p : ((typeof ShadowRoot !== 'undefined' && p instanceof ShadowRoot) ? (p as ShadowRoot).host : (p instanceof DocumentFragment ? null : null));
    if (p instanceof DocumentFragment && !currentEl) {
      // If we're in a fragment (like a template clone), incorporate a random or unique seed if available, 
      // but actually, we should try to reach the 'host' or just accept the fragment depth.
      // For now, let's just make sure we don't crash and at least distinguish by position.
    }
  }
  return hash.string;
}

/**
 * Generates a simple numeric hash for a key-value pair.
 * Used for fast attribute change detection.
 */
export function attrHash(key: number | string, val: number | string): number {
  return new Hash().with(key).with(val).value;
}

/**
 * Recursively walks the DOM tree, respecting 'data-ignore' attributes.
 */
export function walkDOM(
  element: Element | null,
  callback: (el: HTMLElement | SVGElement) => void,
) {
  if (
    !element ||
    !(element instanceof HTMLElement || element instanceof SVGElement)
  ) {
    return;
  }
  
  const dataset = element.dataset;
  // Use 'ignore' instead of 'starIgnore' to align with modern Nexus-UX naming
  if ('ignore' in dataset) {
    return;
  }
  
  callback(element);
  
  let el = element.firstElementChild;
  while (el) {
    walkDOM(el, callback);
    el = el.nextElementSibling;
  }
}
