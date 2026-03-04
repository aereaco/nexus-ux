import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $sw Sprite — Service Worker lifecycle management
 * 
 * Provides declarative control over Service Worker registration,
 * update checking, and messaging. Returns reactive containers.
 *
 * Usage:
 *   $sw.register('/sw.js', { scope: '/' })   — register a service worker
 *   $sw.update()                              — check for updates
 *   $sw.unregister()                          — unregister the active SW
 *   $sw.postMessage(data)                     — send message to SW
 *   $sw.status                                — reactive status string
 *   $sw.controller                            — reactive controller reference
 */

export default function swFactory(runtime: RuntimeContext) {
  // Reactive state for service worker lifecycle
  const state = runtime.reactive<{
    status: 'idle' | 'registering' | 'active' | 'waiting' | 'error';
    controller: ServiceWorker | null;
    registration: ServiceWorkerRegistration | null;
    error: string | null;
    updateAvailable: boolean;
  }>({
    status: 'idle',
    controller: null,
    registration: null,
    error: null,
    updateAvailable: false
  });

  // Track current controller on load
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const sw = navigator.serviceWorker;

    // Initial state
    if (sw.controller) {
      state.status = 'active';
      state.controller = sw.controller;
    }

    // Listen for controller changes
    sw.addEventListener('controllerchange', () => {
      state.controller = sw.controller;
      state.status = sw.controller ? 'active' : 'idle';
    });

    // Listen for messages from the service worker
    sw.addEventListener('message', (event: MessageEvent) => {
      runtime.evaluate(document.body, `$dispatch('sw:message', ${JSON.stringify(event.data)})`, {});
    });
  }

  return {
    $sw: {
      /**
       * Reactive status of the service worker.
       */
      get status() {
        return state.status;
      },

      /**
       * Reactive reference to the active controller.
       */
      get controller() {
        return state.controller;
      },

      /**
       * Whether an update is waiting to be activated.
       */
      get updateAvailable() {
        return state.updateAvailable;
      },

      /**
       * Register a service worker.
       * Returns reactive { status, error } container.
       */
      register(scriptURL: string, options?: RegistrationOptions) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
          op.error = 'Service Worker API not available';
          op.status = 'error';
          return op;
        }

        state.status = 'registering';

        (async () => {
          try {
            const registration = await navigator.serviceWorker.register(scriptURL, options);
            state.registration = registration;

            // Track waiting worker
            if (registration.waiting) {
              state.updateAvailable = true;
              state.status = 'waiting';
            }

            registration.addEventListener('updatefound', () => {
              const installing = registration.installing;
              if (installing) {
                installing.addEventListener('statechange', () => {
                  if (installing.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // New update available
                      state.updateAvailable = true;
                      state.status = 'waiting';
                    } else {
                      // First install
                      state.status = 'active';
                    }
                  }
                });
              }
            });

            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
            state.error = op.error;
            state.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Check for service worker updates.
       */
      update() {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (!state.registration) {
          op.error = 'No service worker registered';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            await state.registration!.update();
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Unregister the active service worker.
       */
      unregister() {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (!state.registration) {
          op.error = 'No service worker registered';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const success = await state.registration!.unregister();
            if (success) {
              state.status = 'idle';
              state.controller = null;
              state.registration = null;
              state.updateAvailable = false;
            }
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Send a message to the active service worker.
       */
      postMessage(data: unknown) {
        if (state.controller) {
          state.controller.postMessage(data);
        }
      },

      /**
       * Skip waiting — activate the waiting worker immediately.
       */
      skipWaiting() {
        if (state.registration?.waiting) {
          state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  };
}
