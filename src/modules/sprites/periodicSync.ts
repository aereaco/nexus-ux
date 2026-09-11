import { RuntimeContext } from '../../engine/composition.ts';
import { runPwaRegistrationOp } from '../../engine/utils/pwa.ts';

/**
 * $periodicSync Sprite — Periodic Background Sync API wrapper
 * 
 * Registers periodic sync events that fire at regular intervals
 * (browser-determined minimum). Requires a service worker.
 *
 * Usage:
 *   $periodicSync.register('content-sync', { minInterval: 24 * 60 * 60 * 1000 })
 *   $periodicSync.unregister('content-sync')
 *   $periodicSync.tags                      — list registered tags
 */

export default function periodicSyncFactory(runtime: RuntimeContext) {
  return {
    $periodicSync: {
      /**
       * Register a periodic background sync.
       * Returns reactive { status, error }.
       */
      register(tag: string, options?: { minInterval?: number }) {
        return runPwaRegistrationOp(
          runtime,
          'periodicSync',
          async (reg) => {
            await (reg as any).periodicSync.register(tag, options || {});
          },
          { featureLabel: 'Periodic Background Sync API' }
        );
      },

      /**
       * Unregister a periodic sync tag.
       */
      unregister(tag: string) {
        return runPwaRegistrationOp(
          runtime,
          'periodicSync',
          async (reg) => {
            await (reg as any).periodicSync.unregister(tag);
          },
          { featureLabel: 'Periodic Background Sync API' }
        );
      },

      /**
       * Get all registered periodic sync tags.
       */
      get tags() {
        return runPwaRegistrationOp<string[]>(
          runtime,
          'periodicSync',
          async (reg) => {
            return await (reg as any).periodicSync.getTags();
          },
          { initialStatus: 'loading', initialData: [], featureLabel: 'Periodic Background Sync API' }
        );
      }
    }
  };
}

