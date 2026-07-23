import { ModuleCoordinator } from './engine/modules.ts';
import { registerScopeProvider } from './engine/scope.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology } from './engine/topology.ts';
import { initSelfHeal, getBeaconHistory } from './engine/agent.ts';
import { stylesheet, discoverColorTokens, buildTailwindThemeBridge } from './modules/attributes/stylesheet.ts';
import { ensureScrollbarGutter } from './engine/scrollbarGutter.ts';

// Core Directives (Explicitly imported for priority ordering)
import importModule from './modules/attributes/import.ts';
import signalModule from './modules/attributes/signal.ts';
import computedModule from './modules/attributes/computed.ts';
import switcherModule from './modules/attributes/switcher.ts';
import themeModule from './modules/attributes/theme.ts';

// Auto-Discovered Modules
import { 
  autoAttributes,
  autoSprites,
  autoModifiers,
  autoObservers,
  autoListeners
} from './manifest.ts';

import { resolveSelector } from './modules/sprites/selector.ts';
import { animate } from './modules/sprites/animate.ts';
import { fetchModule } from './engine/fetch.ts';

// --- Inline utilities from deleted sprite modules ---
// Legacy sprites (el, id, global, dispatch, nextTick, store, watch,
// fetch, http, download, clipboard, cache, notification, payment, ws)
// are replaced by native mirrors (_fetch, _clipboard, etc.) or inline below.

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

/**
 * Nexus-UX Framework Entry Point.
 */
export class UX {
  private coordinator: ModuleCoordinator;

  constructor() {
    this.coordinator = new ModuleCoordinator();

    // --- Inline Scope Provider registrations for deleted utility sprites ---
    // $el: current element reference
    registerScopeProvider('$el', (el) => el);
    // $dispatch: CustomEvent dispatcher on current element
    registerScopeProvider('$dispatch', (el) => (eventName: string, detail?: unknown) => {
      if (!(el instanceof Element)) return;
      el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
    });
    // $global: access to runtime global signals
    registerScopeProvider('$global', (_el, runtime) => runtime.globalSignals());
    // $actions: access to registered action modules
    registerScopeProvider('$actions', (_el, runtime) => runtime.globalActions());

    // --- Inline Action Module registrations for deleted utility sprites ---
    this.coordinator.registerActionModule('$id', {
      name: '$id',
      handle: (_el, ...args: any[]) => ($id as any)(...args)
    });
    this.coordinator.registerActionModule('$nextTick', {
      name: '$nextTick',
      handle: (_el, ...args: any[]) => ($nextTick as any)(...args)
    });

    // Priority 0: Import (Dependency Orchestration)
    this.coordinator.registerAttributeModule('import', importModule);
    this.coordinator.registerAttributeModule('signal', signalModule);
    this.coordinator.registerAttributeModule('computed', computedModule);
    this.coordinator.registerAttributeModule('switcher', switcherModule);
    this.coordinator.registerAttributeModule('ux-theme', themeModule);

    // Auto-Register all discovered modules from inline or imported manifest.
    const manifest = typeof __NX_MANIFEST__ !== 'undefined' ? __NX_MANIFEST__ : null;
    const attributes = manifest?.attributes || autoAttributes;
    const sprites = manifest?.sprites || autoSprites;
    const modifiers = manifest?.modifiers || autoModifiers;
    const observers = manifest?.observers || autoObservers;
    const listeners = manifest?.listeners || autoListeners;

    // A single namespace file may colocate multiple directives (e.g. flow.ts
    // exports data-flow, data-flow-node, data-flow-handle, data-flow-edges),
    // so register every export that is an AttributeModule, not just the first.
    attributes.forEach(({ name, module }: { name: string; module: any }) => {
      let registeredAny = false;
      for (const maybe of Object.values(module)) {
        if (maybe && typeof maybe === 'object' && 'attribute' in maybe && typeof (maybe as any).handle === 'function') {
          this.coordinator.registerAttributeModule((maybe as any).attribute || name, maybe as any);
          registeredAny = true;
        }
      }
      if (!registeredAny) {
        const attrMod = module.default || Object.values(module)[0];
        if (attrMod) {
          this.coordinator.registerAttributeModule(attrMod.attribute || name, attrMod as any);
        }
      }
    });

    // Auto-Register Sprites (Action Modules)
    sprites.forEach(({ name, module }: { name: string; module: any }) => {
      const spriteMod = module.default || Object.values(module).find((m: any) => m && typeof m.sprites === 'function');
      
      if (spriteMod && typeof spriteMod.sprites === 'function') {
        this.coordinator.registerSpriteModule(spriteMod.name || name, spriteMod);
      } else {
        let exportsObj = module;
        if (typeof module.default === 'function') {
          exportsObj = module.default(this.coordinator.runtimeContext);
        }
        
        Object.entries(exportsObj).forEach(([exportName, handler]) => {
          if (exportName === 'default') return;

          // Use a Proxy for the handle to preserve properties (like $animate.flip)
          const handle = (_el: HTMLElement, ...args: any[]) => (handler as any)(...args);
          const proxyHandle = new Proxy(handle, {
            get(target, key) {
              if (key in target) return (target as any)[key];
              const val = (handler as any)[key];
              return typeof val === 'function' ? val.bind(handler) : val;
            }
          });

          this.coordinator.registerActionModule(exportName, {
            name: exportName,
            handle: proxyHandle
          });
        });
      }
    });

    // Auto-Register Modifiers
    modifiers.forEach(({ module }: { module: any }) => {
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
    observers.forEach(({ name, module }: { name: string; module: any }) => {
      const obsMod = module.default || Object.values(module)[0];
      if (obsMod) {
        this.coordinator.registerObserverModule(obsMod.name || name, obsMod);
      }
    });

    // Auto-Register Listener Modules
    listeners.forEach(({ name, module }: { name: string; module: any }) => {
      const listenerMod = module.default || Object.values(module)[0];
      if (listenerMod) {
        this.coordinator.registerListenerModule(listenerMod.name || name, listenerMod);
      }
    });

    initSelfHeal(this.coordinator.runtimeContext, {
      enabled: true,
      emitToConsole: this.coordinator.runtimeContext.isDevMode ?? false,
      emitToPlatform: false
    });

    ensureScrollbarGutter();

    this.init();

    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      // FOUC gate at boot: if the page declares external stylesheets via
      // [data-import], hide the document immediately (the preflight rule
      // `html.nexus-loading` matches) until those assets are adopted and the
      // [data-import] module releases the gate in its finalize(). Pages without
      // a [data-import] gate have nothing to wait for, so unhide immediately.
      if (document.querySelector('[data-import]')) {
        html.classList.add('nexus-loading');
      } else {
        html.classList.add('nexus-ready');
      }
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

  // Detect a statically-loaded @tailwindcss/browser CDN (not via data-import).
  // When Nexus-UX loads as a deferred type="module" script, all static stylesheets
  // and the render-blocking Tailwind CDN script have already executed. Injecting a
  // <style type="text/tailwindcss"> at this point triggers Tailwind's own
  // MutationObserver (observes document.documentElement with subtree:true) to fire
  // a full recompile, picking up any @theme declarations we add.
  //
  // This covers the case where @tailwindcss/browser is loaded via <script> in HTML
  // rather than via data-import (which handles its own bridge injection in importScript).
  if (
    !document.querySelector('style[data-nexus-tailwind-bridge]') &&
    document.querySelector('script[src*="tailwindcss/browser"]')
  ) {
    const tokens = discoverColorTokens();
    const bridge = buildTailwindThemeBridge(tokens);
    if (bridge) {
      const bridgeStyle = document.createElement('style');
      bridgeStyle.setAttribute('type', 'text/tailwindcss');
      bridgeStyle.setAttribute('data-nexus-tailwind-bridge', '');
      bridgeStyle.textContent = bridge;
      document.head.appendChild(bridgeStyle);
    }
  }
}

if (typeof window !== 'undefined' && Nexus) {
  // @ts-ignore
  globalThis.Nexus = Nexus;
  // @ts-ignore
  globalThis.Nexus.selfHeal = { getHistory: getBeaconHistory };
  // @ts-ignore
  globalThis._NEXUS_RUNTIME = (Nexus as any).coordinator.runtimeContext;
}
