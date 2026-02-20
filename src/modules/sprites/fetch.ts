import { RuntimeContext } from '../../engine/composition.ts';
import { FetchOptions } from '../../engine/fetch.ts';

export function fetchSprite(runtime: RuntimeContext) {
  return (url: string, options: FetchOptions = {}) => {
    // Usage: $fetch('/api/data').then(...)
    // Or await $fetch('/api/data')

    // We need access to the current element?
    // The sprite factory doesn't know the current element unless passed.
    // If $fetch is global, it can't know 'el'.
    // BUT runtime.fetch.request requires 'el'.

    // Options:
    // 1. $fetch is context-aware (created per element? Too expensive).
    // 2. $fetch uses document.body as fallback if el not available?
    // 3. Evaluator passes 'el' to sprites? (Not currently supported).

    // Best approach for now: Use document.body.
    // Error reporting will be less specific.

    if (!runtime.fetch) throw new Error('Fetch utility not available');
    return runtime.fetch.request(url, options, document.body);
  };
}
