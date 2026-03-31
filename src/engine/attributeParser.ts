import { RuntimeContext } from './composition.ts';
import { ATTRIBUTE_PREFIX, MODIFIER_ARGUMENT_DELIMITER } from './consts.ts';

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
 * Format: data-[directive]:[argument].[modifier1].[modifier2]
 * Example: data-on:click.prevent.stop
 */
export function parseAttribute(name: string, _runtime: RuntimeContext, element: HTMLElement): ParsedAttribute | null {
  let rawName = '';
  let isNexus = false;

  if (name.startsWith(ATTRIBUTE_PREFIX)) {
    rawName = name.slice(ATTRIBUTE_PREFIX.length); // Remove 'data-'
    isNexus = true;
  } else if (name.startsWith(':')) {
    rawName = `attr:${name.slice(1)}`; // shorthand for data-attr:
    isNexus = true;
  } else if (name.startsWith('@')) {
    rawName = `on:${name.slice(1)}`; // shorthand for data-on:
    isNexus = true;
  }

  if (!isNexus) {
    return null; // Not a Nexus-UX attribute
  }

  let directive: string | undefined = undefined;
  let argument: string | undefined = undefined;
  const modifiers: string[] = [];
  let target: string | undefined = undefined;

  const COMMON_PREFIXES = ['on-', 'class-', 'style-', 'attr-', 'bind-', 'prop-'];
  let startIndex = 0;
  let state = 0; // 0=DIRECTIVE, 1=ARGUMENT, 2=MODIFIER

  for (let i = 0; i < COMMON_PREFIXES.length; i++) {
    const p = COMMON_PREFIXES[i];
    if (rawName.startsWith(p)) {
      directive = p.slice(0, -1);
      startIndex = p.length;
      state = 1;
      break;
    }
  }

  let currentTokenStart = startIndex;
  const len = rawName.length;

  for (let i = startIndex; i <= len; i++) {
    const isEnd = i === len;
    const char = isEnd ? '' : rawName[i];
    const isDelim = char === MODIFIER_ARGUMENT_DELIMITER || char === '.'; // ':' or '.'

    if (isDelim || isEnd) {
      if (i > currentTokenStart) {
        const token = rawName.slice(currentTokenStart, i);
        if (state === 0) {
          directive = token;
        } else if (state === 1) {
          argument = token;
        } else {
          if (token.startsWith('$(') && token.endsWith(')')) {
            target = token.slice(2, -1);
          } else {
            modifiers.push(token);
          }
        }
      }

      if (isDelim) {
        if (state === 0) {
          state = char === MODIFIER_ARGUMENT_DELIMITER ? 1 : 2;
        } else {
          state = 2;
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
