import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $notification Sprite — Web Notifications API wrapper
 * 
 * Declarative notifications with permission management.
 * Returns reactive containers for all async operations.
 *
 * Usage:
 *   $notification.send('Title', { body: 'Hello' })  — show notification
 *   $notification.permission                         — reactive permission state
 *   $notification.requestPermission()                — request permission
 */

export default function notificationFactory(runtime: RuntimeContext) {
  const state = runtime.reactive<{
    permission: NotificationPermission | 'unsupported';
    supported: boolean;
  }>({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    supported: typeof Notification !== 'undefined'
  });

  // Listen for permission changes if the API supports it
  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    navigator.permissions.query({ name: 'notifications' as PermissionName })
      .then(permStatus => {
        permStatus.addEventListener('change', () => {
          state.permission = Notification.permission;
        });
      })
      .catch(() => { /* Permissions API may not support 'notifications' query */ });
  }

  return {
    $notification: {
      /**
       * Current notification permission state (reactive).
       * 'default' | 'granted' | 'denied' | 'unsupported'
       */
      get permission() {
        return state.permission;
      },

      /**
       * Whether the Notification API is supported.
       */
      get supported() {
        return state.supported;
      },

      /**
       * Request notification permission.
       * Returns reactive { data: 'granted'|'denied'|'default', status, error }.
       */
      requestPermission() {
        const op = runtime.reactive<{
          data: NotificationPermission | null;
          status: string;
          error: string | null;
        }>({
          data: null,
          status: 'pending',
          error: null
        });

        if (!state.supported) {
          op.error = 'Notification API not supported';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const result = await Notification.requestPermission();
            state.permission = result;
            op.data = result;
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Send a notification. Auto-requests permission if not yet granted.
       * Returns reactive { status, error } container.
       */
      send(title: string, options?: NotificationOptions) {
        const op = runtime.reactive<{
          status: string;
          error: string | null;
          notification: Notification | null;
        }>({
          status: 'pending',
          error: null,
          notification: null
        });

        if (!state.supported) {
          op.error = 'Notification API not supported';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            // Auto-request permission if needed
            let perm = Notification.permission;
            if (perm === 'default') {
              perm = await Notification.requestPermission();
              state.permission = perm;
            }

            if (perm !== 'granted') {
              op.error = 'Notification permission denied';
              op.status = 'error';
              return;
            }

            const notification = new Notification(title, options);
            op.notification = notification;
            op.status = 'done';

            // Forward notification events to the DOM
            notification.onclick = () => {
              runtime.evaluate(document.body, `$dispatch('notification:click', ${JSON.stringify({ title })})`, {});
            };
            notification.onclose = () => {
              runtime.evaluate(document.body, `$dispatch('notification:close', ${JSON.stringify({ title })})`, {});
            };
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Close all notifications (if registered via service worker).
       */
      closeAll() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        const reg = navigator.serviceWorker.ready;
        reg.then(sw => sw.getNotifications().then(notifications => {
          notifications.forEach(n => n.close());
        }));
      }
    }
  };
}
