import { reactive } from '../../engine/reactivity.ts';

/**
 * Native Scope: Bridge to native app capabilities (when running in a webview/native shell).
 * Currently a stub for web environment.
 */
export const nativeScope = reactive({
  isPresent: false,
  platform: 'web',
  bridge: null as unknown
});

// Check for native bridge injection (e.g. window.nexusNative)
// Check for native bridge injection (e.g. window.nexusNative)
interface NexusNative {
  platform: string;
  [key: string]: unknown;
}

if (typeof window !== 'undefined' && (window as unknown as Window & { nexusNative?: NexusNative }).nexusNative) {
  const native = (window as unknown as Window & { nexusNative?: NexusNative }).nexusNative!;
  nativeScope.isPresent = true;
  nativeScope.platform = native.platform || 'unknown';
  nativeScope.bridge = native;
}
