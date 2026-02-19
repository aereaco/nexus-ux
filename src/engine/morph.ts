// @ts-ignore: idiomorph types
import * as IdiomorphLib from 'idiomorph';
// deno-lint-ignore no-explicit-any
const anyLib: any = IdiomorphLib;
const Idiomorph = anyLib.Idiomorph || anyLib.default || anyLib;
import { DATA_PRESERVE_ATTR } from './consts.ts';

// Configure Idiomorph defaults
const defaults = {
  morphStyle: 'outerHTML',
  callbacks: {
    beforeNodeMorphed: (from: Element, _to: Element) => {
      // Respect data-preserve attribute
      if (from.hasAttribute(DATA_PRESERVE_ATTR)) {
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
