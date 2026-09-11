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

export default function pushFactory(runtime: RuntimeContext) {
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
    $push: {
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
            let key: Uint8Array;
            if (typeof applicationServerKey === 'string') {
              const raw = atob(applicationServerKey.replace(/-/g, '+').replace(/_/g, '/'));
              key = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
            } else {
              key = applicationServerKey;
            }

            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: key as unknown as ArrayBuffer
            });
            state.subscription = sub;
            state.status = 'active';
            op.data = sub;
            op.status = 'done';
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            op.error = msg;
            op.status = 'error';
            state.error = msg;
            state.status = 'error';
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
    }
  };
}

