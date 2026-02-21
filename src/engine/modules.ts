import {
  RuntimeContext,
  InitContext
} from './composition.ts';

import {
  CLEANUP_FUNCTIONS_KEY,
  ROOT_SELECTOR
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
import { elUniqId, attrHash } from './utils/hash.ts';
import { MARKER_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';
import { mutationObserver, resizeObserver, intersectionObserver, disposeObservers } from './observers.ts';

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
  private markerDispenser = 1;

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
      globalSignals: getGlobalSignals.bind(this),
      setGlobalSignal: setGlobalSignal.bind(this),
      localSignals: getLocalSignals.bind(this),
      localActions: getLocalActions.bind(this),
      globalActions: getGlobalActions.bind(this),
      processElement: this.processElement.bind(this),
      parseAttribute: parseAttribute,
      scheduler: scheduler,
      reportError: reportError,
      refs: {}, // Placeholder for refs
      $: (selector: string) => {
        if (typeof document === 'undefined') return null;
        return resolveSelector(document.body as any, selector);
      },
      isDevMode: typeof document !== 'undefined' ? document.documentElement.hasAttribute('data-debug') : false,
      
      elUniqId: elUniqId,
      attrHash: attrHash,
      mutationObserver: mutationObserver,
      resizeObserver: resizeObserver,
      intersectionObserver: intersectionObserver,

      log: (...args: any[]) => logger.log(this.runtimeContext, ...args),
      warn: (...args: any[]) => logger.warn(this.runtimeContext, ...args),
      info: (...args: any[]) => logger.info(this.runtimeContext, ...args),
      debug: (...args: any[]) => logger.debug(this.runtimeContext, ...args),
    };
    // Dynamic Debug Support
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.debugObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-debug') {
            this.runtimeContext.isDevMode = document.documentElement.hasAttribute('data-debug');
          }
        });
      });
      this.debugObserver.observe(document.documentElement, { attributes: true });
    }

    this.initContext = {
      registerAttributeModule: this.registerAttributeModule.bind(this),
      registerActionModule: this.registerActionModule.bind(this),
      registerListenerModule: this.registerListenerModule.bind(this),
      registerObserverModule: this.registerObserverModule.bind(this),
      registerUtilityModule: this.registerUtilityModule.bind(this),
      runtime: this.runtimeContext,
    };
  }

  private debugObserver: MutationObserver | null = null;

  public dispose(): void {
    if (this.debugObserver) {
      this.debugObserver.disconnect();
      this.debugObserver = null;
    }
    this.attributeModules.clear();
    this.actionModules.clear();
    this.listenerModules.clear();
    this.observerModules.clear();
    this.utilityModules.clear();
    
    // Cleanup all registered observers
    disposeObservers();
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
    this.triggerScan();
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

  private scanTimeout: number | null = null;

  public triggerScan(): void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
    if (this.scanTimeout !== null) cancelAnimationFrame(this.scanTimeout);
    this.scanTimeout = requestAnimationFrame(() => {
      const roots = document.querySelectorAll(ROOT_SELECTOR);
      roots.forEach(root => {
        if (root instanceof HTMLElement) {
          this.processElement(root, true); // true = forceReWalk for late bindings
        }
      });
      this.scanTimeout = null;
    });
  }

  public getInitContext(): InitContext {
    return this.initContext;
  }

  public processElement(element: HTMLElement, forceReWalk: boolean = false): void {
    // 1. Element-level gating: If already initialized, skip structure walk
    if (!forceReWalk && (element as NexusEnhancedElement)[MARKER_KEY]) return;

    if (this.runtimeContext.isDevMode && !forceReWalk) this.runtimeContext.debug(`[Coordinator] Processing <${element.tagName}>`, element);
    
    // Mark as initialized IMMEDIATELY to prevent circularity or double-walk
    (element as NexusEnhancedElement)[MARKER_KEY] = this.markerDispenser++;

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
      const enhancedEl = element as NexusEnhancedElement;
      const fullAttrName = Array.from(element.attributes)[handler.originalIndex]?.name || handler.directiveName;
      const hashKey = `${fullAttrName}:${this.runtimeContext.attrHash(handler.directiveName, element.getAttribute(fullAttrName) || '')}`;

      // Check if already applied and hash matches (directive-level gating)
      let elRemovals = enhancedEl[CLEANUP_FUNCTIONS_KEY];
      if (elRemovals?.has(hashKey)) return;

      try {
        const cleanup = handler.handle();
        if (cleanup) {
          if (!elRemovals) {
            elRemovals = new Map();
            enhancedEl[CLEANUP_FUNCTIONS_KEY] = elRemovals;
          }
          elRemovals.set(hashKey, cleanup);
        }
      } catch (e) {
        // Prevent a single bad attribute from halting compilation of the whole element
        this.runtimeContext.reportError(
           e instanceof Error ? e : new Error(String(e)), 
           element, 
           `Attribute compilation failed for: ${fullAttrName}`
        );
      }
    });

    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        this.processElement(child, forceReWalk);
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
  // Use logger.error to ensure consistent prefixing [Nexus Error]
  // We don't have direct access to RuntimeContext here without global Nexus instance or passing it.
  // But logger.error doesn't actually use the context (though the signature had it).
  // Actually, logger.error signature was (context, ...args).
  // I'll update reportError to try and use the logger if possible, or just default to console.error with prefix.
  console.error(`[Nexus Error]`, error, el, expression);
}
