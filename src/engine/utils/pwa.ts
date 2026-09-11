import type { RuntimeContext } from '../composition.ts';

export interface PwaAsyncOp<T = unknown> {
  status: string;
  error: string | null;
  data?: T;
}

/**
 * Checks if the Service Worker API is supported in the current environment.
 */
export function hasServiceWorker(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Creates a reactive async operation tracker.
 */
export function createPwaAsyncOp<T = unknown>(
  runtime: RuntimeContext,
  initial: { status?: string; error?: string | null; data?: T } = {}
): PwaAsyncOp<T> {
  return runtime.reactive<PwaAsyncOp<T>>({
    status: initial.status ?? 'pending',
    error: initial.error ?? null,
    ...(initial.data !== undefined ? { data: initial.data } : {})
  });
}

/**
 * Runs an asynchronous PWA operation, updating the returned reactive op container.
 */
export function runPwaOp<T = unknown>(
  runtime: RuntimeContext,
  fn: () => Promise<T | void>,
  options: {
    initialStatus?: string;
    successStatus?: string;
    initialData?: T;
    missingServiceWorkerMsg?: string;
  } = {}
): PwaAsyncOp<T> {
  const initialStatus = options.initialStatus ?? 'pending';
  const successStatus = options.successStatus ?? (initialStatus === 'loading' ? 'ready' : 'done');
  const op = runtime.reactive<PwaAsyncOp<T>>({
    status: initialStatus,
    error: null,
    ...(options.initialData !== undefined ? { data: options.initialData } : {})
  });

  if (!hasServiceWorker()) {
    op.error = options.missingServiceWorkerMsg ?? 'Service Worker not available';
    op.status = 'error';
    return op;
  }

  (async () => {
    try {
      const result = await fn();
      if (result !== undefined) {
        op.data = result;
      }
      op.status = successStatus;
    } catch (e) {
      op.error = e instanceof Error ? e.message : String(e);
      op.status = 'error';
    }
  })();

  return op;
}

/**
 * Runs an asynchronous PWA operation that requires `navigator.serviceWorker.ready`
 * and optionally checks if a specific feature exists on the registration.
 */
export function runPwaRegistrationOp<T = unknown>(
  runtime: RuntimeContext,
  requiredFeature: string | null,
  fn: (reg: ServiceWorkerRegistration) => Promise<T | void>,
  options: {
    initialStatus?: string;
    successStatus?: string;
    initialData?: T;
    featureLabel?: string;
  } = {}
): PwaAsyncOp<T> {
  return runPwaOp<T>(
    runtime,
    async () => {
      const reg = await navigator.serviceWorker.ready;
      if (requiredFeature && !(requiredFeature in reg)) {
        const label = options.featureLabel || `${requiredFeature} API`;
        throw new Error(`${label} not supported`);
      }
      return await fn(reg);
    },
    options
  );
}
