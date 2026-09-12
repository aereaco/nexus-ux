import { RuntimeContext } from '../../engine/composition.ts';
import { runPwaRegistrationOp } from '../../engine/utils/pwa.ts';

/**
 * $bgSync Sprite — Background Sync API wrapper
 * 
 * Registers one-time sync events that fire when the device
 * comes back online. Requires a service worker.
 *
 * Usage:
 *   $bgSync.register('sync-messages')   — register a sync tag
 *   $bgSync.tags                        — list registered sync tags
 */

import type { SpriteModule } from '../../engine/modules.ts';

export function createBgSyncApi(runtime: RuntimeContext) {
  return {
    /**
     * Register a one-time background sync.
     * Returns reactive { status, error }.
     */
    register(tag: string) {
      return runPwaRegistrationOp(
        runtime,
        'sync',
        async (reg) => {
          await (reg as any).sync.register(tag);
        },
        { featureLabel: 'Background Sync API' }
      );
    },

    /**
     * Get all registered sync tags.
     * Returns reactive { data: string[], status, error }.
     */
    get tags() {
      return runPwaRegistrationOp<string[]>(
        runtime,
        'sync',
        async (reg) => {
          return await (reg as any).sync.getTags();
        },
        { initialStatus: 'loading', initialData: [], featureLabel: 'Background Sync API' }
      );
    }
  };
}

export const bgSyncSpriteModule: SpriteModule = {
  name: 'bgSync',
  key: '$bgSync',
  sprites: (runtime: RuntimeContext) => createBgSyncApi(runtime)
};

export default bgSyncSpriteModule;


