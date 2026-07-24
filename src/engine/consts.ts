/**
 * Nexus-UX Engine Constants
 *
 * Single source of truth for all framework-wide constants, token definitions,
 * and internal HTMLElement augmentation keys.
 *
 * NEG Token Definitions:
 *   The NEG_TOKENS object defines the complete set of Nexus Expression Grammar
 *   tokens. Every parser, evaluator, and module must reference these constants
 *   rather than hardcoding string literals to ensure consistent behavior.
 *
 * Internal Keys:
 *   Symbol.for() keys are used to augment HTMLElement instances with framework
 *   metadata without polluting the DOM interface or causing GC pressure.
 *
 * ZCZS Role:
 *   - Zero-copy: Constants are inlined by the bundler; no runtime lookup cost.
 *   - Zero-serialization: Symbols and strings are immutable shared references.
 *
 * Coordination:
 *   - Referenced by attributeParser.ts for token boundary enforcement.
 *   - Referenced by modules.ts for element marking and cleanup.
 *   - Referenced by evaluator.ts for scope resolution.
 */

/// <reference path="./composition.ts" />

// 1. Core Constants
export const ROOT_SELECTOR = '[data-init]';
export const STATE = 'nexus';
export const ATTRIBUTE_PREFIX = 'data-';
export const CUSTOM_EVENT_PREFIX = 'ux-';
export const DATA_PRESERVE_ATTR = 'data-preserve';

// 2. Nexus Expression Grammar (NEG) Tokens
export const NEG_TOKENS = {
  INTENT: '-',
  PATH: '.',
  GLOBAL: '#',
  MODIFIER: ':',
  LOGIC: '$',
  RULE: '@',
  CONTEXT: '&',
  OVERRIDE: '!',
  PSEUDO: '::',
  GRID: '||',
  MIRROR: '_',
} as const;

export const MODIFIER_DELIMITER = NEG_TOKENS.MODIFIER;

// 3. Relational Combinators
export const RELATIONAL_COMBINATORS = {
  PARENT: '^',
  CHILD: '>',
  SIBLING: '~',
  PREVIOUS: '-',
  NEXT: '+',
  ANCESTOR: '^^',
  DESCENDANT: '>>',
  PRIOR: '--',
  SUBSEQUENT: '++',
} as const;

// 4. Internal Keys for HTMLElement Augmentation
export const DATA_STACK_KEY = Symbol.for('__data_stack__');
export const COMPONENT_CONTEXT_KEY = Symbol.for('__component_context__');
export const CLEANUP_FUNCTIONS_KEY = Symbol.for('__cleanup_functions__');
export const EFFECT_RUNNERS_KEY = Symbol.for('__effect_runners__');
export const RUN_EFFECT_RUNNERS_KEY = Symbol.for('__run_effect_runners__');
export const MARKER_KEY = Symbol.for('__nexus_marker__');

// 5. Default Values
export const DEFAULT_DEBOUNCE_TIME = 250; // ms
export const DEFAULT_THROTTLE_TIME = 250; // ms
