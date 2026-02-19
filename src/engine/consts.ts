/// <reference path="./composition.ts" />

// 1. Core Constants
export const ROOT_SELECTOR = '[data-ux-init]';
export const ATTRIBUTE_PREFIX = 'data-';
export const CUSTOM_EVENT_PREFIX = 'ux-';
export const DATA_PRESERVE_ATTR = 'data-preserve';

// 2. Nexus Expression Grammar (NEG) Tokens
export const NEG_TOKENS = {
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

export const MODIFIER_ARGUMENT_DELIMITER = NEG_TOKENS.MODIFIER;

// 3. Relational Combinators
export const RELATIONAL_COMBINATORS = {
  CHILD: '>',
  SIBLING: '~',
  ADJACENT: '+',
} as const;

// 4. Internal Keys for HTMLElement Augmentation
export const DATA_STACK_KEY = Symbol.for('__data_stack__');
export const COMPONENT_CONTEXT_KEY = Symbol.for('__component_context__');
export const CLEANUP_FUNCTIONS_KEY = Symbol.for('__cleanup_functions__');
export const EFFECT_RUNNERS_KEY = Symbol.for('__effect_runners__');
export const RUN_EFFECT_RUNNERS_KEY = Symbol.for('__run_effect_runners__');

// 5. Default Values
export const DEFAULT_DEBOUNCE_TIME = 250; // ms
export const DEFAULT_THROTTLE_TIME = 250; // ms
