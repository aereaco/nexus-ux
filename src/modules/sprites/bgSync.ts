import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $bgSync Sprite — Background Sync API wrapper
 * 
 * Registers one-time sync events that fire when the device
 * comes back online. Requires a service worker.
 *
 * Usage:
 *   $bgSync.register('sync-messages')   — register a sync tag
 *   $bgSync.tags                        — list registered sync tags
 */

export default function bgSyncFactory(runtime: RuntimeContext) {
  return {
    $bgSync: {
      /**
       * Register a one-time background sync.
       * Returns reactive { status, error }.
       */
      register(tag: string) {
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
            if (!('sync' in reg)) {
              op.error = 'Background Sync API not supported';
              op.status = 'error';
              return;
            }
            await (reg as any).sync.register(tag);
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Get all registered sync tags.
       * Returns reactive { data: string[], status, error }.
       */
      get tags() {
        const op = runtime.reactive<{ data: string[]; status: string; error: string | null }>({
          data: [], status: 'loading', error: null
        });

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
          op.error = 'Service Worker not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('sync' in reg)) {
              op.error = 'Background Sync API not supported';
              op.status = 'error';
              return;
            }
            const tags = await (reg as any).sync.getTags();
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
