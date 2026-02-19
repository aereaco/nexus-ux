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

// Update theme on change
if (typeof window !== 'undefined') {
  globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    osScope.theme = e.matches ? 'dark' : 'light';
  });
}

export function getOSScope() {
  return osScope;
}
