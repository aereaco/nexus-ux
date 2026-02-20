import { ref, Ref } from '../../engine/reactivity.ts';

/**
 * Container Scope: Provides reactive signals for container queries.
 * Usage: @container('(min-width: 300px)')
 * 
 * Note: This implementation currently uses window.matchMedia as a fallback 
 * because true element-scoped container queries via JS are complex to polyfill 
 * efficiently without creating ResizeObservers for every call.
 * 
 * A full implementation would need context about *which* element is asking, 
 * which the Signal implementation might not easily have if not bound to an element.
 * 
 * For now, mapping to media queries or a simple global resize observer on body?
 * We will use matchMedia for standard queries for now, assuming viewport.
 */
const containerSignals: Map<string, Ref<boolean>> = new Map();

export function getContainerSignal(query: string, _element?: HTMLElement): Ref<boolean> {
  // TODO: Implement true container queries using ResizeObserver on closest container.
  // This is a placeholder that falls back to viewport media queries.
  if (containerSignals.has(query)) {
    return containerSignals.get(query)!;
  }

  const mql = globalThis.matchMedia(query);
  const s = ref(mql.matches);

  const listener = (e: MediaQueryListEvent) => {
    s.value = e.matches;
  };

  mql.addEventListener('change', listener);
  containerSignals.set(query, s);
  return s;
}

export const scopeRule = (q: string, body: () => any) => getContainerSignal(q).value ? body() : undefined;
