import { ModuleCoordinator } from './engine/modules.ts';
import { registerScopeProvider } from './engine/scope.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology } from './engine/topology.ts';
import { initSelfHeal, getBeaconHistory } from './engine/agent.ts';
import { stylesheet } from './engine/stylesheet.ts';

// Core Directives (Explicitly imported for priority ordering)
import ingestModule from './modules/attributes/ingest.ts';
import signalModule from './modules/attributes/signal.ts';
import computedModule from './modules/attributes/computed.ts';
import switcherModule from './modules/attributes/switcher.ts';
import themeModule from './modules/attributes/theme.ts';

// Auto-Discovered Modules
import { 
  autoAttributes,
  autoSprites,
  autoModifiers,
  autoObservers 
} from './manifest.ts';

import { resolveSelector } from './modules/sprites/selector.ts';
import { animate } from './modules/sprites/animate.ts';
import { fetchModule } from './engine/fetch.ts';

/**
 * Nexus-UX Framework Entry Point.
 */
export class UX {
  private coordinator: ModuleCoordinator;

  constructor() {
    // 1. ZENITH-PRIORITY: Emit Tailwind v4 tokens IMMEDIATELY
    if (typeof document !== 'undefined') {
      stylesheet.emitPreflightAndTheme();
    }

    this.coordinator = new ModuleCoordinator();

    // Priority 0: Ingest (Dependency Orchestration)
    this.coordinator.registerAttributeModule('ingest', ingestModule);
    this.coordinator.registerAttributeModule('signal', signalModule);
    this.coordinator.registerAttributeModule('computed', computedModule);
    this.coordinator.registerAttributeModule('switcher', switcherModule);
    this.coordinator.registerAttributeModule('ux-theme', themeModule);

    // Auto-Register all discovered attribute modules
    autoAttributes.forEach(({ name, module }) => {
      const attrMod = module.default || Object.values(module)[0];
      if (attrMod) {
        this.coordinator.registerAttributeModule(attrMod.attribute || name, attrMod as any);
      }
    });

    // Auto-Register Sprites (Action Modules)
    autoSprites.forEach(({ module }) => {
      let exportsObj = module;
      if (typeof module.default === 'function') {
         exportsObj = module.default(this.coordinator.runtimeContext);
      }
      
      Object.entries(exportsObj).forEach(([name, handler]) => {
         if (name === 'default') return;

         // Use a Proxy for the handle to preserve properties (like $animate.flip)
         const handle = (_el: HTMLElement, ...args: any[]) => (handler as any)(...args);
         const proxyHandle = new Proxy(handle, {
           get(target, key) {
             if (key in target) return (target as any)[key];
             const val = (handler as any)[key];
             return typeof val === 'function' ? val.bind(handler) : val;
           }
         });

         this.coordinator.registerActionModule(name, {
           name,
           handle: proxyHandle
         });
      });
    });

    // Auto-Register Modifiers
    autoModifiers.forEach(({ module }) => {
      let exportsObj = module.default || module;
      
      if (exportsObj && exportsObj.name && typeof exportsObj.handle === 'function') {
        this.coordinator.registerModifierModule(exportsObj.name, exportsObj);
      } 
      else if (typeof exportsObj === 'object') {
        Object.values(exportsObj).forEach((mod: any) => {
          if (mod && mod.name && typeof mod.handle === 'function') {
            this.coordinator.registerModifierModule(mod.name, mod);
          }
        });
      }
    });

    // 4D Predictive Engine Initialization
    this.coordinator.runtimeContext.setGlobalSignal('$predictive', (async () => {
      const { predictive } = await import('./modules/sprites/predictive.ts');
      return predictive;
    })());

    // 5. Contextual Selector ($) and Animation Engine ($animate)
    registerScopeProvider('$', (el: any) => (selector: string) => resolveSelector(el as HTMLElement, selector));
    registerScopeProvider('$animate', () => animate);

    // Utilities
    this.coordinator.registerUtilityModule('fetch', fetchModule);

    // Auto-Register Observer Modules
    autoObservers.forEach(({ name, module }: { name: string; module: any }) => {
      const obsMod = module.default || Object.values(module)[0];
      if (obsMod) {
        this.coordinator.registerObserverModule(obsMod.name || name, obsMod);
      }
    });

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
  self.onmessage = (e: MessageEvent) => {
     if (e.data.type === 'INIT_HEAP') console.log('[Nexus Worker] Predictive Heap Handshake OK');
  };
} else if (typeof document !== 'undefined') {
  topology.start();
}

if (typeof window !== 'undefined' && Nexus) {
  // @ts-ignore
  globalThis.Nexus = Nexus;
  // @ts-ignore
  globalThis.Nexus.selfHeal = { getHistory: getBeaconHistory };
  // @ts-ignore
  globalThis._NEXUS_RUNTIME = (Nexus as any).coordinator.runtimeContext;
}
