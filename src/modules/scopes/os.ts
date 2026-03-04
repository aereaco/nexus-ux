import { reactive } from '../../engine/reactivity.ts';

// Simple OS detection
const getOS = () => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Mac/.test(ua)) return 'macos';
  if (/Win/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  if (/Android/.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  return 'unknown';
};

const getTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const osScope = reactive({
  platform: getOS(),
  theme: getTheme(),
  isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  isDesktop: !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
});

const cleanupFns: (() => void)[] = [];

// Update theme on change
if (typeof window !== 'undefined') {
  const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
  const onThemeChange = (e: MediaQueryListEvent) => {
    osScope.theme = e.matches ? 'dark' : 'light';
  };
  mq.addEventListener('change', onThemeChange);
  cleanupFns.push(() => mq.removeEventListener('change', onThemeChange));
}

export function getOSScope() {
  return osScope;
}

// deno-lint-ignore no-explicit-any
export const scopeRule = (q: string, body: () => any) => {
  // deno-lint-ignore no-explicit-any
  if (q in osScope) return (osScope as any)[q] ? body() : undefined;
  return osScope.platform === q ? body() : undefined;
};

/** Tear down all listeners — for testing or micro-frontend teardown. */
export function dispose() { cleanupFns.forEach(fn => fn()); }
