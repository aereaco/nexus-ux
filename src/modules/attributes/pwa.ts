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
  icon?: string;
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
      deferredPrompt: null as any,
      _waitingWorker: null as ServiceWorker | null,
      
      install: async () => {
        if (!pwaState.deferredPrompt) {
            runtime.log('PWA: No install prompt available yet.');
            return false;
        }
        pwaState.deferredPrompt.prompt();
        const { outcome } = await pwaState.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            pwaState.deferredPrompt = null;
            return true;
        }
        return false;
      },
      
      update: () => {
        if (pwaState._waitingWorker) {
            pwaState._waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
      }
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
          
          if (reg.waiting) {
              pwaState.updateAvailable = true;
              pwaState._waitingWorker = reg.waiting;
          }
          
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  pwaState.updateAvailable = true;
                  pwaState._waitingWorker = installingWorker;
                }
              };
            }
          };
        })
        .catch(err => reportError(new Error(`PWA: ServiceWorker registration failed: ${err}`), el));
        
      // Auto-reload once new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
              refreshing = true;
              window.location.reload();
          }
      });
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
    
    if (config.manifest) {
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            manifestLink = document.createElement('link');
            manifestLink.setAttribute('rel', 'manifest');
            document.head.appendChild(manifestLink);
        }
        manifestLink.setAttribute('href', config.manifest);
    }
    
    if (config.icon) {
        // Apple Touch Icon
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.setAttribute('rel', 'apple-touch-icon');
            document.head.appendChild(appleIcon);
        }
        appleIcon.setAttribute('href', config.icon);
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
