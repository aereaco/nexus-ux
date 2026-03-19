import { ActionFunction } from './modules.ts';
import { AttributeModule, ActionModule, ListenerModule, ObserverModule, UtilityModule } from './modules.ts';
import type { TierLevel, TierConfig } from './topology.ts';

export interface InitContext {
  registerAttributeModule: (name: string, module: AttributeModule) => void;
  registerActionModule: (name: string, module: ActionModule) => void;
  registerListenerModule: (name: string, module: ListenerModule) => void;
  registerObserverModule: (name: string, module: ObserverModule) => void;
  registerUtilityModule: (name: string, module: UtilityModule) => void;
  runtime: RuntimeContext;
}

export interface RuntimeContext {
  // Reactivity (Vue)
  effect: typeof import('@vue/reactivity').effect;
  stop: typeof import('@vue/reactivity').stop;
  reactive: typeof import('@vue/reactivity').reactive;
  toRaw: typeof import('@vue/reactivity').toRaw;
  isReactive: typeof import('@vue/reactivity').isReactive;
  isReadonly: typeof import('@vue/reactivity').isReadonly;
  isProxy: typeof import('@vue/reactivity').isProxy;
  readonly: typeof import('@vue/reactivity').readonly;
  shallowReactive: typeof import('@vue/reactivity').shallowReactive;
  shallowReadonly: typeof import('@vue/reactivity').shallowReadonly;
  customRef: typeof import('@vue/reactivity').customRef;
  triggerRef: typeof import('@vue/reactivity').triggerRef;
  unref: typeof import('@vue/reactivity').unref;
  ref: typeof import('@vue/reactivity').ref;
  shallowRef: typeof import('@vue/reactivity').shallowRef;
  isRef: typeof import('@vue/reactivity').isRef;
  toRefs: typeof import('@vue/reactivity').toRefs;
  toRef: typeof import('@vue/reactivity').toRef;
  computed: typeof import('@vue/reactivity').computed;
  watch: typeof import('@vue/reactivity').watch;
  onEffectCleanup: typeof import('@vue/reactivity').onEffectCleanup;
  elementBoundEffect: (el: HTMLElement, effect: () => void) => [() => void, () => void];

  // Expression Evaluator & Parser
  evaluate: (el: Element | Text | Comment, expression: string, extras?: Record<string, unknown>) => unknown;
  parseAttribute: (attrName: string, context: RuntimeContext, element: HTMLElement) => any;

  // DOM
  morphDOM: any;
  processElement: (element: HTMLElement) => void;

  // State Management
  globalSignals: () => Record<string, unknown>;
  setGlobalSignal: (key: string, value: unknown) => void;
  localSignals: (el: HTMLElement) => Record<string, unknown>;

  // Actions
  localActions: (el: HTMLElement) => Record<string, (...args: any[]) => any>;
  globalActions: () => Record<string, (...args: any[]) => any>;

  // Error Reporting
  reportError: (error: Error, el?: HTMLElement, expression?: string) => void;

  // Scheduler
  scheduler: any;

  // Utilities
  fetch?: any;
  refs: Record<string, HTMLElement>;
  $: (selector: string) => any;
  isDevMode?: boolean;

  // Garbage-Free Architecture Utils
  elUniqId: (el: Element) => string;
  attrHash: (key: string | number, val: string | number) => number;

  // Engine Topology (Tier 0-3)
  topology: {
    getTier: () => TierLevel;
    getConfig: () => TierConfig;
    getActiveWorkers: () => number;
    isSABAvailable: () => boolean;
    getLagVariance: () => number;
  };

  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}
