import { ModuleCoordinator } from './engine/modules.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';

// Core Directives (Explicitly imported for priority ordering)
import injestModule from './modules/attributes/injest.ts';
import signalModule from './modules/attributes/signal.ts';
import computedModule from './modules/attributes/computed.ts';
import switcherModule from './modules/attributes/switcher.ts';
import themeModule from './modules/attributes/theme.ts';

// Auto-Discovered Modules
import { 
  autoAttributes,
  autoSprites,
  autoMirrors,
  autoScopes 
} from './manifest.ts';

import { fetchModule } from './engine/fetch.ts';

// Re-export core types for consumers
export type { RuntimeContext, InitContext } from './engine/composition.ts';
export type { Module, AttributeModule, ActionModule, ListenerModule, ObserverModule, UtilityModule } from './engine/modules.ts';

/**
 * Nexus-UX Framework Entry Point.
 */
export class UX {
  private coordinator: ModuleCoordinator;

  constructor() {
    this.coordinator = new ModuleCoordinator();

    // Priority 0: Injest (Dependency Orchestration)
    this.coordinator.registerAttributeModule('injest', injestModule);

    // Phase 2: Core Directives (Prioritized explicitly for execution order)
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
      Object.entries(module).forEach(([name, handler]) => {
         this.coordinator.registerActionModule(name, {
           name,
           handle: (_el, ...args) => (handler as any)(...args)
         });
      });
    });

    // 4D Predictive Engine Initialization
    this.coordinator.runtimeContext.setGlobalSignal('$predictive', (async () => {
      const { predictive } = await import('./engine/predictive.ts');
      return predictive;
    })());

    // Standard Sprites (Framework Primitives)
    this.coordinator.runtimeContext.setGlobalSignal('$', async (selector: string, el?: HTMLElement) => {
       const { resolveSelector } = await import('./engine/selector.ts');
       return resolveSelector(el || document.body, selector);
    });

    // Auto-Register Mirrors
    autoMirrors.forEach(({ name, module }) => {
      // Find the first exported value and register it
      const val = Object.values(module)[0];
      if (val) this.coordinator.runtimeContext.setGlobalSignal(`_${name}`, val);
    });

    // Auto-Register Scopes
    const scopesDef: Record<string, any> = {};
    autoScopes.forEach(({ name, module }) => {
      // We expect the scope module to export `scopeRule`
      if (module.scopeRule) {
         scopesDef[name] = module.scopeRule;
      }
    });
    this.coordinator.runtimeContext.setGlobalSignal('_scopes', scopesDef);

    // Utilities
    this.coordinator.registerUtilityModule('fetch', fetchModule);

    this.init();
  }

  private init() {
    // Auto-discover and initialize on DOMContentLoaded
    if (typeof window !== 'undefined') {
      console.error(`[UX] Init. State: ${document.readyState}`);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
           console.error(`[UX] DOMContentLoaded triggered`);
           this.scan();
        });
      } else {
        this.scan();
      }
    }
  }

  /**
   * Scans the document for roots and initializes distinct trees.
   */
  public scan() {
    const roots = document.querySelectorAll(ROOT_SELECTOR);
    console.error(`[UX] Scanning. Found ${roots.length} roots. Selector: ${ROOT_SELECTOR}`);
    roots.forEach(root => {
      if (root instanceof HTMLElement) {
        this.coordinator.initializeModules(root);
      }
    });
  }

  // Exposure for plugins/modules
  public get coordinate() {
    return this.coordinator;
  }

  /**
   * Public API for Decentralized Module Registration.
   * Allows third-party scripts (e.g., loaded via data-injest) to register themselves dynamically.
   */
  public register(type: 'attribute' | 'action' | 'listener' | 'observer' | 'utility', name: string, module: any) {
    if (typeof window !== 'undefined' && this.coordinator.runtimeContext.isDevMode) {
      console.log(`[Nexus Registration] Dynamically registering ${type} module: ${name}`);
    }
    switch (type) {
      case 'attribute': this.coordinator.registerAttributeModule(name, module); break;
      case 'action': this.coordinator.registerActionModule(name, module); break;
      case 'listener': this.coordinator.registerListenerModule(name, module); break;
      case 'observer': this.coordinator.registerObserverModule(name, module); break;
      case 'utility': this.coordinator.registerUtilityModule(name, module); break;
    }
  }
}

// Global singleton instance
export const Nexus = (typeof document !== 'undefined') ? new UX() : null as unknown as UX;

// Expose on window for CDN usage
if (typeof window !== 'undefined' && Nexus) {
  // @ts-ignore: Exposing Nexus to global scope
  globalThis.Nexus = Nexus;
}
