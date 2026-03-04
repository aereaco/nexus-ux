import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $bgFetch Sprite — Background Fetch API wrapper
 * 
 * Allows downloading large assets in the background, even if the
 * user navigates away. Requires a service worker.
 *
 * Usage:
 *   $bgFetch.fetch('my-download', ['/large-file.zip'], { title: 'Downloading...' })
 *   $bgFetch.get('my-download')                    — get status of a fetch
 *   $bgFetch.abort('my-download')                   — abort a fetch
 */

export default function bgFetchFactory(runtime: RuntimeContext) {
  return {
    $bgFetch: {
      /**
       * Start a background fetch.
       * Returns reactive { data: BackgroundFetchRegistration | null, status, error }.
       */
      fetch(id: string, requests: string[], options?: { title?: string; icons?: Array<{ src: string; sizes: string; type: string }>; downloadTotal?: number }) {
        const op = runtime.reactive<{ data: unknown; status: string; error: string | null }>({
          data: null, status: 'pending', error: null
        });

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
          op.error = 'Service Worker not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('backgroundFetch' in reg)) {
              op.error = 'Background Fetch API not supported';
              op.status = 'error';
              return;
            }
            const bgFetch = await (reg as any).backgroundFetch.fetch(id, requests, options || {});
            op.data = bgFetch;
            op.status = 'done';

            bgFetch.addEventListener('progress', () => {
              op.data = { ...bgFetch, downloaded: bgFetch.downloaded, downloadTotal: bgFetch.downloadTotal };
            });
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Get an existing background fetch registration.
       */
      get(id: string) {
        const op = runtime.reactive<{ data: unknown; status: string; error: string | null }>({
          data: null, status: 'loading', error: null
        });

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('backgroundFetch' in reg)) {
              op.error = 'Background Fetch API not supported';
              op.status = 'error';
              return;
            }
            const bgFetch = await (reg as any).backgroundFetch.get(id);
            op.data = bgFetch;
            op.status = 'ready';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Abort a background fetch.
       */
      abort(id: string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending', error: null
        });

        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (!('backgroundFetch' in reg)) {
              op.error = 'Background Fetch API not supported';
              op.status = 'error';
              return;
            }
            const bgFetch = await (reg as any).backgroundFetch.get(id);
            if (bgFetch) {
              await bgFetch.abort();
              op.status = 'done';
            } else {
              op.error = `No background fetch with id '${id}'`;
              op.status = 'error';
            }
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
