import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $cache Sprite — Cache Storage API wrapper
 * 
 * Returns reactive containers (no await needed in directives).
 * Provides CRUD operations against named cache instances.
 * 
 * Usage:
 *   $cache.put('assets', '/img/logo.png', response)  — cache a response
 *   $cache.match('assets', '/img/logo.png')           — lookup a cached response
 *   $cache.delete('assets', '/img/logo.png')          — remove from cache
 *   $cache.keys('assets')                             — list cached URLs
 *   $cache.clear('assets')                            — delete entire cache
 *   $cache.has('assets', '/img/logo.png')             — check if URL is cached
 */

export default function cacheFactory(runtime: RuntimeContext) {
  return {
    $cache: {
      /**
       * Store a URL + response in a named cache.
       * If `response` is a string, wraps it in a Response object.
       * Returns a reactive { status, error } container.
       */
      put(cacheName: string, url: string, response?: Response | string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const cache = await caches.open(cacheName);
            let res: Response;
            if (response instanceof Response) {
              res = response;
            } else if (typeof response === 'string') {
              res = new Response(response, {
                headers: { 'Content-Type': 'text/plain' }
              });
            } else {
              // Fetch the URL and cache the response
              res = await fetch(url);
            }
            await cache.put(url, res);
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Look up a cached response for a URL.
       * Returns a reactive { data, status, error } container.
       * `data` is the response text (auto-extracted).
       */
      match(cacheName: string, url: string) {
        const op = runtime.reactive<{ data: string | null; status: string; error: string | null }>({
          data: null,
          status: 'loading',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const cache = await caches.open(cacheName);
            const response = await cache.match(url);
            if (response) {
              op.data = await response.text();
              op.status = 'ready';
            } else {
              op.data = null;
              op.status = 'ready';
            }
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Check if a URL exists in a named cache.
       * Returns a reactive { data: boolean, status, error } container.
       */
      has(cacheName: string, url: string) {
        const op = runtime.reactive<{ data: boolean; status: string; error: string | null }>({
          data: false,
          status: 'loading',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const cache = await caches.open(cacheName);
            const response = await cache.match(url);
            op.data = !!response;
            op.status = 'ready';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Remove a URL from a named cache.
       * Returns a reactive { status, error } container.
       */
      delete(cacheName: string, url: string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const cache = await caches.open(cacheName);
            await cache.delete(url);
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * List all cached URLs in a named cache.
       * Returns a reactive { data: string[], status, error } container.
       */
      keys(cacheName: string) {
        const op = runtime.reactive<{ data: string[]; status: string; error: string | null }>({
          data: [],
          status: 'loading',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            op.data = requests.map(r => r.url);
            op.status = 'ready';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Delete an entire named cache.
       * Returns a reactive { status, error } container.
       */
      clear(cacheName: string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (typeof caches === 'undefined') {
          op.error = 'Cache API not available';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            await caches.delete(cacheName);
            op.status = 'done';
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
