import { reactive } from '../../engine/reactivity.ts';

/**
 * View Scope: Provides reactive signals for the current view state.
 * Currently maps to window dimensions and orientation.
 */
export const viewScope = reactive({
  width: typeof window !== 'undefined' ? globalThis.innerWidth : 1024,
  height: typeof window !== 'undefined' ? globalThis.innerHeight : 768,
  scrollX: typeof window !== 'undefined' ? globalThis.scrollX : 0,
  scrollY: typeof window !== 'undefined' ? globalThis.scrollY : 0,
  orientation: typeof window !== 'undefined' && globalThis.screen.orientation ? globalThis.screen.orientation.type : 'landscape-primary',
  devicePixelRatio: typeof window !== 'undefined' ? globalThis.devicePixelRatio : 1,
  isPortrait: typeof window !== 'undefined' ? globalThis.innerHeight > globalThis.innerWidth : false,
  isLandscape: typeof window !== 'undefined' ? globalThis.innerWidth >= globalThis.innerHeight : true
});

const cleanupFns: (() => void)[] = [];

// Update on resize and scroll
if (typeof window !== 'undefined') {
  const updateView = () => {
    viewScope.width = globalThis.innerWidth;
    viewScope.height = globalThis.innerHeight;
    viewScope.scrollX = globalThis.scrollX;
    viewScope.scrollY = globalThis.scrollY;
    viewScope.isPortrait = globalThis.innerHeight > globalThis.innerWidth;
    viewScope.isLandscape = globalThis.innerWidth >= globalThis.innerHeight;
    viewScope.devicePixelRatio = globalThis.devicePixelRatio;
  };

  globalThis.addEventListener('resize', updateView);
  globalThis.addEventListener('scroll', updateView);
  cleanupFns.push(
    () => globalThis.removeEventListener('resize', updateView),
    () => globalThis.removeEventListener('scroll', updateView)
  );
}

// Update on orientation change
if (typeof window !== 'undefined' && globalThis.screen.orientation) {
  const onOrientationChange = () => {
    viewScope.orientation = globalThis.screen.orientation.type;
  };
  globalThis.screen.orientation.addEventListener('change', onOrientationChange);
  cleanupFns.push(() => globalThis.screen.orientation.removeEventListener('change', onOrientationChange));
}

// deno-lint-ignore no-explicit-any
export const scopeRule = (q: string, body: () => any) => {
  // deno-lint-ignore no-explicit-any
  if (q in viewScope) return (viewScope as any)[q] ? body() : undefined;
  return undefined;
};

/** Tear down all listeners — for testing or micro-frontend teardown. */
export function dispose() { cleanupFns.forEach(fn => fn()); }
