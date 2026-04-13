// @ts-ignore: idiomorph types
import { Idiomorph } from 'idiomorph/dist/idiomorph.esm.js';
import { DATA_PRESERVE_ATTR, CLEANUP_FUNCTIONS_KEY, MARKER_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';
import { stylesheet } from './stylesheet.ts';

// Configure Idiomorph defaults
const defaults = {
  morphStyle: 'innerHTML',
  callbacks: {
    beforeNodeMorphed: (from: Node, _to: Node) => {
      // Respect data-preserve attribute
      if (from instanceof Element && from.hasAttribute(DATA_PRESERVE_ATTR)) {
        return false; // Skip morphing this node
      }
      
      // Deterministic Teardown: If the node is about to be morphed, 
      // instantly execute and sever all its "borrowed" teardown leases.
      if (from instanceof Element) {
        const enhancedFrom = from as NexusEnhancedElement;
        if (enhancedFrom[CLEANUP_FUNCTIONS_KEY]) {
          enhancedFrom[CLEANUP_FUNCTIONS_KEY].forEach((cleanup: () => void) => cleanup());
          enhancedFrom[CLEANUP_FUNCTIONS_KEY].clear();
        }
        // Nuke the initialization marker so processElement() can safely re-bind
        // new attributes if necessary.
        delete enhancedFrom[MARKER_KEY];
      }
      return true;
    },
    beforeNodeRemoved: (node: Node) => {
      // Execute teardowns synchronously before departure, avoiding race conditions
      // with delayed generic MutationObserver unmounts.
      if (node instanceof Element) {
        const enhancedNode = node as NexusEnhancedElement;
        if (enhancedNode[CLEANUP_FUNCTIONS_KEY]) {
          enhancedNode[CLEANUP_FUNCTIONS_KEY].forEach((cleanup: () => void) => cleanup());
          enhancedNode[CLEANUP_FUNCTIONS_KEY].clear();
        }
      }
      return true;
    }
  }
};

/**
 * Morphs the `from` element to match the `to` element (or HTML string).
 * Uses Idiomorph for state-preserving DOM patching.
 */
export function morphDOM(from: Element, to: Element | string, options: Record<string, unknown> = {}): void {
  const config = { ...defaults, ...options };

  // @ts-ignore - Idiomorph types might need adjustment or ignore
  Idiomorph.morph(from, to, config);
}

// ─── Visual Reconciliation ───

/**
 * Tracks classes added by Nexus to avoid clobbering manually set classes.
 */
const nexusClassMap = new WeakMap<Element, Set<string>>();

/**
 * Reconciles an element's class list against a reactive value.
 * @param el The target element
 * @param value The value to reconcile (Object, Array, or String)
 */
export function reconcileClass(el: HTMLElement, value: unknown): void {
  const currentAdded = nexusClassMap.get(el) || new Set<string>();
  const toAdd = new Set<string>();

  const process = (val: unknown) => {
    if (!val) return;
    if (typeof val === 'string') {
      val.split(/\s+/).filter(Boolean).forEach(c => toAdd.add(c));
    } else if (Array.isArray(val)) {
      val.forEach(process);
    } else if (typeof val === 'object') {
      Object.entries(val).forEach(([cls, cond]) => {
        let isMatch = false;
        if (typeof cond === 'object' && cond !== null) {
          // Conditional AND Nesting: every key in the sub-object must be truthy
          isMatch = Object.values(cond).every(v => !!v);
        } else {
          isMatch = !!cond;
        }
        if (isMatch) toAdd.add(cls);
      });
    }
  };

  process(value);

  // Remove classes that are no longer present in the new set but were added by Nexus
  currentAdded.forEach(cls => {
    if (!toAdd.has(cls)) {
      el.classList.remove(cls);
      currentAdded.delete(cls);
    }
  });

  // Add new classes
  toAdd.forEach(cls => {
    if (!el.classList.contains(cls)) {
      el.classList.add(cls);
      currentAdded.add(cls);
      stylesheet.adoptClass(cls, el);
    }
  });

  if (currentAdded.size > 0) nexusClassMap.set(el, currentAdded);
}

/**
 * Tracks style properties added by Nexus.
 */
const nexusStyleMap = new WeakMap<Element, Set<string>>();

/**
 * Reconciles an element's inline styles against a reactive object.
 * @param el The target element
 * @param value The style map (Object)
 */
export function reconcileStyle(el: HTMLElement, value: unknown): void {
  if (typeof value !== 'object' || value === null) return;

  const currentAdded = nexusStyleMap.get(el) || new Set<string>();
  const toAdd = new Set<string>();

  Object.entries(value as Record<string, unknown>).forEach(([prop, val]) => {
    const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    if (val !== null && val !== undefined && val !== false) {
      el.style.setProperty(cssProp, String(val));
      toAdd.add(cssProp);
      currentAdded.add(cssProp);
    } else {
       el.style.removeProperty(cssProp);
       currentAdded.delete(cssProp);
    }
  });

  // Cleanup properties that were previously set by Nexus but are now missing
  currentAdded.forEach(prop => {
    if (!(prop in value) && !(prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()) in value)) {
      el.style.removeProperty(prop);
      currentAdded.delete(prop);
    }
  });

  if (currentAdded.size > 0) nexusStyleMap.set(el, currentAdded);
}
