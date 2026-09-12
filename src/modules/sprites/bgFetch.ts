import { RuntimeContext } from '../../engine/composition.ts';
import { runPwaRegistrationOp, PwaAsyncOp } from '../../engine/utils/pwa.ts';

/**
 * $bgFetch Sprite — Background Fetch API wrapper
 * 
 * Allows downloading large assets in the background, even if the
 * user navigates away. Requires a service worker.
 *
 * Usage:
 *   $bgFetch.fetch('my-download', ['/large-file.zip'], { title: 'Downloading...' })
 *   $bgFetch.get('my-download')                    — get status of a fetch
 *   $bgFetch.abort('my-download')                   — abort a fetch
 */

import type { SpriteModule } from '../../engine/modules.ts';

export function createBgFetchApi(runtime: RuntimeContext) {
  return {
    /**
     * Start a background fetch.
     * Returns reactive { data: BackgroundFetchRegistration | null, status, error }.
     */
    fetch(id: string, requests: string[], options?: { title?: string; icons?: Array<{ src: string; sizes: string; type: string }>; downloadTotal?: number }) {
      let opRef: PwaAsyncOp<unknown>;
      opRef = runPwaRegistrationOp(
        runtime,
        'backgroundFetch',
        async (reg) => {
          const bgFetch = await (reg as any).backgroundFetch.fetch(id, requests, options || {});
          bgFetch.addEventListener('progress', () => {
            opRef.data = { ...bgFetch, downloaded: bgFetch.downloaded, downloadTotal: bgFetch.downloadTotal };
          });
          return bgFetch;
        },
        { featureLabel: 'Background Fetch API' }
      );
      return opRef;
    },

    /**
     * Get an existing background fetch registration.
     */
    get(id: string) {
      return runPwaRegistrationOp(
        runtime,
        'backgroundFetch',
        async (reg) => {
          return await (reg as any).backgroundFetch.get(id);
        },
        { initialStatus: 'loading', featureLabel: 'Background Fetch API' }
      );
    },

    /**
     * Abort a background fetch.
     */
    abort(id: string) {
      return runPwaRegistrationOp(
        runtime,
        'backgroundFetch',
        async (reg) => {
          const bgFetch = await (reg as any).backgroundFetch.get(id);
          if (bgFetch) {
            await bgFetch.abort();
          } else {
            throw new Error(`No background fetch with id '${id}'`);
          }
        },
        { featureLabel: 'Background Fetch API' }
      );
    }
  };
}

export const bgFetchSpriteModule: SpriteModule = {
  name: 'bgFetch',
  key: '$bgFetch',
  sprites: (runtime: RuntimeContext) => createBgFetchApi(runtime)
};

export default bgFetchSpriteModule;

