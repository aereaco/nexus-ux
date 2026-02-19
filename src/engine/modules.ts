import {
  RuntimeContext,
  InitContext
} from './composition.ts';

import {
  CLEANUP_FUNCTIONS_KEY
} from './consts.ts';

import * as reactivity from './reactivity.ts'; 
import { readonly } from './reactivity.ts';
import { morphDOM } from './morph.ts'; 
import { fetchUtilities } from './fetch.ts'; 
import { getDataStack } from './scope.ts';
import { evaluate } from './evaluator.ts'; 
import { parseAttribute } from './attributeParser.ts'; 
import { scheduler } from './scheduler.ts'; 
import { logger } from './logger.ts';
import { resolveSelector } from './selector.ts';

/**
 * Defines the shape of an action function.
 */
export type ActionFunction = (...args: any[]) => any;

/**
 * Base interface for all Nexus-UX modules.
 */
export interface Module {
  name: string;
  install?: (context: RuntimeContext) => void;
}

/**
 * Metadata for directive ordering.
 */
export interface DirectiveMetadata {
  before?: string[];
  after?: string[];
}

/**
 * Represents a module that handles `data-*` attributes.
 */
export interface AttributeModule extends Module {
  attribute?: string;
  metadata?: DirectiveMetadata;
  handle(element: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void;
}

/**
 * Represents a module that provides imperative actions.
 */
export interface ActionModule extends Module {
  action?: string;
  handle(element: HTMLElement, ...args: unknown[]): unknown;
}

/**
 * Represents a module that listens to DOM or custom events.
 */
export interface ListenerModule extends Module {
  event?: string;
  listen(element: HTMLElement, runtime: RuntimeContext): (() => void) | void;
}

/**
 * Represents a module that integrates with browser Observer APIs.
 */
export interface ObserverModule extends Module {
  observerType?: string;
  observe(element: HTMLElement, runtime: RuntimeContext): (() => void) | void;
}

/**
 * Represents a module that provides general-purpose utility functions.
 */
export interface UtilityModule extends Module {
  install(runtime: RuntimeContext): void;
}

declare module "./composition.ts" {
  interface InitContext {
    registerAttributeModule: (name: string, module: AttributeModule) => void;
    registerActionModule: (name: string, module: ActionModule) => void;
    registerListenerModule: (name: string, module: ListenerModule) => void;
    registerObserverModule: (name: string, module: ObserverModule) => void;
    registerUtilityModule: (name: string, module: UtilityModule) => void;
    runtime: RuntimeContext;
  }
}

/**
 * Global reactive state.
 */
const globalReactiveState = reactivity.reactive<Record<string, unknown>>({});

declare module "./composition.ts" {
  interface RuntimeContext {
    globalSignals: () => Record<string, unknown>;
    setGlobalSignal: (key: string, value: unknown) => void;
    localSignals: (el: HTMLElement) => Record<string, unknown>;
    localActions: (el: HTMLElement) => Record<string, ActionFunction>;
    globalActions: () => Record<string, ActionFunction>;
    reportError: (error: Error, el?: HTMLElement, expression?: string) => void;
  }
}

/**
 * ModuleCoordinator handles module lifecycle and element processing.
 */
export class ModuleCoordinator {
  public attributeModules: Map<string, AttributeModule> = new Map();
  public actionModules: Map<string, ActionModule> = new Map();
  public listenerModules: Map<string, ListenerModule> = new Map();
  public observerModules: Map<string, ObserverModule> = new Map();
  public utilityModules: Map<string, UtilityModule> = new Map();
  private directiveOrder: string[] = [];

  public runtimeContext: RuntimeContext;
  private initContext: InitContext;

  constructor() {
    this.runtimeContext = {
      effect: reactivity.effect,
      stop: reactivity.stop,
      reactive: reactivity.reactive,
      toRaw: reactivity.toRaw,
      isReactive: reactivity.isReactive,
      isReadonly: reactivity.isReadonly,
      isProxy: reactivity.isProxy,
      readonly: readonly,
      shallowReactive: reactivity.shallowReactive,
      shallowReadonly: reactivity.shallowReadonly,
      customRef: reactivity.customRef,
      triggerRef: reactivity.triggerRef,
      unref: reactivity.unref,
      ref: reactivity.ref,
      isRef: reactivity.isRef,
      toRefs: reactivity.toRefs,
      toRef: reactivity.toRef,
      computed: reactivity.computed,
      watch: reactivity.watch,
      onEffectCleanup: reactivity.onEffectCleanup,
      elementBoundEffect: reactivity.elementBoundEffect,

      morphDOM: morphDOM,
      fetch: fetchUtilities,
      evaluate: (el, expression, extras) => evaluate(el, expression, this.runtimeContext, extras),
      globalSignals: getGlobalSignals,
      setGlobalSignal: setGlobalSignal,
      localSignals: getLocalSignals,
      localActions: getLocalActions,
      globalActions: getGlobalActions,
      processElement: this.processElement.bind(this),
      parseAttribute: parseAttribute,
      scheduler: scheduler,
      reportError: reportError,
      refs: {}, // Placeholder for refs
      $: (selector: string) => resolveSelector(document.body as any, selector), // Global selector fallback
      isDevMode: document.documentElement.hasAttribute('data-debug'),
      log: (...args: any[]) => logger.log(this.runtimeContext, ...args),
      warn: (...args: any[]) => logger.warn(this.runtimeContext, ...args),
      info: (...args: any[]) => logger.info(this.runtimeContext, ...args),
    };

    // Dynamic Debug Support
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-debug') {
          this.runtimeContext.isDevMode = document.documentElement.hasAttribute('data-debug');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    this.initContext = {
      registerAttributeModule: this.registerAttributeModule.bind(this),
      registerActionModule: this.registerActionModule.bind(this),
      registerListenerModule: this.registerListenerModule.bind(this),
      registerObserverModule: this.registerObserverModule.bind(this),
      registerUtilityModule: this.registerUtilityModule.bind(this),
      runtime: this.runtimeContext,
    };
  }

  public initializeModules(rootElement: HTMLElement): void {
    this.utilityModules.forEach(module => {
      if (module.install) module.install(this.runtimeContext);
    });
    this.processElement(rootElement);
  }

  public registerAttributeModule(name: string, module: AttributeModule): void {
    const key = module.attribute || name;
    this.attributeModules.set(key, module);

    const index = this.directiveOrder.indexOf(key);
    if (index === -1) {
      if (module.metadata?.after?.[0]) {
        const afterIndex = this.directiveOrder.indexOf(module.metadata.after[0]);
        if (afterIndex !== -1) this.directiveOrder.splice(afterIndex + 1, 0, key);
        else this.directiveOrder.push(key);
      } else if (module.metadata?.before?.[0]) {
        const beforeIndex = this.directiveOrder.indexOf(module.metadata.before[0]);
        if (beforeIndex !== -1) this.directiveOrder.splice(beforeIndex, 0, key);
        else this.directiveOrder.unshift(key);
      } else {
        this.directiveOrder.push(key);
      }
    }
  }

  public registerActionModule(name: string, module: ActionModule): void {
    this.actionModules.set(name, module);
  }

  public registerListenerModule(name: string, module: ListenerModule): void {
    this.listenerModules.set(name, module);
  }

  public registerObserverModule(name: string, module: ObserverModule): void {
    this.observerModules.set(name, module);
  }

  public registerUtilityModule(name: string, module: UtilityModule): void {
    this.utilityModules.set(name, module);
  }

  public getInitContext(): InitContext {
    return this.initContext;
  }

  public processElement(element: HTMLElement): void {
    const handlersToExecute: {
      directiveName: string;
      handle: () => (() => void) | void;
      originalIndex: number;
    }[] = [];

    Array.from(element.attributes).forEach((attr, index) => {
      const parsedAttr = this.runtimeContext.parseAttribute(attr.name, this.runtimeContext, element);
      if (parsedAttr?.directive) {
        const module = this.attributeModules.get(parsedAttr.directive);
        if (module) {
          handlersToExecute.push({
            directiveName: parsedAttr.directive,
            handle: () => module.handle(element, attr.value, this.runtimeContext),
            originalIndex: index,
          });
        }
      }
    });

    handlersToExecute.sort((a, b) => {
      const indexA = this.directiveOrder.indexOf(a.directiveName);
      const indexB = this.directiveOrder.indexOf(b.directiveName);
      const effA = indexA === -1 ? this.directiveOrder.length : indexA;
      const effB = indexB === -1 ? this.directiveOrder.length : indexB;
      return effA === effB ? a.originalIndex - b.originalIndex : effA - effB;
    });

    handlersToExecute.forEach(handler => {
      const cleanup = handler.handle();
      if (cleanup) {
        if (!element[CLEANUP_FUNCTIONS_KEY]) {
          element[CLEANUP_FUNCTIONS_KEY] = new Set();
        }
        element[CLEANUP_FUNCTIONS_KEY].add(cleanup);
      }
    });

    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        this.processElement(child);
      }
    });
  }
}

function getGlobalSignals(): Record<string, unknown> {
  return globalReactiveState;
}

function setGlobalSignal(key: string, value: unknown): void {
  globalReactiveState[key] = value;
}

function getLocalSignals(el: HTMLElement): Record<string, unknown> {
  const dataStack = getDataStack(el);
  return dataStack.length > 0 ? dataStack[0] : reactivity.reactive({});
}

function getLocalActions(_el: HTMLElement): Record<string, ActionFunction> {
  return {};
}

function getGlobalActions(this: ModuleCoordinator): Record<string, ActionFunction> {
  const actions: Record<string, ActionFunction> = {};
  this.actionModules.forEach((module, name) => {
    actions[name] = (...args: any[]) => module.handle(document.body, ...args);
  });
  return actions;
}

export function reportError(error: Error, el?: HTMLElement, expression?: string): void {
  console.error(error, el, expression);
}
