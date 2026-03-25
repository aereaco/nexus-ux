import { ModuleCoordinator } from './engine/modules.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology } from './engine/topology.ts';
import { initSelfHeal, getBeaconHistory, type CrashBeacon } from './engine/agent.ts';

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
  autoScopes,
  autoModifiers,
  autoObservers 
} from './manifest.ts';

import { fetchModule } from './engine/fetch.ts';



// Re-export core types for consumers
export type { RuntimeContext, InitContext } from './engine/composition.ts';
export type { Module, AttributeModule, ActionModule, ListenerModule, ObserverModule, UtilityModule, MirrorModule, SpriteModule, ScopeModule } from './engine/modules.ts';
export type { TierLevel, TierConfig } from './engine/topology.ts';
export type { CrashBeacon, SelfHealConfig } from './engine/agent.ts';

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
      let exportsObj = module;
      if (typeof module.default === 'function') {
         exportsObj = module.default(this.coordinator.runtimeContext);
      }
      
      Object.entries(exportsObj).forEach(([name, handler]) => {
         if (name === 'default') return;

         this.coordinator.registerActionModule(name, {
           name,
           handle: (_el, ...args) => (handler as any)(...args)
         });
      });
    });

    // Auto-Register Modifiers
    autoModifiers.forEach(({ module }) => {
      let exportsObj = module.default || module;
      
      // Single default export (e.g. morph.ts, stop.ts)
      if (exportsObj && exportsObj.name && typeof exportsObj.handle === 'function') {
        this.coordinator.registerModifierModule(exportsObj.name, exportsObj);
      } 
      // Object containing multiple modifiers (e.g. keys.ts)
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

    // Note: $ selector sprite now self-registers via scope provider registry
    // in sprites/selector.ts — no manual registration needed here.

    // Auto-Register Mirrors
    autoMirrors.forEach(({ name, module }) => {
      // Look for an export matching the name or a default export
      const val = module[`${name}Mirror`] || module.default || Object.values(module)[0];
      if (val) {
        if (this.coordinator.runtimeContext.isDevMode) console.log(`[Nexus Mirror] Registering _${name}`);
        this.coordinator.runtimeContext.setGlobalSignal(`_${name}`, val);
      }

      const initFn = module.onGlobalInit || module.default?.onGlobalInit;
      if (initFn) {
        try {
          initFn(this.coordinator.runtimeContext);
        } catch (e) {
          this.coordinator.runtimeContext.reportError(
            e instanceof Error ? e : new Error(String(e)),
            undefined,
            `Failed to initialize mirror module: ${name}`
          );
        }
      }
    });

    // Auto-Register Scopes
    const scopesDef: Record<string, any> = {};
    autoScopes.forEach(({ name, module }) => {
      // We expect the scope module to export `scopeRule`
      if (module.scopeRule) {
         scopesDef[name] = module.scopeRule;
      }

      if (module.onGlobalInit) {
        try {
          module.onGlobalInit(this.coordinator.runtimeContext);
        } catch (e) {
          this.coordinator.runtimeContext.reportError(
            e instanceof Error ? e : new Error(String(e)),
            undefined,
            `Failed to initialize scope module: ${name}`
          );
        }
      }
    });
    this.coordinator.runtimeContext.setGlobalSignal('_scopes', scopesDef);

    // Utilities
    this.coordinator.registerUtilityModule('fetch', fetchModule);

    // Auto-Register Observer Modules — auto-attached to roots during initializeModules()
    autoObservers.forEach(({ name, module }: { name: string; module: any }) => {
      const obsMod = module.default || Object.values(module)[0];
      if (obsMod) {
        this.coordinator.registerObserverModule(obsMod.name || name, obsMod);
      }
    });

    // Initialize Self-Heal Agent (Crash Beacons)
    initSelfHeal({
      enabled: true,
      emitToConsole: this.coordinator.runtimeContext.isDevMode ?? false,
      emitToPlatform: false
    });

    // Diagnostic Heartbeat
    if (this.coordinator.runtimeContext.isDevMode) {
      (window as any)._NEXUS_HEARTBEAT = 0;
      setInterval(() => { (window as any)._NEXUS_HEARTBEAT++; }, 1000);
    }

    this.init();

    // Zenith Ignition: Global broadcast when engine is fully scanned and ready
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('nexus-ready', { bubbles: true }));
    }
  }

  private init() {
    // Auto-discover and initialize on DOMContentLoaded
    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
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
  public register(type: 'attribute' | 'action' | 'modifier' | 'listener' | 'observer' | 'utility', name: string, module: any) {
    if (typeof window !== 'undefined' && this.coordinator.runtimeContext.isDevMode) {
      console.log(`[Nexus Registration] Dynamically registering ${type} module: ${name}`);
    }
    switch (type) {
      case 'attribute': this.coordinator.registerAttributeModule(name, module); break;
      case 'action': this.coordinator.registerActionModule(name, module); break;
      case 'modifier': this.coordinator.registerModifierModule(name, module); break;
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
  
  // Expose Self-Heal agent for developer access
  // @ts-ignore
  globalThis.Nexus.selfHeal = {
    getHistory: getBeaconHistory,
    capture: (message: string, context?: unknown) => {
      const { captureCrashBeacon } = require('./engine/agent.ts');
      return captureCrashBeacon(new Error(message), context);
    }
  };

  // Expose Runtime Context for debugging
  // @ts-ignore
  globalThis._NEXUS_RUNTIME = (Nexus as any).coordinator.runtimeContext;
}
