import { UtilityModule } from './modules.ts';
import { RuntimeContext } from './composition.ts';
import { reportError, errMsg } from './debug.ts';
import { CUSTOM_EVENT_PREFIX } from './consts.ts';
import { cacheEngine } from './cache.ts';

export interface FetchOptions extends RequestInit {
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  targetSelector?: string;
  updateSignals?: boolean;
}

const fetchCache = new Map<string, Promise<unknown>>();

export interface FetchUtilities {
  request(url: string, options: FetchOptions, el: HTMLElement): Promise<unknown>;
  createSuspenseProxy<T>(promise: Promise<T>): T;
}

export const fetchUtilities: FetchUtilities = {
  request: (url: string, options: FetchOptions, el: HTMLElement): Promise<unknown> => {
    const isGetOrHead = !options.method || options.method.toUpperCase() === 'GET' || options.method.toUpperCase() === 'HEAD';

    if (isGetOrHead) {
      return cacheEngine.fetchWithCache(url, {
        storage: 'session',
        responseType: (options.responseType as any) || 'text',
        onUpdate: (freshData) => {
          el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-success`, {
            bubbles: true,
            cancelable: false,
            detail: { url, options, data: freshData },
          }));
        }
      });
    }

    // Deduplicate concurrent in-flight non-GET/HEAD requests, but never cache mutations past settlement
    const cacheKey = `${url}:${options.method || 'POST'}:${options.responseType || 'text'}`;
    if (!options.body && fetchCache.has(cacheKey)) {
      return fetchCache.get(cacheKey)!;
    }

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
          reportError(new Error(`Failed to fetch from ${url}: ${errMsg(e)}`), el);
        }
        el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-error`, {
          bubbles: true,
          cancelable: false,
          detail: { url, options, error: e },
        }));
        throw e;
      }
    })();

    if (!options.body) {
      fetchCache.set(cacheKey, promise);
      promise.finally(() => {
        fetchCache.delete(cacheKey);
      });
    }

    return promise;
  },

  /**
   * Creates a deeply reactive Suspense proxy that throws its pending Promise when accessed.
   * This allows UX to gracefully pause elementBoundEffect until the fetch completes.
   */
  createSuspenseProxy: <T>(promise: Promise<T>): T => {
    let isResolved = false;
    let isRejected = false;
    let parsedResult: unknown = undefined;
    let error: unknown | undefined;

    promise.then(
      res => {
        isResolved = true;
        if (typeof res === 'string') {
          try {
            parsedResult = JSON.parse(res);
          } catch {
            parsedResult = res;
          }
        } else {
          parsedResult = res;
        }
        if (parsedResult && typeof parsedResult === 'object') {
          const obj = parsedResult as Record<string, unknown>;
          const envelopes = ['data', 'results', 'items', 'value', '_embedded', 'entries'];
          for (const envelope of envelopes) {
            if (obj[envelope] !== undefined) {
              parsedResult = obj[envelope];
              break;
            }
          }
        }
      },
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

        if (parsedResult === undefined || parsedResult === null) return undefined;
        
        const val = typeof parsedResult === 'object' ? (parsedResult as Record<string, unknown>)[prop as string] : undefined;
        return typeof val === 'function' ? val.bind(parsedResult) : val;
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
