import { RuntimeContext } from './composition.ts';
import { ATTRIBUTE_PREFIX, MODIFIER_DELIMITER } from './consts.ts';

export interface ParsedAttribute {
  name: string;
  value: string;
  directive?: string;
  argument?: string;
  modifiers: string[];
  target?: string;
}

/**
 * Parses an HTML attribute into a structured Nexus-UX directive object.
 * 
 * Universal Grammar (per §2.1 NEG Token Set):
 *   data-{directive}[-{argument}][_{modifier1}[_{modifier2}]]
 * 
 * - `-` separates directive from argument
 * - `_` introduces modifiers (Pipeline Anchors per NEG_TOKENS.MODIFIER)
 * Examples:
 *   data-on-click_once       → { directive: "on", argument: "click", modifiers: ["once"] }
 *   data-drag-handle         → { directive: "drag", argument: "handle", modifiers: [] }
 *   data-bind-value_lazy     → { directive: "bind", argument: "value", modifiers: ["lazy"] }
 *   data-signal_global       → { directive: "signal", modifiers: ["global"] }
 *   data-for                 → { directive: "for" }
 */
export function parseAttribute(name: string, _runtime: RuntimeContext, element: HTMLElement): ParsedAttribute | null {
  let rawName = '';
  let isNexus = false;

  if (name.startsWith(ATTRIBUTE_PREFIX)) {
    rawName = name.slice(ATTRIBUTE_PREFIX.length); // Remove 'data-'
    isNexus = true;
  } else if (name.startsWith(':')) {
    rawName = `bind-${name.slice(1)}`; // shorthand for data-bind-
    isNexus = true;
  } else if (name.startsWith('@')) {
    rawName = `on-${name.slice(1)}`; // shorthand for data-on-
    isNexus = true;
  }

  if (!isNexus) {
    return null; // Not a Nexus-UX attribute
  }

  let directive: string | undefined = undefined;
  let argument: string | undefined = undefined;
  const modifiers: string[] = [];
  let target: string | undefined = undefined;

  // State machine: 0=DIRECTIVE, 1=ARGUMENT, 2=MODIFIER
  let state = 0;
  const rest = rawName;

  let currentTokenStart = 0;
  const len = rest.length;

  for (let i = 0; i <= len; i++) {
    const isEnd = i === len;
    const char = isEnd ? '' : rest[i];

    // `_` (standard per NEG_TOKENS.MODIFIER) transitions to MODIFIER state
    // `-` transitions from DIRECTIVE to ARGUMENT state (only when before modifier state)
    const isModifierDelim = char === MODIFIER_DELIMITER || char === '_';
    const isArgDelim = char === '-' && state < 2;
    const isDelim = isModifierDelim || isArgDelim;

    if (isDelim || isEnd) {
      if (i > currentTokenStart) {
        const token = rest.slice(currentTokenStart, i);
        if (state === 0) {
          directive = token;
        } else if (state === 1) {
          argument = argument ? argument + '-' + token : token;
        } else {
          if (token.startsWith('$(') && token.endsWith(')')) {
            target = token.slice(2, -1);
          } else {
            modifiers.push(token);
          }
        }
      }

      if (isDelim) {
        if (isModifierDelim) {
          state = 2;
        } else if (isArgDelim && state === 0) {
          state = 1;
        }
      }
      
      currentTokenStart = i + 1;
    }
  }

  return {
    name: name,
    value: element.getAttribute(name) || '',
    directive: directive,
    argument: argument,
    modifiers: modifiers,
    target: target
  };
}

/**
 * Helper to find all attributes on an element that match a specific directive.
 * Supports data-directive, data-directive_modifier, and data-directive-arg formats.
 */
export function matchAttributes(el: HTMLElement, directive: string, value?: string): Attr[] {
  const prefixUnderscore = `data-${directive}_`;
  const prefixDash = `data-${directive}-`;
  const exact = `data-${directive}`;
  
  return Array.from(el.attributes).filter(a => {
    const isMatch = a.name === exact || a.name.startsWith(prefixUnderscore) || a.name.startsWith(prefixDash);
    if (!isMatch) return false;
    if (value !== undefined && a.value !== value) return false;
    return true;
  });
}




