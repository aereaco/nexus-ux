import { RuntimeContext } from '../../engine/composition.ts';
import { FetchOptions } from '../../engine/fetch.ts';

// A deeply reactive Suspense proxy that throws its pending Promise when accessed
// Instead of undefined crashes, this gracefully pauses elementBoundEffect until the fetch completes.
function createSuspenseProxy(promise: Promise<any>): any {
  let isResolved = false;
  let isRejected = false;
  let result: any;
  let error: any;

  // Evaluate the promise
  promise.then(
    res => { isResolved = true; result = res; },
    err => { isRejected = true; error = err; }
  );

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
      
      const value = result[prop as string];
      
      // If the property is an object itself, we don't strictly *need* to re-wrap it 
      // because it's already resolved, but we return it cleanly.
      return value;
    }
  };

  return new Proxy(promise, handler);
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
  return {
    $fetch: fetchSprite(runtime)
  };
}
