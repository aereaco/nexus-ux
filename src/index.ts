import { ModuleCoordinator } from './engine/modules.ts';
import { registerScopeProvider } from './engine/scope.ts';
import { ROOT_SELECTOR } from './engine/consts.ts';
import { topology } from './engine/topology.ts';
import { initSelfHeal, getBeaconHistory } from './engine/agent.ts';
import { stylesheet, discoverColorTokens, buildTailwindThemeBridge } from './modules/attributes/stylesheet.ts';
import { fetchModule } from './engine/fetch.ts';
import { resolveSelector } from './modules/sprites/selector.ts';
import { animate } from './modules/sprites/animate.ts';
import { corePredictiveEngine } from './engine/predictive.ts';
import { cacheEngine } from './engine/cache.ts';

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
    this.coordinator.runtimeContext.setGlobalSignal('$predictive', (async () => {
      const { predictive } = await import('./modules/sprites/predictive.ts');
      return predictive;
    })());

    // Contextual selector and animation
    registerScopeProvider('$', (el: any) => (selector: string) => resolveSelector(el as HTMLElement, selector));
    registerScopeProvider('$animate', () => animate);

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
      const html = document.documentElement;
      if (document.querySelector('[data-import]')) {
        html.classList.add('nexus-loading');
      } else {
        html.classList.add('nexus-ready');
      }
      document.dispatchEvent(new CustomEvent('nexus-ready', { bubbles: true }));
    }
  }

  private registerFromManifest() {
    autoAttributes.forEach(({ name, module }) => {
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

    autoSprites.forEach(({ name, module }) => {
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

    autoModifiers.forEach(({ module }) => {
      let exportsObj = module.default || module;
      if (exportsObj && exportsObj.name && typeof exportsObj.handle === 'function') {
        this.coordinator.registerModifierModule(exportsObj.name, exportsObj);
      } else if (typeof exportsObj === 'object') {
        Object.values(exportsObj).forEach((mod: any) => {
          if (mod && mod.name && typeof mod.handle === 'function') {
            this.coordinator.registerModifierModule(mod.name, mod);
          }
        });
      }
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
  self.onmessage = (e: MessageEvent) => {
    if (e.data.type === 'INIT_HEAP') console.log('[Nexus Worker] Predictive Heap Handshake OK');
  };
} else if (typeof document !== 'undefined') {
  topology.start();

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
  globalThis.Nexus = Nexus;
  globalThis.Nexus.selfHeal = { getHistory: getBeaconHistory };
  globalThis._NEXUS_RUNTIME = (Nexus as any).coordinator.runtimeContext;
}
