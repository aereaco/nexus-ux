import { RuntimeContext } from './composition.ts';
import { ATTRIBUTE_PREFIX, MODIFIER_ARGUMENT_DELIMITER } from './consts.ts';

export interface ParsedAttribute {
  name: string;
  value: string;
  directive?: string;
  argument?: string;
  modifiers: string[];
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
  let modifiers: string[] = [];

  const COMMON_PREFIXES = ['on-', 'class-', 'style-', 'attr-', 'bind-'];
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
    const isDelim = char === MODIFIER_ARGUMENT_DELIMITER || char === '.';

    if (isDelim || isEnd) {
      if (i > currentTokenStart) {
        const token = rawName.slice(currentTokenStart, i);
        if (state === 0) {
          directive = token;
        } else if (state === 1) {
          argument = token;
        } else {
          modifiers.push(token);
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
    modifiers: modifiers
  };
}
