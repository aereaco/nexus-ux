import { ModuleCoordinator } from './engine/modules.ts';
import { registerScopeProvider } from './engine/scope.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology, runInWorker } from './engine/topology.ts';
export { runInWorker };
import { initSelfHeal, getBeaconHistory } from './engine/agent.ts';
import { fetchModule } from './engine/fetch.ts';
import { corePredictiveEngine } from './engine/predictive.ts';
import { cacheEngine } from './engine/cache.ts';
import { scheduler } from './engine/scheduler.ts';
import { getElementScope } from './engine/scope.ts';
import {
  reactiveLocalStorage,
  reactiveSessionStorage,
  getIndexedDBProxy
} from './engine/reflect.ts';
import { morphDOM, teardownSubtree } from './engine/reconciler.ts';
import {
  reactive,
  ref,
  computed,
  effect,
  elementBoundEffect,
  watch
} from './engine/reactivity.ts';

// Auto-Discovered Modules (inlined by build.ts from generated manifest.ts)
import {
  autoAttributes,
  autoSprites,
  autoScopes,
  autoModifiers,
  autoListeners,
  autoObservers
} from './manifest.ts';

const _idCounters: Record<string, number> = {};
export function $id(groupName: string = 'default'): string {
  if (!_idCounters[groupName]) {
    _idCounters[groupName] = 1;
  } else {
    _idCounters[groupName]++;
  }
  return `${groupName}-${_idCounters[groupName]}`;
}

export function $nextTick(cb?: () => void): Promise<void> {
  return new Promise(resolve => {
    scheduler.nextTick(() => {
      cb?.();
      resolve();
    });
  });
}

export class UX {
  private _coordinator: ModuleCoordinator;
  public readonly reactive = reactive;
  public readonly ref = ref;
  public readonly computed = computed;
  public readonly effect = effect;
  public readonly elementBoundEffect = elementBoundEffect;
  public readonly watch = watch;
  public readonly nextTick = $nextTick;
  public readonly id = $id;
  public readonly storage = {
    local: reactiveLocalStorage,
    session: reactiveSessionStorage
  };
  public readonly predictive = corePredictiveEngine;
  public readonly cache = cacheEngine;
  public readonly topology = topology;
  public readonly selfHeal = { getHistory: getBeaconHistory };
  public readonly runInWorker = runInWorker;
  public readonly UX = UX;

  constructor() {
    this._coordinator = new ModuleCoordinator();

    // Scope providers
    registerScopeProvider('$el', (el) => el);
    registerScopeProvider('$dispatch', (el) => (eventName: string, detail?: unknown) => {
      if (!(el instanceof Element)) return;
      el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
    });
    registerScopeProvider('$global', (_el, runtime) => runtime.globalSignals());
    registerScopeProvider('$actions', (_el, runtime) => runtime.globalActions());


    // Inline actions
    this._coordinator.registerActionModule('$id', {
      name: '$id',
      handle: (_el, ...args: any[]) => ($id as any)(...args)
    });
    this._coordinator.registerActionModule('$nextTick', {
      name: '$nextTick',
      handle: (_el, ...args: any[]) => ($nextTick as any)(...args)
    });

    // Register all modules from manifest
    this.registerFromManifest();
    this._coordinator.finishBooting();

    // Predictive engine
    this._coordinator.runtimeContext.setGlobalSignal('$predictive', corePredictiveEngine);

    // Fetch utility
    this._coordinator.registerUtilityModule('fetch', fetchModule);

    // Self-heal
    initSelfHeal(this._coordinator.runtimeContext, {
      enabled: true,
      emitToConsole: this._coordinator.runtimeContext.isDevMode ?? false,
      emitToPlatform: false
    });

    this.init();

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('ux:ready', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('nexus-ready', { bubbles: true }));
    }
  }

  private registerFromManifest() {
    autoAttributes.forEach(({ name, module }) => {
      this._coordinator.registerAttributeModule(name, module.default || module);
    });

    autoSprites.forEach(({ name, module }) => {
      const spriteMod = module.default || Object.values(module).find((m: any) => m && typeof m.sprites === 'function');
      if (spriteMod && typeof spriteMod.sprites === 'function') {
        this._coordinator.registerSpriteModule(spriteMod.name || name, spriteMod);
      }
    });

    autoScopes.forEach(({ name, module }) => {
      const scopeMod = module.default || Object.values(module)[0];
      if (scopeMod) {
        this._coordinator.registerScopeModule(scopeMod.name || name, scopeMod);
      }
    });

    autoModifiers.forEach(({ name, module }) => {
      this._coordinator.registerModifierModule(name, module.default || module);
    });

    autoObservers.forEach(({ name, module }) => {
      const obsMod = module.default || Object.values(module)[0];
      if (obsMod) {
        this._coordinator.registerObserverModule(obsMod.name || name, obsMod);
      }
    });

    autoListeners.forEach(({ name, module }) => {
      const listenerMod = module.default || Object.values(module)[0];
      if (listenerMod) {
        this._coordinator.registerListenerModule(listenerMod.name || name, listenerMod);
      }
    });
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.scan());
    } else {
      this.scan();
    }
  }

  public scan() {
    const roots = document.querySelectorAll(ROOT_SELECTOR);
    roots.forEach(root => {
      if (root instanceof HTMLElement) {
        this._coordinator.initializeModules(root);
      }
    });
  }

  public get coordinator() { return this._coordinator; }
  public get coordinate() { return this._coordinator; }
  public get runtime() { return this._coordinator.runtimeContext; }
  public get signals() { return this._coordinator.runtimeContext.globalSignals(); }
  public get sprites() { return this._coordinator.runtimeContext.sprites; }
  public get idb() { return getIndexedDBProxy(); }

  public getSignal<T = unknown>(key: string): T {
    return this._coordinator.runtimeContext.globalSignals()[key] as T;
  }

  public setSignal(key: string, value: unknown): void {
    this._coordinator.runtimeContext.setGlobalSignal(key, value);
  }

  public scope(el: Element, extras?: Record<string, unknown>) {
    return getElementScope(el, this._coordinator.runtimeContext, extras);
  }

  public localSignals(el: HTMLElement) {
    return this._coordinator.runtimeContext.localSignals(el);
  }

  public evaluate(el: Element, expr: string, extras?: Record<string, unknown>) {
    return this._coordinator.runtimeContext.evaluate(el as HTMLElement, expr, extras);
  }

  public process(el: HTMLElement, forceReWalk: boolean = false) {
    return this._coordinator.processElement(el, forceReWalk);
  }

  public teardown(el: Node, includeRoot: boolean = true) {
    return teardownSubtree(el, includeRoot);
  }

  public morph(el: Element, htmlOrNode: Element | string, options?: Record<string, unknown>) {
    return morphDOM(el, htmlOrNode, options);
  }

  public action(name: string, fn: (...args: any[]) => unknown) {
    this._coordinator.registerActionModule(name, {
      name,
      handle: (_el, ...args: any[]) => fn(...args)
    });
  }

  public register(type: string, name: string, module: any) {
    const c = this._coordinator;
    switch (type) {
      case 'attribute': c.registerAttributeModule(name, module); break;
      case 'action': c.registerActionModule(name, module); break;
      case 'modifier': c.registerModifierModule(name, module); break;
      case 'listener': c.registerListenerModule(name, module); break;
      case 'observer': c.registerObserverModule(name, module); break;
      case 'utility': c.registerUtilityModule(name, module); break;
    }
  }
}

export const uxInstance = (typeof document !== 'undefined') ? new UX() : null as unknown as UX;
export const Nexus = uxInstance;
export default uxInstance;

if (typeof document !== 'undefined') {
  topology.start();
}

const elementUxBridgeCache = new WeakMap<Element, {
  readonly state: Record<string, unknown>;
  readonly scope: Record<string, unknown>;
  evaluate: (expr: string, extras?: Record<string, unknown>) => unknown;
  morph: (htmlOrNode: Element | string, options?: Record<string, unknown>) => void;
  process: (forceReWalk?: boolean) => void;
  teardown: (includeRoot?: boolean) => void;
}>();

if (typeof Element !== 'undefined' && !Object.getOwnPropertyDescriptor(Element.prototype, 'ux')) {
  Object.defineProperty(Element.prototype, 'ux', {
    configurable: true,
    get(this: Element) {
      let bridge = elementUxBridgeCache.get(this);
      if (!bridge && uxInstance) {
        const el = this;
        bridge = {
          get state() {
            return el instanceof HTMLElement ? uxInstance.localSignals(el) : {};
          },
          get scope() {
            return uxInstance.scope(el);
          },
          evaluate: (expr: string, extras?: Record<string, unknown>) => uxInstance.evaluate(el, expr, extras),
          morph: (htmlOrNode: Element | string, options?: Record<string, unknown>) => uxInstance.morph(el, htmlOrNode, options),
          process: (forceReWalk: boolean = false) => {
            if (el instanceof HTMLElement) uxInstance.process(el, forceReWalk);
          },
          teardown: (includeRoot: boolean = true) => uxInstance.teardown(el, includeRoot)
        };
        elementUxBridgeCache.set(el, bridge);
      }
      return bridge;
    }
  });
}

if (typeof window !== 'undefined' && uxInstance) {
  (globalThis as any).UX = uxInstance;
  (globalThis as any).Nexus = uxInstance;
  if ((globalThis as any).NexusHighlights && !(uxInstance as any).Highlights) {
    (uxInstance as any).Highlights = (globalThis as any).NexusHighlights;
  }
  (globalThis as any)._UX_RUNTIME = uxInstance.runtime;
  (globalThis as any)._NEXUS_RUNTIME = uxInstance.runtime;
}
