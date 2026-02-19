import { reactive } from '../../engine/reactivity.ts';

const state = reactive({
  onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
  language: typeof navigator !== 'undefined' ? navigator.language : 'en',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
  hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1,
  clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : null
});

if (typeof window !== 'undefined') {
  globalThis.addEventListener('online', () => state.onLine = true);
  globalThis.addEventListener('offline', () => state.onLine = false);
  globalThis.addEventListener('languagechange', () => state.language = navigator.language);
}

export const navigatorMirror = state;
