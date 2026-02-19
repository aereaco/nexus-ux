import { ModuleCoordinator } from './engine/modules.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';

// Core Directives
import signalModule from './attributes/signal.ts';
import textModule from './attributes/text.ts';
import bindModule from './attributes/bind.ts';
import styleModule from './attributes/style.ts';
import classModule from './attributes/class.ts';
import ifModule from './attributes/if.ts';
import showModule from './attributes/show.ts';
import forModule from './attributes/for.ts';
import onModule from './attributes/on.ts';
import attrModule from './attributes/attr.ts';
import themeModule from './attributes/theme.ts';
import switcherModule from './attributes/switcher.ts';
import injestModule from './attributes/injest.ts';
import progressModule from './attributes/progress.ts';
import pwaModule from './attributes/pwa.ts';
import computedModule from './attributes/computed.ts';
import effectModule from './attributes/effect.ts';
import refModule from './attributes/ref.ts';
import htmlModule from './attributes/html.ts';
import varModule from './attributes/var.ts';
import preserveModule from './attributes/preserve.ts';
import debugModule from './attributes/debug.ts';
import assertModule from './attributes/assert.ts';
import componentModule from './attributes/component.ts';
import intersectModule from './attributes/intersect.ts';
import rafModule from './attributes/raf.ts';

// Sprites (Global Actions)
import * as sprites from './sprites/index.ts';

// Mirrors & Scopes
import { windowMirror } from './modules/mirrors/window.ts';
import { localStorageMirror } from './modules/mirrors/localStorage.ts';
import { networkMirror } from './modules/mirrors/network.ts';
import { batteryMirror } from './modules/mirrors/battery.ts';
import { geolocationMirror } from './modules/mirrors/geolocation.ts';
import { navigatorMirror } from './modules/mirrors/navigator.ts';
import { screenMirror } from './modules/mirrors/screen.ts';

import { getMediaSignal } from './modules/scopes/media.ts';
import { osScope } from './modules/scopes/os.ts';
import { authScope } from './modules/scopes/auth.ts';
import { viewScope } from './modules/scopes/view.ts';
import { nativeScope } from './modules/scopes/native.ts';
import { getContainerSignal } from './modules/scopes/container.ts';

// Extended Attributes
import routerModule from './modules/attributes/router.ts';
import routeModule from './modules/attributes/route.ts';

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

    // Phase 2: Core Directives (Prioritized)
    this.coordinator.registerAttributeModule('signal', signalModule);
    this.coordinator.registerAttributeModule('computed', computedModule);
    this.coordinator.registerAttributeModule('switcher', switcherModule);
    this.coordinator.registerAttributeModule('theme', themeModule);

    // Standard Directives
    this.coordinator.registerAttributeModule('text', textModule);
    this.coordinator.registerAttributeModule('bind', bindModule);
    this.coordinator.registerAttributeModule('style', styleModule);
    this.coordinator.registerAttributeModule('class', classModule);
    this.coordinator.registerAttributeModule('if', ifModule);
    this.coordinator.registerAttributeModule('show', showModule);
    this.coordinator.registerAttributeModule('for', forModule);
    this.coordinator.registerAttributeModule('on', onModule);
    this.coordinator.registerAttributeModule('attr', attrModule);

    // Extended Directives
    this.coordinator.registerAttributeModule('effect', effectModule);
    this.coordinator.registerAttributeModule('ref', refModule);
    this.coordinator.registerAttributeModule('html', htmlModule);
    this.coordinator.registerAttributeModule('var', varModule);
    this.coordinator.registerAttributeModule('preserve', preserveModule);
    this.coordinator.registerAttributeModule('debug', debugModule);
    this.coordinator.registerAttributeModule('assert', assertModule);
    this.coordinator.registerAttributeModule('component', componentModule);
    this.coordinator.registerAttributeModule('progress', progressModule);
    this.coordinator.registerAttributeModule('pwa', pwaModule);
    this.coordinator.registerAttributeModule('router', routerModule as any);
    this.coordinator.registerAttributeModule('route', routeModule as any);
    this.coordinator.registerAttributeModule('on-intersect', intersectModule);
    this.coordinator.registerAttributeModule('on-raf', rafModule);

    // Register Sprites as Action Modules
    Object.entries(sprites).forEach(([name, handler]) => {
      this.coordinator.registerActionModule(name, {
        name,
        handle: (_el, ...args) => (handler as any)(...args)
      });
    });

    // Standard Sprites
    this.coordinator.runtimeContext.setGlobalSignal('$', async (selector: string, el?: HTMLElement) => {
       const { resolveSelector } = await import('./engine/selector.ts');
       return resolveSelector(el || document.body, selector);
    });

    // 4D Predictive Engine Initialization
    this.coordinator.runtimeContext.setGlobalSignal('$predictive', (async () => {
      const { predictive } = await import('./engine/predictive.ts');
      return predictive;
    })());

    // Initialize Mirrors and Scopes in Global State
    this.coordinator.runtimeContext.setGlobalSignal('_window', windowMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_localStorage', localStorageMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_network', networkMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_battery', batteryMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_geolocation', geolocationMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_navigator', navigatorMirror);
    this.coordinator.runtimeContext.setGlobalSignal('_screen', screenMirror);

    // Scope Rule Helpers for @rule syntax
    this.coordinator.runtimeContext.setGlobalSignal('_scopes', {
      media: (q: string, body: () => any) => getMediaSignal(q).value ? body() : undefined,
      os: (q: string, body: () => any) => {
        // q might be a property check like 'isMobile' or a platform name match
        if (q in osScope) return (osScope as any)[q] ? body() : undefined;
        return osScope.platform === q ? body() : undefined;
      },
      auth: (q: string, body: () => any) => {
        if (q === 'isAuthenticated') return authScope.isAuthenticated ? body() : undefined;
        if (authScope.roles.includes(q)) return body() ? body() : undefined;
        return undefined;
      },
      view: (q: string, body: () => any) => {
        if (q in viewScope) return (viewScope as any)[q] ? body() : undefined;
        return undefined;
      },
      native: (q: string, body: () => any) => {
        if (q === 'isPresent') return nativeScope.isPresent ? body() : undefined;
        return nativeScope.platform === q ? body() : undefined;
      },
      container: (q: string, body: () => any) => getContainerSignal(q).value ? body() : undefined,
    });

    // Utilities
    this.coordinator.registerUtilityModule('fetch', fetchModule);

    this.init();
  }

  private init() {
    // Auto-discover and initialize on DOMContentLoaded
    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.scan());
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
}

// Global singleton instance
export const Nexus = new UX();

// Expose on window for CDN usage
if (typeof window !== 'undefined') {

  // @ts-ignore: Exposing Nexus to global scope
  globalThis.Nexus = Nexus;
}
