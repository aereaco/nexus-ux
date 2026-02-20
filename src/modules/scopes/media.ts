import { ref, Ref, computed } from '../../engine/reactivity.ts';

// Cache for media query signals
const mediaSignals: Map<string, Ref<boolean>> = new Map();

/**
 * Creates or retrieves a cached signal that tracks a media query.
 */
export function getMediaSignal(query: string): Ref<boolean> {
  if (mediaSignals.has(query)) {
    return mediaSignals.get(query)!;
  }

  if (typeof window === 'undefined') {
    // Server-side default
    mediaSignals.set(query, computed(() => false));
    return mediaSignals.get(query)!;
  }
  const mql = globalThis.matchMedia(query);
  const s = ref(mql.matches);

  const listener = (e: MediaQueryListEvent) => {
    s.value = e.matches;
  };

  mql.addEventListener('change', listener);
  mediaSignals.set(query, s);
  return s;
}

export const scopeRule = (q: string, body: () => any) => getMediaSignal(q).value ? body() : undefined;
