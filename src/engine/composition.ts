/**
 * Nexus-UX Runtime Composition
 *
 * Defines the core interfaces and contracts for the framework's reactive
 * runtime. This module is the single source of truth for how modules
 * register themselves, how the runtime context is shaped, and how the
 * engine bootstraps its dependency graph.
 *
 * ZCZS Role:
 *   - Zero-copy: Interfaces are structural; no runtime overhead.
 *   - Zero-serialization: RuntimeContext is a plain object literal,
 *     marshaled by reference only.
 *
 * Coordination:
 *   - ModuleCoordinator consumes InitContext during registration.
 *   - All engine modules (reactivity, evaluator, parser, reconciler)
 *     are wired through RuntimeContext.
 *   - Module interfaces from modules.ts are referenced here to avoid
 *     circular dependencies.
 *
 * Nexus-UX Innovations Preserved:
 *   - Reactive Proxy Signals (via reactivity.ts bindings)
 *   - NEG Grammar (evaluator/parser contracts)
 *   - ZCZS guarantees through plain-object runtime context
 */

import { ActionFunction, AttributeModule, ActionModule, ListenerModule, ObserverModule, UtilityModule } from './modules.ts';
import { topology, TierLevel, TierConfig, TIER_CONFIGS } from './topology.ts';

/**
 * Initialization context provided to modules during registration.
 *
 * Modules receive this context to register their handlers with the
 * coordinator. It is constructed once during ModuleCoordinator
 * initialization and never mutated thereafter.
 */
export interface InitContext {
  registerAttributeModule: (name: string, module: AttributeModule) => void;
  registerActionModule: (name: string, module: ActionModule) => void;
  registerListenerModule: (name: string, module: ListenerModule) => void;
  registerObserverModule: (name: string, module: ObserverModule) => void;
  registerUtilityModule: (name: string, module: UtilityModule) => void;
  runtime: RuntimeContext;
}

/**
 * The central runtime context object passed to every directive handler,
 * modifier, sprite, and evaluator call.
 *
 * This is the "god object" of Nexus-UX, deliberately so: it provides
 * zero-copy access to every engine capability without function-call
 * indirection. Every property is a direct reference to the underlying
 * implementation.
 *
 * ZCZS Guarantee:
 *   - This object is created once and shared by reference.
 *   - No property is serialized or copied during normal operation.
 *   - Module registration mutates maps owned by ModuleCoordinator,
 *     not this object.
 */
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
  processElement: (element: Element) => void;

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
