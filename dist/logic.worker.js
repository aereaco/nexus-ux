// src/engine/logic.worker.ts
var _heapView = null;
function describeWorkerFnError(err) {
  if (err instanceof ReferenceError) {
    return `${err.message} \u2014 runInWorker() cannot see variables closed over from the caller's scope; pass them explicitly via the "args" parameter instead.`;
  }
  return err instanceof Error ? err.message : String(err);
}
function handleWorkerMessage(e) {
  const { type, payload, id, taskName, fn, args } = e.data || {};
  switch (type) {
    case "INIT_HEAP":
      if (payload instanceof SharedArrayBuffer || payload instanceof ArrayBuffer) {
        _heapView = new Float64Array(payload);
        postLog("Heap initialized in worker");
      }
      break;
    case "EXECUTE":
      try {
        const result = executeTask(taskName, payload);
        self.postMessage({ type: "RESULT", id, payload: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        self.postMessage({ type: "ERROR", id, error: message });
      }
      break;
    case "EXECUTE_FN":
      (async () => {
        try {
          const compiledFn = new Function(`return (${fn})`)();
          const callArgs = Array.isArray(args) ? args : [];
          const result = await compiledFn(...callArgs);
          self.postMessage({ type: "RESULT", id, payload: result });
        } catch (err) {
          const message = describeWorkerFnError(err);
          self.postMessage({ type: "ERROR", id, error: message });
        }
      })();
      break;
  }
}
self.onmessage = handleWorkerMessage;
function postLog(...args) {
  self.postMessage({ type: "LOG", payload: args });
}
var tasks = {
  "fibonacci": (data) => {
    const n = Number(data);
    const fib = (num) => num <= 1 ? num : fib(num - 1) + fib(num - 2);
    return fib(n);
  },
  "processData": (data) => {
    const numbers = data;
    return numbers.map((x) => x * 2).filter((x) => x > 10);
  }
};
function executeTask(taskName, data) {
  if (taskName in tasks) {
    return tasks[taskName](data);
  }
  throw new Error(`Unknown task: ${taskName}`);
}
postLog("Worker ready");
export {
  handleWorkerMessage
};
