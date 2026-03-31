import { RuntimeContext } from '../../engine/composition.ts';
import { FetchOptions } from '../../engine/fetch.ts';

export function fetchSprite(runtime: RuntimeContext) {
  return (url: string, options: FetchOptions = {}) => {
    if (!runtime.fetch) throw new Error('Fetch utility not available');

    // Use the centralized engine Suspense Proxy
    const promise = runtime.fetch.request(url, options, document.body);
    return runtime.fetch.createSuspenseProxy(promise);
  };
}

export default function(runtime: RuntimeContext) {
  const fetchFn = fetchSprite(runtime);
  return {
    $fetch: fetchFn,
    $get: (url: string, options: FetchOptions = {}) => fetchFn(url, { ...options, responseType: 'json' })
  };
}
