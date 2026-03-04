import { RuntimeContext } from '../../engine/composition.ts';

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
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
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
        const op = runtime.reactive<{ data: PushSubscription | null; status: string; error: string | null }>({
          data: null, status: 'pending', error: null
        });

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
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
              applicationServerKey: key
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
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending', error: null
        });

        if (!state.subscription) {
          op.error = 'No active subscription';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            await state.subscription!.unsubscribe();
            state.subscription = null;
            state.status = 'idle';
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      }
    }
  };
}
