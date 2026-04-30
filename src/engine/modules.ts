import {
  RuntimeContext,
  InitContext
} from './composition.ts';

import {
  CLEANUP_FUNCTIONS_KEY,
  ROOT_SELECTOR
} from './consts.ts';

import * as reactivity from './reactivity.ts'; 
import * as reconciler from './reconciler.ts'; 
import { readonly } from './reactivity.ts';
import { morphDOM } from './reconciler.ts'; 
import { fetchUtilities } from './fetch.ts'; 
import { getDataStack } from './scope.ts';
import { evaluate } from './evaluator.ts'; 
import { parseAttribute } from './attributeParser.ts'; 
import { scheduler } from './scheduler.ts'; 
import { logger } from './logger.ts';
import { resolveSelector } from '../modules/sprites/selector.ts';
import { elUniqId, attrHash } from './utils/hash.ts';
import { MARKER_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';
import { attachObserver, registerObserver, disposeObservers } from './observers.ts';
import { topology, TierLevel } from './topology.ts';
import { stylesheet } from './stylesheet.ts';
import { MCPClient } from './mcp.ts';

/**
 * Defines the shape of an action function.
 */
export type ActionFunction = (...args: any[]) => any;

/**
 * Base interface for all Nexus-UX modules.
 */
export interface Module {
  name: string;
  onGlobalInit?: (context: RuntimeContext) => void;
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
 * Represents a module that intercepts and refines DOM events or pipeline evaluation.
 */
export interface ModifierModule extends Module {
  handle(payload: any, element: HTMLElement, argument: string, runtime: RuntimeContext): any;
  /**
   * Universal Pipeline Extensibility: Allow modifiers to safely wrap the evaluation engine
   * directly, deferring or mutating values without assuming the executing payload is a DOM Event.
   */
  interceptPipeline?: (evaluate: RuntimeContext['evaluate'], element: HTMLElement, argument: string, runtime: RuntimeContext) => RuntimeContext['evaluate'];
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

/**
 * Represents a module that provides reactive read/write wrappers for browser APIs.
 * Mirrors are injected into the expression scope with the `_` prefix.
 */
export interface MirrorModule extends Module {
  prefix: string;  // e.g. 'localStorage', 'sessionStorage', 'indexedDB'
  create(runtime: RuntimeContext): object;  // Returns the reactive Proxy
}

/**
 * Represents a module that provides imperative commands in expression scope.
 * Sprites are injected with the `$` prefix.
 */
export interface SpriteModule extends Module {
  sprites(runtime: RuntimeContext): Record<string, unknown>;  // e.g. { $cache: {...} }
}

/**
 * Represents a module that provides environment-aware conditional boundaries.
 * Scopes are used with the `@` prefix in directives.
 */
export interface ScopeModule extends Module {
  rule: string;  // e.g. 'media', 'auth', 'os'
  evaluate(expression: string, runtime: RuntimeContext): boolean | unknown;
}

declare module "./composition.ts" {
  interface InitContext {
    registerAttributeModule: (name: string, module: AttributeModule) => void;
    registerActionModule: (name: string, module: ActionModule) => void;
    registerModifierModule: (name: string, module: ModifierModule) => void;
    registerListenerModule: (name: string, module: ListenerModule) => void;
    registerObserverModule: (name: string, module: ObserverModule) => void;
    registerUtilityModule: (name: string, module: UtilityModule) => void;
    registerMirrorModule: (name: string, module: MirrorModule) => void;
    registerSpriteModule: (name: string, module: SpriteModule) => void;
    registerScopeModule: (name: string, module: ScopeModule) => void;
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
    getModifier: (name: string) => ModifierModule | undefined;
    reportError: (err: Error, el?: HTMLElement, expr?: string) => void;
  }
}

/**
 * ModuleCoordinator handles module lifecycle and element processing.
 */
export class ModuleCoordinator {
  public attributeModules: Map<string, AttributeModule> = new Map();
  public actionModules: Map<string, ActionModule> = new Map();
  public modifierModules: Map<string, ModifierModule> = new Map();
  public listenerModules: Map<string, ListenerModule> = new Map();
  public observerModules: Map<string, ObserverModule> = new Map();
  public utilityModules: Map<string, UtilityModule> = new Map();
  public mirrorModules: Map<string, MirrorModule> = new Map();
  public spriteModules: Map<string, SpriteModule> = new Map();
  public scopeModules: Map<string, ScopeModule> = new Map();
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
      shallowRef: reactivity.shallowRef,
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
      getModifier: (name: string) => this.modifierModules.get(name),
      processElement: this.processElement.bind(this),
      reconcileClass: (el, val) => reconciler.reconcileClass(el, val),
      reconcileStyle: (el, val) => reconciler.reconcileStyle(el, val),
      adoptStyle: (el) => el.classList.forEach(cls => stylesheet.adoptClass(cls, el)),
      parseAttribute: parseAttribute,
      scheduler: scheduler,
      reportError: (err: Error, el?: HTMLElement, expr?: string) => logger.error(this.runtimeContext, err.message, el, expr),

      $: (selector: string) => {
        if (typeof document === 'undefined') return null;
        return resolveSelector(document.body as any, selector);
      },
      isDevMode: typeof document !== 'undefined' ? document.documentElement.hasAttribute('data-debug') : false,
      
      elUniqId: elUniqId,
      attrHash: attrHash,

      // Engine Topology (Tier 0-3)
      topology: {
        getTier: () => topology.getTier(),
        getConfig: () => topology.getTierConfig(),
        getActiveWorkers: () => topology.getActiveWorkers(),
        isSABAvailable: () => topology.isSABAvailable(),
        getLagVariance: () => topology.getLagVariance(),
      },

      log: (...args: unknown[]) => logger.log(this.runtimeContext, ...args),
      warn: (...args: unknown[]) => logger.warn(this.runtimeContext, ...args),
      info: (...args: unknown[]) => logger.info(this.runtimeContext, ...args),
      debug: (...args: unknown[]) => logger.debug(this.runtimeContext, ...args),
      mcp: undefined as any // Placeholder for initialization below
    };

    // Optional MCP Initialization
    if (typeof document !== 'undefined') {
      const mcpUrl = document.querySelector('meta[name="nexus-mcp-server"]')?.getAttribute('content');
      if (mcpUrl) {
        this.runtimeContext.mcp = new MCPClient(mcpUrl);
        this.runtimeContext.mcp.connect().catch(() => {
          this.runtimeContext.debug(`[Coordinator] MCP Connection skipped: ${mcpUrl}`);
        });
      }
    }
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
      registerModifierModule: this.registerModifierModule.bind(this),
      registerListenerModule: this.registerListenerModule.bind(this),
      registerObserverModule: this.registerObserverModule.bind(this),
      registerUtilityModule: this.registerUtilityModule.bind(this),
      registerMirrorModule: this.registerMirrorModule.bind(this),
      registerSpriteModule: this.registerSpriteModule.bind(this),
      registerScopeModule: this.registerScopeModule.bind(this),
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
    this.modifierModules.clear();
    this.listenerModules.clear();
    this.observerModules.clear();
    this.utilityModules.clear();
    
    // Cleanup all registered observers
    disposeObservers();
  }

  public initializeModules(rootElement: HTMLElement): void {
    this.utilityModules.forEach((module, name) => {
      if (module.onGlobalInit) {
        try {
          module.onGlobalInit(this.runtimeContext);
        } catch (e) {
          this.runtimeContext.reportError(
            e instanceof Error ? e : new Error(String(e)),
            undefined,
            `Failed to initialize module: ${name}`
          );
        }
      }
    });
    this.processElement(rootElement);

    // Auto-attach mutation observer to root for dynamic content processing.
    // Any DOM nodes added to the root subtree will be automatically processed
    // by the engine, and removed nodes will have their cleanups invoked.
    const cleanup = attachObserver('mutationObserver', rootElement, this.runtimeContext);
    if (cleanup) {
      const enhanced = rootElement as NexusEnhancedElement;
      if (!enhanced[CLEANUP_FUNCTIONS_KEY]) enhanced[CLEANUP_FUNCTIONS_KEY] = new Map();
      enhanced[CLEANUP_FUNCTIONS_KEY]!.set('__rootMutationObserver__', cleanup);
    }
  }

  public registerModifierModule(name: string, module: ModifierModule): void {
    this.modifierModules.set(name, module);
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
    // Also register with the centralized observer registry
    registerObserver(name, module);
  }

  public registerUtilityModule(name: string, module: UtilityModule): void {
    this.utilityModules.set(name, module);
  }

  public registerMirrorModule(name: string, module: MirrorModule): void {
    this.mirrorModules.set(name, module);
    // Auto-inject into expression scope with _ prefix
    const proxy = module.create(this.runtimeContext);
    this.runtimeContext.setGlobalSignal(`_${module.prefix}`, proxy);
  }

  public registerSpriteModule(name: string, module: SpriteModule): void {
    this.spriteModules.set(name, module);
    // Auto-inject sprite commands into expression scope
    const sprites = module.sprites(this.runtimeContext);
    Object.entries(sprites).forEach(([spriteName, handler]) => {
      this.registerActionModule(spriteName, {
        name: spriteName,
        handle: (_el, ...args) => (handler as any)(...args)
      });
    });
  }

  public registerScopeModule(name: string, module: ScopeModule): void {
    this.scopeModules.set(name, module);
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


  /**
   * Processes a DOM element and its children, applying directive modules.
   * Now supports recursive Isolation Firewalls via data-ignore.
   */
  public processElement(
    element: HTMLElement, 
    forceReWalk: boolean = false, 
    isolationLevel: 'none' | 'total' | 'ux' | 'style' = 'none'
  ): void {
    // 1. Isolation Level Detection (Nested Overrides)
    let currentIsolation = isolationLevel;
    
    if (element.hasAttribute('data-ignore:off')) {
      currentIsolation = 'none';
    } else    if (element.hasAttribute('data-nexus-ignore')) {
      currentIsolation = 'total';
    } else if (element.hasAttribute('data-ux-ignore')) {
      currentIsolation = 'ux';
    } else if (element.hasAttribute('data-style-ignore')) {
      currentIsolation = 'style';
    }

    // 2. Early Gating
    if (currentIsolation === 'total') return; // Absolute Firewall: Stop recursion instantly

    // Element-level gating: If already initialized, skip structure walk
    if (!forceReWalk && (element as NexusEnhancedElement)[MARKER_KEY]) return;

    if (this.runtimeContext.isDevMode && !forceReWalk) this.runtimeContext.debug(`[Coordinator] Processing <${element.tagName}> (Isolation: ${currentIsolation})`, element);
    
    // Mark as initialized IMMEDIATELY to prevent circularity or double-walk
    (element as NexusEnhancedElement)[MARKER_KEY] = this.markerDispenser++;

    // 3. JIT Style Adoption (Gated by 'style' isolation)
    if (currentIsolation !== 'style' && element.classList && element.classList.length > 0) {
      element.classList.forEach(cls => stylesheet.adoptClass(cls, element as HTMLElement, this.runtimeContext));
    }

    // 4. Directive Processing (Gated by 'ux' isolation)
    if (currentIsolation !== 'ux') {
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
              handle: () => {
                let scopedRuntime = this.runtimeContext;
                if (parsedAttr.modifiers && parsedAttr.modifiers.length > 0) {
                  scopedRuntime = { ...this.runtimeContext };
                  let currentEvaluate = scopedRuntime.evaluate;
                  parsedAttr.modifiers.forEach((modFull: string) => {
                    let modName = modFull;
                    let modArg = '';
                    const dashIdx = modFull.indexOf('-');
                    if (dashIdx !== -1) {
                      modName = modFull.substring(0, dashIdx);
                      modArg = modFull.substring(dashIdx + 1);
                    }
                    const modModule = this.modifierModules.get(modName);
                    if (modModule && typeof modModule.interceptPipeline === 'function') {
                      currentEvaluate = modModule.interceptPipeline(currentEvaluate, element, modArg || parsedAttr.target || '', scopedRuntime);
                    }
                  });
                  scopedRuntime.evaluate = currentEvaluate;
                }
                return module.handle(element, attr.value, scopedRuntime);
              },
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
          this.runtimeContext.reportError(
            e instanceof Error ? e : new Error(String(e)), 
            element, 
            `Attribute compilation failed for: ${fullAttrName}`
          );
        }
      });
    }

    // 5. Recursive Walk (Passing current Isolation state)
    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        this.processElement(child, forceReWalk, currentIsolation);
      } else if (child instanceof Element && child.classList && child.classList.length > 0) {
        if (currentIsolation !== 'style') {
          child.classList.forEach(cls => stylesheet.adoptClass(cls, child as unknown as HTMLElement, this.runtimeContext));
          Array.from(child.children).forEach(grandchild => {
            if (grandchild instanceof Element && grandchild.classList && grandchild.classList.length > 0) {
              grandchild.classList.forEach(cls => stylesheet.adoptClass(cls, grandchild as unknown as HTMLElement, this.runtimeContext));
            }
          });
        }
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
    // Create a wrapper that preserves properties from module.handle
    const action = (...args: any[]) => module.handle(document.body, ...args);
    const proxyAction = new Proxy(action, {
      get(target, key) {
        if (key in target) return (target as any)[key];
        const val = (module.handle as any)[key];
        return typeof val === 'function' ? val.bind(module.handle) : val;
      }
    });
    actions[name] = proxyAction;
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
