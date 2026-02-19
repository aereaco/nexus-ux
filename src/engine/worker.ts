import { heap } from './heap.ts';

/**
 * ThreadManager
 * Handles communication with the background logic worker.
 * Syncs the shared heap if SharedArrayBuffer is available.
 */
export class ThreadManager {
  private worker: Worker | null = null;
  private isSAB: boolean = typeof SharedArrayBuffer !== 'undefined';

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // In a real build, this would be a URL to the bundled worker.
      // For Deno/Dev, we point to the TS source if handled by loader, or JS.
      // We assume a build step exists or we utilize a compatible loader.
      this.worker = new Worker(new URL('../workers/logic.ts', import.meta.url).href, {
        type: 'module',
      });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'LOG') {
          if (document.documentElement.hasAttribute('data-debug')) {
            console.log('[Worker]', ...payload);
          }
        } else if (type === 'ERROR') {
          console.error('[Worker Error]', payload);
        }
      };

      // Send Heap Buffer
      if (this.isSAB) {
        this.worker.postMessage({
          type: 'INIT_HEAP',
          payload: heap.getBuffer()
        });
      } else {
        if (document.documentElement.hasAttribute('data-debug')) {
          console.warn('SharedArrayBuffer not supported. Threading will be limited to message passing.');
        }
      }

    } catch (e) {
      console.error('Failed to initialize worker:', e);
    }
  }

  public execute(taskName: string, data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) return reject('Worker not initialized');

      const id = crypto.randomUUID();

      const handler = (e: MessageEvent) => {
        const { id: msgId, type, payload, error } = e.data;
        if (msgId === id) {
          this.worker?.removeEventListener('message', handler);
          if (type === 'RESULT') resolve(payload);
          else reject(error || 'Unknown worker error');
        }
      };

      this.worker.addEventListener('message', handler);

      this.worker.postMessage({
        type: 'EXECUTE',
        id,
        taskName,
        payload: data
      });
    });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const threadManager = new ThreadManager();
