import { RuntimeContext } from '../../engine/composition.ts';
import { createPwaAsyncOp, hasServiceWorker, runPwaOp } from '../../engine/utils/pwa.ts';

/**
 * $push Sprite — Push Messaging API wrapper
 * 
 * Manages push notification subscriptions via the Push API.
 * Requires an active service worker registration.
 *
 * Usage:
 *   $push.subscribe(vapidPublicKey)     — subscribe to push notifications
 *   $push.unsubscribe()                 — unsubscribe
 *   $push.subscription                  — reactive current subscription
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function createPushApi(runtime: RuntimeContext) {
  const state = runtime.reactive<{
    subscription: PushSubscription | null;
    status: 'idle' | 'subscribing' | 'active' | 'error';
    error: string | null;
  }>({
    subscription: null,
    status: 'idle',
    error: null
  });

  // Check for existing subscription on init
  if (hasServiceWorker()) {
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          state.subscription = sub;
          state.status = 'active';
        }
      }).catch(() => { /* Push not available */ });
    }).catch(() => { /* SW not registered */ });
  }

  return {
    get subscription() { return state.subscription; },
    get status() { return state.status; },

    /**
     * Subscribe to push notifications.
     * @param applicationServerKey - VAPID public key (base64 or Uint8Array)
     */
    subscribe(applicationServerKey: string | Uint8Array) {
      const op = createPwaAsyncOp<PushSubscription | null>(runtime, { data: null });

      if (!hasServiceWorker()) {
        op.error = 'Service Worker not available';
        op.status = 'error';
        return op;
      }

      state.status = 'subscribing';

      (async () => {
        try {
          const reg = await navigator.serviceWorker.ready;
          const keyBytes = typeof applicationServerKey === 'string'
            ? urlBase64ToUint8Array(applicationServerKey)
            : applicationServerKey;

          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes
          });

          state.subscription = sub;
          state.status = 'active';
          op.data = sub;
          op.status = 'success';
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          state.error = message;
          state.status = 'error';
          op.error = message;
          op.status = 'error';
        }
      })();

      return op;
    },

    /**
     * Unsubscribe from push notifications.
     */
    unsubscribe() {
      if (!state.subscription) {
        return createPwaAsyncOp(runtime, { status: 'error', error: 'No active subscription' });
      }

      return runPwaOp(runtime, async () => {
        await state.subscription!.unsubscribe();
        state.subscription = null;
        state.status = 'idle';
      });
    }
  };
}

export const pushSpriteModule: SpriteModule = {
  name: 'push',
  key: '$push',
  sprites: (runtime: RuntimeContext) => createPushApi(runtime)
};

export default pushSpriteModule;
