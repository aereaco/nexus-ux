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
  },
  "PREDICT_TRAJECTORY": (data) => {
    const { history, candidates } = data;
    if (!history || history.length < 3)
      return { matchedIds: [] };
    const p0 = history[history.length - 3];
    const p2 = history[history.length - 1];
    const dt = (p2.t - p0.t) / 1e3;
    if (dt <= 0)
      return { matchedIds: [] };
    const vx = (p2.x - p0.x) / dt;
    const vy = (p2.y - p0.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 50)
      return { matchedIds: [], speed };
    const timeHorizon = 0.15;
    const projX = p2.x + vx * timeHorizon;
    const projY = p2.y + vy * timeHorizon;
    const minX = Math.min(p2.x, projX) - 20;
    const minY = Math.min(p2.y, projY) - 20;
    const maxX = Math.max(p2.x, projX) + 20;
    const maxY = Math.max(p2.y, projY) + 20;
    const matchedIds = [];
    let minD = Infinity;
    let snappedId = void 0;
    let snappedCx = 0;
    let snappedCy = 0;
    const len = candidates ? candidates.length : 0;
    for (let i = 0; i < len; i++) {
      const c = candidates[i];
      const cx = c.left + c.width / 2;
      const cy = c.top + c.height / 2;
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        matchedIds.push(c.id);
        const d = Math.hypot(cx - projX, cy - projY);
        if (d < minD) {
          minD = d;
          snappedId = c.id;
          snappedCx = cx;
          snappedCy = cy;
        }
      }
    }
    return {
      matchedIds,
      snappedId,
      snappedTarget: snappedId ? { cx: snappedCx, cy: snappedCy } : void 0,
      speed,
      vx,
      vy,
      projX,
      projY
    };
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
