import { ActionFunction, AttributeModule, ActionModule, ListenerModule, ObserverModule, UtilityModule } from './modules.ts';
import { topology, TierLevel, TierConfig, TIER_CONFIGS } from './topology.ts';

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
  effect: typeof import('./reactivity.ts').effect;
  stop: typeof import('./reactivity.ts').stop;
  reactive: typeof import('./reactivity.ts').reactive;
  toRaw: typeof import('./reactivity.ts').toRaw;
  isReactive: typeof import('./reactivity.ts').isReactive;
  isReadonly: typeof import('./reactivity.ts').isReadonly;
  isProxy: typeof import('./reactivity.ts').isProxy;
  readonly: typeof import('./reactivity.ts').readonly;
  shallowReactive: typeof import('./reactivity.ts').shallowReactive;
  shallowReadonly: typeof import('./reactivity.ts').shallowReadonly;
  customRef: typeof import('./reactivity.ts').customRef;
  triggerRef: typeof import('./reactivity.ts').triggerRef;
  unref: typeof import('./reactivity.ts').unref;
  ref: typeof import('./reactivity.ts').ref;
  shallowRef: typeof import('./reactivity.ts').shallowRef;
  isRef: typeof import('./reactivity.ts').isRef;
  toRefs: typeof import('./reactivity.ts').toRefs;
  toRef: typeof import('./reactivity.ts').toRef;
  computed: typeof import('./reactivity.ts').computed;
  watch: typeof import('./reactivity.ts').watch;
  onEffectCleanup: typeof import('./reactivity.ts').onEffectCleanup;
  elementBoundEffect: (el: HTMLElement, effect: () => void) => [() => void, () => void];

  // Expression Evaluator & Parser
  evaluate: (el: Element | Text | Comment, expression: string, extras?: Record<string, unknown>) => unknown;
  parseAttribute: (attrName: string, context: RuntimeContext, element: HTMLElement) => any;

  // DOM
  morphDOM: (from: Element, to: Element | string, options?: Record<string, unknown>) => void;
  reconcileClass: (el: HTMLElement, value: unknown) => void;
  reconcileStyle: (el: HTMLElement, value: unknown) => void;
  adoptStyle: (el: HTMLElement) => void;
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
  $: (selector: string) => any;
  isDevMode?: boolean;
  agent?: any; // SelfHealAgent (typed as any to avoid circular dependency)

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
  mcp?: any; // MCPClient instance
  predictive?: any; // PredictiveEngine instance
  spatial?: any; // $spatial sprite API
  svg?: any; // $svg sprite API
  $animate?: any; // $animate sprite reference
  sprites: any; // Namespace for all registered sprites
  update: (fn: () => void) => void; // Batch update or immediate execution hook
}
