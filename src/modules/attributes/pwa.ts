import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * data-pwa="{ sw: '/sw.js', manifest: '/manifest.json', themeColor: '#570df8' }"
 */
interface PWAConfig {
  sw?: string;
  manifest?: string;
  themeColor?: string;
  name?: string;
  shortName?: string;
  display?: string;
  startUrl?: string;
}

const pwaModule: AttributeModule = {
  name: 'pwa',
  attribute: 'pwa',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let config: PWAConfig;
    try {
      config = runtime.evaluate(el, expression) as PWAConfig;
    } catch (e) {
      reportError(new Error(`PWA: Evaluation error: ${e}`), el);
      return;
    }

    if (!config) return;

    // 1. Initialize $pwa global signal
    const pwaState = runtime.reactive({
      isOnline: navigator.onLine,
      isInstalled: false,
      updateAvailable: false,
      deferredPrompt: null as unknown
    });

    runtime.setGlobalSignal('$pwa', pwaState);

    // 2. Offline Detection
    const updateOnlineStatus = () => { pwaState.isOnline = navigator.onLine; };
    globalThis.addEventListener('online', updateOnlineStatus);
    globalThis.addEventListener('offline', updateOnlineStatus);

    // 3. Service Worker Registration
    if (config.sw && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(config.sw)
        .then(reg => {
          runtime.log(`PWA: ServiceWorker registered for scope: ${reg.scope}`);
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  pwaState.updateAvailable = true;
                }
              };
            }
          };
        })
        .catch(err => reportError(new Error(`PWA: ServiceWorker registration failed: ${err}`), el));
    }

    // 4. Manifest / Meta Tags
    if (config.themeColor) {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', config.themeColor);
    }

    // "Add to Home Screen" prompt interception
    globalThis.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      pwaState.deferredPrompt = e;
    });

    globalThis.addEventListener('appinstalled', () => {
      pwaState.isInstalled = true;
      pwaState.deferredPrompt = null;
    });

    return () => {
      globalThis.removeEventListener('online', updateOnlineStatus);
      globalThis.removeEventListener('offline', updateOnlineStatus);
    };
  }
};

export default pwaModule;
