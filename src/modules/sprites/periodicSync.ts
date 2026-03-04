import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $periodicSync Sprite — Periodic Background Sync API wrapper
 * 
 * Registers periodic sync events that fire at regular intervals
 * (browser-determined minimum). Requires a service worker.
 *
 * Usage:
 *   $periodicSync.register('content-sync', { minInterval: 24 * 60 * 60 * 1000 })
 *   $periodicSync.unregister('content-sync')
 *   $periodicSync.tags                      — list registered tags
 */

export default function periodicSyncFactory(runtime: RuntimeContext) {
  return {
    $periodicSync: {
      /**
       * Register a periodic background sync.
       * Returns reactive { status, error }.
       */
      register(tag: string, options?: { minInterval?: number }) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending', error: null
        });

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
          op.error = 'Service Worker not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('periodicSync' in reg)) {
              op.error = 'Periodic Background Sync API not supported';
              op.status = 'error';
              return;
            }
            await (reg as any).periodicSync.register(tag, options || {});
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Unregister a periodic sync tag.
       */
      unregister(tag: string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending', error: null
        });

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('periodicSync' in reg)) {
              op.error = 'Periodic Background Sync API not supported';
              op.status = 'error';
              return;
            }
            await (reg as any).periodicSync.unregister(tag);
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Get all registered periodic sync tags.
       */
      get tags() {
        const op = runtime.reactive<{ data: string[]; status: string; error: string | null }>({
          data: [], status: 'loading', error: null
        });

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('periodicSync' in reg)) {
              op.error = 'Periodic Background Sync API not supported';
              op.status = 'error';
              return;
            }
            const tags = await (reg as any).periodicSync.getTags();
            op.data = tags;
            op.status = 'ready';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      }
    }
  };
}
