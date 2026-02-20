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

  let directive = rawName;
  let argument = undefined;
  let modifiers: string[] = [];

  // 1. Extract Argument (separated by first colon OR hyphen)
  // Priority: Colon first (explicit), then hyphen (if no colon)
  let argIndex = directive.indexOf(MODIFIER_ARGUMENT_DELIMITER);
  if (argIndex === -1) {
    // Exception for known hyphenated directives like 'ux-theme'
    if (directive === 'ux-theme' || directive.startsWith('ux-theme.')) {
      argIndex = -1;
    } else {
      argIndex = directive.indexOf('-');
    }
  }

  if (argIndex !== -1) {
    argument = directive.slice(argIndex + 1);
    directive = directive.slice(0, argIndex);

    // If argument has dot modifiers, split them out
    // e.g. click.prevent.stop -> argument="click", modifiers=["prevent", "stop"]
    const dotIndex = argument.indexOf('.');
    if (dotIndex !== -1) {
      const rawArg = argument; // "click.prevent.stop"
      argument = rawArg.slice(0, dotIndex); // "click"
      modifiers = rawArg.slice(dotIndex + 1).split('.'); // ["prevent", "stop"]
    }

  } else {
    // No argument, but check for modifiers on the directive itself? 
    // e.g. data-text.trim ? usually modifiers are on events
    const dotIndex = directive.indexOf('.');
    if (dotIndex !== -1) {
      modifiers = directive.slice(dotIndex + 1).split('.');
      directive = directive.slice(0, dotIndex);
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
