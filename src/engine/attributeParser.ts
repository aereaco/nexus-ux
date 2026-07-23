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
 *   data-{directive}[-{argument}][:{modifier1}[:{modifier2}]]
 * 
 * - `-` separates directive from argument
 * - `:` ALWAYS introduces modifiers (Pipeline Anchors)
 * Examples:
 *   data-on-click:once       → { directive: "on", argument: "click", modifiers: ["once"] }
 *   data-teleport:drop       → { directive: "teleport", modifiers: ["drop"] }
 *   data-bind-attr:draggable → { directive: "bind", argument: "attr", modifiers: ["draggable"] }
 *   data-for                 → { directive: "for" }
 *   data-signal              → { directive: "signal" }
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
  let rest = rawName;

  const hyphenated = ['ux-theme', 'on-raf', 'flow-node', 'flow-handle', 'flow-edges', 'flow-grid'].find(h =>
    rawName === h || rawName.startsWith(h + '-') || rawName.startsWith(h + ':') || rawName.startsWith(h + '.')
  );

  if (hyphenated) {
    directive = hyphenated;
    rest = rawName.slice(hyphenated.length);
    if (rest.length > 0) {
      if (rest.startsWith('-')) {
        state = 1;
        rest = rest.slice(1);
      } else if (rest.startsWith(':') || rest.startsWith('.')) {
        state = 2;
        rest = rest.slice(1);
      }
    }
  }

  let currentTokenStart = 0;
  const len = rest.length;

  for (let i = 0; i <= len; i++) {
    const isEnd = i === len;
    const char = isEnd ? '' : rest[i];

    // `:` ALWAYS transitions to MODIFIER state (per §2.1)
    // `-` transitions from DIRECTIVE to ARGUMENT state
    // `.` transitions to MODIFIER state
    const isModifierDelim = char === MODIFIER_DELIMITER;
    const isArgDelim = char === '-';
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
          // `:` and `.` ALWAYS move to modifier state regardless of current state
          state = 2;
        } else if (isArgDelim && state === 0) {
          // `-` after directive introduces the argument
          state = 1;
        }
        // `-` while already in ARGUMENT state: we concatenate (e.g., `data-on-signal-change` → argument = "signal-change")
        // `-` while in MODIFIER state: part of modifier token (e.g., debounce-500ms)
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
 * Supports data-directive, data-directive:arg, and data-directive-arg formats.
 */
export function matchAttributes(el: HTMLElement, directive: string, value?: string): Attr[] {
  const prefixColon = `data-${directive}:`;
  const prefixDash = `data-${directive}-`;
  const exact = `data-${directive}`;
  
  return Array.from(el.attributes).filter(a => {
    const isMatch = a.name === exact || a.name.startsWith(prefixColon) || a.name.startsWith(prefixDash);
    if (!isMatch) return false;
    if (value !== undefined && a.value !== value) return false;
    return true;
  });
}



