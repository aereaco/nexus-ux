// @ts-ignore: idiomorph types
import { Idiomorph } from 'idiomorph/dist/idiomorph.esm.js';
import { DATA_PRESERVE_ATTR, CLEANUP_FUNCTIONS_KEY, MARKER_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';

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
