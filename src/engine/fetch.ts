import { UtilityModule } from './modules.ts';
import { RuntimeContext } from './composition.ts';
import { reportError } from './errors.ts';
import { CUSTOM_EVENT_PREFIX } from './consts.ts';

export interface FetchOptions extends RequestInit {
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  targetSelector?: string;
  updateSignals?: boolean;
}

const fetchCache = new Map<string, Promise<unknown>>();
const fetchCacheTimers = new Map<string, number>();

export interface FetchUtilities {
  request(url: string, options: FetchOptions, el: HTMLElement): Promise<unknown>;
  createSuspenseProxy<T>(promise: Promise<T>): T;
}

export const fetchUtilities: FetchUtilities = {
  request: (url: string, options: FetchOptions, el: HTMLElement): Promise<unknown> => {
    // Zero-Serialization cache key to adhere to ZCZS mandate
    const cacheKey = `${url}:${options.method || 'GET'}:${options.responseType || 'text'}`;
    if (fetchCache.has(cacheKey)) return fetchCache.get(cacheKey)!;

    const promise = (async () => {
      let controller: AbortController | undefined;
      try {
        controller = new AbortController();
        const signal = controller.signal;

        const fetchOptions: RequestInit = {
          ...options,
          signal,
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data: unknown;
        switch (options.responseType) {
          case 'json':
            data = await response.json();
            break;
          case 'blob':
            data = await response.blob();
            break;
          case 'arrayBuffer':
            data = await response.arrayBuffer();
            break;
          case 'formData':
            data = await response.formData();
            break;
          case 'text':
          default:
            data = await response.text();
            break;
        }

        el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-success`, {
          bubbles: true,
          cancelable: false,
          detail: { url, options, data, response },
        }));

        return data;

      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          if (document.documentElement.hasAttribute('data-debug')) {
            console.warn(`Fetch request to ${url} was aborted.`);
          }
        } else {
          reportError(new Error(`Failed to fetch from ${url}: ${e instanceof Error ? e.message : String(e)}`), el);
        }
        el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-error`, {
          bubbles: true,
          cancelable: false,
          detail: { url, options, error: e },
        }));
        throw e;
      }
    })();

    fetchCache.set(cacheKey, promise);
    
    // Keep in cache until settlement + grace period to satisfy Suspense re-runs
    promise.finally(() => {
      if (fetchCacheTimers.has(cacheKey)) clearTimeout(fetchCacheTimers.get(cacheKey));
      fetchCacheTimers.set(cacheKey, setTimeout(() => {
        fetchCache.delete(cacheKey);
        fetchCacheTimers.delete(cacheKey);
      }, 2000) as unknown as number);
    });

    return promise;
  },

  /**
   * Creates a deeply reactive Suspense proxy that throws its pending Promise when accessed.
   * This allows Nexus-UX to gracefully pause elementBoundEffect until the fetch completes.
   */
  createSuspenseProxy: <T>(promise: Promise<T>): T => {
    let isResolved = false;
    let isRejected = false;
    let result: T | undefined;
    let error: unknown | undefined;

    promise.then(
      res => { isResolved = true; result = res; },
      err => { isRejected = true; error = err; }
    );

    return new Proxy(promise, {
      get(target, prop) {
        if (prop === 'then') return target.then.bind(target);
        if (prop === 'catch') return target.catch.bind(target);
        if (prop === 'finally') return target.finally.bind(target);
        
        if (prop === '__v_isRef' || prop === '__v_isReactive') return false;

        if (isRejected) throw error;
        if (!isResolved) throw promise; 

        if (result === undefined || result === null) return undefined;
        
        // Adaptive Ingress: Auto-Lex JSON and Dive into envelopes
        let finalResult = result as any;
        if (typeof result === 'string') {
          try { finalResult = JSON.parse(result); } catch (_e) { /* ignore */ }
        }

        if (finalResult && typeof finalResult === 'object') {
          const envelopes = ['data', 'results', 'items', 'value', '_embedded', 'entries'];
          for (const envelope of envelopes) {
            if (finalResult[envelope] !== undefined) {
              finalResult = finalResult[envelope];
              break;
            }
          }
        }
        
        const val = finalResult && typeof finalResult === 'object' ? (finalResult as Record<string, unknown>)[prop as string] : undefined;
        return typeof val === 'function' ? val.bind(finalResult) : val;
      }
    }) as unknown as T;
  }
};

export const fetchModule: UtilityModule = {
  name: 'fetch',
  install: (context: RuntimeContext) => {
    context.fetch = fetchUtilities;
  },
};
