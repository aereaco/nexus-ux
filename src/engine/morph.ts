// @ts-ignore: idiomorph types
import { Idiomorph } from 'idiomorph/dist/idiomorph.esm.js';
import { DATA_PRESERVE_ATTR } from './consts.ts';

// Configure Idiomorph defaults
const defaults = {
  morphStyle: 'innerHTML',
  callbacks: {
    beforeNodeMorphed: (from: Node, _to: Node) => {
      // Respect data-preserve attribute
      if (from instanceof Element && from.hasAttribute(DATA_PRESERVE_ATTR)) {
        return false; // Skip morphing this node
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
