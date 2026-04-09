/**
 * Logic Worker
 * Executes heavy logic off the main thread.
 * Shares state via SharedArrayBuffer if available.
 */

let _heapView: Float64Array | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id, taskName } = e.data;

  switch (type) {
    case 'INIT_HEAP':
      if (payload instanceof SharedArrayBuffer || payload instanceof ArrayBuffer) {
        _heapView = new Float64Array(payload);
        postLog('Heap initialized in worker');
      }
      break;

    case 'EXECUTE':
      try {
        const result = executeTask(taskName, payload);
        self.postMessage({ type: 'RESULT', id, payload: result });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        self.postMessage({ type: 'ERROR', id, error: message });
      }
      break;
  }
};

function postLog(...args: unknown[]) {
  self.postMessage({ type: 'LOG', payload: args });
}

// Registry of tasks available to the worker
const tasks: Record<string, (data: unknown) => unknown> = {
  'fibonacci': (data: unknown) => {
    const n = Number(data);
    // Example CPU intensive task
    const fib = (num: number): number => num <= 1 ? num : fib(num - 1) + fib(num - 2);
    return fib(n);
  },
  'processData': (data: unknown) => {
    const numbers = data as number[];
    // Example data processing
    return numbers.map(x => x * 2).filter(x => x > 10);
  }
};

function executeTask(taskName: string, data: unknown): unknown {
  if (taskName in tasks) {
    return tasks[taskName](data);
  }
  // Dynamic execution? (Riskier, but powerful)
  // if (taskName === 'eval') ...
  throw new Error(`Unknown task: ${taskName}`);
}

// Signal readiness
postLog('Worker ready');
