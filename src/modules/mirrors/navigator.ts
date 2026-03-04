import { reactive } from '../../engine/reactivity.ts';

const state = reactive({
  onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
  language: typeof navigator !== 'undefined' ? navigator.language : 'en',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
  hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1,
  clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : null
});

const cleanupFns: (() => void)[] = [];

if (typeof window !== 'undefined') {
  const onOnline = () => { state.onLine = true; };
  const onOffline = () => { state.onLine = false; };
  const onLangChange = () => { state.language = navigator.language; };
  globalThis.addEventListener('online', onOnline);
  globalThis.addEventListener('offline', onOffline);
  globalThis.addEventListener('languagechange', onLangChange);
  cleanupFns.push(
    () => globalThis.removeEventListener('online', onOnline),
    () => globalThis.removeEventListener('offline', onOffline),
    () => globalThis.removeEventListener('languagechange', onLangChange)
  );
}

export const navigatorMirror = state;

/** Tear down all listeners — for testing or micro-frontend teardown. */
export function dispose() { cleanupFns.forEach(fn => fn()); }
