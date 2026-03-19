import { RuntimeContext } from '../../engine/composition.ts';
import { FetchOptions } from '../../engine/fetch.ts';

const proxyCache = new WeakMap<Promise<any>, any>();

// A deeply reactive Suspense proxy that throws its pending Promise when accessed
// Instead of undefined crashes, this gracefully pauses elementBoundEffect until the fetch completes.
function createSuspenseProxy(promise: Promise<any>): any {
  if (proxyCache.has(promise)) {
    return proxyCache.get(promise);
  }

  let isResolved = false;
  let isRejected = false;
  let result: any;
  let error: any;

  // Settlement Tracking
  promise.then(
    res => { 
       isResolved = true; 
       result = res; 
    },
    err => { 
       isRejected = true; 
       error = err; 
    }
  );

  // Sync Check for already settled promises (e.g. from cache)
  // We can't synchronously check native Promises, so we rely on the .then() above.
  // However, we can use microtasks to ensure we don't spin.

  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'then') return target.then.bind(target);
      if (prop === 'catch') return target.catch.bind(target);
      if (prop === 'finally') return target.finally.bind(target);
      
      // Essential Vue reactivity flags so it doesn't try to infinitely unravel the Proxy
      if (prop === '__v_isRef') return false;
      if (prop === '__v_isReactive') return false;

      if (isRejected) throw error;
      if (!isResolved) {
        // Deep Suspense Tripwire: Throw the promise up to elementBoundEffect
        throw promise; 
      }

      if (result === undefined || result === null) return undefined;
      
      // ZCZS: Lazy JSON Hydration. E.g if text response from network resolves as string, parse it upon first property read.
      let finalResult = result;
      if (typeof result === 'string') {
        try { finalResult = JSON.parse(result); } catch (e) { /* fallback to string */ }
      }
      
      const value = finalResult && typeof finalResult === 'object' ? finalResult[prop as string] : undefined;
      return value;
    }
  };

  const proxy = new Proxy(promise, handler);
  proxyCache.set(promise, proxy);
  return proxy;
}

export function fetchSprite(runtime: RuntimeContext) {
  return (url: string, options: FetchOptions = {}) => {
    if (!runtime.fetch) throw new Error('Fetch utility not available');

    // Return the Suspense Proxy instead of a raw Promise
    const promise = runtime.fetch.request(url, options, document.body);
    return createSuspenseProxy(promise);
  };
}

export default function(runtime: RuntimeContext) {
  const fetchFn = fetchSprite(runtime);
  return {
    $fetch: fetchFn,
    $get: (url: string, options: FetchOptions = {}) => fetchFn(url, { ...options, responseType: 'json' })
  };
}
