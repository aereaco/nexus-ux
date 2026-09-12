import { ModuleCoordinator } from './engine/modules.ts';
import { registerScopeProvider } from './engine/scope.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology, runInWorker } from './engine/topology.ts';
export { runInWorker };
import { initSelfHeal, getBeaconHistory } from './engine/agent.ts';
import { fetchModule } from './engine/fetch.ts';
import { corePredictiveEngine } from './engine/predictive.ts';
import { cacheEngine } from './engine/cache.ts';
import { handleWorkerMessage } from './engine/logic.worker.ts';

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

export function $nextTick(): Promise<void> {
  return new Promise(resolve => {
    Promise.resolve().then(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export class UX {
  private coordinator: ModuleCoordinator;

  constructor() {
    this.coordinator = new ModuleCoordinator();

    // Scope providers
    registerScopeProvider('$el', (el) => el);
    registerScopeProvider('$dispatch', (el) => (eventName: string, detail?: unknown) => {
      if (!(el instanceof Element)) return;
      el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
    });
    registerScopeProvider('$global', (_el, runtime) => runtime.globalSignals());
    registerScopeProvider('$actions', (_el, runtime) => runtime.globalActions());


    // Inline actions
    this.coordinator.registerActionModule('$id', {
      name: '$id',
      handle: (_el, ...args: any[]) => ($id as any)(...args)
    });
    this.coordinator.registerActionModule('$nextTick', {
      name: '$nextTick',
      handle: (_el, ...args: any[]) => ($nextTick as any)(...args)
    });

    // Register all modules from manifest
    this.registerFromManifest();

    // Predictive engine
    this.coordinator.runtimeContext.setGlobalSignal('$predictive', corePredictiveEngine);
    (this as any).predictive = corePredictiveEngine;
    (this as any).cache = cacheEngine;

    // Fetch utility
    this.coordinator.registerUtilityModule('fetch', fetchModule);

    // Self-heal
    initSelfHeal(this.coordinator.runtimeContext, {
      enabled: true,
      emitToConsole: this.coordinator.runtimeContext.isDevMode ?? false,
      emitToPlatform: false
    });

    this.init();

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('nexus-ready', { bubbles: true }));
    }
  }

  private registerFromManifest() {
    autoAttributes.forEach(({ name, module }) => {
      this.coordinator.registerAttributeModule(name, module.default || module);
    });

    autoSprites.forEach(({ name, module }) => {
      const spriteMod = module.default || Object.values(module).find((m: any) => m && typeof m.sprites === 'function');
      if (spriteMod && typeof spriteMod.sprites === 'function') {
        this.coordinator.registerSpriteModule(spriteMod.name || name, spriteMod);
      }
    });

    autoScopes.forEach(({ name, module }) => {
      const scopeMod = module.default || Object.values(module)[0];
      if (scopeMod) {
        this.coordinator.registerScopeModule(scopeMod.name || name, scopeMod);
      }
    });

    autoModifiers.forEach(({ name, module }) => {
      this.coordinator.registerModifierModule(name, module.default || module);
    });

    autoObservers.forEach(({ name, module }) => {
      const obsMod = module.default || Object.values(module)[0];
      if (obsMod) {
        this.coordinator.registerObserverModule(obsMod.name || name, obsMod);
      }
    });

    autoListeners.forEach(({ name, module }) => {
      const listenerMod = module.default || Object.values(module)[0];
      if (listenerMod) {
        this.coordinator.registerListenerModule(listenerMod.name || name, listenerMod);
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
        this.coordinator.initializeModules(root);
      }
    });
  }

  public get coordinate() { return this.coordinator; }

  public register(type: string, name: string, module: any) {
    const c = this.coordinator;
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

const isWorker = typeof (globalThis as any).WorkerGlobalScope !== 'undefined' && typeof document === 'undefined';
export const Nexus = (typeof document !== 'undefined') ? new UX() : null as unknown as UX;

if (isWorker) {
  self.onmessage = handleWorkerMessage;
} else if (typeof document !== 'undefined') {
  topology.start();
}

if (typeof window !== 'undefined' && Nexus) {
  (globalThis as any).Nexus = Nexus;
  (globalThis as any).Nexus.selfHeal = { getHistory: getBeaconHistory };
  (globalThis as any).Nexus.runInWorker = runInWorker;
  (globalThis as any)._NEXUS_RUNTIME = (Nexus as any).coordinator.runtimeContext;
}
