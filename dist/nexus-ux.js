var UX = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/engine/consts.ts
  var ROOT_SELECTOR, STATE, ATTRIBUTE_PREFIX, CUSTOM_EVENT_PREFIX, DATA_PRESERVE_ATTR, NEG_TOKENS, MODIFIER_DELIMITER, DATA_STACK_KEY, COMPONENT_CONTEXT_KEY, CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, MARKER_KEY, DEFAULT_DEBOUNCE_TIME;
  var init_consts = __esm({
    "src/engine/consts.ts"() {
      ROOT_SELECTOR = "[data-ux-init]";
      STATE = "nexus";
      ATTRIBUTE_PREFIX = "data-";
      CUSTOM_EVENT_PREFIX = "ux-";
      DATA_PRESERVE_ATTR = "data-preserve";
      NEG_TOKENS = {
        PATH: ".",
        GLOBAL: "#",
        MODIFIER: ":",
        LOGIC: "$",
        RULE: "@",
        CONTEXT: "&",
        OVERRIDE: "!",
        PSEUDO: "::",
        GRID: "||",
        MIRROR: "_"
      };
      MODIFIER_DELIMITER = NEG_TOKENS.MODIFIER;
      DATA_STACK_KEY = Symbol.for("__data_stack__");
      COMPONENT_CONTEXT_KEY = Symbol.for("__component_context__");
      CLEANUP_FUNCTIONS_KEY = Symbol.for("__cleanup_functions__");
      EFFECT_RUNNERS_KEY = Symbol.for("__effect_runners__");
      RUN_EFFECT_RUNNERS_KEY = Symbol.for("__run_effect_runners__");
      MARKER_KEY = Symbol.for("__nexus_marker__");
      DEFAULT_DEBOUNCE_TIME = 250;
    }
  });

  // src/engine/mcp.ts
  var mcp_exports = {};
  __export(mcp_exports, {
    MCPClient: () => MCPClient
  });
  var MCPClient;
  var init_mcp = __esm({
    "src/engine/mcp.ts"() {
      init_debug();
      MCPClient = class {
        url;
        eventSource = null;
        requestId = 0;
        pendingRequests = /* @__PURE__ */ new Map();
        onConnectCallback;
        onMessageCallback;
        constructor(serverUrl) {
          this.url = serverUrl;
        }
        /**
         * Connect to the MCP server via SSE.
         */
        connect() {
          return new Promise((resolve, reject) => {
            try {
              this.eventSource = new EventSource(this.url);
              this.eventSource.onopen = () => {
                if (this.onConnectCallback)
                  this.onConnectCallback();
                resolve();
              };
              this.eventSource.onerror = (err2) => {
                reportError(new Error(`MCP Connection failed: ${this.url}`));
                reject(err2);
              };
              this.eventSource.onmessage = (event) => {
                try {
                  const payload = JSON.parse(event.data);
                  this.handleIncoming(payload);
                } catch (_e) {
                  reportError(new Error(`MCP Malformed JSON: ${event.data}`));
                }
              };
              this.eventSource.addEventListener("message", (e) => {
                try {
                  const payload = JSON.parse(e.data);
                  this.handleIncoming(payload);
                } catch (_e) {
                }
              });
            } catch (e) {
              reject(e);
            }
          });
        }
        /**
         * Send a JSON-RPC 2.0 request to the MCP server via POST.
         */
        sendRequest(method, params = {}) {
          const id = ++this.requestId;
          const body = JSON.stringify({
            jsonrpc: "2.0",
            id,
            method,
            params
          });
          return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, (res) => resolve(res));
            fetch(this.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body
            }).catch((err2) => {
              this.pendingRequests.delete(id);
              reject(err2);
            });
          });
        }
        /**
         * Handle incoming JSON-RPC messages (Responses or Notifications).
         */
        handleIncoming(payload) {
          if (payload.id !== void 0) {
            const resolve = this.pendingRequests.get(payload.id);
            if (resolve) {
              this.pendingRequests.delete(payload.id);
              resolve(payload.result || payload.error);
            }
          } else if (payload.method) {
            if (this.onMessageCallback) {
              this.onMessageCallback(payload.method, payload.params);
            }
          }
        }
        onConnect(cb) {
          this.onConnectCallback = cb;
        }
        onNotification(cb) {
          this.onMessageCallback = cb;
        }
        disconnect() {
          this.eventSource?.close();
        }
      };
    }
  });

  // src/engine/debug.ts
  function reportError(error, element, expression) {
    const errorMessage = `[UX Error] ${error.message}`;
    console.error(errorMessage, { element, expression, originalError: error });
    const Nexus2 = globalThis.Nexus;
    const coordinator = Nexus2?.coordinator;
    const runtime = coordinator?.runtimeContext;
    if (runtime?.mcp && runtime.isDevMode) {
      runtime.mcp.sendRequest("sampling/createMessage", {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Diagnose and suggest a fix for this Nexus-UX engine error:
Message: ${error.message}
Expression: ${expression || "N/A"}
Element: ${element?.outerHTML?.substring(0, 500) || "N/A"}
Stack: ${error.stack}`
          }
        }]
      }).then((res) => {
        const content = res?.content;
        const suggestion = content?.text || (Array.isArray(content) ? content[0]?.text : void 0);
        if (suggestion) {
          console.info(`[Nexus AI Diagnosis] \u2728 Suggested Fix:
${suggestion}`);
        }
      }).catch(() => {
      });
    }
    if (typeof CustomEvent !== "undefined") {
      const errorEvent = new CustomEvent(`${CUSTOM_EVENT_PREFIX}error`, {
        bubbles: true,
        cancelable: false,
        detail: {
          message: errorMessage,
          element,
          expression,
          originalError: error
        }
      });
      element?.dispatchEvent(errorEvent) || typeof document !== "undefined" && document.dispatchEvent(errorEvent);
    }
  }
  function initError(moduleName, message, element, expression) {
    const error = new UXError(`Initialization failed for ${moduleName}: ${message}`, element, expression);
    reportError(error, element, expression);
  }
  function syntaxError(directiveName, attributeValue, message, element) {
    const error = new UXError(
      `Syntax error in ${ATTRIBUTE_PREFIX}${directiveName}="${attributeValue}": ${message}`,
      element,
      attributeValue
    );
    reportError(error, element, attributeValue);
  }
  function evaluationError(expression, originalError, element) {
    const error = new UXError(
      `Expression evaluation failed: ${originalError.message}`,
      element,
      expression
    );
    error.stack = originalError.stack;
    reportError(error, element, expression);
  }
  function initSanitizingEngine(runtimeContext) {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined")
      return;
    try {
      sanitizingObserver = new MutationObserver((mutations) => {
        try {
          for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "data-debug") {
              const target2 = mutation.target;
              const debugValue = target2.getAttribute("data-debug");
              runtimeContext.isDevMode = debugValue !== null;
              if (debugValue && debugValue.trim().startsWith("{")) {
                try {
                  const config = new Function(`return (${debugValue})`)();
                  if (config.mcp && !runtimeContext.mcp) {
                    Promise.resolve().then(() => (init_mcp(), mcp_exports)).then(({ MCPClient: MCPClient2 }) => {
                      runtimeContext.mcp = new MCPClient2(config.mcp);
                      runtimeContext.mcp.connect().catch(() => {
                        console.warn(`[Nexus Debug] MCP connection failed: ${config.mcp}`);
                      });
                    });
                  }
                } catch {
                }
              }
            }
          }
        } catch (e) {
          console.error("[Nexus Sanitizer] Internal error (isolated):", e);
        }
      });
      sanitizingObserver.observe(document.documentElement, { attributes: true, subtree: true });
    } catch (e) {
      console.error("[Nexus Sanitizer] Failed to initialize:", e);
    }
  }
  function disposeSanitizingEngine() {
    if (sanitizingObserver) {
      sanitizingObserver.disconnect();
      sanitizingObserver = null;
    }
  }
  var UXError, logger, sanitizingObserver;
  var init_debug = __esm({
    "src/engine/debug.ts"() {
      init_consts();
      UXError = class _UXError extends Error {
        constructor(message, element, expression) {
          super(message);
          this.element = element;
          this.expression = expression;
          this.name = "UXError";
          Object.setPrototypeOf(this, _UXError.prototype);
        }
      };
      logger = {
        log: (context, ...args) => {
          if (context.isDevMode)
            console.log(`[Nexus]`, ...args);
        },
        warn: (context, ...args) => {
          if (context.isDevMode)
            console.warn(`[Nexus]`, ...args);
        },
        info: (context, ...args) => {
          if (context.isDevMode)
            console.info(`[Nexus]`, ...args);
        },
        debug: (context, ...args) => {
          if (context.isDevMode)
            console.debug(`[Nexus Debug]`, ...args);
        },
        error: (_context, ...args) => {
          console.error(`[Nexus Error]`, ...args);
        }
      };
      sanitizingObserver = null;
    }
  });

  // src/engine/scheduler.ts
  function yieldToBrowser() {
    if (yieldChannel) {
      return new Promise((resolve) => {
        yieldResolve = resolve;
        yieldChannel.port2.postMessage(null);
      });
    }
    if (typeof globalThis.scheduler === "object" && typeof globalThis.scheduler?.yield === "function") {
      return globalThis.scheduler.yield();
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  var PHASE_CURRENT, PHASE_PENDING, CAPTURE_LEN, EVALUATE_LEN, RESOLVE_LEN, PAINT_LEN, STATE_SLOTS, sharedState, yieldChannel, yieldResolve, STALL_BUDGET_MS, Scheduler, scheduler;
  var init_scheduler = __esm({
    "src/engine/scheduler.ts"() {
      PHASE_CURRENT = 0;
      PHASE_PENDING = 1;
      CAPTURE_LEN = 2;
      EVALUATE_LEN = 3;
      RESOLVE_LEN = 4;
      PAINT_LEN = 5;
      STATE_SLOTS = 6;
      try {
        if (typeof SharedArrayBuffer !== "undefined" && typeof globalThis.crossOriginIsolated !== "undefined" && globalThis.crossOriginIsolated) {
          sharedState = new Int32Array(new SharedArrayBuffer(STATE_SLOTS * 4));
        } else {
          sharedState = new Int32Array(new ArrayBuffer(STATE_SLOTS * 4));
        }
      } catch {
        sharedState = new Int32Array(new ArrayBuffer(STATE_SLOTS * 4));
      }
      yieldChannel = null;
      yieldResolve = null;
      if (typeof MessageChannel !== "undefined") {
        yieldChannel = new MessageChannel();
        yieldChannel.port1.onmessage = () => {
          if (yieldResolve) {
            yieldResolve();
            yieldResolve = null;
          }
        };
      }
      STALL_BUDGET_MS = 8;
      Scheduler = class _Scheduler {
        // Phase 1: Capture (Input/Signal Flagging)
        captureQueue = [];
        // Phase 2: Evaluate (Downstream effects & Ghost DOM)
        evaluateQueue = [];
        // Phase 3: Resolve (Instruction Queue translation)
        resolveQueue = [];
        // Phase 4: Paint (DOM mutation execution)
        paintQueue = [];
        nextTickQueue = [];
        pending = false;
        flushing = false;
        // Deduplication set: prevents the same runner from being enqueued multiple
        // times in the same flush cycle, which was the root cause of infinite loops.
        evaluateSet = /* @__PURE__ */ new Set();
        /** Configurable stall detection budget (ms). Phases yielding after this. */
        stallBudget = STALL_BUDGET_MS;
        /**
         * Phase 1: Capture
         */
        enqueueCapture(job) {
          this.captureQueue.push(job);
          this.syncSharedState();
          this.requestFlush();
        }
        /**
         * Phase 2: Evaluate (Legacy enqueueEffect/enqueueMorph mapping)
         * Deduplicates: if a runner is already queued, skip re-enqueue.
         */
        enqueueEvaluate(job) {
          if (this.evaluateSet.has(job))
            return;
          this.evaluateSet.add(job);
          this.evaluateQueue.push(job);
          this.syncSharedState();
          this.requestFlush();
        }
        // Alias for compatibility with existing modules
        enqueueEffect(job) {
          this.enqueueEvaluate(job);
        }
        /**
         * Phase 3: Resolve
         */
        enqueueResolve(job) {
          this.resolveQueue.push(job);
          this.syncSharedState();
          this.requestFlush();
        }
        /**
         * Phase 4: Paint (Legacy enqueueMorph mapping)
         */
        enqueuePaint(job) {
          this.paintQueue.push(job);
          this.syncSharedState();
          this.requestFlush();
        }
        // Alias for compatibility with existing code
        enqueueMorph(job) {
          this.enqueuePaint(job);
        }
        // Alias for Phase 4 or cleanup
        enqueueClean(job) {
          this.paintQueue.push(job);
          this.syncSharedState();
          this.requestFlush();
        }
        /**
         * Schedules a task to run after the current atomic frame completes.
         */
        nextTick(job) {
          this.nextTickQueue.push(job);
          this.requestFlush();
        }
        /**
         * Exposes the shared phase state for cross-context coordination.
         * Workers can read this to check scheduler load without IPC.
         */
        getSharedState() {
          return sharedState;
        }
        // ─── Async Process Loop ───────────────────────────────────────────────
        /**
         * Request a flush using the async process loop.
         * Phases 1-3 are dispatched via queueMicrotask for immediate processing.
         * Phase 4 (Paint) is deferred to requestAnimationFrame for frame alignment.
         */
        requestFlush() {
          if (this.pending)
            return;
          this.pending = true;
          Atomics.store(sharedState, PHASE_PENDING, 1);
          queueMicrotask(() => {
            this.flushComputationPhases();
          });
        }
        /**
         * Flush computation phases (Capture, Evaluate, Resolve) with stall detection.
         * If any phase exceeds the budget, yield to the browser and resume.
         */
        async flushComputationPhases() {
          if (this.flushing)
            return;
          this.flushing = true;
          try {
            Atomics.store(sharedState, PHASE_CURRENT, 1);
            await this.runQueueWithYielding(this.captureQueue);
            Atomics.store(sharedState, PHASE_CURRENT, 2);
            await this.runQueueWithYielding(this.evaluateQueue);
            this.evaluateSet.clear();
            Atomics.store(sharedState, PHASE_CURRENT, 3);
            await this.runQueueWithYielding(this.resolveQueue);
            if (this.paintQueue.length > 0 || this.nextTickQueue.length > 0) {
              await this.flushPaintPhase();
            } else {
              this.finalize();
            }
          } catch (e) {
            console.error("[Nexus Scheduler] Async loop error:", e);
            this.finalize();
          }
        }
        /**
         * Flush the Paint phase on the next animation frame.
         */
        flushPaintPhase() {
          return new Promise((resolve) => {
            if (typeof requestAnimationFrame !== "undefined") {
              requestAnimationFrame(() => {
                Atomics.store(sharedState, PHASE_CURRENT, 4);
                this.runQueueSync(this.paintQueue);
                this.runQueueSync(this.nextTickQueue);
                this.finalize();
                resolve();
              });
            } else {
              setTimeout(() => {
                Atomics.store(sharedState, PHASE_CURRENT, 4);
                this.runQueueSync(this.paintQueue);
                this.runQueueSync(this.nextTickQueue);
                this.finalize();
                resolve();
              }, 0);
            }
          });
        }
        /**
         * Reset scheduler state after a full flush cycle.
         */
        finalize() {
          this.flushing = false;
          this.pending = false;
          Atomics.store(sharedState, PHASE_CURRENT, 0);
          Atomics.store(sharedState, PHASE_PENDING, 0);
          this.syncSharedState();
          if (this.captureQueue.length > 0 || this.evaluateQueue.length > 0 || this.resolveQueue.length > 0 || this.paintQueue.length > 0 || this.nextTickQueue.length > 0) {
            this.pending = false;
            this.requestFlush();
          }
        }
        // ─── Queue Execution ──────────────────────────────────────────────────
        /** Maximum iterations per queue flush to prevent infinite loops */
        static MAX_QUEUE_ITERATIONS = 1e4;
        /**
         * Run a queue with stall detection. If execution exceeds the budget,
         * yield to the browser and resume processing.
         */
        async runQueueWithYielding(queue) {
          if (queue.length === 0)
            return;
          const startTime = performance.now();
          let iterations = 0;
          while (queue.length > 0) {
            if (++iterations > _Scheduler.MAX_QUEUE_ITERATIONS) {
              console.error(
                `[Nexus Scheduler] Loop guard: ${iterations} iterations exceeded. Remaining queue size: ${queue.length}. Draining queue to prevent infinite loop.`
              );
              queue.length = 0;
              break;
            }
            const job = queue.shift();
            try {
              job();
            } catch (e) {
              console.error("[Nexus Scheduler] Job error:", e);
            }
            if (performance.now() - startTime > this.stallBudget) {
              this.syncSharedState();
              await yieldToBrowser();
            }
          }
          this.syncSharedState();
        }
        /**
         * Run a queue synchronously (used for Paint phase which must be atomic).
         */
        runQueueSync(queue) {
          const len = queue.length;
          if (len === 0)
            return;
          for (let i = 0; i < len; i++) {
            try {
              queue[i]();
            } catch (e) {
              console.error("[Nexus Scheduler] Job error:", e);
            }
          }
          queue.splice(0, len);
        }
        /**
         * Sync queue lengths to the shared state buffer for cross-context visibility.
         */
        syncSharedState() {
          Atomics.store(sharedState, CAPTURE_LEN, this.captureQueue.length);
          Atomics.store(sharedState, EVALUATE_LEN, this.evaluateQueue.length);
          Atomics.store(sharedState, RESOLVE_LEN, this.resolveQueue.length);
          Atomics.store(sharedState, PAINT_LEN, this.paintQueue.length);
        }
      };
      scheduler = new Scheduler();
    }
  });

  // src/modules/sprites/predictive.ts
  var predictive_exports = {};
  __export(predictive_exports, {
    default: () => predictive_default,
    predictive: () => predictive,
    predictiveModule: () => predictiveModule
  });
  var Quadtree, PredictiveEngine, predictive, predictiveModule, predictive_default;
  var init_predictive = __esm({
    "src/modules/sprites/predictive.ts"() {
      init_scheduler();
      Quadtree = class _Quadtree {
        bounds;
        capacity;
        depth = 0;
        points = [];
        divided = false;
        northeast = null;
        northwest = null;
        southeast = null;
        southwest = null;
        constructor(bounds, capacity = 10) {
          this.bounds = bounds;
          this.capacity = capacity;
        }
        /**
         * Insert an element with its center point into the quadtree
         */
        insert(el, x, y) {
          if (!this.contains(x, y))
            return false;
          if (this.points.length < this.capacity) {
            this.points.push({ el, x, y });
            return true;
          }
          let allIdentical = true;
          for (let i = 0; i < this.points.length; i++) {
            if (this.points[i].x !== x || this.points[i].y !== y) {
              allIdentical = false;
              break;
            }
          }
          if (allIdentical) {
            this.points.push({ el, x, y });
            return true;
          }
          if (!this.divided) {
            this.subdivide();
          }
          return this.northeast.insert(el, x, y) || this.northwest.insert(el, x, y) || this.southeast.insert(el, x, y) || this.southwest.insert(el, x, y);
        }
        /**
         * Query all elements within a range (bounding box)
         * ZCZS: Uses Float64Array for results to minimize allocation
         */
        queryRange(x, y, width, height) {
          const results = [];
          if (!this.intersects(x, y, width, height)) {
            return results;
          }
          for (const point of this.points) {
            if (this.pointInRect(point.x, point.y, x, y, width, height)) {
              results.push(point.el);
            }
          }
          if (this.divided) {
            results.push(...this.northeast.queryRange(x, y, width, height));
            results.push(...this.northwest.queryRange(x, y, width, height));
            results.push(...this.southeast.queryRange(x, y, width, height));
            results.push(...this.southwest.queryRange(x, y, width, height));
          }
          return results;
        }
        /**
         * Query elements near a point (circle query)
         */
        queryRadius(x, y, radius) {
          const results = [];
          const r2 = radius * radius;
          if (!this.intersects(x - radius, y - radius, radius * 2, radius * 2)) {
            return results;
          }
          for (const point of this.points) {
            const dx = point.x - x;
            const dy = point.y - y;
            if (dx * dx + dy * dy <= r2) {
              results.push(point.el);
            }
          }
          if (this.divided) {
            results.push(...this.northeast.queryRadius(x, y, radius));
            results.push(...this.northwest.queryRadius(x, y, radius));
            results.push(...this.southeast.queryRadius(x, y, radius));
            results.push(...this.southwest.queryRadius(x, y, radius));
          }
          return results;
        }
        /**
         * Clear all points from the quadtree
         */
        clear() {
          this.points = [];
          this.divided = false;
          this.northeast = null;
          this.northwest = null;
          this.southeast = null;
          this.southwest = null;
        }
        contains(x, y) {
          return x >= this.bounds.x && x < this.bounds.x + this.bounds.width && y >= this.bounds.y && y < this.bounds.y + this.bounds.height;
        }
        intersects(x, y, w, h) {
          return !(x > this.bounds.x + this.bounds.width || x + w < this.bounds.x || y > this.bounds.y + this.bounds.height || y + h < this.bounds.y);
        }
        pointInRect(px, py, rx, ry, rw, rh) {
          return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
        }
        subdivide() {
          const { x, y, width, height } = this.bounds;
          const hw = width / 2;
          const hh = height / 2;
          this.northeast = new _Quadtree(
            { x: x + hw, y, width: hw, height: hh },
            this.capacity
          );
          this.northwest = new _Quadtree(
            { x, y, width: hw, height: hh },
            this.capacity
          );
          this.southeast = new _Quadtree({
            x: x + hw,
            y: y + hh,
            width: hw,
            height: hh
          }, this.capacity);
          this.southwest = new _Quadtree(
            { x, y: y + hh, width: hw, height: hh },
            this.capacity
          );
          this.divided = true;
        }
      };
      PredictiveEngine = class {
        lastPoint = null;
        velocity = { x: 0, y: 0, z: 0, t: 0 };
        predictiveNodes = /* @__PURE__ */ new Set();
        cleanupFns = [];
        debugTracker = null;
        // ZCZS: Quadtree for O(log n) spatial queries
        quadtree;
        viewportWidth = 0;
        viewportHeight = 0;
        rebuildTimer = null;
        fadeTimer = null;
        constructor() {
          if (typeof window !== "undefined") {
            this.viewportWidth = window.innerWidth;
            this.viewportHeight = window.innerHeight;
          }
          if (typeof document !== "undefined") {
            this.init();
          }
        }
        init() {
          const setup = () => {
            if (typeof document !== "undefined" && document.body && document.documentElement.hasAttribute("data-debug") && !this.debugTracker) {
              const svgNS = "http://www.w3.org/2000/svg";
              const svg = document.createElementNS(svgNS, "svg");
              svg.setAttribute("class", "nexus-predictive-tracker");
              svg.style.position = "fixed";
              svg.style.pointerEvents = "none";
              svg.style.zIndex = "999999";
              svg.style.overflow = "visible";
              svg.style.transform = "translate(-50%, -50%)";
              svg.style.width = "200px";
              svg.style.height = "200px";
              svg.style.left = "-1000px";
              svg.style.top = "-1000px";
              const halo = document.createElementNS(svgNS, "circle");
              halo.setAttribute("cx", "100");
              halo.setAttribute("cy", "100");
              halo.setAttribute("r", "20");
              halo.setAttribute("fill", "rgba(255, 0, 128, 0.1)");
              halo.setAttribute("stroke", "rgba(255, 0, 128, 0.5)");
              halo.setAttribute("stroke-width", "2");
              halo.style.transition = "r 0.15s ease-out";
              const line = document.createElementNS(svgNS, "line");
              line.setAttribute("x1", "100");
              line.setAttribute("y1", "100");
              line.setAttribute("x2", "100");
              line.setAttribute("y2", "100");
              line.setAttribute("stroke", "rgba(255, 0, 128, 0.5)");
              line.setAttribute("stroke-width", "2");
              line.setAttribute("stroke-dasharray", "4 4");
              line.style.opacity = "0";
              line.style.transition = "x2 0.1s linear, y2 0.1s linear, opacity 0.3s ease-out";
              const targetLine = document.createElementNS(svgNS, "line");
              targetLine.setAttribute("x1", "100");
              targetLine.setAttribute("y1", "100");
              targetLine.setAttribute("x2", "100");
              targetLine.setAttribute("y2", "100");
              targetLine.setAttribute("stroke", "rgba(34, 197, 94, 0.9)");
              targetLine.setAttribute("stroke-width", "2");
              targetLine.style.transition = "x2 0.1s linear, y2 0.1s linear, opacity 0.1s ease";
              targetLine.style.opacity = "0";
              svg.appendChild(halo);
              svg.appendChild(line);
              svg.appendChild(targetLine);
              document.body.appendChild(svg);
              this.debugTracker = { svg, halo, line, targetLine };
            }
            this.rebuildQuadtree();
          };
          if (typeof document !== "undefined" && document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setup);
            this.cleanupFns.push(
              () => document.removeEventListener("DOMContentLoaded", setup)
            );
          } else {
            setup();
          }
          const onMouseMove = (e) => this.track(e.clientX, e.clientY);
          const onTouchStart = (e) => {
            const touch = e.touches[0];
            if (touch)
              this.track(touch.clientX, touch.clientY);
          };
          const onResize = () => {
            this.viewportWidth = window.innerWidth;
            this.viewportHeight = window.innerHeight;
            this.rebuildQuadtree();
          };
          const onScroll = () => {
            if (this.rebuildTimer)
              clearTimeout(this.rebuildTimer);
            this.rebuildTimer = setTimeout(
              () => this.rebuildQuadtree(),
              16
            );
          };
          globalThis.addEventListener("mousemove", onMouseMove);
          globalThis.addEventListener("touchstart", onTouchStart, {
            passive: true
          });
          globalThis.addEventListener("resize", onResize);
          globalThis.addEventListener("scroll", onScroll, { passive: true });
          const onDomMutated = () => {
            if (this.rebuildTimer)
              clearTimeout(this.rebuildTimer);
            this.rebuildTimer = setTimeout(
              () => this.rebuildQuadtree(),
              200
            );
          };
          globalThis.addEventListener("nexus:dom-mutated", onDomMutated);
          this.cleanupFns.push(
            () => globalThis.removeEventListener("mousemove", onMouseMove),
            () => globalThis.removeEventListener("touchstart", onTouchStart),
            () => globalThis.removeEventListener("resize", onResize),
            () => globalThis.removeEventListener("scroll", onScroll),
            () => globalThis.removeEventListener("nexus:dom-mutated", onDomMutated),
            () => {
              if (this.rebuildTimer)
                clearTimeout(this.rebuildTimer);
              if (this.fadeTimer)
                clearTimeout(this.fadeTimer);
            }
          );
        }
        /** Tear down all listeners. */
        dispose() {
          this.cleanupFns.forEach((fn) => fn());
          this.quadtree.clear();
          if (this.debugTracker && this.debugTracker.svg.parentNode) {
            this.debugTracker.svg.parentNode.removeChild(this.debugTracker.svg);
          }
        }
        /**
         * Rebuild the quadtree with all data-signal elements
         * Called on init and resize
         */
        getDynamicSelectors() {
          const baseSelectors = /* @__PURE__ */ new Set([
            "[data-signal]",
            "[data-on-click]",
            "[data-on-hover]",
            "[data-on-mouseenter]",
            "[data-on-touchstart]",
            "button",
            "a",
            "input",
            "select",
            "textarea",
            "label",
            "[data-bind]"
          ]);
          if (typeof document === "undefined")
            return Array.from(baseSelectors).join(", ");
          try {
            const sheets = Array.from(document.styleSheets);
            if (document.adoptedStyleSheets) {
              sheets.push(...document.adoptedStyleSheets);
            }
            for (const sheet of sheets) {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules)
                  continue;
                for (let j = 0; j < rules.length; j++) {
                  const rule = rules[j];
                  if (rule.selectorText && (rule.selectorText.includes(":hover") || rule.selectorText.includes(":active") || rule.selectorText.includes(":focus"))) {
                    const segments = rule.selectorText.split(",");
                    for (let segment of segments) {
                      segment = segment.split("::")[0];
                      const clean = segment.replace(/:hover|:active|:focus/g, "").trim();
                      if (clean && clean !== "*" && clean !== "html" && clean !== "body") {
                        baseSelectors.add(clean);
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
          } catch (e) {
          }
          return Array.from(baseSelectors).join(", ");
        }
        rebuildQuadtree() {
          if (typeof document === "undefined")
            return;
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          this.viewportWidth = vw;
          this.viewportHeight = vh;
          const bufferX = vw * 0.15;
          const bufferY = vh * 0.15;
          this.quadtree = new Quadtree(
            {
              x: scrollX - bufferX,
              y: scrollY - bufferY,
              width: vw + bufferX * 2,
              height: vh + bufferY * 2
            },
            20
          );
          const selectors = this.getDynamicSelectors();
          const elements = document.querySelectorAll(selectors);
          elements.forEach((el) => {
            if (el instanceof HTMLElement) {
              const rect = el.getBoundingClientRect();
              const centerX = rect.x + rect.width / 2 + scrollX;
              const centerY = rect.y + rect.height / 2 + scrollY;
              this.quadtree.insert(el, centerX, centerY);
            }
          });
        }
        /**
         * Update quadtree when elements are added/removed
         */
        updateElement(el) {
          const rect = el.getBoundingClientRect();
          const centerX = rect.x + rect.width / 2 + window.scrollX;
          const centerY = rect.y + rect.height / 2 + window.scrollY;
          this.quadtree.insert(el, centerX, centerY);
        }
        track(x, y, z = 0) {
          const t = performance.now();
          const pageX = x + window.scrollX;
          const pageY = y + window.scrollY;
          if (this.lastPoint) {
            const dt = t - this.lastPoint.t;
            if (dt > 1) {
              this.velocity = {
                x: (pageX - this.lastPoint.x) / dt,
                y: (pageY - this.lastPoint.y) / dt,
                z: (z - this.lastPoint.z) / dt,
                t: 1
              };
              if (this.debugTracker)
                this.debugTracker.line.style.opacity = "1";
              scheduler.enqueueCapture(() => this.predict(pageX, pageY, z));
            }
          }
          this.lastPoint = { x: pageX, y: pageY, z, t };
          if (this.fadeTimer)
            clearTimeout(this.fadeTimer);
          this.fadeTimer = setTimeout(() => {
            this.velocity = { x: 0, y: 0, z: 0, t: 1 };
            if (this.debugTracker) {
              this.debugTracker.line.style.opacity = "0";
              this.debugTracker.targetLine.style.opacity = "0";
            }
          }, 150);
        }
        /**
         * Projects the interaction frustum and identifies nodes to pre-warm.
         * ZCZS: Uses quadtree for O(log n) spatial queries
         */
        predict(x, y, z) {
          const px = x + this.velocity.x * 100;
          const py = y + this.velocity.y * 100;
          const _pz = z + this.velocity.z * 100;
          const targets = this.quadtree.queryRadius(px, py, 150);
          const newPredictiveNodes = /* @__PURE__ */ new Set();
          let snappedTarget = void 0;
          let minD = Infinity;
          targets.forEach((target2) => {
            if (target2 instanceof HTMLElement) {
              newPredictiveNodes.add(target2);
              const className = target2.className || "";
              const hasTailwindInteraction = typeof className === "string" && (className.includes("hover:") || className.includes("active:") || className.includes("focus:"));
              const isInteractiveNode = target2.hasAttribute("data-on-click") || target2.hasAttribute("data-on-hover") || target2.hasAttribute("data-on-mouseenter") || target2.tagName === "BUTTON" || target2.tagName === "A" || target2.tagName === "INPUT" || target2.tagName === "SELECT" || target2.tagName === "TEXTAREA" || target2.hasAttribute("data-bind") || hasTailwindInteraction;
              if (isInteractiveNode) {
                const rect = target2.getBoundingClientRect();
                const cx = rect.x + rect.width / 2 + window.scrollX;
                const cy = rect.y + rect.height / 2 + window.scrollY;
                const d = Math.hypot(cx - px, cy - py);
                if (d < minD) {
                  minD = d;
                  snappedTarget = { cx, cy };
                }
              }
            }
          });
          if (this.debugTracker) {
            const vpX = x - window.scrollX;
            const vpY = y - window.scrollY;
            this.debugTracker.svg.style.left = `${vpX}px`;
            this.debugTracker.svg.style.top = `${vpY}px`;
            const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            const targetR = Math.min(80, Math.max(20, 20 + speed * 5));
            this.debugTracker.halo.setAttribute("r", targetR.toString());
            const trajX = 100 + this.velocity.x * 200;
            const trajY = 100 + this.velocity.y * 200;
            this.debugTracker.line.setAttribute("x2", trajX.toString());
            this.debugTracker.line.setAttribute("y2", trajY.toString());
            if (snappedTarget) {
              const target2 = snappedTarget;
              const targetX = 100 + (target2.cx - x);
              const targetY = 100 + (target2.cy - y);
              this.debugTracker.targetLine.setAttribute("x2", targetX.toString());
              this.debugTracker.targetLine.setAttribute("y2", targetY.toString());
              this.debugTracker.targetLine.style.opacity = "1";
            } else {
              this.debugTracker.targetLine.style.opacity = "0";
              this.debugTracker.targetLine.setAttribute("x2", "100");
              this.debugTracker.targetLine.setAttribute("y2", "100");
            }
          }
          newPredictiveNodes.forEach((node) => {
            if (!this.predictiveNodes.has(node)) {
              this.preWarm(node);
            }
          });
          this.predictiveNodes.forEach((node) => {
            if (!newPredictiveNodes.has(node)) {
              this.coolDown(node);
            }
          });
          this.predictiveNodes = newPredictiveNodes;
        }
        preWarm(el) {
          el.classList.add("nexus-predictive-warm");
          el.dispatchEvent(
            new CustomEvent("nexus:predictive-warm", {
              detail: { velocity: this.velocity }
            })
          );
        }
        coolDown(el) {
          el.classList.remove("nexus-predictive-warm");
          el.dispatchEvent(new CustomEvent("nexus:predictive-cool"));
        }
        getVelocity() {
          return this.velocity;
        }
      };
      predictive = new PredictiveEngine();
      globalThis._nexusQuadtree = predictive.quadtree;
      predictiveModule = {
        name: "predictive",
        key: "$predictive",
        sprites: (context) => {
          context.predictive = predictive;
          return {
            getVelocity: () => predictive.getVelocity(),
            updateElement: (el) => predictive.updateElement(el)
          };
        }
      };
      predictive_default = predictiveModule;
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    $id: () => $id,
    $nextTick: () => $nextTick,
    Nexus: () => Nexus,
    UX: () => UX
  });

  // src/engine/modules.ts
  init_consts();

  // src/engine/reactivity.ts
  init_consts();
  init_debug();
  init_scheduler();
  var ZCZS_SUPPORTED = typeof SharedArrayBuffer !== "undefined";
  var SignalHeap = class {
    _floatHeap;
    _intHeap;
    _boolHeap;
    _stringHeap;
    _stringPool;
    _objectHeap;
    _arrayHeap;
    _indexMap;
    _typeMap;
    _nextIndex = 0;
    _shared = false;
    constructor(size = 1024, shared = false) {
      this._shared = shared && ZCZS_SUPPORTED;
      if (this._shared) {
        const sab = new SharedArrayBuffer(size * 8);
        this._floatHeap = new Float64Array(sab);
        this._intHeap = new Int32Array(sab, size * 4);
        this._boolHeap = new Uint8Array(new SharedArrayBuffer(size));
      } else {
        this._floatHeap = new Float64Array(size);
        this._intHeap = new Int32Array(size);
        this._boolHeap = new Uint8Array(size);
      }
      this._stringHeap = /* @__PURE__ */ new Map();
      this._stringPool = /* @__PURE__ */ new Map();
      this._objectHeap = /* @__PURE__ */ new Map();
      this._arrayHeap = /* @__PURE__ */ new Map();
      this._indexMap = /* @__PURE__ */ new Map();
      this._typeMap = /* @__PURE__ */ new Map();
    }
    _allocateSlot(key, type) {
      if (this._indexMap.has(key)) {
        this._typeMap.set(key, type);
        return this._indexMap.get(key);
      }
      const index = this._nextIndex++;
      this._indexMap.set(key, index);
      this._typeMap.set(key, type);
      return index;
    }
    allocateForValue(key, value) {
      if (typeof value === "number") {
        if (Number.isInteger(value))
          return this.allocateInt(key);
        return this.allocateNumeric(key);
      } else if (typeof value === "boolean") {
        return this.allocateBoolean(key);
      } else if (typeof value === "string") {
        return this.allocateString(key);
      } else if (Array.isArray(value)) {
        return this.allocateArray(key);
      } else if (typeof value === "object" && value !== null) {
        return this.allocateObject(key);
      }
      return this.allocateObject(key);
    }
    allocateNumeric(key) {
      return this._allocateSlot(key, "float");
    }
    allocateInt(key) {
      return this._allocateSlot(key, "int");
    }
    allocateBoolean(key) {
      return this._allocateSlot(key, "bool");
    }
    allocateString(key) {
      return this._allocateSlot(key, "string");
    }
    allocateObject(key) {
      return this._allocateSlot(key, "object");
    }
    allocateArray(key) {
      return this._allocateSlot(key, "array");
    }
    set(key, value) {
      if (typeof value === "number") {
        if (Number.isInteger(value))
          this.setInt(key, value);
        else
          this.setNumeric(key, value);
      } else if (typeof value === "boolean") {
        this.setBoolean(key, value);
      } else if (typeof value === "string") {
        this.setString(key, value);
      } else if (Array.isArray(value)) {
        this.setArray(key, value);
      } else if (typeof value === "object" && value !== null) {
        this.setObject(key, value);
      }
    }
    get(key) {
      const type = this._typeMap.get(key);
      switch (type) {
        case "float":
          return this.getNumeric(key);
        case "int":
          return this.getInt(key);
        case "bool":
          return this.getBoolean(key);
        case "string":
          return this.getString(key);
        case "array":
          return this.getArray(key);
        case "object":
          return this.getObject(key);
        default:
          return void 0;
      }
    }
    setNumeric(key, value) {
      const index = this.allocateNumeric(key);
      this._floatHeap[index] = value;
    }
    getNumeric(key) {
      const index = this._indexMap.get(key);
      return index !== void 0 ? this._floatHeap[index] : void 0;
    }
    setInt(key, value) {
      const index = this.allocateInt(key);
      this._intHeap[index] = value;
    }
    getInt(key) {
      const index = this._indexMap.get(key);
      return index !== void 0 ? this._intHeap[index] : void 0;
    }
    setBoolean(key, value) {
      const index = this.allocateBoolean(key);
      this._boolHeap[index] = value ? 1 : 0;
    }
    getBoolean(key) {
      const index = this._indexMap.get(key);
      return index !== void 0 ? this._boolHeap[index] === 1 : void 0;
    }
    setString(key, value) {
      this._allocateSlot(key, "string");
      if (!this._stringPool.has(value)) {
        this._stringPool.set(value, this._stringPool.size);
      }
      this._stringHeap.set(key, value);
    }
    getString(key) {
      return this._stringHeap.get(key);
    }
    setObject(key, value) {
      this._allocateSlot(key, "object");
      this._objectHeap.set(key, value);
    }
    getObject(key) {
      return this._objectHeap.get(key);
    }
    setArray(key, value) {
      this._allocateSlot(key, "array");
      this._arrayHeap.set(key, value);
    }
    getArray(key) {
      return this._arrayHeap.get(key);
    }
    has(key) {
      return this._indexMap.has(key);
    }
    getType(key) {
      return this._typeMap.get(key);
    }
    delete(key) {
      this._indexMap.delete(key);
      this._typeMap.delete(key);
      this._stringHeap.delete(key);
      this._objectHeap.delete(key);
      this._arrayHeap.delete(key);
    }
    attachSharedBuffer(sab) {
      if (this._shared)
        return;
      this._shared = true;
      this._floatHeap = new Float64Array(sab);
      this._intHeap = new Int32Array(sab, this._floatHeap.length * 8);
      this._boolHeap = new Uint8Array(sab, this._floatHeap.length * 8 + this._intHeap.length * 4);
      console.log("[SignalHeap] Attached SharedArrayBuffer");
    }
  };
  var heap = new SignalHeap();
  var OWNERSHIP_KEY = Symbol.for("nexus.ownership");
  var BORROW_KEY = Symbol.for("nexus.borrow");
  var OwnershipTracker = class {
    _ownerships = /* @__PURE__ */ new WeakMap();
    _borrows = /* @__PURE__ */ new WeakMap();
    acquire(value, ownerId) {
      const ownership2 = { ownerId, refCount: 1, acquiredAt: Date.now() };
      this._ownerships.set(value, ownership2);
      value[OWNERSHIP_KEY] = ownership2;
    }
    release(value, ownerId) {
      const ownership2 = this._ownerships.get(value);
      if (!ownership2 || ownership2.ownerId !== ownerId)
        return;
      ownership2.refCount--;
      if (ownership2.refCount <= 0) {
        this._ownerships.delete(value);
        delete value[OWNERSHIP_KEY];
      }
    }
    borrowImmutable(value, borrower) {
      const borrows = this._borrows.get(value) || [];
      if (borrows.some((b) => b.type === "mutable"))
        return false;
      borrows.push({ borrower, type: "immutable", borrowedAt: Date.now() });
      this._borrows.set(value, borrows);
      value[BORROW_KEY] = borrows[borrows.length - 1];
      return true;
    }
    borrowMutable(value, borrower) {
      const borrows = this._borrows.get(value);
      if (borrows && borrows.length > 0)
        return false;
      const borrow = { borrower, type: "mutable", borrowedAt: Date.now() };
      this._borrows.set(value, [borrow]);
      value[BORROW_KEY] = borrow;
      return true;
    }
    returnBorrow(value, borrower) {
      const borrows = this._borrows.get(value);
      if (!borrows)
        return;
      const idx = borrows.findIndex((b) => b.borrower === borrower);
      if (idx !== -1) {
        borrows.splice(idx, 1);
        if (borrows.length === 0)
          this._borrows.delete(value);
        delete value[BORROW_KEY];
      }
    }
    validateBorrow(value, type) {
      const borrows = this._borrows.get(value);
      if (type === "mutable" && borrows && borrows.length > 0) {
        throw new Error(`Mutable borrow denied for ${type}: active borrows exist`);
      }
      if (type === "immutable" && borrows?.some((b) => b.type === "mutable")) {
        throw new Error(`Immutable borrow denied for ${type}: mutable borrow exists`);
      }
    }
    getBorrowers(value) {
      return this._borrows.get(value) || [];
    }
  };
  var ownership = new OwnershipTracker();
  var ITERATE_KEY = Symbol("iterate");
  var targetMap = /* @__PURE__ */ new WeakMap();
  var activeEffect = null;
  function track(target2, key) {
    if (!activeEffect)
      return;
    let depsMap = targetMap.get(target2);
    if (!depsMap) {
      depsMap = /* @__PURE__ */ new Map();
      targetMap.set(target2, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
      dep = /* @__PURE__ */ new Set();
      depsMap.set(key, dep);
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.add(dep);
    }
  }
  function trigger(target2, key) {
    const depsMap = targetMap.get(target2);
    if (!depsMap)
      return;
    const effectsToRun = /* @__PURE__ */ new Set();
    const addEffects = (effects) => {
      if (effects) {
        for (const eff of effects) {
          if (eff !== activeEffect)
            effectsToRun.add(eff);
        }
      }
    };
    addEffects(depsMap.get(key));
    if (Array.isArray(target2)) {
      if (key === "length") {
        depsMap.forEach((effects, k) => {
          if (k === "length" || typeof k === "string" && Number(k) >= target2.length) {
            addEffects(effects);
          }
        });
      } else if (typeof key === "string" && !isNaN(Number(key))) {
        addEffects(depsMap.get("length"));
        addEffects(depsMap.get(ITERATE_KEY));
      }
    }
    for (const eff of effectsToRun) {
      if (eff.scheduler)
        eff.scheduler();
      else
        eff.run();
    }
  }
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  var rawMap = /* @__PURE__ */ new WeakMap();
  function isReactive(value) {
    return rawMap.has(value);
  }
  function isProxy(value) {
    return isReactive(value);
  }
  function isReadonly(_value) {
    return false;
  }
  function toRaw(observed) {
    const raw = observed?.__v_raw;
    return raw ? toRaw(raw) : observed;
  }
  function reactive(target2) {
    if (!target2 || typeof target2 !== "object")
      return target2;
    if (rawMap.has(target2))
      return target2;
    let proxy = reactiveMap.get(target2);
    if (proxy)
      return proxy;
    proxy = new Proxy(target2, {
      get(t, key, receiver) {
        if (key === "__v_raw")
          return t;
        if (key === "__v_isReactive")
          return true;
        track(t, key);
        const res = Reflect.get(t, key, receiver);
        if (res && typeof res === "object") {
          return reactive(res);
        }
        return res;
      },
      set(t, key, value, receiver) {
        if (t !== toRaw(receiver)) {
          return Reflect.set(t, key, value, receiver);
        }
        const oldVal = Reflect.get(t, key, receiver);
        const oldLength = Array.isArray(t) ? t.length : 0;
        const rawVal = toRaw(value);
        const success = Reflect.set(t, key, rawVal);
        if (success) {
          const isNewKey = !Object.prototype.hasOwnProperty.call(t, key);
          if (oldVal !== rawVal || Array.isArray(t) && t.length !== oldLength) {
            trigger(t, key);
            if (isNewKey)
              trigger(t, ITERATE_KEY);
          }
        }
        return success;
      },
      deleteProperty(t, key) {
        const hasKey = Object.prototype.hasOwnProperty.call(t, key);
        const success = Reflect.deleteProperty(t, key);
        if (success && hasKey) {
          trigger(t, key);
          trigger(t, ITERATE_KEY);
        }
        return success;
      },
      has(t, key) {
        track(t, key);
        return Reflect.has(t, key);
      },
      ownKeys(t) {
        track(t, Array.isArray(t) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(t);
      }
    });
    reactiveMap.set(target2, proxy);
    rawMap.set(proxy, target2);
    return proxy;
  }
  function shallowReactive(target2) {
    return reactive(target2);
  }
  function readonly(target2) {
    return reactive(target2);
  }
  function shallowReadonly(target2) {
    return reactive(target2);
  }
  function effect(fn, options) {
    const effectRunner = {
      deps: /* @__PURE__ */ new Set(),
      scheduler: options?.scheduler,
      run() {
        if (!this.deps)
          return;
        cleanupEffect(this);
        const lastActiveEffect = activeEffect;
        activeEffect = this;
        try {
          return fn();
        } finally {
          activeEffect = lastActiveEffect;
        }
      },
      stop() {
        cleanupEffect(this);
        if (this.deps) {
          this.deps.clear();
          this.deps = null;
        }
      }
    };
    if (!options?.lazy) {
      effectRunner.run();
    }
    const runner = effectRunner.run.bind(effectRunner);
    runner.effect = effectRunner;
    return runner;
  }
  function cleanupEffect(eff) {
    if (!eff.deps)
      return;
    for (const dep of eff.deps) {
      dep.delete(eff);
    }
    eff.deps.clear();
  }
  function stop(runner) {
    const eff = runner?.effect || runner;
    if (eff && typeof eff.stop === "function") {
      eff.stop();
    }
  }
  var RefImpl = class {
    _value;
    _rawValue;
    __v_isRef = true;
    constructor(value, shallow = false) {
      this._rawValue = shallow ? value : toRaw(value);
      this._value = shallow ? value : typeof value === "object" && value !== null ? reactive(value) : value;
    }
    get value() {
      track(this, "value");
      return this._value;
    }
    set value(newValue) {
      newValue = toRaw(newValue);
      if (newValue !== this._rawValue) {
        this._rawValue = newValue;
        this._value = typeof newValue === "object" && newValue !== null ? reactive(newValue) : newValue;
        trigger(this, "value");
      }
    }
  };
  function ref(value) {
    return new RefImpl(value);
  }
  function isRef(value) {
    return !!(value && value.__v_isRef === true);
  }
  function shallowRef(value) {
    return new RefImpl(value, true);
  }
  function triggerRef(r) {
    trigger(r, "value");
  }
  function unref(r) {
    return isRef(r) ? r.value : r;
  }
  function customRef(factory) {
    const { get, set } = factory(
      () => track(refObj, "value"),
      () => trigger(refObj, "value")
    );
    const refObj = {
      __v_isRef: true,
      get value() {
        return get();
      },
      set value(v) {
        set(v);
      }
    };
    return refObj;
  }
  var ComputedRefImpl = class {
    _value;
    _dirty = true;
    _runner;
    __v_isRef = true;
    __v_isReadonly = true;
    constructor(getter) {
      this._runner = effect(getter, {
        lazy: true,
        scheduler: () => {
          if (!this._dirty) {
            this._dirty = true;
            trigger(this, "value");
          }
        }
      });
    }
    get value() {
      track(this, "value");
      if (this._dirty) {
        this._value = this._runner();
        this._dirty = false;
      }
      return this._value;
    }
  };
  function computed(getter) {
    return new ComputedRefImpl(getter);
  }
  function watch(source, cb, options) {
    let getter;
    if (isRef(source))
      getter = () => source.value;
    else if (isReactive(source))
      getter = () => traverse(source);
    else if (typeof source === "function")
      getter = source;
    else if (Array.isArray(source)) {
      getter = () => source.map((s) => isRef(s) ? s.value : isReactive(s) ? traverse(s) : s);
    } else
      getter = () => {
      };
    let oldValue;
    const job = () => {
      const newValue = runner();
      if (cb) {
        cb(newValue, oldValue);
        oldValue = newValue;
      }
    };
    const runner = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (options?.scheduler)
          options.scheduler(job);
        else
          job();
      }
    });
    if (options?.immediate)
      job();
    else
      oldValue = runner();
    return () => {
      stop(runner);
    };
  }
  function traverse(value, seen = /* @__PURE__ */ new Set()) {
    if (typeof value !== "object" || value === null || seen.has(value))
      return value;
    seen.add(value);
    if (isRef(value))
      traverse(value.value, seen);
    else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++)
        traverse(value[i], seen);
    } else {
      for (const key of Object.keys(value))
        traverse(value[key], seen);
    }
    return value;
  }
  var ObjectRefImpl = class {
    constructor(_object, _key, _defaultValue) {
      this._object = _object;
      this._key = _key;
      this._defaultValue = _defaultValue;
    }
    __v_isRef = true;
    get value() {
      const val = this._object[this._key];
      return val === void 0 ? this._defaultValue : val;
    }
    set value(newVal) {
      this._object[this._key] = newVal;
    }
  };
  function toRef(object, key, defaultValue) {
    const val = object[key];
    return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue);
  }
  function toRefs(object) {
    const ret = Array.isArray(object) ? new Array(object.length) : {};
    for (const key in object)
      ret[key] = toRef(object, key);
    return ret;
  }
  function onEffectCleanup(fn) {
    if (activeEffect) {
      let cleanupFns = activeEffect.cleanupFns;
      if (!cleanupFns) {
        cleanupFns = [];
        activeEffect.cleanupFns = cleanupFns;
        const originalRun = activeEffect.run;
        activeEffect.run = function() {
          for (const cleanup of cleanupFns) {
            try {
              cleanup();
            } catch {
            }
          }
          cleanupFns.length = 0;
          return originalRun.apply(this, arguments);
        };
      }
      cleanupFns.push(fn);
    }
  }
  var effectIdCounter = 0;
  function elementBoundEffect(el, effectCallback, options) {
    const pendingPromises = /* @__PURE__ */ new WeakSet();
    let pendingCount = 0;
    let consecutiveFailures = 0;
    let lastErrorMessage = "";
    const suspenseWrappedCallback = () => {
      try {
        effectCallback();
        consecutiveFailures = 0;
        lastErrorMessage = "";
      } catch (err2) {
        if (err2 instanceof Promise) {
          if (pendingPromises.has(err2))
            return;
          if (window._nexusDebug)
            console.debug(`[Nexus Suspense] <${el.tagName}> suspended pending network resolution.`);
          pendingCount++;
          pendingPromises.add(err2);
          err2.finally(() => {
            pendingCount--;
            pendingPromises.delete(err2);
            if (window._nexusDebug)
              console.debug(`[Nexus Suspense] <${el.tagName}> resumed.`);
            if (runner) {
              let reEntryCount = 0;
              const MAX_REENTRY = 10;
              const safeRun = () => {
                if (pendingCount > 0)
                  return;
                if (reEntryCount++ > MAX_REENTRY) {
                  console.warn(`[Nexus Loop Guard] Stopped runaway effect on <${el.tagName}> after ${MAX_REENTRY} re-entries.`);
                  return;
                }
                runner();
              };
              queueMicrotask(safeRun);
            }
          });
        } else {
          const msg = err2 instanceof Error ? err2.message : String(err2);
          if (msg === lastErrorMessage)
            consecutiveFailures++;
          else {
            consecutiveFailures = 1;
            lastErrorMessage = msg;
          }
          if (consecutiveFailures >= 3) {
            console.error(`[Nexus Diagnostic] Persistent error on <${el.tagName}> (${consecutiveFailures}x):`, err2);
            reportError(err2 instanceof Error ? err2 : new Error(msg), el, `Persistent failure (${consecutiveFailures}x) \u2014 effect quarantined`);
            stop(runner);
            const enhanced = el;
            enhanced[EFFECT_RUNNERS_KEY]?.delete(runner);
          } else {
            if (globalThis.Nexus?.coordinator?.runtimeContext?.isDevMode) {
              console.debug(`[Nexus Transient] <${el.tagName}> effect attempt ${consecutiveFailures}/3:`, msg);
            }
          }
        }
      }
    };
    let runner;
    const stableJob = () => {
      if (runner)
        runner();
    };
    try {
      const schedulerOptions = {
        scheduler: () => {
          scheduler.enqueueEvaluate(stableJob);
        },
        ...options
      };
      runner = effect(suspenseWrappedCallback, schedulerOptions);
    } catch (e) {
      console.error(`[Reactivity Error] effect() failed for <${el.tagName}>:`, e);
      throw e;
    }
    const enhancedEl = el;
    if (!enhancedEl[EFFECT_RUNNERS_KEY]) {
      enhancedEl[EFFECT_RUNNERS_KEY] = /* @__PURE__ */ new Set();
      if (!enhancedEl.nexus)
        enhancedEl.nexus = {};
      enhancedEl.nexus.effectRunners = enhancedEl[EFFECT_RUNNERS_KEY];
    }
    enhancedEl[EFFECT_RUNNERS_KEY].add(runner);
    if (!enhancedEl[RUN_EFFECT_RUNNERS_KEY]) {
      enhancedEl[RUN_EFFECT_RUNNERS_KEY] = () => {
        if (!enhancedEl[EFFECT_RUNNERS_KEY])
          return;
        for (const r of enhancedEl[EFFECT_RUNNERS_KEY]) {
          try {
            r();
          } catch (err2) {
            console.error(`[Nexus Isolation] Effect failed on <${enhancedEl.tagName}>, isolated from ${enhancedEl[EFFECT_RUNNERS_KEY].size - 1} sibling effects:`, err2);
            reportError(err2 instanceof Error ? err2 : new Error(String(err2)), enhancedEl, "Isolated effect failure");
          }
        }
      };
    }
    const cleanup = () => {
      stop(runner);
      const enhancedEl2 = el;
      if (enhancedEl2[EFFECT_RUNNERS_KEY]) {
        enhancedEl2[EFFECT_RUNNERS_KEY].delete(runner);
        if (enhancedEl2[EFFECT_RUNNERS_KEY].size === 0) {
          delete enhancedEl2[EFFECT_RUNNERS_KEY];
          delete enhancedEl2[RUN_EFFECT_RUNNERS_KEY];
        }
      }
    };
    if (!enhancedEl[CLEANUP_FUNCTIONS_KEY]) {
      enhancedEl[CLEANUP_FUNCTIONS_KEY] = /* @__PURE__ */ new Map();
    }
    const cleanupKey = `effect-${effectIdCounter++}`;
    enhancedEl[CLEANUP_FUNCTIONS_KEY].set(cleanupKey, cleanup);
    return [runner, cleanup];
  }
  function unifiedRef(initialValue, key, typeHints) {
    const heapKey = key || `unified_${Math.random().toString(36).slice(2)}`;
    if (typeHints) {
      Object.entries(typeHints).forEach(([k, type]) => {
        const fullKey = `${heapKey}.${k}`;
        if (type === "number")
          heap.allocateNumeric(fullKey);
        else if (type === "boolean")
          heap.allocateBoolean(fullKey);
        else if (type === "string")
          heap.setString(fullKey, "");
      });
    } else {
      Object.entries(initialValue).forEach(([k, v]) => {
        const fullKey = `${heapKey}.${k}`;
        if (typeof v === "number")
          heap.allocateNumeric(fullKey);
        else if (typeof v === "boolean")
          heap.allocateBoolean(fullKey);
      });
    }
    let state = reactive(initialValue);
    const ownerId = heapKey;
    ownership.acquire(state, ownerId);
    return customRef((track2, trigger2) => ({
      get() {
        track2();
        ownership.validateBorrow(state, "immutable");
        return state;
      },
      set(newValue) {
        ownership.validateBorrow(state, "mutable");
        if (newValue && typeof newValue === "object") {
          Object.entries(newValue).forEach(([k, v]) => {
            const fullKey = `${heapKey}.${k}`;
            heap.set(fullKey, v);
            state[k] = v;
          });
        } else {
          state = newValue;
        }
        trigger2();
      }
    }));
  }
  function unifiedComputed(getter, key) {
    const heapKey = key || `computed_${Math.random().toString(36).slice(2)}`;
    return computed(() => {
      const value = getter();
      heap.set(heapKey, value);
      return value;
    });
  }

  // src/engine/reconciler.ts
  init_consts();

  // src/modules/attributes/stylesheet.ts
  var stylesheet_exports = {};
  __export(stylesheet_exports, {
    NexusStyleSheet: () => NexusStyleSheet,
    PACKED_COMPONENTS: () => PACKED_COMPONENTS,
    PREFLIGHT_CSS: () => PREFLIGHT_CSS,
    buildTailwindThemeBridge: () => buildTailwindThemeBridge,
    default: () => stylesheet_default,
    discoverColorTokens: () => discoverColorTokens,
    initializeJitEngine: () => initializeJitEngine,
    jitSheet: () => jitSheet,
    markExternalStylesSettled: () => markExternalStylesSettled,
    stylesheet: () => stylesheet
  });

  // src/modules/attributes/mask.ts
  var mask_exports2 = {};
  __export(mask_exports2, {
    default: () => mask_default,
    maskModule: () => maskModule
  });

  // src/modules/sprites/mask.ts
  var mask_exports = {};
  __export(mask_exports, {
    format: () => format,
    mask: () => mask
  });
  function stripDown(template, input) {
    const regexes = {
      "9": /[0-9]/,
      "a": /[a-zA-Z]/,
      "*": /[a-zA-Z0-9]/
    };
    let inputIdx = 0;
    let result = "";
    for (let i = 0; i < template.length && inputIdx < input.length; i++) {
      const char = template[i];
      const regex = regexes[char];
      if (regex) {
        while (inputIdx < input.length) {
          if (regex.test(input[inputIdx])) {
            result += input[inputIdx];
            inputIdx++;
            break;
          }
          inputIdx++;
        }
      } else {
        if (input[inputIdx] === char) {
          inputIdx++;
        }
      }
    }
    return result;
  }
  function buildUp(template, stripped) {
    if (!stripped)
      return "";
    let strippedIdx = 0;
    let result = "";
    for (let i = 0; i < template.length && strippedIdx < stripped.length; i++) {
      const char = template[i];
      if (["9", "a", "*"].includes(char)) {
        result += stripped[strippedIdx];
        strippedIdx++;
      } else {
        result += char;
      }
    }
    return result;
  }
  function format(value, template) {
    if (!value || !template)
      return value;
    const stripped = stripDown(template, value);
    return buildUp(template, stripped);
  }
  var mask = {
    format
  };

  // src/modules/attributes/mask.ts
  var maskModule = {
    name: "mask",
    handle(el, value, runtime) {
      if (!(el instanceof HTMLInputElement)) {
        runtime.warn("data-mask only supported on <input> elements.", el);
        return;
      }
      let lastValue = el.value;
      const onInput = () => {
        const template = runtime.evaluate(el, value);
        if (!template)
          return;
        const cursor = el.selectionStart;
        const unformatted = el.value;
        if (lastValue.length > unformatted.length) {
          lastValue = unformatted;
          return;
        }
        const formatted = format(unformatted, template);
        el.value = formatted;
        lastValue = formatted;
        if (cursor !== null) {
          const newPos = format(unformatted.slice(0, cursor), template).length;
          el.setSelectionRange(newPos, newPos);
        }
      };
      el.addEventListener("input", onInput);
      onInput();
      return () => {
        el.removeEventListener("input", onInput);
      };
    }
  };
  var mask_default = maskModule;

  // src/modules/attributes/drag.ts
  var drag_exports = {};
  __export(drag_exports, {
    DragReorderEngine: () => DragReorderEngine,
    Draggable: () => Draggable,
    buildReorderContext: () => buildReorderContext,
    default: () => drag_default,
    dragAttribute: () => dragAttribute
  });

  // src/modules/sprites/animate.ts
  var animate_exports = {};
  __export(animate_exports, {
    animate: () => animate,
    flip: () => flip
  });

  // src/modules/sprites/selector.ts
  var selector_exports = {};
  __export(selector_exports, {
    resolveSelector: () => resolveSelector
  });

  // src/engine/scope.ts
  init_consts();
  function getDataStack(element) {
    const node = element;
    if (node[DATA_STACK_KEY]) {
      return node[DATA_STACK_KEY];
    }
    if (typeof ShadowRoot !== "undefined" && node instanceof ShadowRoot) {
      return getDataStack(node.host);
    }
    const parent = node.parentElement || node.parentNode;
    if (!parent) {
      return [];
    }
    if (typeof ShadowRoot !== "undefined" && parent instanceof ShadowRoot) {
      const shadow = parent;
      if (shadow[DATA_STACK_KEY]) {
        return shadow[DATA_STACK_KEY];
      }
      return [];
    }
    if (parent instanceof DocumentFragment) {
      return [];
    }
    if (parent instanceof Element) {
      return getDataStack(parent);
    }
    return [];
  }
  function addScopeToNode(element, data, referenceNode) {
    const node = element;
    const parentStack = getDataStack(referenceNode || element);
    node[DATA_STACK_KEY] = [data, ...parentStack];
    if (typeof document !== "undefined" && document.body && document.documentElement.hasAttribute("data-debug")) {
      console.log(`[Nexus Scope] Added scope to <${element.tagName}>. New stack depth: ${node[DATA_STACK_KEY].length}`);
    }
    return () => {
      if (node[DATA_STACK_KEY]) {
        node[DATA_STACK_KEY] = node[DATA_STACK_KEY].filter((item) => item !== data);
      }
    };
  }
  function hasScope(element) {
    return !!element[DATA_STACK_KEY];
  }
  var scopeProviderRegistry = /* @__PURE__ */ new Map();
  function registerScopeProvider(key, provider) {
    scopeProviderRegistry.set(key, provider);
  }
  function hasScopeProvider(key) {
    return scopeProviderRegistry.has(key);
  }
  function resolveScopeProvider(key, el, runtime) {
    const provider = scopeProviderRegistry.get(key);
    return provider ? provider(el, runtime) : void 0;
  }
  function parseGhostKeys(expression) {
    const ghostKeys = [];
    const typeHints = {};
    const trimmed = expression.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("({"))
      return { ghostKeys, typeHints };
    const start = trimmed.indexOf("{");
    let i = start + 1;
    const len = trimmed.length;
    while (i < len) {
      while (i < len && /\s/.test(trimmed[i]))
        i++;
      let key = "";
      if (trimmed[i] === '"' || trimmed[i] === "'") {
        const quote = trimmed[i++];
        while (i < len && trimmed[i] !== quote)
          key += trimmed[i++];
        i++;
      } else {
        while (i < len && /[\w$]/.test(trimmed[i]))
          key += trimmed[i++];
      }
      if (!key)
        break;
      while (i < len && /[\s:]/.test(trimmed[i]))
        i++;
      let value = "";
      let depth = 0;
      let inString = null;
      while (i < len) {
        const ch = trimmed[i];
        if (inString) {
          if (ch === "\\") {
            value += ch + (trimmed[i + 1] || "");
            i += 2;
            continue;
          }
          if (ch === inString)
            inString = null;
          value += ch;
          i++;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = ch;
          value += ch;
          i++;
          continue;
        }
        if (ch === "{" || ch === "[" || ch === "(") {
          depth++;
          value += ch;
          i++;
          continue;
        }
        if (ch === "}" || ch === "]" || ch === ")") {
          if (depth === 0)
            break;
          depth--;
          value += ch;
          i++;
          continue;
        }
        if (ch === "," && depth === 0) {
          i++;
          break;
        }
        value += ch;
        i++;
      }
      const valToken = value.trim();
      if (key) {
        ghostKeys.push(key);
        if (valToken.startsWith("true") || valToken.startsWith("false"))
          typeHints[key] = "boolean";
        else if (/^-?\d/.test(valToken))
          typeHints[key] = "number";
        else if (/^['"`]/.test(valToken))
          typeHints[key] = "string";
        else if (valToken.startsWith("[") || valToken.startsWith("{"))
          typeHints[key] = "object";
      }
    }
    return { ghostKeys, typeHints };
  }
  function createScopeProxy(stateRef, onSet, onTrigger) {
    return new Proxy({}, {
      has(_, key) {
        return Reflect.has(stateRef.value, key);
      },
      get(_, key) {
        return Reflect.get(stateRef.value, key);
      },
      set(_, key, value) {
        const res = Reflect.set(stateRef.value, key, value);
        if (onSet)
          onSet(key, value);
        if (onTrigger)
          onTrigger();
        return res;
      },
      ownKeys() {
        return Reflect.ownKeys(stateRef.value);
      },
      getOwnPropertyDescriptor(_, key) {
        return Reflect.getOwnPropertyDescriptor(stateRef.value, key);
      }
    });
  }

  // src/engine/topology.ts
  var TIER_CONFIGS = {
    0: {
      level: 0,
      name: "Mono-Thread (Fallback)",
      threads: 1,
      usesSharedArrayBuffer: false,
      usesWorkers: false,
      predictiveEngineDedicated: false
    },
    1: {
      level: 1,
      name: "Dual-Thread (Standard)",
      threads: 2,
      usesSharedArrayBuffer: ZCZS_SUPPORTED,
      usesWorkers: true,
      predictiveEngineDedicated: false
    },
    2: {
      level: 2,
      name: "Tri-Thread (Performance)",
      threads: 3,
      usesSharedArrayBuffer: ZCZS_SUPPORTED,
      usesWorkers: true,
      predictiveEngineDedicated: false
    },
    3: {
      level: 3,
      name: "Quad-Thread (Sovereign)",
      threads: 4,
      usesSharedArrayBuffer: ZCZS_SUPPORTED,
      usesWorkers: true,
      predictiveEngineDedicated: true
    }
  };
  var EngineTopology = class {
    currentTier = 0;
    workers = [];
    sharedBuffer = null;
    lagHistory = [];
    LAG_SAMPLE_SIZE = 60;
    LAG_THRESHOLD = 0.4;
    // 40% of frame budget
    FRAME_BUDGET = 16.67;
    // 60fps = 16.67ms per frame
    autoScaleEnabled = true;
    monitoringInterval = null;
    constructor() {
    }
    start() {
      this.boot();
    }
    /**
     * Boot probe - determines optimal tier based on environment
     * Spec 5.2.1: Auto-Adaptation Logic
     */
    boot() {
      const isCrossOriginIsolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
      const cores = navigator.hardwareConcurrency || 2;
      const hasNexusIO = typeof globalThis.__NEXUS_IO__ !== "undefined";
      if (cores >= 4 && (isCrossOriginIsolated || hasNexusIO)) {
        this.currentTier = 3;
      } else if (cores >= 3 && (isCrossOriginIsolated || hasNexusIO)) {
        this.currentTier = 2;
      } else if (cores >= 2 && typeof Worker !== "undefined") {
        this.currentTier = 1;
      } else {
        this.currentTier = 0;
      }
      console.log(`[Nexus Topology] Boot: Detected ${cores} cores, SAB: ${isCrossOriginIsolated}, NexusIO: ${hasNexusIO}`);
      console.log(`[Nexus Topology] Selected Tier: ${this.currentTier} (${TIER_CONFIGS[this.currentTier].name})`);
      this.initializeTier();
    }
    /**
     * Initialize resources for the selected tier
     */
    async initializeTier() {
      const config = TIER_CONFIGS[this.currentTier];
      if (config.usesSharedArrayBuffer && ZCZS_SUPPORTED) {
        try {
          this.sharedBuffer = new SharedArrayBuffer(1024 * 1024);
          if (heap) {
            heap.attachSharedBuffer(this.sharedBuffer);
          }
          console.log("[Nexus Topology] SharedArrayBuffer initialized");
        } catch (e) {
          console.warn("[Nexus Topology] Failed to initialize SAB, falling back:", e);
          this.currentTier = Math.max(0, this.currentTier - 1);
          this.initializeTier();
          return;
        }
      }
      if (config.usesWorkers && this.currentTier > 0) {
        await this.spawnWorkers(this.currentTier);
      }
      if (this.autoScaleEnabled && this.currentTier > 0) {
        this.startMonitoring();
      }
    }
    /**
     * Spawn worker threads based on tier
     */
    async spawnWorkers(tier) {
      const config = TIER_CONFIGS[tier];
      const workerCount = config.threads - 1;
      this.terminateWorkers();
      for (let i = 0; i < workerCount; i++) {
        try {
          let scriptSrc = "/dist/nexus-ux.js";
          if (typeof document !== "undefined" && document.currentScript instanceof HTMLScriptElement) {
            scriptSrc = document.currentScript.src;
          }
          const worker = new Worker(scriptSrc, { type: "module" });
          worker.onmessage = (e) => {
          };
          this.workers.push(worker);
        } catch (e) {
          console.warn(`[Nexus Topology] Failed to spawn worker ${i}:`, e);
        }
      }
      console.log(`[Nexus Topology] Spawned ${this.workers.length} worker(s) for Tier ${tier}`);
    }
    /**
     * Terminate all worker threads
     */
    terminateWorkers() {
      this.workers.forEach((w) => w.terminate());
      this.workers = [];
    }
    /**
     * Start lag variance monitoring for auto-scaling
     * Spec 5.1.2: The Autoscale Mechanism
     */
    startMonitoring() {
      if (this.monitoringInterval)
        return;
      this.monitoringInterval = setInterval(() => {
        this.measureLag();
      }, 1e3);
    }
    /**
     * Measure frame lag and trigger scale up/down
     */
    measureLag() {
      const frameStart = performance.now();
      requestAnimationFrame(() => {
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        const lagRatio = frameTime / this.FRAME_BUDGET;
        this.lagHistory.push(lagRatio);
        if (this.lagHistory.length > this.LAG_SAMPLE_SIZE) {
          this.lagHistory.shift();
        }
        const avgLag = this.lagHistory.reduce((a, b) => a + b, 0) / this.lagHistory.length;
        if (avgLag > this.LAG_THRESHOLD && this.currentTier < 3) {
          this.scaleUp();
        } else if (avgLag < 0.1 && this.currentTier > 0 && this.lagHistory.length >= this.LAG_SAMPLE_SIZE) {
          this.scaleDown();
        }
      });
    }
    /**
     * Scale up to higher tier
     */
    async scaleUp() {
      const newTier = this.currentTier + 1;
      console.log(`[Nexus Topology] Scaling UP from Tier ${this.currentTier} to Tier ${newTier}`);
      this.currentTier = newTier;
      await this.initializeTier();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:topology-scale", {
          detail: { tier: this.currentTier, direction: "up" }
        }));
      }
    }
    /**
     * Scale down to lower tier
     */
    async scaleDown() {
      const newTier = this.currentTier - 1;
      if (newTier < 0)
        return;
      console.log(`[Nexus Topology] Scaling DOWN from Tier ${this.currentTier} to Tier ${newTier}`);
      this.currentTier = newTier;
      await this.initializeTier();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:topology-scale", {
          detail: { tier: this.currentTier, direction: "down" }
        }));
      }
    }
    /**
     * Get current tier configuration
     */
    getTier() {
      return this.currentTier;
    }
    /**
     * Get tier configuration
     */
    getTierConfig() {
      return TIER_CONFIGS[this.currentTier];
    }
    /**
     * Get number of active workers
     */
    getActiveWorkers() {
      return this.workers.length;
    }
    /**
     * Check if SAB is available
     */
    isSABAvailable() {
      return !!this.sharedBuffer;
    }
    /**
     * Get lag variance
     */
    getLagVariance() {
      if (this.lagHistory.length === 0)
        return 0;
      return this.lagHistory.reduce((a, b) => a + b, 0) / this.lagHistory.length;
    }
    /**
     * Get SharedArrayBuffer for cross-thread communication
     */
    getSharedBuffer() {
      return this.sharedBuffer;
    }
    /**
     * Enable/disable auto-scaling
     */
    setAutoScale(enabled) {
      this.autoScaleEnabled = enabled;
      if (enabled && this.currentTier > 0) {
        this.startMonitoring();
      } else if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
    }
    /**
     * Force specific tier (for testing or manual override)
     */
    async setTier(tier) {
      if (tier === this.currentTier)
        return;
      console.log(`[Nexus Topology] Manual tier change: ${this.currentTier} -> ${tier}`);
      this.currentTier = tier;
      await this.initializeTier();
    }
    /**
     * Get worker for task distribution
     */
    getWorker(index) {
      return this.workers[index % this.workers.length] || null;
    }
    /**
     * Cleanup resources
     */
    dispose() {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      this.terminateWorkers();
      this.sharedBuffer = null;
    }
  };
  var topology = new EngineTopology();

  // src/engine/agent.ts
  var DEFAULT_CONFIG = {
    enabled: true,
    captureHeap: true,
    captureMirror: true,
    captureStack: true,
    maxStackDepth: 20,
    emitToConsole: true,
    emitToPlatform: false
    // Disabled by default - requires platform endpoint
  };
  var SelfHealAgent = class {
    config;
    beaconHistory = [];
    maxHistorySize = 10;
    heapSnapshot = null;
    mirrorSnapshot = null;
    isCapturing = false;
    globalErrorHandler = null;
    globalRejectionHandler = null;
    runtime = null;
    constructor(runtime, config = {}) {
      if (runtime) {
        this.runtime = runtime;
        this.runtime.agent = this;
      }
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.setupGlobalHandlers();
    }
    /**
     * Setup global error handlers for automatic beacon capture
     */
    setupGlobalHandlers() {
      if (typeof window === "undefined")
        return;
      this.globalErrorHandler = (error, context) => {
        this.captureBeacon(error, "error", context);
      };
      globalThis.addEventListener("error", this.globalErrorHandler);
      this.globalRejectionHandler = (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.captureBeacon(error, "unhandledRejection", { promise });
      };
      globalThis.addEventListener("unhandledrejection", this.globalRejectionHandler);
    }
    /**
     * Capture a crash beacon with full state snapshot
     */
    captureBeacon(error, type, context) {
      if (this.isCapturing) {
        return this.createMinimalBeacon(error, type);
      }
      this.isCapturing = true;
      const _startTime = performance.now();
      try {
        const beacon = {
          id: this.generateBeaconId(),
          timestamp: Date.now(),
          tier: topology.getTier(),
          signalHeap: this.config.captureHeap ? this.captureSignalHeap() : this.createEmptyHeapSnapshot(),
          ghostMirror: this.config.captureMirror ? this.captureGhostMirror() : this.createEmptyMirrorSnapshot(),
          callStack: this.config.captureStack ? this.captureCallStack(error) : [],
          navigator: this.captureNavigator(),
          memory: this.captureMemory()
        };
        this.beaconHistory.push(beacon);
        if (this.beaconHistory.length > this.maxHistorySize) {
          this.beaconHistory.shift();
        }
        if (this.config.emitToConsole) {
          this.emitToConsole(beacon, type, context);
        }
        if (this.config.emitToPlatform && this.config.platformEndpoint) {
          this.emitToPlatform(beacon);
        }
        return beacon;
      } catch (e) {
        return this.createMinimalBeacon(error, type);
      } finally {
        this.isCapturing = false;
      }
    }
    /**
     * Create a minimal beacon when full capture fails
     */
    createMinimalBeacon(error, type) {
      return {
        id: this.generateBeaconId(),
        timestamp: Date.now(),
        tier: topology.getTier(),
        signalHeap: this.createEmptyHeapSnapshot(),
        ghostMirror: this.createEmptyMirrorSnapshot(),
        callStack: [{ function: error.message, file: error.stack?.split("\n")[0] || "unknown", line: 0, column: 0 }],
        navigator: this.captureNavigator(),
        memory: this.captureMemory()
      };
    }
    /**
     * Capture Signal Heap snapshot (Zero-Copy optimized)
     */
    captureSignalHeap() {
      let numericSignals = null;
      let booleanSignals = null;
      let objectSignals = [];
      let signalIndexMap = {};
      try {
        if (this.runtime) {
          if (heap) {
            const h = heap;
            if (h._floatHeap instanceof Float64Array)
              numericSignals = new Float64Array(h._floatHeap);
            if (h._intHeap instanceof Int32Array)
              booleanSignals = new Int32Array(h._intHeap);
            signalIndexMap = { ...h._indexMap || {} };
          }
          const globalState = this.runtime.globalSignals();
          if (globalState) {
            objectSignals = [globalState];
          }
        }
      } catch (e) {
      }
      const size = (numericSignals?.byteLength || 0) + (booleanSignals?.byteLength || 0);
      return {
        numericSignals,
        booleanSignals,
        objectSignals,
        signalIndexMap,
        size
      };
    }
    /**
     * Capture Ghost Mirror snapshot
     */
    captureGhostMirror() {
      let activeNodes = 0;
      let dirtyNodes = 0;
      let spatialIndex = { nodes: 0, maxDepth: 0, objects: 0 };
      try {
        const predictiveModule2 = globalThis.__nexus_predictive;
        if (predictiveModule2?.quadtree) {
          const qt = predictiveModule2.quadtree;
          spatialIndex = {
            nodes: qt.nodes?.length || 0,
            maxDepth: qt.maxDepth || 0,
            objects: qt.objects?.length || 0
          };
        }
        if (typeof document !== "undefined") {
          activeNodes = document.querySelectorAll("[data-signal]").length;
          dirtyNodes = document.querySelectorAll("[data-dirty]").length;
        }
      } catch (e) {
      }
      return {
        activeNodes,
        dirtyNodes,
        spatialIndex
      };
    }
    /**
     * Capture call stack from error
     */
    captureCallStack(error) {
      const frames = [];
      if (!error.stack)
        return frames;
      const stackLines = error.stack.split("\n").slice(1);
      const maxDepth = Math.min(stackLines.length, this.config.maxStackDepth);
      for (let i = 0; i < maxDepth; i++) {
        const line = stackLines[i].trim();
        if (!line)
          continue;
        let match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
        if (match) {
          frames.push({
            function: match[1] || "anonymous",
            file: match[2],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10)
          });
        } else {
          match = line.match(/(?:(.+?)@)?(.+?):(\d+):(\d+)/);
          if (match) {
            frames.push({
              function: match[1] || "anonymous",
              file: match[2],
              line: parseInt(match[3], 10),
              column: parseInt(match[4], 10)
            });
          }
        }
      }
      return frames;
    }
    /**
     * Capture navigator info
     */
    captureNavigator() {
      if (typeof navigator === "undefined") {
        return { userAgent: "", language: "", hardwareConcurrency: 0 };
      }
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory
      };
    }
    /**
     * Capture memory info if available
     */
    captureMemory() {
      if (typeof performance.memory === "undefined") {
        return void 0;
      }
      const mem = performance.memory;
      return {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit
      };
    }
    /**
     * Create empty heap snapshot
     */
    createEmptyHeapSnapshot() {
      return {
        numericSignals: null,
        booleanSignals: null,
        objectSignals: [],
        signalIndexMap: {},
        size: 0
      };
    }
    /**
     * Create empty mirror snapshot
     */
    createEmptyMirrorSnapshot() {
      return {
        activeNodes: 0,
        dirtyNodes: 0,
        spatialIndex: { nodes: 0, maxDepth: 0, objects: 0 }
      };
    }
    /**
     * Generate unique beacon ID
     */
    generateBeaconId() {
      return `beacon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    /**
     * Emit beacon to console
     */
    emitToConsole(beacon, type, context) {
      console.error("[Nexus Self-Heal] Crash Beacon captured", {
        id: beacon.id,
        type,
        timestamp: new Date(beacon.timestamp).toISOString(),
        tier: beacon.tier,
        memory: beacon.memory,
        error: beacon.callStack[0]?.function || "Unknown",
        stack: beacon.callStack
      });
      if (context) {
        console.error("[Nexus Self-Heal] Context:", context);
      }
    }
    /**
     * Emit beacon to Aerea platform for AI analysis
     */
    async emitToPlatform(beacon) {
      if (!this.config.platformEndpoint)
        return;
      try {
        await fetch(this.config.platformEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(beacon)
        });
      } catch (e) {
      }
    }
    /**
     * Get beacon history
     */
    getBeaconHistory() {
      return [...this.beaconHistory];
    }
    /**
     * Get latest beacon
     */
    getLatestBeacon() {
      return this.beaconHistory[this.beaconHistory.length - 1] || null;
    }
    /**
     * Get beacon by ID
     */
    getBeaconById(id) {
      return this.beaconHistory.find((b) => b.id === id) || null;
    }
    /**
     * Clear beacon history
     */
    clearHistory() {
      this.beaconHistory = [];
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
      this.config = { ...this.config, ...config };
    }
    /**
     * Manually trigger a beacon capture
     */
    manualCapture(message, context) {
      const error = new Error(message);
      return this.captureBeacon(error, "manual", context);
    }
    /**
     * Report a non-breaking resolution failure to the Agentic Host.
     * This is used for missing selectors or failed expression evaluations
     * that don't throw but impede framework functionality.
     */
    reportResolutionFailure(type, identifier, context) {
      if (!this.config.enabled)
        return;
      const emitBeacon = () => {
        const errMsg = context?.error ? ` (Error: ${context.error})` : "";
        console.warn(`[Nexus Resolution Beacon] ${type.toUpperCase()} Failure: "${identifier}"${errMsg}`, {
          context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (this.config.emitToPlatform && this.config.platformEndpoint) {
          const resolutionBeacon = {
            id: `res_${this.generateBeaconId()}`,
            timestamp: Date.now(),
            type: "resolution_failure",
            failureType: type,
            identifier,
            context,
            tier: topology.getTier(),
            navigator: this.captureNavigator()
          };
          this.emitToPlatform(resolutionBeacon);
        }
      };
      if (type === "expression" && context && context.node instanceof Element) {
        const el = context.node;
        requestAnimationFrame(() => {
          if (el.hasAttribute("data-ux-template"))
            return;
          if (!el.isConnected)
            return;
          if (this.runtime) {
            let resolved = false;
            try {
              const res = this.runtime.evaluate(el, identifier);
              if (res !== void 0)
                resolved = true;
            } catch (_e) {
              resolved = false;
            }
            if (resolved)
              return;
          }
          emitBeacon();
        });
      } else {
        emitBeacon();
      }
    }
    /**
     * Cleanup - remove global handlers
     */
    dispose() {
      if (typeof globalThis === "undefined")
        return;
      if (this.globalErrorHandler) {
        globalThis.removeEventListener("error", this.globalErrorHandler);
      }
      if (this.globalRejectionHandler) {
        globalThis.removeEventListener("unhandledrejection", this.globalRejectionHandler);
      }
      this.beaconHistory = [];
    }
  };
  var agentInstance = null;
  function getSelfHealAgent(runtime, config) {
    if (!agentInstance) {
      agentInstance = new SelfHealAgent(runtime, config);
    }
    return agentInstance;
  }
  function initSelfHeal(runtime, config) {
    if (agentInstance) {
      agentInstance.updateConfig(config || {});
      return agentInstance;
    }
    agentInstance = new SelfHealAgent(runtime, config);
    return agentInstance;
  }
  function getBeaconHistory() {
    return getSelfHealAgent().getBeaconHistory();
  }

  // src/modules/sprites/selector.ts
  function resolveSelector(contextEl, selector) {
    if (!selector)
      return null;
    if (typeof selector !== "string")
      return createReactiveElementProxy(selector);
    let current = contextEl;
    let targetSelector = "";
    if (selector.startsWith("^")) {
      const match = selector.match(/^\^([.#a-zA-Z0-9_-]+)(.*)/);
      if (match) {
        current = contextEl.closest(match[1]);
        targetSelector = match[2].trim();
      }
    } else if (selector.startsWith("-")) {
      const match = selector.match(/^-([.#a-zA-Z0-9_-]+)(.*)/);
      if (match) {
        const sel = match[1];
        const rest = match[2];
        current = contextEl.previousElementSibling;
        while (current && sel && !current.matches(sel)) {
          current = current.previousElementSibling;
        }
        targetSelector = rest.trim();
      }
    } else if (selector.startsWith("+")) {
      const match = selector.match(/^\+([.#a-zA-Z0-9_-]+)(.*)/);
      if (match) {
        const sel = match[1];
        const rest = match[2];
        current = contextEl.nextElementSibling;
        while (current && sel && !current.matches(sel)) {
          current = current.nextElementSibling;
        }
        targetSelector = rest.trim();
      }
    } else if (selector.startsWith("~")) {
      const match = selector.match(/^~([.#a-zA-Z0-9_-]+)(.*)/);
      if (match) {
        const sel = match[1];
        const rest = match[2];
        current = contextEl.parentElement?.querySelector(sel);
        targetSelector = rest.trim();
      }
    } else if (selector.startsWith(">")) {
      current = contextEl.querySelector(selector);
      targetSelector = "";
    } else if (selector.startsWith("*")) {
      current = document.querySelector(selector.substring(1).trim());
      targetSelector = "";
    } else {
      const items = Array.from(contextEl.querySelectorAll(selector));
      if (items.length > 0)
        return createNexusCollection(items);
      const globalItems = Array.from(document.querySelectorAll(selector));
      if (globalItems.length === 0) {
        try {
          getSelfHealAgent().reportResolutionFailure("selector", selector, { contextEl });
        } catch (e) {
        }
      }
      return createNexusCollection(globalItems);
    }
    if (current && targetSelector) {
      const refined = Array.from(current.querySelectorAll(targetSelector));
      return createNexusCollection(refined);
    }
    if (!current)
      return createNexusCollection([]);
    const root = current || document;
    const cleanSelector = selector.replace(/^[*^>~+-]/, "").trim() || "*";
    const results = Array.from(root.querySelectorAll(cleanSelector));
    return createNexusCollection(results);
  }
  function createNexusCollection(elements) {
    const proxies = elements.map((el) => createReactiveElementProxy(el));
    return new Proxy(proxies, {
      get(target2, key, receiver) {
        if (typeof key === "symbol")
          return Reflect.get(target2, key, receiver);
        const val = target2[key];
        if (val !== void 0) {
          return typeof val === "function" ? val.bind(target2) : val;
        }
        if (target2.length > 0) {
          const head = target2[0];
          const headVal = head[key];
          return typeof headVal === "function" ? headVal.bind(head) : headVal;
        }
        return void 0;
      },
      set(target2, key, value, receiver) {
        if (typeof key === "symbol")
          return Reflect.set(target2, key, value, receiver);
        if (!isNaN(Number(key))) {
          target2[Number(key)] = value;
          return true;
        }
        if (target2.length > 0) {
          target2[0][key] = value;
          return true;
        }
        return false;
      }
    });
  }
  function createReactiveElementProxy(el) {
    return new Proxy(el, {
      get(target2, key) {
        if (typeof key === "symbol")
          return target2[key];
        const val = target2[key];
        if (val !== void 0) {
          return typeof val === "function" ? val.bind(target2) : val;
        }
        const stack = getDataStack(target2);
        for (const data of stack) {
          if (key in data)
            return data[key];
        }
        return void 0;
      },
      set(target2, key, value) {
        if (typeof key === "symbol") {
          target2[key] = value;
          return true;
        }
        const stack = getDataStack(target2);
        for (const data of stack) {
          if (key in data) {
            data[key] = value;
            return true;
          }
        }
        target2[key] = value;
        return true;
      }
    });
  }

  // src/modules/sprites/animate.ts
  async function flip(targets, changeCallback, options = {}) {
    const { duration = 300, easing = "ease-out" } = options;
    const resolved = typeof targets === "string" ? resolveSelector(document.body, targets) : null;
    const targetArray = resolved ? Array.isArray(resolved) ? resolved : [resolved] : Array.from(targets);
    const initialRects = /* @__PURE__ */ new Map();
    targetArray.forEach((el) => {
      initialRects.set(el, el.getBoundingClientRect());
    });
    await changeCallback();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    targetArray.forEach((el) => {
      const initialRect = initialRects.get(el);
      const finalRect = el.getBoundingClientRect();
      if (!initialRect)
        return;
      const dx = initialRect.left - finalRect.left;
      const dy = initialRect.top - finalRect.top;
      if (dx !== 0 || dy !== 0) {
        el.style.transition = "none";
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        el.offsetWidth;
        el.style.transition = `transform ${duration}ms ${easing}`;
        el.style.transform = "translate3d(0, 0, 0)";
        el.addEventListener(
          "transitionend",
          () => {
            el.style.transition = "";
            el.style.transform = "";
          },
          { once: true }
        );
      }
    });
  }
  function animate(el, keyframesOrState, optionsOrConfig = {}, callback) {
    if (typeof globalThis.window === "undefined") {
      if (callback)
        callback();
      return;
    }
    if (Array.isArray(keyframesOrState)) {
      const anim = el.animate(keyframesOrState, optionsOrConfig);
      if (callback)
        anim.onfinish = callback;
      return anim;
    }
    return $animate_legacy(el, keyframesOrState, optionsOrConfig, callback);
  }
  animate.flip = flip;
  animate.out = (el, config, cb) => animate(el, "leave", config, cb);
  function $animate_legacy(el, state, config = {}, callback) {
    const base = state === "enter" ? config.enter : config.leave;
    const start = state === "enter" ? config.enterStart : config.leaveStart;
    const end = state === "enter" ? config.enterEnd : config.leaveEnd;
    applyClasses(el, base || "");
    applyClasses(el, start || "");
    void el.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        removeClasses(el, start || "");
        applyClasses(el, end || "");
        const duration = getEffectDurations(el);
        let finished = false;
        const cleanup = () => {
          if (finished)
            return;
          finished = true;
          removeClasses(el, base || "");
          removeClasses(el, end || "");
          if (callback)
            callback();
        };
        if (duration > 0) {
          el.addEventListener("transitionend", (e) => {
            if (e.target === el)
              cleanup();
          }, { once: true });
          setTimeout(cleanup, duration + 50);
        } else {
          cleanup();
        }
      });
    });
  }
  var getEffectDurations = (el) => {
    const styles = globalThis.window.getComputedStyle(el);
    const parse = (str) => str.split(",").map((s) => parseFloat(s) * 1e3 || 0);
    const trans = parse(styles.transitionDuration);
    const delay = parse(styles.transitionDelay);
    const anim = parse(styles.animationDuration);
    let max = 0;
    trans.forEach((d, i) => max = Math.max(max, d + (delay[i] || 0)));
    return Math.max(max, ...anim, 0);
  };
  var applyClasses = (el, s) => s.split(" ").filter(Boolean).forEach((c) => el.classList.add(c));
  var removeClasses = (el, s) => s.split(" ").filter(Boolean).forEach((c) => el.classList.remove(c));

  // src/modules/attributes/drag.ts
  init_consts();
  function getScrollParent(el) {
    let current = el;
    while (current) {
      const style = getComputedStyle(current);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const isScrollableY = overflowY === "auto" || overflowY === "scroll";
      const isScrollableX = overflowX === "auto" || overflowX === "scroll";
      if (isScrollableY || isScrollableX) {
        return current;
      }
      current = current.parentElement;
    }
    return document.documentElement;
  }
  var Draggable = class _Draggable {
    static active = null;
    static ghost = null;
    static clone = null;
    el;
    options;
    _pointerDownBound;
    _pointerMoveBound;
    _pointerUpBound;
    _touchStartBound;
    dragEl = null;
    parentEl = null;
    nextEl = null;
    lastTarget = null;
    lastDirection = 0;
    pastFirstInvertThresh = false;
    isCircumstantialInvert = false;
    targetMoveDistance = 0;
    targetBeforeFirstSwap;
    _swapHighlightTarget = null;
    tapEvt = null;
    dragStarted = false;
    multiDragElements = [];
    originalIndices = /* @__PURE__ */ new Map();
    scrollParent = null;
    _lastActiveItemScope = null;
    _lastSourceItemScope = null;
    _dockedContainer = null;
    scrollParentBounds = null;
    _runtime;
    constructor(el, options, runtime) {
      this.el = el;
      this._runtime = runtime;
      this.options = {
        animation: 150,
        ghostClass: "draggable-ghost",
        dragClass: "draggable-drag",
        chosenClass: "draggable-chosen",
        selectedClass: "draggable-selected",
        swapClass: "draggable-swap-highlight",
        fallbackOnBody: true,
        swapThreshold: 1,
        invertedSwapThreshold: 1,
        invertSwap: false,
        draggable: "[data-drag]",
        sort: true,
        ...options
      };
      this._pointerDownBound = this._onPointerDown.bind(this);
      this._pointerMoveBound = this._onPointerMove.bind(this);
      this._pointerUpBound = this._onPointerUp.bind(this);
      this._touchStartBound = (e) => {
        const target2 = e.target;
        const dragEl = target2.closest(this.options.draggable);
        if (dragEl && this.el.contains(dragEl)) {
          const closestContainer = dragEl.closest("[data-drag-container]");
          if (closestContainer !== this.el)
            return;
          if (dragEl.getAttribute("draggable") === "false")
            return;
          if (this.options.handle && !target2.closest(this.options.handle))
            return;
          if (this.options.filter && target2.closest(this.options.filter))
            return;
          const tagName = target2.tagName.toUpperCase();
          if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tagName))
            return;
          e.preventDefault();
        }
      };
      this.el.addEventListener("pointerdown", this._pointerDownBound);
      this.el.addEventListener("touchstart", this._touchStartBound, { passive: false });
    }
    destroy() {
      this.el.removeEventListener("pointerdown", this._pointerDownBound);
      this.el.removeEventListener("touchstart", this._touchStartBound);
      this._cleanupDragListeners();
    }
    _onPointerDown(e) {
      if (e.button !== 0)
        return;
      if (_Draggable.active)
        return;
      const target2 = e.target;
      const dragEl = target2.closest(this.options.draggable);
      if (!dragEl || !this.el.contains(dragEl))
        return;
      const closestDraggableContainer = dragEl.closest("[data-drag-container]");
      if (closestDraggableContainer !== this.el) {
        return;
      }
      if (dragEl.getAttribute("draggable") === "false") {
        return;
      }
      if (this.options.handle && !target2.closest(this.options.handle))
        return;
      if (this.options.filter) {
        if (target2.closest(this.options.filter)) {
          return;
        }
      }
      const targetTag = target2.tagName.toUpperCase();
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(targetTag)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.dragEl = dragEl;
      this.tapEvt = e;
      this.dragStarted = false;
      this.dragEl.classList.add(this.options.chosenClass);
      document.addEventListener("pointermove", this._pointerMoveBound);
      document.addEventListener("pointerup", this._pointerUpBound);
      document.addEventListener("pointercancel", this._pointerUpBound);
    }
    _onPointerMove(e) {
      if (!this.tapEvt || !this.dragEl)
        return;
      const dx = e.clientX - this.tapEvt.clientX;
      const dy = e.clientY - this.tapEvt.clientY;
      if (!this.dragStarted) {
        const threshold = e.pointerType === "touch" ? 8 : 3;
        if (Math.sqrt(dx * dx + dy * dy) > threshold) {
          this._startDrag(e);
        }
        return;
      }
      if (_Draggable.ghost) {
        _Draggable.ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
      this._maybeAutoScroll(e.clientX, e.clientY);
      this._onDragOver(e);
    }
    _startDrag(e) {
      this.dragStarted = true;
      _Draggable.active = this;
      this.parentEl = this.dragEl.parentElement;
      this.nextEl = this.dragEl.nextElementSibling;
      if (this.parentEl) {
        const stack = getDataStack(this.parentEl);
        this._lastSourceItemScope = stack.find((s) => s && "item" in s && s.item && typeof s.item === "object");
      }
      this.originalIndices.clear();
      let draggableIdx = 0;
      Array.from(this.el.children).forEach((child) => {
        if (child.matches(this.options.draggable) && child.getAttribute("draggable") !== "false" && !child.hasAttribute("data-ux-template")) {
          child.draggableIndex = draggableIdx;
          this.originalIndices.set(child, draggableIdx);
          draggableIdx++;
        }
      });
      if (this.options.multiDrag) {
        if (this.dragEl.classList.contains(this.options.selectedClass)) {
          this.multiDragElements = Array.from(this.el.children).filter(
            (c) => c.matches(this.options.draggable) && c.classList.contains(this.options.selectedClass)
          );
        } else {
          Array.from(this.el.children).forEach((c) => {
            const stack = getDataStack(c);
            const scope = stack.find((s) => s && "item" in s && s.item && typeof s.item === "object");
            if (scope && scope.item) {
              scope.item.selected = c === this.dragEl;
            }
          });
          this.multiDragElements = [this.dragEl];
        }
      }
      const pull = typeof this.options.group === "object" && this.options.group.pull === "clone";
      if (pull) {
        _Draggable.clone = this.dragEl.cloneNode(true);
        this.dragEl.parentNode.insertBefore(_Draggable.clone, this.dragEl);
      }
      const rect = this.dragEl.getBoundingClientRect();
      _Draggable.ghost = this.dragEl.cloneNode(true);
      _Draggable.ghost.style.position = "fixed";
      _Draggable.ghost.style.top = `${rect.top}px`;
      _Draggable.ghost.style.left = `${rect.left}px`;
      _Draggable.ghost.style.width = `${rect.width}px`;
      _Draggable.ghost.style.height = `${rect.height}px`;
      _Draggable.ghost.style.maskImage = "linear-gradient(to bottom right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)";
      _Draggable.ghost.style.webkitMaskImage = "linear-gradient(to bottom right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)";
      _Draggable.ghost.style.pointerEvents = "none";
      _Draggable.ghost.style.zIndex = "100000";
      _Draggable.ghost.classList.add(this.options.ghostClass);
      const originalMarker = this.dragEl[MARKER_KEY];
      if (originalMarker)
        _Draggable.ghost[MARKER_KEY] = originalMarker;
      const originalStack = getDataStack(this.dragEl);
      if (originalStack.length)
        _Draggable.ghost[DATA_STACK_KEY] = originalStack;
      document.body.appendChild(_Draggable.ghost);
      this.dragEl.classList.add(this.options.chosenClass);
      this.dragEl.classList.add(this.options.dragClass);
      if (this.options.multiDrag && this.multiDragElements.length > 0) {
        this.multiDragElements.forEach((el) => {
          if (el !== this.dragEl) {
            el.style.display = "none";
          }
        });
      }
      this.scrollParent = getScrollParent(this.el);
      this.scrollParentBounds = this.scrollParent.getBoundingClientRect();
      if (this.options.onStart) {
        this.options.onStart({
          item: this.dragEl,
          oldIndex: this.originalIndices.get(this.dragEl),
          originalEvent: e
        });
      }
    }
    _onDragOver(e) {
      if (!this.dragEl)
        return;
      if (this.parentEl && this._lastSourceItemScope && this._lastSourceItemScope.item) {
        if (this.dragEl.parentElement !== this.parentEl) {
          this._lastSourceItemScope.item.isDraggedOut = true;
        } else {
          const rect = this.parentEl.getBoundingClientRect();
          const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
          this._lastSourceItemScope.item.isDraggedOut = isOutside;
        }
      }
      const target2 = this._findTargetUnderCursor(e.clientX, e.clientY);
      if (!target2 || target2 === this.dragEl) {
        this._clearDragOverState();
        return;
      }
      if (this.dragEl.contains(target2)) {
        this._clearDragOverState();
        return;
      }
      const targetParent = target2.hasAttribute("data-drag-container") ? target2 : target2.closest("[data-drag-container]");
      if (!targetParent) {
        this._clearDragOverState();
        return;
      }
      let targetDraggable = null;
      const reorderEngine = targetParent.__draggable;
      if (reorderEngine && reorderEngine.draggable) {
        targetDraggable = reorderEngine.draggable;
      }
      const isSameContainer = targetParent === this.el;
      if (!isSameContainer) {
        if (!targetDraggable || !this._canPullPut(targetDraggable)) {
          this._clearDocked();
          this._clearDragOverState();
          return;
        }
      }
      this._updateDragOverState(targetParent, e);
      if (target2.hasAttribute("data-drag-container")) {
        if (this.dragEl.parentElement !== target2) {
          const srcBefore = this._captureRects(this.dragEl.parentElement);
          const destBefore = this._captureRects(target2);
          target2.appendChild(this.dragEl);
          this._animateShift(this.dragEl.parentElement, srcBefore);
          this._animateShift(target2, destBefore);
        }
        this._updateDocked();
        return;
      }
      const targetRect = target2.getBoundingClientRect();
      const dragRect = this.dragEl.getBoundingClientRect();
      const vertical = this._detectDirection(targetParent) === "vertical";
      const differentLevel = this.dragEl.parentNode !== targetParent;
      const differentRowCol = !this._dragElInRowColumn(dragRect, targetRect, vertical);
      const side1 = vertical ? "top" : "left";
      if (this.lastTarget !== target2) {
        this.targetBeforeFirstSwap = targetRect[side1];
        this.pastFirstInvertThresh = false;
        this.isCircumstantialInvert = !differentRowCol && this.options.invertSwap || differentLevel;
      }
      const direction = this._getSwapDirection(
        e,
        target2,
        targetRect,
        vertical,
        differentRowCol ? 1 : this.options.swapThreshold,
        this.options.invertedSwapThreshold,
        this.isCircumstantialInvert,
        this.lastTarget === target2
      );
      if (direction !== 0) {
        if (this.options.swap) {
          this._setSwapHighlight(target2);
        }
        let sibling = null;
        let dragIndex = Array.from(this.dragEl.parentElement.children).indexOf(this.dragEl);
        if (dragIndex !== -1) {
          do {
            dragIndex -= direction;
            sibling = this.dragEl.parentElement.children[dragIndex];
          } while (sibling && (getComputedStyle(sibling).display === "none" || sibling === _Draggable.ghost));
        }
        if (sibling === target2) {
          return;
        }
        this.lastTarget = target2;
        this.lastDirection = direction;
        const srcBefore = this._captureRects(this.dragEl.parentElement);
        const destBefore = isSameContainer ? srcBefore : this._captureRects(targetParent);
        if (this.options.swap) {
          this._swapNodes(this.dragEl, target2);
        } else {
          const nextSibling = target2.nextElementSibling;
          const after = direction === 1;
          if (after && !nextSibling) {
            targetParent.appendChild(this.dragEl);
          } else {
            targetParent.insertBefore(this.dragEl, after ? nextSibling : target2);
          }
        }
        this._animateShift(this.dragEl.parentElement, srcBefore);
        if (!isSameContainer) {
          this._animateShift(targetParent, destBefore);
        }
        this._updateDocked();
        if (this.targetBeforeFirstSwap !== void 0 && !this.isCircumstantialInvert) {
          const newTargetRect = target2.getBoundingClientRect();
          this.targetMoveDistance = Math.abs(this.targetBeforeFirstSwap - newTargetRect[side1]);
        }
      }
    }
    _onPointerUp(e) {
      this._cleanupDragListeners();
      this._clearSwapHighlight();
      if (this.dragEl) {
        this.dragEl.classList.remove(this.options.chosenClass);
        if (this.dragStarted) {
          this.dragEl.classList.remove(this.options.dragClass);
          if (this.options.multiDrag && this.multiDragElements.length > 0) {
            this.multiDragElements.forEach((el) => {
              el.style.display = "";
            });
          }
          if (this.dragEl)
            this.dragEl.style.display = "";
          if (_Draggable.clone) {
            _Draggable.clone.parentNode?.removeChild(_Draggable.clone);
            _Draggable.clone = null;
          }
          if (_Draggable.ghost) {
            _Draggable.ghost.parentNode?.removeChild(_Draggable.ghost);
            _Draggable.ghost = null;
          }
          let finalIndex = 0;
          const children = Array.from(this.dragEl.parentElement.children);
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child === this.dragEl)
              break;
            if (child.classList.contains(this.options.selectedClass))
              continue;
            if (child.nodeName.toUpperCase() === "TEMPLATE")
              continue;
            if (child.hasAttribute("data-ux-template"))
              continue;
            if (child.getAttribute("draggable") === "false")
              continue;
            if (child.matches(this.options.draggable)) {
              finalIndex++;
            }
          }
          const oldIndex = this.originalIndices.get(this.dragEl);
          if (this.options.onEnd) {
            this.options.onEnd({
              item: this.dragEl,
              from: this.parentEl,
              to: this.dragEl.parentElement,
              oldIndex,
              newIndex: finalIndex,
              originalEvent: e,
              items: [...this.multiDragElements],
              oldIndicies: this.multiDragElements.map((el) => ({
                multiDragElement: el,
                index: this.originalIndices.get(el) ?? -1
              }))
            });
          }
          if (this.options.multiDrag) {
            this.multiDragElements = [];
          }
        } else {
          if (this.options.multiDrag) {
            const stack = getDataStack(this.dragEl);
            const scope = stack.find((s) => s && "item" in s && s.item && typeof s.item === "object");
            if (scope && scope.item) {
              scope.item.selected = !scope.item.selected;
            }
          }
        }
      }
      this._clearDragOverState();
      if (this._lastSourceItemScope && this._lastSourceItemScope.item) {
        this._lastSourceItemScope.item.isDraggedOut = false;
        this._lastSourceItemScope = null;
      }
      this._clearDocked();
      if (this.el) {
        this.el.querySelectorAll("[data-drag-container]").forEach((el) => {
        });
      }
      _Draggable.active = null;
      this.dragEl = null;
      this.tapEvt = null;
      this.dragStarted = false;
      this._clearDocked();
    }
    _cleanupDragListeners() {
      document.removeEventListener("pointermove", this._pointerMoveBound);
      document.removeEventListener("pointerup", this._pointerUpBound);
      document.removeEventListener("pointercancel", this._pointerUpBound);
    }
    _clearDocked() {
      if (this._dockedContainer) {
        this._dockedContainer.removeAttribute("data-dropzone-state");
        this._dockedContainer = null;
      }
    }
    _updateDocked() {
      if (!this.dragEl)
        return;
      const container = this.dragEl.closest("[data-drag-container]");
      if (container !== this._dockedContainer) {
        if (this._dockedContainer) {
          this._dockedContainer.removeAttribute("data-dropzone-state");
        }
        if (container) {
          container.setAttribute("data-dropzone-state", "docked");
        }
        this._dockedContainer = container;
      }
    }
    _clearDragOverState() {
      if (this._lastActiveItemScope && this._lastActiveItemScope.item) {
        this._lastActiveItemScope.item.isDragOver = false;
        this._lastActiveItemScope = null;
      }
      this._clearSwapHighlight();
    }
    _setSwapHighlight(target2) {
      if (this._swapHighlightTarget && this._swapHighlightTarget !== target2) {
        this._swapHighlightTarget.classList.remove(this.options.swapClass);
      }
      target2.classList.add(this.options.swapClass);
      this._swapHighlightTarget = target2;
    }
    _clearSwapHighlight() {
      if (this._swapHighlightTarget) {
        this._swapHighlightTarget.classList.remove(this.options.swapClass);
        this._swapHighlightTarget = null;
      }
    }
    _updateDragOverState(targetParent, e) {
      const stack = getDataStack(targetParent);
      const targetItemScope = stack.find((s) => s && "item" in s && s.item && typeof s.item === "object");
      if (this._lastActiveItemScope !== targetItemScope) {
        this._clearDragOverState();
        this._lastActiveItemScope = targetItemScope || null;
      }
      if (targetItemScope && targetItemScope.item) {
        const rect = targetParent.getBoundingClientRect();
        const isInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        targetItemScope.item.isDragOver = isInside;
      }
    }
    _findTargetUnderCursor(clientX, clientY) {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el)
        return null;
      const container = el.closest("[data-drag-container]");
      if (!container || !container.__draggable)
        return null;
      const children = Array.from(container.children).filter(
        (c) => c.nodeName.toUpperCase() !== "TEMPLATE" && c !== this.dragEl && c !== _Draggable.ghost && c.style.display !== "none" && !c.hasAttribute("data-ux-template") && !c.classList.contains("draggable-ghost")
      );
      if (children.length === 0)
        return container;
      let closest = null;
      let minDistance = Infinity;
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
          minDistance = dist;
          closest = child;
        }
      }
      return closest;
    }
    _detectDirection(container) {
      if (this.options.direction)
        return this.options.direction === "grid" ? "vertical" : this.options.direction;
      const style = getComputedStyle(container);
      if (style.display === "flex") {
        return style.flexDirection === "column" || style.flexDirection === "column-reverse" ? "vertical" : "horizontal";
      }
      if (style.display === "grid") {
        return style.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
      }
      const children = Array.from(container.children).filter((c) => c.nodeName.toUpperCase() !== "TEMPLATE");
      if (children.length >= 2) {
        const rect1 = children[0].getBoundingClientRect();
        const rect2 = children[1].getBoundingClientRect();
        return Math.abs(rect1.top - rect2.top) < 4 ? "horizontal" : "vertical";
      }
      return "vertical";
    }
    _dragElInRowColumn(dragRect, targetRect, vertical) {
      const dragElS1Opp = vertical ? dragRect.left : dragRect.top;
      const dragElS2Opp = vertical ? dragRect.right : dragRect.bottom;
      const dragElOppLength = vertical ? dragRect.width : dragRect.height;
      const targetS1Opp = vertical ? targetRect.left : targetRect.top;
      const targetS2Opp = vertical ? targetRect.right : targetRect.bottom;
      const targetOppLength = vertical ? targetRect.width : targetRect.height;
      const EPS = 1;
      return Math.abs(dragElS1Opp - targetS1Opp) < EPS || Math.abs(dragElS2Opp - targetS2Opp) < EPS || Math.abs(dragElS1Opp + dragElOppLength / 2 - (targetS1Opp + targetOppLength / 2)) < EPS;
    }
    _getSwapDirection(evt, target2, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
      const mouseOnAxis = vertical ? evt.clientY : evt.clientX;
      const targetLength = vertical ? targetRect.height : targetRect.width;
      const targetS1 = vertical ? targetRect.top : targetRect.left;
      const targetS2 = vertical ? targetRect.bottom : targetRect.right;
      let invert = false;
      if (!invertSwap) {
        if (isLastTarget && this.targetMoveDistance < targetLength * swapThreshold) {
          if (!this.pastFirstInvertThresh && (this.lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) {
            this.pastFirstInvertThresh = true;
          }
          if (!this.pastFirstInvertThresh) {
            if (this.lastDirection === 1 ? mouseOnAxis < targetS1 + this.targetMoveDistance : mouseOnAxis > targetS2 - this.targetMoveDistance) {
              return -this.lastDirection;
            }
          } else {
            invert = true;
          }
        } else {
          if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) {
            return this._getInsertDirection(evt, target2, targetRect, vertical);
          }
        }
      }
      invert = invert || invertSwap;
      if (invert) {
        if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) {
          return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
        }
      }
      return 0;
    }
    _getInsertDirection(evt, target2, targetRect, vertical) {
      const mouseOnAxis = vertical ? evt.clientY : evt.clientX;
      const targetS1 = vertical ? targetRect.top : targetRect.left;
      const targetLength = vertical ? targetRect.height : targetRect.width;
      return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
    }
    _swapNodes(n1, n2) {
      const p1 = n1.parentNode;
      const p2 = n2.parentNode;
      if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1))
        return;
      const children = Array.from(p1.children);
      const i1 = children.indexOf(n1);
      const i2 = children.indexOf(n2);
      if (p1.isEqualNode(p2) && i1 < i2) {
        p1.insertBefore(n2, children[i1]);
        p2.insertBefore(n1, children[i2 + 1] || null);
      } else {
        p1.insertBefore(n2, children[i1]);
        p2.insertBefore(n1, children[i2] || null);
      }
    }
    _maybeAutoScroll(clientX, clientY) {
      if (!this.scrollParent || !this.scrollParentBounds)
        return;
      const { left, top, width, height } = this.scrollParentBounds;
      const edgeScrollThreshold = 40;
      const autoScrollSpeed = 15;
      const dl = clientX - left;
      const dr = left + width - clientX;
      const dt = clientY - top;
      const db = top + height - clientY;
      let dx = 0;
      let dy = 0;
      const canScrollLeft = this.scrollParent.scrollLeft > 0;
      const canScrollRight = this.scrollParent.scrollLeft < this.scrollParent.scrollWidth - this.scrollParent.clientWidth;
      const canScrollTop = this.scrollParent.scrollTop > 0;
      const canScrollBottom = this.scrollParent.scrollTop < this.scrollParent.scrollHeight - this.scrollParent.clientHeight;
      if (dl < edgeScrollThreshold && canScrollLeft) {
        dx = -autoScrollSpeed * (1 - dl / edgeScrollThreshold);
      } else if (dr < edgeScrollThreshold && canScrollRight) {
        dx = autoScrollSpeed * (1 - dr / edgeScrollThreshold);
      }
      if (dt < edgeScrollThreshold && canScrollTop) {
        dy = -autoScrollSpeed * (1 - dt / edgeScrollThreshold);
      } else if (db < edgeScrollThreshold && canScrollBottom) {
        dy = autoScrollSpeed * (1 - db / edgeScrollThreshold);
      }
      if (dx !== 0 || dy !== 0) {
        this.scrollParent.scrollBy({ left: dx, top: dy });
      }
    }
    _canPullPut(toDraggable) {
      const fromGroup = this.options.group;
      const toGroup = toDraggable.options.group;
      if (!fromGroup || !toGroup)
        return false;
      const fromName = typeof fromGroup === "object" ? fromGroup.name : fromGroup;
      const toName = typeof toGroup === "object" ? toGroup.name : toGroup;
      if (fromName && toName && fromName === toName) {
        const fromPull = typeof fromGroup === "object" && fromGroup.pull !== void 0 ? fromGroup.pull : true;
        const toPut = typeof toGroup === "object" && toGroup.put !== void 0 ? toGroup.put : true;
        return !!fromPull && !!toPut;
      }
      return false;
    }
    _captureRects(container) {
      const rects = /* @__PURE__ */ new Map();
      Array.from(container.children).forEach((child) => {
        if (child.nodeName.toUpperCase() !== "TEMPLATE") {
          rects.set(child, child.getBoundingClientRect());
        }
      });
      return rects;
    }
    _animateShift(container, beforeRects) {
      Array.from(container.children).forEach((child) => {
        if (child.nodeName.toUpperCase() === "TEMPLATE" || child === this.dragEl)
          return;
        const beforeRect = beforeRects.get(child);
        if (!beforeRect)
          return;
        const afterRect = child.getBoundingClientRect();
        const dx = beforeRect.left - afterRect.left;
        const dy = beforeRect.top - afterRect.top;
        if (dx !== 0 || dy !== 0) {
          child.style.transition = "none";
          child.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          child.offsetHeight;
          child.style.transition = `transform ${this.options.animation}ms ease-out`;
          child.style.transform = "translate3d(0, 0, 0)";
          const clean = () => {
            child.style.transition = "";
            child.style.transform = "";
          };
          child.addEventListener("transitionend", clean, { once: true });
        }
      });
    }
  };
  var DragReorderEngine = class {
    constructor(ctx, runtime) {
      this.ctx = ctx;
      this.runtime = runtime;
      if (this.ctx.container) {
        this.init();
      }
    }
    draggable = null;
    finalToIndex = -1;
    init() {
      const container = this.ctx.container;
      const isMulti = container.getAttribute("data-drag-multi") === "true";
      const selectedClass = container.getAttribute("data-drag-selected-class") || "draggable-selected";
      const swap = container.hasAttribute("data-drag-swap") || container.getAttribute("data-drag-swap") === "true";
      const swapClass = container.getAttribute("data-drag-swap-class") || "draggable-swap-highlight";
      const groupAttr = container.getAttribute("data-drag-group");
      let group = void 0;
      if (groupAttr) {
        group = { name: groupAttr };
        const pullAttr = container.getAttribute("data-drag-pull");
        const pull = pullAttr !== "false" ? container.hasAttribute("data-drag-clone") || container.getAttribute("data-drag-clone") === "true" ? "clone" : true : false;
        const put = container.getAttribute("data-drag-put") !== "false";
        const revertClone = container.getAttribute("data-drag-revert-clone") === "true";
        group.pull = pull;
        group.put = put;
        group.revertClone = revertClone;
      }
      const directionAttr = container.getAttribute("data-drag-direction");
      const direction = directionAttr === "grid" ? void 0 : directionAttr;
      const isNested = groupAttr === "nested";
      const swapThresholdAttr = container.getAttribute("data-drag-swap-threshold");
      const swapThreshold = swapThresholdAttr ? parseFloat(swapThresholdAttr) : isNested ? 0.65 : 1;
      const invertSwapAttr = container.getAttribute("data-drag-invert-swap");
      const invertSwap = invertSwapAttr === "true" || isNested;
      this.draggable = new Draggable(container, {
        animation: this.ctx.animationDuration ?? 150,
        ghostClass: this.ctx.ghostClass ?? "draggable-ghost",
        dragClass: this.ctx.dragClass ?? "draggable-drag",
        ghostOpacity: this.ctx.ghostOpacity ?? 0.4,
        fallbackOnBody: this.ctx.fallbackOnBody !== false,
        swapThreshold,
        invertSwap,
        direction,
        handle: container.getAttribute("data-drag-handle") || void 0,
        filter: container.getAttribute("data-drag-filter") || void 0,
        draggable: "[data-drag]",
        multiDrag: isMulti,
        selectedClass,
        swap,
        swapClass,
        group,
        sort: this.ctx.sort !== false,
        onStart: (evt) => {
          const globalSignals = this.runtime?.globalSignals();
          if (globalSignals) {
            globalSignals["drag:start"] = {
              element: evt.item,
              originalEvent: evt.originalEvent,
              fromIndex: evt.oldIndex
            };
          }
          const fromContainer = evt.from;
          if (this.runtime && fromContainer) {
            this.updateEmptyState(fromContainer);
          }
        },
        onEnd: (evt) => {
          this.finalToIndex = evt.newIndex;
          const globalSignals = this.runtime?.globalSignals();
          if (globalSignals) {
            globalSignals["drag:end"] = {
              element: evt.item,
              originalEvent: evt.originalEvent,
              cancelled: false
            };
          }
          const fromContainer = evt.from;
          const toContainer = evt.to;
          const fromExpr = fromContainer.getAttribute("data-drag-container") || fromContainer.getAttribute("data-teleport:drop");
          const toExpr = toContainer.getAttribute("data-drag-container") || toContainer.getAttribute("data-teleport:drop");
          if (!fromExpr || !this.runtime)
            return;
          const oldIndex = evt.oldIndex;
          const newIndex = evt.newIndex;
          const isMultiDrag = isMulti && evt.items && evt.items.length > 0;
          const childrenToAnimate = Array.from(toContainer.children);
          const flipFn = this.runtime.sprites?.$animate?.flip || flip;
          if (toContainer !== fromContainer && toExpr) {
            const targetList = this.runtime.evaluate(toContainer, toExpr);
            const sourceList = this.runtime.evaluate(fromContainer, fromExpr);
            if (Array.isArray(targetList) && Array.isArray(sourceList)) {
              const isClone = group?.pull === "clone" || (toContainer.hasAttribute("data-drag-clone") || toContainer.getAttribute("data-drag-clone") === "true");
              let itemsToInsert = [];
              let indicesToRemove = [];
              if (isMultiDrag) {
                const sortedIndices = (evt.oldIndicies || []).slice().sort((a, b) => b.index - a.index);
                const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a, b) => a.index - b.index);
                itemsToInsert = sortedOldAsc.map((x) => {
                  const item = sourceList[x.index];
                  return isClone ? { ...item, id: `${item.id}-clone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` } : item;
                });
                if (!isClone) {
                  indicesToRemove = sortedIndices.map((x) => x.index);
                }
              } else {
                const item = sourceList[oldIndex];
                itemsToInsert = [isClone ? { ...item, id: `${item.id}-clone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` } : item];
                if (!isClone) {
                  indicesToRemove = [oldIndex];
                }
              }
              if (isClone) {
                if (Draggable.clone && Draggable.clone.parentNode) {
                  Draggable.clone.parentNode.removeChild(Draggable.clone);
                  Draggable.clone = null;
                }
                if (isMultiDrag) {
                  const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a, b) => a.index - b.index);
                  sortedOldAsc.forEach((x) => {
                    const el = x.multiDragElement;
                    const sib = fromContainer.children[x.index];
                    if (sib) {
                      fromContainer.insertBefore(el, sib);
                    } else {
                      fromContainer.appendChild(el);
                    }
                  });
                } else {
                  const sib = fromContainer.children[oldIndex];
                  if (sib) {
                    fromContainer.insertBefore(evt.item, sib);
                  } else {
                    fromContainer.appendChild(evt.item);
                  }
                }
              } else {
                if (isMultiDrag) {
                  evt.items.forEach((item) => {
                    if (item.parentNode === fromContainer) {
                      fromContainer.removeChild(item);
                    }
                  });
                } else {
                  if (evt.item.parentNode === fromContainer) {
                    fromContainer.removeChild(evt.item);
                  }
                }
              }
              if (isClone) {
                this.ctx.updateList((src) => {
                  targetList.splice(newIndex, 0, ...itemsToInsert);
                });
              } else {
                flipFn(childrenToAnimate, () => {
                  this.ctx.updateList((list) => {
                    for (const idx of indicesToRemove) {
                      list.splice(idx, 1);
                    }
                    targetList.splice(newIndex, 0, ...itemsToInsert);
                  });
                }, { duration: this.ctx.animationDuration ?? 150 });
              }
              if (this.runtime) {
                this.updateEmptyState(fromContainer);
                this.updateEmptyState(toContainer);
              }
            }
          } else {
            const sourceList = this.runtime.evaluate(fromContainer, fromExpr);
            if (Array.isArray(sourceList)) {
              flipFn(childrenToAnimate, () => {
                this.ctx.updateList((list) => {
                  if (swap) {
                    if (isMultiDrag) {
                      const oldInd = evt.oldIndicies || [];
                      const newInd = evt.newIndicies || [];
                      for (let i = 0; i < oldInd.length; i++) {
                        const oIdx = oldInd[i].index;
                        const nIdx = newInd[i].index;
                        if (oIdx !== -1 && nIdx !== -1) {
                          const temp = list[nIdx];
                          list[nIdx] = list[oIdx];
                          list[oIdx] = temp;
                        }
                      }
                    } else {
                      const temp = list[newIndex];
                      list[newIndex] = list[oldIndex];
                      list[oldIndex] = temp;
                    }
                  } else {
                    if (isMultiDrag) {
                      const sortedOldDesc = (evt.oldIndicies || []).slice().sort((a, b) => b.index - a.index);
                      const sortedOldAsc = (evt.oldIndicies || []).slice().sort((a, b) => a.index - b.index);
                      const itemsToInsert = sortedOldAsc.map((x) => sourceList[x.index]);
                      for (const x of sortedOldDesc) {
                        list.splice(x.index, 1);
                      }
                      list.splice(newIndex, 0, ...itemsToInsert);
                    } else {
                      const [moved] = list.splice(oldIndex, 1);
                      list.splice(newIndex, 0, moved);
                    }
                  }
                });
              }, { duration: this.ctx.animationDuration ?? 150 });
              if (this.runtime) {
                this.updateEmptyState(fromContainer);
              }
            }
          }
        }
      });
      this.draggable._runtime = this.runtime;
    }
    updateEmptyState(container) {
      const stack = getDataStack(container);
      if (stack.length > 0) {
        const scope = stack[0];
        const hasChildren = container.querySelector(":scope > [data-drag]:not([data-for])") != null;
        scope.dragEmpty = !hasChildren;
      }
    }
    startDrag() {
    }
    updateDrag() {
    }
    endDrag() {
    }
    getFinalToIndex() {
      return this.finalToIndex;
    }
  };
  function buildReorderContext(container, listExpr, runtime, options) {
    const getList = () => {
      try {
        const result = runtime.evaluate(container, listExpr);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    };
    return {
      getList,
      updateList: (mutate) => {
        const list = getList();
        mutate(list);
      },
      container,
      direction: options?.direction,
      ghostClass: options?.ghostClass,
      dragClass: options?.dragClass,
      ghostOpacity: options?.ghostOpacity,
      group: options?.group,
      sort: options?.sort !== false,
      swap: options?.swap,
      swapClass: options?.swapClass,
      fallbackOnBody: options?.fallbackOnBody,
      swapThreshold: options?.swapThreshold,
      edgeScrollThreshold: options?.edgeScrollThreshold ?? 40,
      autoScrollSpeed: options?.autoScrollSpeed ?? 15,
      animationDuration: options?.animationDuration ?? 150,
      onReorder: options?.onReorder
    };
  }
  var dragAttribute = {
    name: "drag",
    attribute: "drag",
    handle: (element, _value, runtime) => {
      if (element.__nexusDragBound)
        return element.__nexusDragCleanup;
      element.__nexusDragBound = true;
      const isContainer = element.hasAttribute("data-drag-container") || element.hasAttribute("data-teleport:drop");
      const container = isContainer ? element : element.parentElement;
      if (!container)
        return;
      let cleanupEffect2 = void 0;
      const [_, stopEffect] = runtime.elementBoundEffect(container, () => {
        const swapThreshExpr = container.getAttribute("data-bind-data-drag-swap-threshold") || container.getAttribute("data-bind:data-drag-swap-threshold");
        const swapThreshVal = swapThreshExpr ? runtime.evaluate(container, swapThreshExpr) : void 0;
        const invertThreshExpr = container.getAttribute("data-bind-data-drag-invert-swap-threshold") || container.getAttribute("data-bind:data-drag-invert-swap-threshold");
        const invertThreshVal = invertThreshExpr ? runtime.evaluate(container, invertThreshExpr) : void 0;
        if (!container.__draggable) {
          try {
            const listExpr = container.getAttribute("data-drag-container") || container.getAttribute("data-teleport:drop") || "";
            const ghostOpacityAttr = container.getAttribute("data-drag-ghost-opacity");
            const ghostOpacity = ghostOpacityAttr ? parseFloat(ghostOpacityAttr) : void 0;
            const ctx = buildReorderContext(container, listExpr, runtime, {
              ghostOpacity
            });
            const engine = new DragReorderEngine(ctx, runtime);
            container.__draggable = engine;
            const enhancedContainer = container;
            if (!enhancedContainer[CLEANUP_FUNCTIONS_KEY]) {
              enhancedContainer[CLEANUP_FUNCTIONS_KEY] = /* @__PURE__ */ new Map();
            }
            const containerCleanups = enhancedContainer[CLEANUP_FUNCTIONS_KEY];
            const cleanupFn = () => {
              if (engine.draggable) {
                engine.draggable.destroy();
              }
              delete container.__draggable;
            };
            if (containerCleanups instanceof Map) {
              containerCleanups.set("draggable-cleanup", cleanupFn);
            } else if (Array.isArray(containerCleanups)) {
              containerCleanups.push(cleanupFn);
            }
          } catch (err2) {
            runtime.reportError(err2 instanceof Error ? err2 : new Error(String(err2)), container, "drag-init");
          }
        }
        const engineNow = container.__draggable;
        if (engineNow && engineNow.draggable) {
          if (swapThreshVal !== void 0 && swapThreshVal !== null && swapThreshVal !== "") {
            engineNow.draggable.options.swapThreshold = Number(swapThreshVal);
          }
          if (invertThreshVal !== void 0 && invertThreshVal !== null && invertThreshVal !== "") {
            engineNow.draggable.options.invertedSwapThreshold = Number(invertThreshVal);
          }
        }
      });
      cleanupEffect2 = () => {
        stopEffect();
        delete element.__nexusDragBound;
        delete element.__nexusDragCleanup;
      };
      element.__nexusDragCleanup = cleanupEffect2;
      return cleanupEffect2;
    }
  };
  var drag_default = dragAttribute;

  // src/modules/attributes/markdown.ts
  var markdown_exports = {};
  __export(markdown_exports, {
    default: () => markdown_default
  });
  var markdownModule = {
    name: "markdown",
    attribute: "markdown",
    handle: (el, value, runtime) => {
      const parseMarkdown = (md) => {
        let html = md || "";
        const codeBlocks = [];
        html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, (_match, lang, code) => {
          const id = `__CODE_BLOCK_${codeBlocks.length}__`;
          const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
          codeBlocks.push(
            `<pre class="bg-base-300 p-4 rounded-xl overflow-x-auto text-sm my-4 border border-base-200 font-mono shadow-inner text-base-content" data-lang="${lang}"><code>${escaped}</code></pre>`
          );
          return id;
        });
        html = html.replace(/`([^`]+)`/g, '<code class="bg-base-200 text-primary px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');
        html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-base-content">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b border-base-300 pb-2 border-opacity-50 text-base-content">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-extrabold mt-10 mb-6 tracking-tight text-base-content">$1</h1>');
        html = html.replace(/^\s*> (.*$)/gim, '<blockquote class="border-l-4 border-primary bg-primary/5 pl-4 py-2 my-4 italic opacity-90 rounded-r-lg text-base-content">$1</blockquote>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-base-content">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link link-primary hover:text-primary-focus transition-colors">$1</a>');
        html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-6 list-disc marker:text-primary/50 py-0.5 text-base-content">$1</li>');
        html = html.replace(/(<li class="ml-6 list-disc[^>]*>.*<\/li>[\s\n]*)+/gim, (match) => `<ul class="mt-2 mb-4 space-y-1">
${match}</ul>
`);
        html = html.split("\n").map((line) => {
          const trimmed = line.trim();
          if (trimmed.length > 0 && !trimmed.startsWith("<") && !trimmed.startsWith("__CODE_BLOCK_")) {
            return `<p class="mb-4 leading-relaxed opacity-90 text-base-content">${trimmed}</p>`;
          }
          return line;
        }).join("\n");
        html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_match, idx) => codeBlocks[parseInt(idx, 10)]);
        return html;
      };
      const render = () => {
        const content = value ? runtime.evaluate(el, value) : el.innerHTML || el.innerText;
        const mdText = String(content || "").trim();
        if (!el.classList.contains("nexus-markdown-body")) {
          el.classList.add("nexus-markdown-body", "font-sans", "antialiased");
        }
        const transpiled = parseMarkdown(mdText);
        if (el.innerHTML !== transpiled) {
          el.innerHTML = transpiled;
          runtime.processElement(el);
        }
      };
      if (value) {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, render);
        return cleanup;
      } else {
        render();
      }
    }
  };
  var markdown_default = markdownModule;

  // src/modules/attributes/preserve.ts
  var preserve_exports = {};
  __export(preserve_exports, {
    default: () => preserve_default
  });
  init_consts();
  var preserveModule = {
    name: "preserve",
    attribute: "preserve",
    handle: (el, _value, _runtime) => {
      el.setAttribute(DATA_PRESERVE_ATTR, "true");
      return () => {
      };
    }
  };
  var preserve_default = preserveModule;

  // src/modules/attributes/bind.ts
  var bind_exports = {};
  __export(bind_exports, {
    default: () => bind_default
  });
  init_debug();

  // src/engine/attributeParser.ts
  init_consts();
  function parseAttribute(name, _runtime, element) {
    let rawName = "";
    let isNexus = false;
    if (name.startsWith(ATTRIBUTE_PREFIX)) {
      rawName = name.slice(ATTRIBUTE_PREFIX.length);
      isNexus = true;
    } else if (name.startsWith(":")) {
      rawName = `bind-${name.slice(1)}`;
      isNexus = true;
    } else if (name.startsWith("@")) {
      rawName = `on-${name.slice(1)}`;
      isNexus = true;
    }
    if (!isNexus) {
      return null;
    }
    let directive = void 0;
    let argument = void 0;
    const modifiers = [];
    let target2 = void 0;
    let state = 0;
    let rest = rawName;
    const hyphenated = ["ux-theme", "on-raf", "flow-node", "flow-handle", "flow-edges", "flow-grid"].find(
      (h) => rawName === h || rawName.startsWith(h + "-") || rawName.startsWith(h + ":") || rawName.startsWith(h + ".")
    );
    if (hyphenated) {
      directive = hyphenated;
      rest = rawName.slice(hyphenated.length);
      if (rest.length > 0) {
        if (rest.startsWith("-")) {
          state = 1;
          rest = rest.slice(1);
        } else if (rest.startsWith(":") || rest.startsWith(".")) {
          state = 2;
          rest = rest.slice(1);
        }
      }
    }
    let currentTokenStart = 0;
    const len = rest.length;
    for (let i = 0; i <= len; i++) {
      const isEnd = i === len;
      const char = isEnd ? "" : rest[i];
      const isModifierDelim = char === MODIFIER_DELIMITER || char === ".";
      const isArgDelim = char === "-";
      const isDelim = isModifierDelim || isArgDelim;
      if (isDelim || isEnd) {
        if (i > currentTokenStart) {
          const token = rest.slice(currentTokenStart, i);
          if (state === 0) {
            directive = token;
          } else if (state === 1) {
            argument = argument ? argument + "-" + token : token;
          } else {
            if (token.startsWith("$(") && token.endsWith(")")) {
              target2 = token.slice(2, -1);
            } else {
              modifiers.push(token);
            }
          }
        }
        if (isDelim) {
          if (isModifierDelim) {
            state = 2;
          } else if (isArgDelim && state === 0) {
            state = 1;
          }
        }
        currentTokenStart = i + 1;
      }
    }
    return {
      name,
      value: element.getAttribute(name) || "",
      directive,
      argument,
      modifiers,
      target: target2
    };
  }
  function matchAttributes(el, directive, value) {
    const prefixColon = `data-${directive}:`;
    const prefixDash = `data-${directive}-`;
    const exact = `data-${directive}`;
    return Array.from(el.attributes).filter((a) => {
      const isMatch = a.name === exact || a.name.startsWith(prefixColon) || a.name.startsWith(prefixDash);
      if (!isMatch)
        return false;
      if (value !== void 0 && a.value !== value)
        return false;
      return true;
    });
  }

  // src/modules/attributes/bind.ts
  var bindModule = {
    name: "bind",
    attribute: "bind",
    handle: (el, value, runtime) => {
      if (!value)
        return;
      const cleanupFns = [];
      const allBindAttrs = matchAttributes(el, "bind", value);
      const hasSubDirective = allBindAttrs.some((a) => a.name !== "data-bind");
      if (!hasSubDirective && el.hasAttribute("data-bind") && el.getAttribute("data-bind") === value) {
        try {
          const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
            const result = runtime.evaluate(el, value);
            if (result && typeof result === "object" && !Array.isArray(result)) {
              Object.entries(result).forEach(([param, val]) => {
                if (param in el) {
                  if (el[param] !== val)
                    el[param] = val;
                } else {
                  if (val === false || val === null || val === void 0) {
                    if (el.hasAttribute(param))
                      el.removeAttribute(param);
                  } else {
                    const strVal = String(val);
                    if (el.getAttribute(param) !== strVal)
                      el.setAttribute(param, strVal);
                  }
                }
              });
              return;
            }
            if (el instanceof HTMLInputElement) {
              if (el.type === "checkbox") {
                el.checked = Boolean(result);
              } else if (el.type === "radio") {
                el.checked = el.value === String(result);
              } else {
                el.value = result !== void 0 && result !== null ? String(result) : "";
              }
            } else if (el instanceof HTMLSelectElement) {
              const targetValue = result !== void 0 && result !== null ? String(result) : "";
              const options = Array.from(el.options);
              const found = options.some((opt) => opt.value === targetValue);
              if (found || targetValue === "") {
                if (el.value !== targetValue) {
                  el.value = targetValue;
                }
              }
            } else if (el instanceof HTMLTextAreaElement) {
              el.value = result !== void 0 && result !== null ? String(result) : "";
            } else {
              el.textContent = result !== void 0 && result !== null ? String(result) : "";
            }
          });
          cleanupFns.push(cleanup);
          const isLazy = el.hasAttribute("data-bind:lazy") || el.hasAttribute("data-bind.lazy");
          const eventName = isLazy ? "change" : el instanceof HTMLSelectElement || el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? "change" : "input";
          const inputHandler = (_e) => {
            let newValue;
            if (el instanceof HTMLInputElement && el.type === "checkbox") {
              newValue = el.checked;
            } else if (el instanceof HTMLInputElement && el.type === "radio") {
              newValue = target === "checked" ? el.checked : el.checked ? el.value : void 0;
              if (newValue === void 0)
                return;
            } else if (el instanceof HTMLSelectElement && el.multiple) {
              newValue = Array.from(el.selectedOptions).map((opt) => opt.value);
            } else if (el instanceof HTMLInputElement && (el.type === "range" || el.type === "number")) {
              newValue = el.value === "" ? "" : Number(el.value);
            } else if ("value" in el) {
              newValue = el.value;
            }
            const current = runtime.evaluate(el, value);
            if (current && typeof current === "object" && "value" in current) {
              runtime.evaluate(el, `${value}.value = $newValue`, { $newValue: newValue });
            } else {
              runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
            }
          };
          el.addEventListener(eventName, inputHandler);
          cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));
        } catch (e) {
          runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, `Auto-bind failed: ${value}`);
        }
        return () => cleanupFns.forEach((fn) => fn());
      }
      const attrs = allBindAttrs.filter((a) => a.name !== "data-bind");
      attrs.forEach((attr) => {
        const parsed = runtime.parseAttribute(attr.name, runtime, el);
        if (!parsed || !parsed.argument)
          return;
        const target2 = parsed.argument;
        if (target2 === "lazy")
          return;
        try {
          const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
            const result = runtime.evaluate(el, attr.value);
            const attrValue = result !== void 0 && result !== null ? String(result) : "";
            if (target2 === "value" || target2 === "checked") {
              if (el instanceof HTMLInputElement && el.type === "checkbox") {
                if (el.checked !== Boolean(result))
                  el.checked = Boolean(result);
              } else if (el instanceof HTMLInputElement && el.type === "radio") {
                if (target2 === "checked") {
                  if (el.checked !== Boolean(result))
                    el.checked = Boolean(result);
                } else {
                  if (el.value !== attrValue)
                    el.value = attrValue;
                }
              } else if ("value" in el) {
                if (el.value !== attrValue)
                  el.value = attrValue;
              }
            } else if (target2 === "text") {
              if (el.textContent !== attrValue)
                el.textContent = attrValue;
            } else if (target2 === "html") {
              if (el.innerHTML !== attrValue)
                el.innerHTML = attrValue;
            } else if (target2 === "style") {
              runtime.reconcileStyle(el, result);
            } else if (target2 === "draggable") {
              const newVal = result ? "true" : "false";
              if (el.getAttribute("draggable") !== newVal) {
                el.setAttribute("draggable", newVal);
              }
            } else {
              if (result === false || result === null || result === void 0) {
                if (el.hasAttribute(target2))
                  el.removeAttribute(target2);
              } else {
                if (el.getAttribute(target2) !== attrValue)
                  el.setAttribute(target2, attrValue);
              }
            }
          });
          cleanupFns.push(cleanup);
          if (target2 === "value" || target2 === "checked") {
            const isLazy = el.hasAttribute("data-bind:lazy") || el.hasAttribute("data-bind.lazy");
            const eventName = isLazy ? "change" : el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") || el instanceof HTMLSelectElement ? "change" : "input";
            const inputHandler = (e) => {
              let newValue;
              if (el instanceof HTMLInputElement && el.type === "checkbox") {
                newValue = el.checked;
              } else if (el instanceof HTMLInputElement && el.type === "radio") {
                newValue = el.checked ? el.value : void 0;
              } else if (el instanceof HTMLInputElement && (el.type === "range" || el.type === "number")) {
                const raw = e.target.value;
                newValue = raw === "" ? "" : Number(raw);
              } else {
                newValue = e.target.value;
              }
              runtime.evaluate(el, `${attr.value} = $newValue`, { $newValue: newValue });
            };
            el.addEventListener(eventName, inputHandler);
            cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));
          }
        } catch (e) {
          initError("bind", `Failed to bind ${target2}: ${e instanceof Error ? e.message : String(e)}`, el, value);
        }
      });
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var bind_default = bindModule;

  // src/modules/attributes/computed.ts
  var computed_exports = {};
  __export(computed_exports, {
    default: () => computed_default
  });
  var computedModule = {
    name: "computed",
    attribute: "computed",
    metadata: { after: ["signal"] },
    handle: (el, value, runtime) => {
      const computedCleanup = [];
      const { ghostKeys } = parseGhostKeys(value);
      const initialGhostState = {};
      ghostKeys.forEach((key) => initialGhostState[key] = void 0);
      const stateRef = unifiedRef(initialGhostState);
      const scopeId = el.id || `computed_${Math.random().toString(36).slice(2)}`;
      const isGlobal = el.hasAttribute("data-ux-init");
      if (el.hasAttribute("data-computed")) {
        const scopeProxy = createScopeProxy(stateRef);
        let addCleanup;
        if (!isGlobal) {
          addCleanup = addScopeToNode(el, scopeProxy);
          computedCleanup.push(addCleanup);
        }
        const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
          const computedDefs = runtime.evaluate(el, value || "{}");
          if (typeof computedDefs === "object" && computedDefs !== null) {
            Object.entries(computedDefs).forEach(([propName, getter]) => {
              if (typeof getter !== "function")
                return;
              const computedVal = unifiedComputed(() => {
                try {
                  return getter();
                } catch (e) {
                  if (runtime.isDevMode)
                    runtime.warn(`[Computed Error] Failed to evaluate getter for "${propName}":`, e);
                  return null;
                }
              }, propName);
              if (isGlobal || !addCleanup) {
                const stop2 = runtime.watch(computedVal, (val) => {
                  runtime.setGlobalSignal(propName, val);
                }, { immediate: true });
                computedCleanup.push(stop2);
              } else {
                const stop2 = runtime.watch(computedVal, (val) => {
                  stateRef.value[propName] = val;
                }, { immediate: true });
                computedCleanup.push(stop2);
              }
            });
          }
        });
        computedCleanup.push(effectCleanup);
      }
      const attrs = Array.from(el.attributes).filter((a) => a.name.startsWith("data-computed-"));
      if (attrs.length > 0) {
        const attrStateRef = unifiedRef({}, `computed_${scopeId}`);
        const scopeProxy = new Proxy({}, {
          has(_, key) {
            return Reflect.has(attrStateRef.value, key);
          },
          get(_, key) {
            return Reflect.get(attrStateRef.value, key);
          },
          set(_, key, value2) {
            return Reflect.set(attrStateRef.value, key, value2);
          },
          ownKeys() {
            return Reflect.ownKeys(attrStateRef.value);
          },
          getOwnPropertyDescriptor(_, key) {
            return Reflect.getOwnPropertyDescriptor(attrStateRef.value, key);
          }
        });
        let addCleanup;
        if (!isGlobal) {
          addCleanup = addScopeToNode(el, scopeProxy);
          computedCleanup.push(addCleanup);
        }
        attrs.forEach((attr) => {
          const propName = attr.name.substring("data-computed-".length);
          if (!propName)
            return;
          const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
            const expression = attr.value;
            const computedVal = runtime.computed(() => {
              try {
                return runtime.evaluate(el, expression);
              } catch (e) {
                if (runtime.isDevMode)
                  runtime.warn(`[Computed Error] Failed to evaluate expression for "${propName}":`, e);
                return null;
              }
            });
            if (isGlobal || !addCleanup) {
              const stop2 = runtime.watch(computedVal, (val) => {
                runtime.setGlobalSignal(propName, val);
              }, { immediate: true });
              computedCleanup.push(stop2);
            } else {
              const stop2 = runtime.watch(computedVal, (val) => {
                attrStateRef.value[propName] = val;
              }, { immediate: true });
              computedCleanup.push(stop2);
            }
          });
          computedCleanup.push(effectCleanup);
        });
      }
      return () => {
        computedCleanup.forEach((c) => c());
      };
    }
  };
  var computed_default = computedModule;

  // src/modules/attributes/on.ts
  var on_exports = {};
  __export(on_exports, {
    default: () => on_default
  });
  init_debug();
  var globalListeners = /* @__PURE__ */ new Map();
  var listenerIdCounter = 0;
  var NEXUS_ID = Symbol.for("_nx_id");
  var NON_BUBBLING_EVENTS = /* @__PURE__ */ new Set(["focus", "blur", "mouseenter", "mouseleave", "scroll", "load", "error"]);
  function getGlobalHandler(eventName) {
    return (e) => {
      const flatMap = globalListeners.get(eventName);
      if (!flatMap)
        return;
      const path = e.composedPath();
      for (const target2 of path) {
        if (e.cancelBubble)
          break;
        const nxId = target2[NEXUS_ID];
        if (nxId && flatMap.has(nxId)) {
          if (document.documentElement.hasAttribute("data-debug")) {
            console.log(`[Nexus Event] Triggering "${eventName}" for nxId: ${nxId} on <${target2.tagName}>`);
          }
          flatMap.get(nxId).forEach((fn) => fn(e));
        }
      }
    };
  }
  var onModule = {
    name: "on",
    attribute: "on",
    handle: (el, value, runtime) => {
      const attrs = matchAttributes(el, "on", value);
      const cleanupFns = [];
      attrs.forEach((attr) => {
        const parsed = runtime.parseAttribute(attr.name, runtime, el);
        if (!parsed || !parsed.argument)
          return;
        const eventName = parsed.argument;
        const modifiers = parsed.modifiers;
        try {
          let handler = (e) => {
            const detail = e.detail;
            const extras = {
              $evt: e,
              $detail: detail,
              $newValue: e.target?.value ?? e.target?.checked ?? detail
            };
            return runtime.evaluate(el, value, extras);
          };
          let target2 = el;
          let options = false;
          modifiers.forEach((mod) => {
            let modName = mod;
            let modArg = "";
            const dashIdx = mod.indexOf("-");
            if (dashIdx !== -1) {
              modName = mod.substring(0, dashIdx);
              modArg = mod.substring(dashIdx + 1);
            }
            if (modName === "window")
              target2 = window;
            else if (modName === "document")
              target2 = document;
            else if (modName === "passive")
              options = { passive: true };
            else if (modName === "capture")
              options = true;
            else {
              const modifierModule = runtime.getModifier(modName);
              if (modifierModule) {
                handler = modifierModule.handle(handler, el, modArg, runtime);
              }
            }
          });
          const forceDirect = target2 === window || target2 === document || NON_BUBBLING_EVENTS.has(eventName) || options !== false;
          if (eventName === "hover") {
            const enterHandler = (e) => {
              const extras = { $evt: e, $newValue: true, hovered: true };
              return runtime.evaluate(el, value, extras);
            };
            const leaveHandler = (e) => {
              const extras = { $evt: e, $newValue: false, hovered: false };
              return runtime.evaluate(el, value, extras);
            };
            el.addEventListener("mouseenter", enterHandler);
            el.addEventListener("mouseleave", leaveHandler);
            cleanupFns.push(() => {
              el.removeEventListener("mouseenter", enterHandler);
              el.removeEventListener("mouseleave", leaveHandler);
            });
            return;
          }
          if (forceDirect) {
            target2.addEventListener(eventName, handler, options);
            cleanupFns.push(() => target2.removeEventListener(eventName, handler, options));
            if (target2 === window && eventName === "load" && document.readyState === "complete") {
              queueMicrotask(() => handler(new Event("load")));
            } else if (target2 === document && eventName === "DOMContentLoaded" && (document.readyState === "interactive" || document.readyState === "complete")) {
              queueMicrotask(() => handler(new Event("DOMContentLoaded")));
            }
          } else {
            if (!globalListeners.has(eventName)) {
              globalListeners.set(eventName, /* @__PURE__ */ new Map());
              document.addEventListener(eventName, getGlobalHandler(eventName), { capture: false });
            }
            const flatMap = globalListeners.get(eventName);
            if (!target2[NEXUS_ID]) {
              target2[NEXUS_ID] = ++listenerIdCounter;
            }
            const nxId = target2[NEXUS_ID];
            let elementHandlers = flatMap.get(nxId);
            if (!elementHandlers) {
              elementHandlers = [];
              flatMap.set(nxId, elementHandlers);
            }
            elementHandlers.push(handler);
            cleanupFns.push(() => {
              const currentHandlers = flatMap.get(nxId);
              if (currentHandlers) {
                const idx = currentHandlers.indexOf(handler);
                if (idx > -1)
                  currentHandlers.splice(idx, 1);
                if (currentHandlers.length === 0) {
                  flatMap.delete(nxId);
                }
              }
            });
          }
        } catch (e) {
          initError("on", `Failed to attach listener ${eventName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
        }
      });
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var on_default = onModule;

  // src/modules/attributes/assert.ts
  var assert_exports = {};
  __export(assert_exports, {
    default: () => assert_default
  });
  init_debug();
  var assertModule = {
    name: "assert",
    attribute: "assert",
    handle: (el, value, runtime) => {
      try {
        const result = runtime.evaluate(el, value);
        if (!result) {
          const msg = `Assertion failed: "${value}" evaluated to falsy value based on ${result}`;
          console.error(msg, el);
          initError("assert", msg, el, value);
        }
      } catch (e) {
        initError("assert", `Assertion error: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var assert_default = assertModule;

  // src/modules/attributes/switcher.ts
  var switcher_exports = {};
  __export(switcher_exports, {
    default: () => switcher_default
  });
  init_debug();
  var switcherModule = {
    name: "switcher",
    attribute: "switcher",
    metadata: {
      after: ["for", "signal"]
    },
    handle: (el, expression, runtime) => {
      const attr = Array.from(el.attributes).find((a) => a.value === expression && a.name.startsWith("data-switcher"));
      if (attr && attr.name !== "data-switcher") {
        return;
      }
      runtime.log(`Nexus Switcher [${expression}]: Initializing on`, el);
      const optionsAttr = el.getAttribute("data-switcher-options");
      if (!optionsAttr) {
        initError("switcher", "Missing data-switcher-options attribute", el, expression);
        return;
      }
      const helpers = {
        $switch: () => {
          const items = runtime.evaluate(el, optionsAttr);
          const current = runtime.evaluate(el, expression);
          if (!Array.isArray(items)) {
            runtime.warn(`Nexus Switcher [${expression}]: Options "${optionsAttr}" is not an array`, items);
            return;
          }
          const idx = items.findIndex((item) => (item.id || item) === current);
          const nextIdx = (idx + 1) % items.length;
          const nextItem = items[nextIdx];
          const nextValue = nextItem.id || nextItem;
          runtime.log(`Nexus Switcher [${expression}]: Cycling ${current} -> ${nextValue}`);
          try {
            runtime.evaluate(el, `${expression} = ${JSON.stringify(nextValue)}`);
          } catch (e) {
            console.error("Nexus Switcher: Failed to update signal", expression, e);
          }
        },
        $isActive: (id) => {
          const current = runtime.evaluate(el, expression);
          const isActive = current === id;
          return isActive;
        },
        get $activeItem() {
          const items = runtime.evaluate(el, optionsAttr);
          const current = runtime.evaluate(el, expression);
          if (!Array.isArray(items))
            return null;
          return items.find((item) => (item.id || item) === current) || null;
        }
      };
      runtime.log(`Nexus Switcher [${expression}]: Injecting helpers on`, el);
      addScopeToNode(el, helpers);
      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const currentVal = runtime.evaluate(el, expression);
          const items = runtime.evaluate(el, optionsAttr);
          runtime.log(`Nexus Switcher [${expression}]: Active state changed to:`, currentVal, "options:", items);
          Array.from(el.children).forEach((child) => {
            if (child instanceof HTMLElement) {
              child.classList.add("switcher-transitioning");
              const onEnd = () => {
                child.classList.remove("switcher-transitioning");
                child.removeEventListener("transitionend", onEnd);
                clearTimeout(fallback);
              };
              child.addEventListener("transitionend", onEnd, { once: true });
              const fallback = setTimeout(onEnd, 1e3);
            }
          });
        });
        return cleanup;
      } catch (e) {
        initError("switcher", `Failed to initialize switcher: ${e instanceof Error ? e.message : String(e)}`, el, expression);
      }
    }
  };
  var switcher_default = switcherModule;

  // src/modules/attributes/import.ts
  var import_exports = {};
  __export(import_exports, {
    default: () => import_default
  });
  init_debug();

  // src/engine/utils/idb.ts
  var DB_NAME = "nexus-store";
  var DEFAULT_STORES = ["files", "builds", "patterns", "components", "themes"];
  async function openDB(version) {
    return new Promise((resolve, reject) => {
      const request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        DEFAULT_STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store);
          }
        });
      };
    });
  }
  async function readIDB(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        db.close();
        resolve(getReq.result);
      };
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
    });
  }
  async function writeIDB(storeName, key, data) {
    let db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) {
      const nextVersion = db.version + 1;
      db.close();
      db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, nextVersion);
        req.onupgradeneeded = (e) => {
          const udb = e.target.result;
          if (!udb.objectStoreNames.contains(storeName)) {
            udb.createObjectStore(storeName);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put(data, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  // src/modules/attributes/import.ts
  async function readFromIDB(key) {
    const storeName = key.split("/")[0] || "files";
    const result = await readIDB(storeName, key);
    if (!result)
      return null;
    if (typeof result === "string")
      return result;
    if (result.data && typeof result.data === "string")
      return result.data;
    if (result.data instanceof ArrayBuffer)
      return new TextDecoder().decode(result.data);
    return null;
  }
  var assetCache = /* @__PURE__ */ new Map();
  function isVFSUri(str) {
    return /^(idb|fs|https?|wss?):\/\//.test(str);
  }
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 3e3 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }
  async function resolveContent(uri) {
    if (isVFSUri(uri) && uri.startsWith("idb://")) {
      const key = uri.replace(/^idb:\/\//, "");
      return readFromIDB(key);
    }
    const cached = assetCache.get(uri);
    if (cached)
      return cached;
    try {
      const response = await fetchWithTimeout(uri, { mode: "cors", timeout: 3e3 });
      if (!response.ok)
        return null;
      const text = await response.text();
      assetCache.set(uri, text);
      return text;
    } catch {
      return null;
    }
  }
  function parseInlineAttrs(raw) {
    const attrs = {};
    const regex = /([a-z-]+)=["']([^"']+)["']/gi;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }
  function applyAttributes(el, attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "content" || key === "innerText" || key === "textContent" || key === "href" || key === "src")
        return;
      if (value === true)
        el.setAttribute(key, "");
      else if (value === false)
        el.removeAttribute(key);
      else
        el.setAttribute(key, String(value));
    });
  }
  async function importLink(id, payload, cleanupFns, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks = items.map(async (item) => {
      let attrs;
      if (typeof item === "string") {
        const parsed = parseInlineAttrs(item);
        attrs = parsed.href ? parsed : { href: item, rel: "stylesheet" };
      } else {
        attrs = item;
      }
      const href = attrs.href;
      if (!href)
        return;
      if (attrs.rel === "stylesheet" || !attrs.rel) {
        const cssText = await resolveContent(href);
        if (cssText) {
          const cleanup = await stylesheet.adoptRawCSS(cssText, `import-${id}-${href}`);
          cleanupFns.push(cleanup);
          runtime.log(`Nexus Import [${id}]: CSS adopted (raw): ${href}`);
          return;
        }
      }
      await new Promise((resolve) => {
        const link = document.createElement("link");
        applyAttributes(link, attrs);
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => {
          reportError(new Error(`Nexus Import: Failed to load ${href}`), el);
          resolve();
        };
        document.head.appendChild(link);
        cleanupFns.push(() => link.remove());
        runtime.log(`Nexus Import [${id}]: Link tag injected: ${href}`);
      });
    });
    await Promise.all(tasks);
  }
  async function importAdopt(id, payload, cleanupFns, runtime, _el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks = items.map(async (item) => {
      let href;
      if (typeof item === "string") {
        href = item;
      } else {
        href = item.href;
      }
      if (!href)
        return;
      const cssText = await resolveContent(href);
      if (!cssText)
        return;
      const cleanup = await stylesheet.adoptRawCSS(cssText, `import-adopt-${id}-${href}`);
      cleanupFns.push(cleanup);
      runtime.log(`Nexus Import [${id}]: CSS adopted (constructable): ${href}`);
    });
    await Promise.all(tasks);
  }
  async function importScript(id, payload, cleanupFns, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks = items.map(async (item) => {
      let attrs = typeof item === "string" ? { src: item } : item;
      if (typeof item === "string" && !attrs.src) {
        attrs = parseInlineAttrs(item);
        if (!attrs.src)
          attrs = { src: item };
      }
      const src = attrs.src;
      if (!src)
        return;
      let finalSrc = src;
      if (src.startsWith("idb://")) {
        const content = await resolveContent(src);
        if (content) {
          const blob = new Blob([content], { type: attrs.type || "text/javascript" });
          const url = URL.createObjectURL(blob);
          finalSrc = url;
          cleanupFns.push(() => URL.revokeObjectURL(url));
        }
      }
      if (src.includes("tailwindcss/browser") && !document.querySelector("style[data-nexus-tailwind-bridge]")) {
        const tokens = discoverColorTokens();
        const bridge = buildTailwindThemeBridge(tokens);
        if (bridge) {
          const bridgeStyle = document.createElement("style");
          bridgeStyle.setAttribute("type", "text/tailwindcss");
          bridgeStyle.setAttribute("data-nexus-tailwind-bridge", "");
          bridgeStyle.textContent = bridge;
          document.head.appendChild(bridgeStyle);
          cleanupFns.push(() => bridgeStyle.remove());
          runtime.log(`Nexus Import [${id}]: Tailwind theme bridge injected (${tokens.size} color tokens discovered)`);
        }
      }
      await new Promise((resolve) => {
        const script = document.createElement("script");
        applyAttributes(script, attrs);
        script.onload = () => resolve();
        script.onerror = () => {
          reportError(new Error(`Nexus Import: Failed to load script ${src}`), el);
          resolve();
        };
        script.src = finalSrc;
        document.head.appendChild(script);
        cleanupFns.push(() => script.remove());
        runtime.log(`Nexus Import [${id}]: Script injected: ${src}`);
      });
    });
    await Promise.all(tasks);
  }
  async function importStyle(id, payload, cleanupFns, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks = items.map(async (item) => {
      const attrs = typeof item === "string" ? { content: item } : item;
      const content = attrs.content || (typeof item === "string" ? item : "");
      if (!content && !attrs.href)
        return;
      if (attrs.href) {
        await importLink(id, attrs, cleanupFns, runtime, el);
        return;
      }
      const cssText = isVFSUri(content) ? await resolveContent(content) : content;
      if (!cssText)
        return;
      const cleanup = await stylesheet.adoptCSS(cssText, `import-style-${id}`);
      cleanupFns.push(cleanup);
      runtime.log(`Nexus Import [${id}]: Style adopted (ZCZS)`);
    });
    await Promise.all(tasks);
  }
  async function importPattern(id, uri, el, item, cleanupFns, runtime) {
    const content = await resolveContent(uri);
    if (!content)
      throw new Error(`Pattern not found: ${uri}`);
    const target2 = item.target ? el.querySelector(item.target) || el : el;
    const position = item.position || "append";
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-import-pattern", id);
    wrapper.innerHTML = content;
    switch (position) {
      case "replace":
        target2.innerHTML = "";
        target2.appendChild(wrapper);
        break;
      case "prepend":
        target2.insertBefore(wrapper, target2.firstChild);
        break;
      case "append":
        target2.appendChild(wrapper);
        break;
      case "before":
        target2.parentElement?.insertBefore(wrapper, target2);
        break;
      case "after":
        target2.parentElement?.insertBefore(wrapper, target2.nextSibling);
        break;
    }
    cleanupFns.push(() => wrapper.remove());
    runtime.log(`Nexus Import [${id}]: Pattern loaded from ${uri}`);
  }
  async function importComponent(id, uri, cleanupFns, runtime) {
    const content = await resolveContent(uri);
    if (!content)
      throw new Error(`Component template not found: ${uri}`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const templates = doc.querySelectorAll("template[data-component-name]");
    if (templates.length > 0) {
      templates.forEach((template) => {
        const name = template.getAttribute("data-component-name");
        const templateEl = document.createElement("template");
        templateEl.id = `component-${name}`;
        templateEl.innerHTML = template.innerHTML;
        document.body.appendChild(templateEl);
        cleanupFns.push(() => templateEl.remove());
        runtime.log(`Nexus Import [${id}]: Component "${name}" registered from ${uri}`);
      });
    } else {
      const templateEl = document.createElement("template");
      templateEl.id = `component-${id}`;
      templateEl.innerHTML = content;
      document.body.appendChild(templateEl);
      cleanupFns.push(() => templateEl.remove());
      runtime.log(`Nexus Import [${id}]: Component registered from ${uri}`);
    }
  }
  if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.setAttribute("data-nexus-fouc", "");
    style.textContent = `
    /* FOUC guard: keep the document hidden until Nexus-UX has adopted the
       external stylesheets declared via [data-import]. The gate is released
       (nexus-ready / nexus-loading removed) only after imports resolve. */
    html.nexus-loading,
    [data-nexus-loading],
    [data-import]:not(.nexus-ready),
    body[data-nexus-fouc-pending] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
    document.head.appendChild(style);
  }
  var importModule = {
    name: "import",
    attribute: "import",
    handle: (el, expression, runtime) => {
      let activeCleanup = null;
      let lastConfigStr = "";
      const stopEffect = runtime.effect(() => {
        const attrExpr = el.getAttribute("data-import") || expression;
        const config = runtime.evaluate(el, attrExpr);
        const configStr = JSON.stringify(config);
        if (configStr === lastConfigStr)
          return;
        lastConfigStr = configStr;
        if (activeCleanup) {
          activeCleanup();
          activeCleanup = null;
        }
        const finalize = () => {
          el.classList.remove("nexus-loading");
          el.classList.add("nexus-ready");
          el.removeAttribute("data-nexus-loading");
          el.setAttribute("data-nexus-ready", "");
          runtime.log(`Nexus Import: Assets synchronized.`);
          markExternalStylesSettled();
        };
        el.classList.add("nexus-loading");
        el.setAttribute("data-nexus-loading", "");
        if (!config || typeof config !== "object") {
          finalize();
          return;
        }
        const ids = Object.keys(config);
        if (ids.length === 0) {
          finalize();
          return;
        }
        const iterationCleanupFns = [];
        activeCleanup = () => iterationCleanupFns.forEach((fn) => fn());
        const runImports = async () => {
          const tasks = ids.map(async (id) => {
            const item = config[id];
            try {
              const itemTasks = [];
              if (item.link) {
                itemTasks.push(importLink(id, item.link, iterationCleanupFns, runtime, el));
              }
              if (item.adopt) {
                itemTasks.push(importAdopt(id, item.adopt, iterationCleanupFns, runtime, el));
              }
              if (item.script) {
                itemTasks.push(importScript(id, item.script, iterationCleanupFns, runtime, el));
              }
              const stylePayload = item.style || item.theme;
              if (stylePayload) {
                itemTasks.push(importStyle(id, stylePayload, iterationCleanupFns, runtime, el));
              }
              if (item.pattern)
                itemTasks.push(importPattern(id, item.pattern, el, item, iterationCleanupFns, runtime));
              if (item.component)
                itemTasks.push(importComponent(id, item.component, iterationCleanupFns, runtime));
              await Promise.all(itemTasks);
            } catch (e) {
              reportError(new Error(`Nexus Import [${id}]: Error ${e}`), el);
            }
          });
          await Promise.all(tasks);
        };
        runImports().then(finalize);
      });
      return () => {
        stopEffect();
        if (activeCleanup)
          activeCleanup();
      };
    }
  };
  var import_default = importModule;

  // src/modules/attributes/if.ts
  var if_exports = {};
  __export(if_exports, {
    default: () => if_default
  });
  init_debug();
  init_consts();
  function teardownTree(node) {
    if (!(node instanceof HTMLElement))
      return;
    const children = Array.from(node.childNodes);
    for (const child of children)
      teardownTree(child);
    const enhanced = node;
    const removals = enhanced[CLEANUP_FUNCTIONS_KEY];
    if (removals) {
      removals.forEach((c) => {
        try {
          c();
        } catch {
        }
      });
      delete enhanced[CLEANUP_FUNCTIONS_KEY];
    }
    delete enhanced[MARKER_KEY];
  }
  var ifModule = {
    name: "if",
    attribute: "if",
    handle: (el, value, runtime) => {
      const parent = el.parentNode;
      if (!parent || parent instanceof DocumentFragment)
        return;
      const anchor = document.createComment(` if: ${value} `);
      parent.insertBefore(anchor, el);
      const isTemplate = el instanceof HTMLTemplateElement;
      const blueprint = isTemplate ? el.content : el;
      if (!isTemplate) {
        el.style.display = "none";
        el.setAttribute("data-ux-template", "true");
      }
      let currentNodes = [];
      let isMounted = false;
      const disposeNodes = (nodes) => {
        nodes.forEach((n) => {
          teardownTree(n);
          n.parentNode?.removeChild(n);
        });
      };
      const mount = () => {
        const clone = blueprint.cloneNode(true);
        if (clone instanceof HTMLElement) {
          clone.removeAttribute("data-if");
          clone.removeAttribute("data-ux-template");
          clone.style.removeProperty("display");
          currentNodes = [clone];
        } else {
          currentNodes = Array.from(clone.childNodes);
        }
        currentNodes.forEach((n) => {
          anchor.parentNode?.insertBefore(n, anchor);
          if (n instanceof HTMLElement)
            runtime.processElement(n);
        });
      };
      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const condition = Boolean(runtime.evaluate(el, value));
          if (condition) {
            if (!isMounted) {
              mount();
              isMounted = true;
            }
          } else {
            if (isMounted) {
              disposeNodes(currentNodes);
              currentNodes = [];
              isMounted = false;
            }
          }
        });
        return () => {
          cleanup();
          disposeNodes(currentNodes);
          currentNodes = [];
          if (anchor.parentNode)
            anchor.remove();
        };
      } catch (e) {
        initError("if", `Failed to initialize if: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var if_default = ifModule;

  // src/modules/attributes/effect.ts
  var effect_exports = {};
  __export(effect_exports, {
    default: () => effect_default
  });
  init_debug();
  var effectModule = {
    name: "effect",
    attribute: "effect",
    handle: (el, value, runtime) => {
      try {
        let isEvaluating = false;
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          if (isEvaluating)
            return;
          isEvaluating = true;
          try {
            runtime.evaluate(el, value);
          } finally {
            isEvaluating = false;
          }
        });
        return cleanup;
      } catch (e) {
        initError("effect", `Failed to run effect: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var effect_default = effectModule;

  // src/modules/attributes/component.ts
  var component_exports = {};
  __export(component_exports, {
    default: () => component_default
  });
  init_consts();
  init_debug();
  function createInheritedShadowScope(host, ctx) {
    return new Proxy(ctx, {
      has(target2, key) {
        if (key in target2)
          return true;
        return getDataStack(host).some((scope) => key in scope);
      },
      get(target2, key) {
        if (key in target2)
          return Reflect.get(target2, key);
        const stack = getDataStack(host);
        for (const scope of stack) {
          if (key in scope)
            return scope[key];
        }
        return void 0;
      },
      set(target2, key, value) {
        const stack = getDataStack(host);
        for (const scope of stack) {
          if (key in scope) {
            scope[key] = value;
            return true;
          }
        }
        return Reflect.set(target2, key, value);
      },
      ownKeys(target2) {
        const keys = new Set(Reflect.ownKeys(target2));
        for (const scope of getDataStack(host)) {
          for (const k of Object.keys(scope))
            keys.add(k);
        }
        return Array.from(keys);
      },
      getOwnPropertyDescriptor(target2, key) {
        if (key in target2)
          return Reflect.getOwnPropertyDescriptor(target2, key);
        for (const scope of getDataStack(host)) {
          if (key in scope) {
            return { configurable: true, enumerable: true, writable: true, value: scope[key] };
          }
        }
        return void 0;
      }
    });
  }
  var componentModule = {
    name: "component",
    attribute: "component",
    handle: (el, value, runtime) => {
      try {
        if (el.hasAttribute("data-route"))
          return;
        const componentState = runtime.reactive({
          isConnected: false,
          isLoading: false,
          hasError: false,
          errorMessage: "",
          templateContent: ""
        });
        const ctx = {
          element: el,
          ...componentState
        };
        el[COMPONENT_CONTEXT_KEY] = ctx;
        addScopeToNode(el, ctx);
        let __lastPath;
        runtime.effect(() => {
          let config;
          const evaluated = runtime.evaluate(el, value);
          if (typeof evaluated === "object" && evaluated !== null) {
            config = evaluated;
          } else if (typeof evaluated === "string") {
            try {
              config = JSON.parse(evaluated);
            } catch {
              config = { path: evaluated };
            }
          } else {
            return;
          }
          if (!config.path || config.path === "none")
            return;
          if (config.path === __lastPath)
            return;
          __lastPath = config.path;
          const load = async () => {
            componentState.isLoading = true;
            componentState.hasError = false;
            try {
              let html = "";
              if (config.path.trim().startsWith("<")) {
                html = config.path;
              } else if (config.path.startsWith("#")) {
                const template = document.querySelector(config.path);
                if (!template)
                  throw new Error(`Template ${config.path} not found`);
                html = template.innerHTML;
              } else {
                if (!runtime.fetch)
                  throw new Error("Fetch utility not available");
                html = await runtime.fetch.request(config.path, { responseType: "text" }, el);
              }
              if (runtime.isDevMode)
                console.log(`[Component] Template loaded for <${el.tagName}>, length: ${html.length}`);
              componentState.templateContent = html;
              if (config.shadowrootmode) {
                if (!el.shadowRoot)
                  el.attachShadow({ mode: config.shadowrootmode });
                const shadow = el.shadowRoot;
                const scopeExpr = el.getAttribute("data-scope");
                let shadowScope;
                if (scopeExpr && scopeExpr.trim()) {
                  const declared = runtime.evaluate(el, scopeExpr);
                  const declaredObj = declared && typeof declared === "object" ? declared : {};
                  shadowScope = Object.assign(/* @__PURE__ */ Object.create(null), ctx, declaredObj);
                } else {
                  shadowScope = createInheritedShadowScope(el, ctx);
                }
                shadow[DATA_STACK_KEY] = [shadowScope];
                runtime.morphDOM(shadow, html);
                Array.from(shadow.children).forEach((child) => {
                  if (child instanceof HTMLElement || child instanceof SVGElement) {
                    runtime.processElement(child);
                  }
                });
              } else {
                runtime.morphDOM(el, html);
                Array.from(el.children).forEach((child) => {
                  if (child instanceof HTMLElement || child instanceof SVGElement) {
                    runtime.processElement(child);
                  }
                });
                runtime.processElement(el);
              }
            } catch (e) {
              componentState.hasError = true;
              componentState.errorMessage = e instanceof Error ? e.message : String(e);
              initError("component", componentState.errorMessage, el, value);
              if (config.fallback) {
                const fb = runtime.evaluate(el, config.fallback);
                runtime.morphDOM(el, String(fb));
              }
            } finally {
              componentState.isLoading = false;
            }
          };
          if (!config.lazy) {
            load();
          } else {
            load();
          }
        });
        return () => {
        };
      } catch (e) {
        initError("component", `Failed to init component: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var component_default = componentModule;

  // src/modules/attributes/flow.ts
  var flow_exports = {};
  __export(flow_exports, {
    default: () => flow_default,
    flowAttribute: () => flowAttribute,
    flowEdgesAttribute: () => flowEdgesAttribute,
    flowHandleAttribute: () => flowHandleAttribute,
    flowNodeAttribute: () => flowNodeAttribute
  });
  var SVG_NS = "http://www.w3.org/2000/svg";
  var MIN_ZOOM = 0.2;
  var MAX_ZOOM = 4;
  var NO_PAN = "[data-flow-node],[data-flow-handle],[data-flow-nodrag],button,a,input,textarea,select,label";
  var sharedViewport = (el) => {
    const flow = el?.closest("[data-flow]");
    const vp = flow?.__nexusFlowViewport;
    return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
  };
  var flowAttribute = {
    name: "flow",
    attribute: "flow",
    handle: (element, value, runtime) => {
      const evaluated = runtime.evaluate(element, value);
      const isViewport = evaluated && typeof evaluated === "object" && !Array.isArray(evaluated) && ("zoom" in evaluated || "x" in evaluated || "y" in evaluated);
      const state = isViewport ? evaluated : reactive({ x: 0, y: 0, zoom: 1 });
      if (state.zoom === void 0)
        state.zoom = 1;
      if (state.x === void 0)
        state.x = 0;
      if (state.y === void 0)
        state.y = 0;
      element.__nexusFlowViewport = state;
      element.classList.add("nexus-flow", "nexus-flow-pane");
      const gridAttr = element.getAttribute("data-flow-grid");
      const gridSize = gridAttr !== null ? parseFloat(gridAttr) || 0 : 0;
      let isPanning = false;
      let startX = 0;
      let startY = 0;
      const canPan = (e) => {
        if (e.button === 1)
          return true;
        if (e.button === 0 && e.altKey)
          return true;
        if (e.button === 0)
          return !e.target.closest(NO_PAN);
        return false;
      };
      const onPointerDown = (e) => {
        if (!canPan(e))
          return;
        isPanning = true;
        startX = e.clientX - state.x;
        startY = e.clientY - state.y;
        element.setPointerCapture(e.pointerId);
        element.style.cursor = "grabbing";
      };
      const onPointerMove = (e) => {
        if (!isPanning)
          return;
        state.x = e.clientX - startX;
        state.y = e.clientY - startY;
      };
      const onPointerUp = (e) => {
        if (!isPanning)
          return;
        isPanning = false;
        try {
          element.releasePointerCapture(e.pointerId);
        } catch {
        }
        element.style.cursor = "";
      };
      const onWheel = (e) => {
        e.preventDefault();
        const rect = element.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 15e-4);
        const prevZoom = state.zoom || 1;
        const nextZoom = Math.min(Math.max(prevZoom * factor, MIN_ZOOM), MAX_ZOOM);
        if (nextZoom === prevZoom)
          return;
        const fx = (px - state.x) / prevZoom;
        const fy = (py - state.y) / prevZoom;
        state.x = px - fx * nextZoom;
        state.y = py - fy * nextZoom;
        state.zoom = nextZoom;
      };
      element.addEventListener("pointerdown", onPointerDown);
      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerup", onPointerUp);
      element.addEventListener("wheel", onWheel, { passive: false });
      if (state.tick === void 0)
        state.tick = 0;
      let settleFrames = 0;
      const settle = () => {
        state.tick++;
        if (++settleFrames < 24)
          requestAnimationFrame(settle);
        else if (settleFrames === 24)
          setTimeout(() => state.tick++, 350);
      };
      requestAnimationFrame(settle);
      let ro = null;
      if (typeof ResizeObserver !== "undefined") {
        const contentEl = element.querySelector(".nexus-flow-content");
        if (contentEl) {
          ro = new ResizeObserver(() => {
            state.tick++;
          });
          ro.observe(contentEl);
        }
      }
      const stop2 = runtime.effect(() => {
        const zoom = state.zoom || 1;
        const x = state.x || 0;
        const y = state.y || 0;
        const content = element.querySelector(".nexus-flow-content") || element;
        content.classList.add("nexus-flow-viewport");
        content.style.transformOrigin = "0 0";
        content.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
        if (gridSize > 0 && element.style.backgroundImage) {
          const scaled = gridSize * zoom;
          element.style.backgroundSize = `${scaled}px ${scaled}px`;
          element.style.backgroundPosition = `${x}px ${y}px`;
        }
      });
      return () => {
        stop2();
        if (ro)
          ro.disconnect();
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("wheel", onWheel);
        delete element.__nexusFlowViewport;
      };
    }
  };
  var flowNodeAttribute = {
    name: "flowNode",
    attribute: "flow-node",
    handle: (element, value, runtime) => {
      const nodeState = runtime.evaluate(element, value);
      if (!nodeState || typeof nodeState !== "object")
        return;
      const readPos = () => {
        const p = nodeState.position;
        return p ? { x: p.x || 0, y: p.y || 0 } : { x: nodeState.x || 0, y: nodeState.y || 0 };
      };
      const writePos = (x, y) => {
        if (nodeState.position) {
          nodeState.position.x = x;
          nodeState.position.y = y;
        } else {
          nodeState.x = x;
          nodeState.y = y;
        }
      };
      const resolveSnap = () => {
        const local = element.getAttribute("data-flow-snap");
        if (local !== null)
          return parseFloat(local) || 0;
        const flowEl = element.closest("[data-flow]");
        const grid = flowEl?.getAttribute("data-flow-grid");
        if (grid !== null && grid !== void 0)
          return parseFloat(grid) || 0;
        return 0;
      };
      const snapPoint = (x, y, s) => s > 0 ? { x: Math.round(x / s) * s, y: Math.round(y / s) * s } : { x, y };
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let initialX = 0;
      let initialY = 0;
      const onPointerDown = (e) => {
        if (e.button !== 0 || e.altKey)
          return;
        if (e.target.closest(
          "[data-flow-handle],[data-flow-nodrag],button,a,input,textarea,select,label"
        ))
          return;
        e.stopPropagation();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const p = readPos();
        initialX = p.x;
        initialY = p.y;
        element.setPointerCapture(e.pointerId);
        element.style.zIndex = "1000";
      };
      const onPointerMove = (e) => {
        if (!isDragging)
          return;
        const zoom = sharedViewport(element).zoom;
        const dx = (e.clientX - dragStartX) / zoom;
        const dy = (e.clientY - dragStartY) / zoom;
        const snapped = snapPoint(initialX + dx, initialY + dy, resolveSnap());
        writePos(snapped.x, snapped.y);
      };
      const onPointerUp = (e) => {
        if (!isDragging)
          return;
        isDragging = false;
        try {
          element.releasePointerCapture(e.pointerId);
        } catch {
        }
        element.style.zIndex = "";
      };
      element.addEventListener("pointerdown", onPointerDown);
      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerup", onPointerUp);
      const stop2 = runtime.effect(() => {
        element.style.position = "absolute";
        element.style.left = "0";
        element.style.top = "0";
        const p = readPos();
        const s = snapPoint(p.x, p.y, resolveSnap());
        element.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      });
      return () => {
        stop2();
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", onPointerUp);
      };
    }
  };
  var flowHandleAttribute = {
    name: "flowHandle",
    attribute: "flow-handle",
    handle: (element, value, runtime) => {
      let kind = "source";
      const raw = value.trim();
      if (raw === "source" || raw === "target") {
        kind = raw;
      } else if (raw) {
        try {
          const resolved = runtime.evaluate(element, raw);
          if (resolved === "source" || resolved === "target")
            kind = resolved;
        } catch {
        }
      }
      element.setAttribute("data-nexus-flow-handle", kind);
      element.classList.add("nexus-flow-handle");
      const viewport = () => element.closest("[data-flow]");
      const toFlow = (clientX, clientY) => {
        const vp = viewport();
        const st = sharedViewport(element);
        const r = vp.getBoundingClientRect();
        return { x: (clientX - r.left - st.x) / st.zoom, y: (clientY - r.top - st.y) / st.zoom };
      };
      const anchorFlow = (el) => {
        const r = el.getBoundingClientRect();
        return toFlow(r.left + r.width / 2, r.top + r.height / 2);
      };
      const edgesArray = () => {
        const vp = viewport();
        if (!vp)
          return null;
        const svg = vp.querySelector("[data-flow-edges]");
        const expr = svg?.getAttribute("data-nexus-flow-edges-expr") || svg?.getAttribute("data-flow-edges") || "edges";
        try {
          const arr = runtime.evaluate(vp, expr);
          return Array.isArray(arr) ? arr : null;
        } catch {
          return null;
        }
      };
      const onPointerDown = (e) => {
        if (e.button !== 0)
          return;
        e.stopPropagation();
        e.preventDefault();
        const vp = viewport();
        const svg = vp?.querySelector("[data-flow-edges]");
        if (!vp || !svg)
          return;
        const srcNode = element.closest("[data-flow-node]");
        const srcId = srcNode?.id || srcNode?.getAttribute("data-bind-id") || element.id || "";
        const start = anchorFlow(element);
        const preview = document.createElementNS(SVG_NS, "path");
        preview.setAttribute("class", "nexus-flow-edge nexus-flow-edge-preview");
        preview.setAttribute("fill", "none");
        preview.setAttribute("stroke", "currentColor");
        preview.setAttribute("stroke-width", "2");
        preview.setAttribute("stroke-dasharray", "4 4");
        preview.style.pointerEvents = "none";
        svg.appendChild(preview);
        const move = (ev) => {
          const pt = toFlow(ev.clientX, ev.clientY);
          const dx = Math.abs(start.x - pt.x) / 2;
          preview.setAttribute(
            "d",
            `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${pt.x - dx} ${pt.y}, ${pt.x} ${pt.y}`
          );
        };
        const up = (ev) => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
          preview.remove();
          const target2 = document.elementFromPoint(ev.clientX, ev.clientY);
          const targetNode = target2?.closest("[data-flow-node]");
          const tgtId = targetNode?.id || targetNode?.getAttribute("data-bind-id") || "";
          if (tgtId && tgtId !== srcId) {
            const edges = edgesArray();
            if (edges && !edges.some((ed) => ed.source === srcId && ed.target === tgtId)) {
              edges.push({ source: srcId, target: tgtId });
            }
          }
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      };
      element.addEventListener("pointerdown", onPointerDown);
      return () => {
        element.removeEventListener("pointerdown", onPointerDown);
      };
    }
  };
  var flowEdgesAttribute = {
    name: "flowEdges",
    attribute: "flow-edges",
    handle: (element, value) => {
      const expr = value.trim() || "edges";
      element.setAttribute("data-nexus-flow-edges-expr", expr);
      element.classList.add("nexus-flow-edges", "absolute", "inset-0", "overflow-visible", "pointer-events-none");
      const flowEl = element.closest("[data-flow]");
      const content = flowEl?.querySelector(".nexus-flow-content");
      if (content && element.parentElement !== content) {
        content.appendChild(element);
      }
      return () => {
        element.removeAttribute("data-nexus-flow-edges-expr");
      };
    }
  };
  var flow_default = flowAttribute;

  // src/modules/attributes/for.ts
  var for_exports = {};
  __export(for_exports, {
    default: () => for_default
  });
  init_debug();
  init_consts();
  var isFlowNode = (n) => n instanceof HTMLElement || n instanceof SVGElement;
  function copyNexusMetadata(src, dest) {
    const srcClasses = nexusClassMap.get(src);
    if (srcClasses) {
      nexusClassMap.set(dest, new Set(srcClasses));
    }
    const srcStyles = nexusStyleMap.get(src);
    if (srcStyles) {
      nexusStyleMap.set(dest, new Set(srcStyles));
    }
    const srcChildren = Array.from(src.children);
    const destChildren = Array.from(dest.children);
    for (let i = 0; i < srcChildren.length; i++) {
      if (srcChildren[i] && destChildren[i]) {
        copyNexusMetadata(srcChildren[i], destChildren[i]);
      }
    }
  }
  var forModule = {
    name: "for",
    attribute: "for",
    handle: (el, value, runtime) => {
      const isTemplate = el instanceof HTMLTemplateElement;
      const blueprint = isTemplate ? el.content : el;
      let itemKey = "";
      let indexKey = void 0;
      let itemsExpr = "";
      const inIdx = value.indexOf(" in ");
      if (inIdx === -1) {
        initError("for", `Invalid syntax: ${value}. Expected "item in items"`, el, value);
        return;
      }
      const lhs = value.substring(0, inIdx).trim();
      itemsExpr = value.substring(inIdx + 4).trim();
      if (lhs.startsWith("(") && lhs.endsWith(")")) {
        const inner = lhs.substring(1, lhs.length - 1);
        const commaIdx = inner.indexOf(",");
        if (commaIdx !== -1) {
          itemKey = inner.substring(0, commaIdx).trim();
          indexKey = inner.substring(commaIdx + 1).trim();
        } else {
          itemKey = inner.trim();
        }
      } else {
        itemKey = lhs;
      }
      const anchor = document.createComment(` for: ${value} `);
      el.parentNode?.insertBefore(anchor, el);
      if (!isTemplate) {
        el.style.display = "none";
        el.setAttribute("data-ux-template", "true");
      }
      const disposeNodes = (nodes) => {
        nodes.forEach((n) => {
          if (n instanceof HTMLElement || n instanceof SVGElement) {
            const enhanced = n;
            const elRemovals = enhanced[CLEANUP_FUNCTIONS_KEY];
            if (elRemovals) {
              elRemovals.forEach((cleanup) => cleanup());
              delete enhanced[CLEANUP_FUNCTIONS_KEY];
            }
            disposeNodes(Array.from(n.childNodes));
          }
          n.parentNode?.removeChild(n);
        });
      };
      const mountedMap = /* @__PURE__ */ new Map();
      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const items = runtime.evaluate(el, itemsExpr);
          if (!Array.isArray(items))
            return;
          const currentKeys = /* @__PURE__ */ new Set();
          const nextNodes = [];
          items.forEach((item, index) => {
            const key = item.id ?? index;
            currentKeys.add(key);
            let nodes = mountedMap.get(key);
            if (!nodes) {
              const clone = isTemplate ? blueprint.cloneNode(true) : blueprint.cloneNode(true);
              if (!isTemplate) {
                copyNexusMetadata(blueprint, clone);
              } else {
                const srcChildren = Array.from(blueprint.childNodes).filter((n) => n instanceof HTMLElement);
                const destChildren = Array.from(clone.childNodes).filter((n) => n instanceof HTMLElement);
                for (let i = 0; i < srcChildren.length; i++) {
                  if (srcChildren[i] && destChildren[i]) {
                    copyNexusMetadata(srcChildren[i], destChildren[i]);
                  }
                }
              }
              nodes = isTemplate ? Array.from(clone.childNodes).filter(isFlowNode) : [clone];
              nodes.forEach((n) => {
                if (isFlowNode(n)) {
                  const scope = { [itemKey]: item };
                  if (indexKey)
                    scope[indexKey] = index;
                  addScopeToNode(n, runtime.shallowReactive(scope), el);
                  if (!isTemplate) {
                    n.style.display = "";
                    n.removeAttribute("data-for");
                    n.removeAttribute("data-ux-template");
                  }
                  runtime.processElement(n);
                }
              });
              mountedMap.set(key, nodes);
            } else {
              nodes.forEach((n) => {
                if (isFlowNode(n)) {
                  const enhanced = n;
                  const stack = enhanced[Symbol.for("__data_stack__")] || enhanced["__data_stack__"];
                  if (stack && stack.length > 0) {
                    const scope = stack[0];
                    scope[itemKey] = item;
                    if (indexKey)
                      scope[indexKey] = index;
                  } else {
                    const scope = { [itemKey]: item };
                    if (indexKey)
                      scope[indexKey] = index;
                    addScopeToNode(n, runtime.shallowReactive(scope), el);
                  }
                }
              });
            }
            nextNodes.push(...nodes);
          });
          for (const [key, nodes] of mountedMap.entries()) {
            if (!currentKeys.has(key)) {
              disposeNodes(nodes);
              mountedMap.delete(key);
            }
          }
          let expectedBefore = anchor;
          for (let i = nextNodes.length - 1; i >= 0; i--) {
            const node = nextNodes[i];
            if (node.nextSibling !== expectedBefore) {
              anchor.parentNode?.insertBefore(node, expectedBefore);
            }
            expectedBefore = node;
          }
        });
        return () => {
          cleanup();
          for (const nodes of mountedMap.values())
            disposeNodes(nodes);
          mountedMap.clear();
          anchor.remove();
        };
      } catch (e) {
        initError("for", `Failed to initialize for: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var for_default = forModule;

  // src/modules/attributes/router.ts
  var router_exports = {};
  __export(router_exports, {
    default: () => router_default,
    routerAttributeModule: () => routerAttributeModule
  });
  init_debug();
  init_consts();
  function pathToRegex(path) {
    const keys = [];
    let hasWildcard = false;
    let pattern = path.replace(/:([a-zA-Z0-9_]+)\?/g, (_, key) => {
      keys.push(key);
      return "(?:/([^/]+))?";
    }).replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
    if (pattern.endsWith("*")) {
      hasWildcard = true;
      pattern = pattern.slice(0, -1) + "(.*)";
    } else {
      pattern = pattern.replace(/\*/g, ".*");
    }
    return { regex: new RegExp(`^${pattern}$`), keys, hasWildcard };
  }
  function fillPath(pattern, params) {
    let out = pattern.replace(/:([a-zA-Z0-9_]+)\??/g, (_, key) => {
      const v = params[key];
      return v !== void 0 && v !== null ? String(v) : "";
    }).replace(/\*$/, () => params.wildcard !== void 0 ? String(params.wildcard) : "");
    out = out.replace(/\/{2,}/g, "/");
    if (out.length > 1 && out.endsWith("/"))
      out = out.slice(0, -1);
    return out || "/";
  }
  function autoDetectBasePath() {
    const baseEl = document.querySelector("base[href]");
    if (baseEl && baseEl.href) {
      try {
        const u = new URL(baseEl.href, globalThis.location.href);
        const p = u.pathname;
        return p.endsWith("/") ? p : p + "/";
      } catch {
      }
    }
    const pathname = globalThis.location.pathname;
    const lastSlash = pathname.lastIndexOf("/");
    const lastSeg = pathname.substring(lastSlash + 1);
    if (lastSeg.includes(".")) {
      return pathname.substring(0, lastSlash + 1);
    }
    return "/";
  }
  var routerAttributeModule = {
    name: "router-attribute",
    attribute: "router",
    handle: (el, initConfig, runtime) => {
      try {
        runtime.debug("Initializing data-router on", el);
        const appBase = globalThis.location.href;
        let cfg = {};
        if (initConfig && initConfig.trim()) {
          try {
            const evaluated = runtime.evaluate(el, initConfig);
            if (evaluated && typeof evaluated === "object") {
              cfg = evaluated;
            }
          } catch {
          }
        }
        const mode = cfg.mode === "static" || cfg.mode === "hybrid" ? cfg.mode : "signal";
        const defaultPath = typeof cfg.default === "string" && cfg.default ? cfg.default : null;
        const initialFile = globalThis.location.pathname.split("/").pop() || "";
        const manualBase = document.documentElement.getAttribute("data-router.base-path");
        const basePath = manualBase !== null && manualBase !== "" ? manualBase.endsWith("/") ? manualBase : manualBase + "/" : autoDetectBasePath();
        const pagesDir = typeof cfg.pagesDir === "string" && cfg.pagesDir ? cfg.pagesDir.replace(/\/+$/, "") : "_pages";
        const resolvePagesPath = (ref2, fallback) => {
          const raw = ref2 && ref2.trim() ? ref2.trim() : fallback;
          if (raw.startsWith("/") || raw.startsWith("http"))
            return raw;
          return `${pagesDir}/${raw.replace(/^\/+/, "")}`;
        };
        const errorPage = resolvePagesPath(cfg.error, "error.html");
        const routerConfig = {
          mode,
          default: defaultPath,
          basePath,
          manifest: typeof cfg.manifest === "string" && cfg.manifest ? cfg.manifest : void 0,
          dynamic: cfg.dynamic === true,
          shadow: cfg.shadow ?? void 0,
          pagesDir,
          error: errorPage
        };
        const stripBase = (pathname) => {
          let p = pathname;
          if (basePath !== "/" && p.startsWith(basePath)) {
            p = p.substring(basePath.length - 1);
          }
          if (!p.startsWith("/"))
            p = "/" + p;
          return p;
        };
        const applyBase = (path) => {
          if (basePath === "/" || basePath === "")
            return path;
          if (path.startsWith("/"))
            return basePath + path.substring(1);
          return basePath + path;
        };
        const normalizeHref = (href) => {
          let resolved;
          try {
            resolved = new URL(href, appBase);
          } catch {
            return href;
          }
          return resolved.pathname + resolved.search + resolved.hash;
        };
        const globToRegex = (glob) => {
          let pattern = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "::globstar::").replace(/\*/g, "[^/]*").replace(/::globstar::/g, ".*");
          return new RegExp(`^${pattern}$`);
        };
        const shadowMatch = (path) => {
          const shadows = state.config.shadow;
          if (!shadows)
            return false;
          const globs = Array.isArray(shadows) ? shadows : [shadows];
          return globs.some((g) => globToRegex(g).test(path));
        };
        const buildManifest = async () => {
          const entries = routeList.slice();
          const manifestUrl = state.config.manifest;
          if (manifestUrl) {
            try {
              let raw;
              if (runtime.fetch) {
                raw = await runtime.fetch.request(applyBase(manifestUrl), { responseType: "text" }, el);
              } else {
                raw = await (await fetch(applyBase(manifestUrl))).text();
              }
              const parsed = JSON.parse(raw);
              const list = Array.isArray(parsed) ? parsed : parsed.routes ?? [];
              for (const entry of list) {
                if (!entry || typeof entry.path !== "string")
                  continue;
                const meta = pathToRegex(entry.path);
                const rec = {
                  path: entry.path,
                  element: document.documentElement,
                  name: entry.name,
                  redirect: entry.redirect,
                  layout: entry.layout,
                  component: entry.component,
                  meta: entry.meta,
                  internal: entry.internal === true || shadowMatch(entry.path),
                  source: "manifest",
                  ...meta
                };
                rec.matcher = meta.regex;
                entries.push(rec);
              }
            } catch (e) {
              reportError(new Error(`router: failed to load manifest "${manifestUrl}": ${e}`), el);
            }
          }
          state.manifest = entries.filter((r) => !r.internal).slice();
          state.routes = entries.slice();
        };
        const routeList = [];
        const matchMeta = /* @__PURE__ */ new WeakMap();
        const state = runtime.shallowReactive({
          path: stripBase(globalThis.location.pathname),
          params: {},
          query: {},
          hash: globalThis.location.hash,
          loading: false,
          error: null,
          errorCode: null,
          basePath,
          mode,
          route: null,
          layout: null,
          outlet: null,
          meta: {},
          name: null,
          previous: null,
          scrollPosition: { x: 0, y: 0 },
          currentRoute: null,
          routes: [],
          // Declarative strategy snapshot + resolved manifest.
          config: routerConfig,
          manifest: [],
          // Per-tab history bookkeeping (native history is the single store).
          activeTabId: null,
          tabPaths: {},
          tabMeta: {},
          navigate(url, opts) {
            if (url.startsWith("http") || url.startsWith("//")) {
              globalThis.location.href = url;
              return;
            }
            const target2 = applyBase(url);
            const tabId = opts?.tabId ?? getActiveTabId() ?? state.activeTabId ?? null;
            if (tabId) {
              state.tabPaths[tabId] = stripBase(target2);
              if (opts?.title !== void 0 || opts?.icon !== void 0) {
                state.tabMeta[tabId] = {
                  ...state.tabMeta[tabId] || {},
                  ...opts?.title !== void 0 ? { title: opts.title } : {},
                  ...opts?.icon !== void 0 ? { icon: opts.icon } : {}
                };
              }
            }
            if ("navigation" in globalThis) {
              globalThis.navigation.navigate(target2, {
                history: opts?.replace ? "replace" : "push",
                state: { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon }
              });
            } else {
              const histState = { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon };
              if (opts?.replace)
                globalThis.history.replaceState(histState, "", target2);
              else
                globalThis.history.pushState(histState, "", target2);
              updateRoute(target2);
            }
          },
          // Back/forward for a tab. Drives the native history; the popstate /
          // navigation handler resolves which tab the destination belongs to and
          // switches the active tab if it lands on another tab's entry.
          back(_opts) {
            if ("navigation" in globalThis)
              globalThis.navigation.back();
            else
              globalThis.history.back();
          },
          forward(_opts) {
            if ("navigation" in globalThis)
              globalThis.navigation.forward();
            else
              globalThis.history.forward();
          },
          canBack(_tabId) {
            if ("navigation" in globalThis) {
              const nav = globalThis.navigation;
              return nav && typeof nav.canGoBack === "function" ? nav.canGoBack : true;
            }
            return globalThis.history.length > 1;
          },
          canForward(_tabId) {
            if ("navigation" in globalThis) {
              const nav = globalThis.navigation;
              return nav && typeof nav.canGoForward === "function" ? nav.canGoForward : true;
            }
            return globalThis.history.length > 1;
          },
          navigateByName(name, params = {}, query, opts) {
            const route = routeList.find((r) => r.name === name);
            if (!route) {
              reportError(new Error(`navigateByName: no route named "${name}"`), el);
              return;
            }
            let target2 = fillPath(route.path, params);
            if (query && Object.keys(query).length) {
              target2 += "?" + state.buildQuery(query);
            }
            state.navigate(target2, opts);
          },
          isActive(path, exact = false) {
            const current = state.path;
            if (exact)
              return current === path;
            if (path === "/")
              return current === "/";
            return current === path || current.startsWith(path + "/");
          },
          buildQuery(obj) {
            const usp = new URLSearchParams();
            for (const [k, v] of Object.entries(obj)) {
              if (v === void 0 || v === null)
                continue;
              usp.append(k, String(v));
            }
            return usp.toString();
          },
          addRoute(route) {
            runtime.debug("addRoute called with path:", route.path);
            const meta = pathToRegex(route.path);
            matchMeta.set(route, meta);
            routeList.push(route);
            state.routes = routeList.slice();
            queueMicrotask(() => {
              buildManifest();
              updateRoute(globalThis.location.href);
            });
          },
          removeRoute(route) {
            const idx = routeList.indexOf(route);
            if (idx > -1)
              routeList.splice(idx, 1);
            matchMeta.delete(route);
            state.routes = routeList.slice();
            queueMicrotask(() => buildManifest());
          },
          // Intuitive navigate: resolve a name via the manifest, else treat the
          // target as a path. This is the friendly entrypoint for app code.
          go(target2, opts) {
            if (!target2)
              return;
            const named = routeList.find((r) => r.name === target2);
            if (named) {
              state.navigateByName(target2, {}, void 0, { replace: opts?.replace });
              return;
            }
            state.navigate(target2, opts);
          },
          // Match a path (default: current) and return the RouteInfo the router
          // would use — without navigating. Useful for guards/preview UI.
          match(path) {
            const p = path ? stripBase(path) : state.path;
            for (const route of routeList) {
              const meta = matchMeta.get(route);
              if (!meta)
                continue;
              const m = p.match(meta.regex);
              if (m) {
                const params = {};
                meta.keys.forEach((key, i) => {
                  params[key] = m[i + 1] || "";
                });
                if (meta.hasWildcard)
                  params.wildcard = m[meta.keys.length + 1] || "";
                return buildInfo(route, p, params, state.query, state.hash);
              }
            }
            if (mode === "static" || mode === "hybrid") {
              return buildInfo(null, p, {}, state.query, state.hash);
            }
            return null;
          },
          // Render the active tab's stored path through the outlet. Tab switching
          // uses a direct synchronous state commit — it skips ALL lifecycle hooks
          // (beforeLeave, beforeEnter, handler, afterEnter) to avoid cascading
          // re-renders and clobbering.
          renderActiveTab() {
            const id = getActiveTabId();
            if (!id)
              return;
            let path = state.tabPaths[id];
            if (!path) {
              path = stripBase(globalThis.location.pathname) || "/";
              state.tabPaths[id] = path;
            }
            if (path === "custom-component") {
              state.route = null;
              state.layout = null;
              state.outlet = null;
              const url = globalThis.location.pathname + globalThis.location.search + globalThis.location.hash;
              suppressNavIntercept = true;
              globalThis.history.replaceState({ tabId: id, scrollY: globalThis.scrollY }, "", url);
              suppressNavIntercept = false;
              return;
            }
            const fakeUrl = new URL(applyBase(path), globalThis.location.origin);
            const switchPath = path;
            const query = {};
            fakeUrl.searchParams.forEach((val, key) => query[key] = val);
            let matched = null;
            const params = {};
            for (const route of routeList) {
              const meta2 = matchMeta.get(route);
              if (!meta2)
                continue;
              const m = switchPath.match(meta2.regex);
              if (m) {
                matched = route;
                meta2.keys.forEach((key, i) => {
                  params[key] = m[i + 1] || "";
                });
                if (meta2.hasWildcard)
                  params.wildcard = m[meta2.keys.length + 1] || "";
                break;
              }
            }
            let staticComponent = null;
            if (!matched && (mode === "static" || mode === "hybrid")) {
              staticComponent = resolveStaticComponent(switchPath);
            }
            state.path = switchPath;
            state.hash = fakeUrl.hash;
            state.query = query;
            state.params = params;
            state.currentRoute = matched;
            state.meta = matched?.meta ?? {};
            state.name = matched?.name ?? null;
            state.route = matched?.component ?? staticComponent ?? null;
            state.layout = matched?.layout ?? null;
            state.outlet = state.layout ?? state.route;
            state.error = null;
            commitVisibility(matched);
            const target2 = applyBase(switchPath);
            const meta = state.tabMeta[id] || {};
            suppressNavIntercept = true;
            globalThis.history.replaceState(
              { tabId: id, scrollY: globalThis.scrollY, title: meta.title, icon: meta.icon },
              "",
              target2
            );
            suppressNavIntercept = false;
          },
          // Switch the active tab (also updates the layout's global signal so the
          // tab bar + panels react).
          setActiveTab(id) {
            setActiveTabId(id);
            state.renderActiveTab();
          },
          // Surface a server/HTTP error and render the generic `error` page.
          // A numeric/string code (500/502/503/504…) is published to
          // `#router.errorCode` so a single error page can present the right
          // message. Omit or pass null to clear the error and resume routing.
          setError(code) {
            if (code === void 0 || code === null || code === "") {
              state.error = null;
              state.errorCode = null;
              return;
            }
            const c = String(code);
            state.error = { type: c === "404" ? "404" : "http", code: c, message: `Error ${c}` };
            state.errorCode = c;
            const errPath = state.config.error ?? resolvePagesPath(void 0, "error.html");
            const onErr = globalThis.location.pathname === applyBase(errPath);
            if (!onErr) {
              state.navigate(errPath, { replace: true });
            }
          }
        });
        runtime.setGlobalSignal("router", state);
        const globals = runtime.globalSignals();
        const getActiveTabId = () => typeof globals.activeTabId === "string" && globals.activeTabId || null;
        const setActiveTabId = (id) => {
          runtime.setGlobalSignal("activeTabId", id);
        };
        let tabSwitching = false;
        runtime.watch(
          () => globals.activeTabId,
          () => {
            if (tabSwitching)
              return;
            try {
              state.renderActiveTab();
            } catch (_e) {
            }
          }
        );
        let suppressNavIntercept = false;
        let previousInfo = null;
        let navToken = 0;
        const runHook = async (hook, to, from) => {
          if (!hook)
            return {};
          try {
            const result = await Promise.resolve(hook(to, from));
            if (result === false)
              return { abort: true };
            if (typeof result === "string")
              return { redirect: result };
            return {};
          } catch (e) {
            state.error = { type: "hook_error", error: e };
            reportError(e instanceof Error ? e : new Error(String(e)), el);
            return { abort: true };
          }
        };
        const buildInfo = (route, path, params, query, hash) => ({
          path,
          params,
          query,
          hash,
          name: route?.name,
          meta: route?.meta,
          component: route?.component,
          layout: route?.layout
        });
        const shownDisplay = /* @__PURE__ */ new WeakMap();
        const commitVisibility = (matched) => {
          routeList.forEach((r) => {
            const showable = r === matched && !r.component;
            if (showable) {
              if (!shownDisplay.has(r.element)) {
                const inline = r.element.style.display;
                shownDisplay.set(r.element, inline === "none" ? "" : inline);
              }
              runtime.reconcileStyle(r.element, { display: shownDisplay.get(r.element) || "" });
            } else {
              if (!shownDisplay.has(r.element)) {
                const inline = r.element.style.display;
                shownDisplay.set(r.element, inline === "none" ? "" : inline);
              }
              runtime.reconcileStyle(r.element, { display: "none" });
            }
          });
        };
        const restoreScroll = (hash) => {
          const savedScrollY = globalThis.history.state?.scrollY;
          if (savedScrollY !== void 0 && savedScrollY !== null) {
            globalThis.scrollTo(0, savedScrollY);
          } else if (hash) {
            const targetEl = document.getElementById(hash.substring(1));
            if (targetEl)
              targetEl.scrollIntoView();
            else
              globalThis.scrollTo(0, 0);
          } else {
            globalThis.scrollTo(0, 0);
          }
          state.scrollPosition = { x: globalThis.scrollX, y: globalThis.scrollY };
        };
        const resolveStaticComponent = (path) => {
          const dir = (state.config.pagesDir || "").replace(/^\/+|\/+$/g, "");
          const rel = path === "/" || path === "" ? "/index.html" : path.replace(/\/$/, "");
          const withExt = rel.endsWith(".html") ? rel : rel + ".html";
          const full = dir ? `/${dir}${withExt}` : withExt;
          return applyBase(full);
        };
        const updateRoute = async (fullPath) => {
          const token = ++navToken;
          const url = new URL(fullPath, globalThis.location.origin);
          let path = stripBase(url.pathname);
          if (url.hash && url.hash.startsWith("#/")) {
            path = url.hash.substring(1);
          } else if (!url.hash && initialFile && initialFile !== "404.html" && // Only collapse when the served document is an actual HTML file
          // (e.g. /router.html). A clean route like /profile must NOT be
          // collapsed to "/", or deep links lose their path.
          /\.html?$/i.test(initialFile) && path === "/" + initialFile) {
            path = "/";
          }
          if (defaultPath && path === "/" && defaultPath !== "/") {
            state.navigate(defaultPath, { replace: true });
            return;
          }
          const query = {};
          url.searchParams.forEach((val, key) => query[key] = val);
          let matched = null;
          const params = {};
          for (const route of routeList) {
            const meta = matchMeta.get(route);
            if (!meta)
              continue;
            const match = path.match(meta.regex);
            if (match) {
              runtime.debug(`Matched route: ${route.path} via path ${path}`);
              matched = route;
              meta.keys.forEach((key, i) => {
                params[key] = match[i + 1] || "";
              });
              if (meta.hasWildcard) {
                params.wildcard = match[meta.keys.length + 1] || "";
              }
              break;
            }
          }
          if (matched && matched.redirect) {
            state.navigate(matched.redirect, { replace: true });
            return;
          }
          let staticComponent = null;
          const errorPage2 = state.config.error ?? resolvePagesPath(void 0, "error.html");
          const alreadyOnError = path === errorPage2 || url.pathname === applyBase(errorPage2);
          if (!matched) {
            if (!alreadyOnError && (mode === "static" || mode === "hybrid")) {
              const candidate = resolveStaticComponent(path);
              const known = routeList.some((r) => {
                if (r.component && r.component.endsWith(candidate.replace(/^\/+/, "")))
                  return true;
                return false;
              });
              if (known) {
                staticComponent = candidate;
              } else if (path === "/" || path === "") {
                staticComponent = resolveStaticComponent("/");
              } else {
                state.error = { type: "404", message: "Page not found", path };
                state.errorCode = null;
                state.errorCode = "404";
                state.navigate(errorPage2, { replace: true });
                return;
              }
            } else if (!alreadyOnError) {
              state.errorCode = "404";
              state.navigate(errorPage2, { replace: true });
              return;
            }
          }
          const toInfo = buildInfo(matched, path, params, query, url.hash);
          const fromRoute = state.currentRoute;
          const fromInfo = previousInfo;
          state.loading = true;
          if (fromRoute) {
            const r = await runHook(fromRoute.beforeLeave, toInfo, fromInfo);
            if (token !== navToken) {
              state.loading = false;
              return;
            }
            if (r.abort) {
              state.loading = false;
              return;
            }
            if (r.redirect) {
              state.loading = false;
              state.navigate(r.redirect, { replace: true });
              return;
            }
          }
          if (matched) {
            const r = await runHook(matched.beforeEnter, toInfo, fromInfo);
            if (token !== navToken) {
              state.loading = false;
              return;
            }
            if (r.abort) {
              state.loading = false;
              return;
            }
            if (r.redirect) {
              state.loading = false;
              state.navigate(r.redirect, { replace: true });
              return;
            }
            const h = await runHook(matched.handler, toInfo, fromInfo);
            if (token !== navToken) {
              state.loading = false;
              return;
            }
            if (h.abort) {
              state.loading = false;
              return;
            }
            if (h.redirect) {
              state.loading = false;
              state.navigate(h.redirect, { replace: true });
              return;
            }
          }
          if (token !== navToken) {
            state.loading = false;
            return;
          }
          const outgoingPrevious = fromRoute ? { path: state.path, meta: fromRoute.meta } : previousInfo ? { path: previousInfo.path, meta: previousInfo.meta } : null;
          state.path = path;
          state.hash = url.hash;
          state.query = query;
          state.params = params;
          state.currentRoute = matched;
          state.meta = matched?.meta ?? {};
          state.name = matched?.name ?? null;
          state.previous = outgoingPrevious;
          state.route = matched?.component ?? staticComponent ?? null;
          state.layout = matched?.layout ?? null;
          state.outlet = state.layout ?? state.route;
          const _at = getActiveTabId();
          if (_at)
            state.tabPaths[_at] = path;
          if (matched || staticComponent) {
            commitVisibility(matched);
            state.error = null;
            state.errorCode = null;
            state.loading = false;
            restoreScroll(url.hash);
            if (matched) {
              queueMicrotask(async () => {
                await runHook(matched.afterEnter, toInfo, fromInfo);
                if (fromRoute && fromRoute !== matched) {
                  await runHook(fromRoute.afterLeave, toInfo, fromInfo);
                }
              });
            }
            previousInfo = toInfo;
          } else {
            const onErrorPage = path === errorPage2 || url.pathname === applyBase(errorPage2);
            state.loading = false;
            state.error = { type: state.errorCode ?? "404", message: "Page not found", path };
            if (onErrorPage) {
              staticComponent = errorPage2;
              commitVisibility(null);
              state.route = staticComponent;
              state.outlet = staticComponent;
              const _at2 = getActiveTabId();
              if (_at2)
                state.tabPaths[_at2] = staticComponent;
            } else {
              state.navigate(errorPage2, { replace: true });
            }
          }
        };
        const onNavigate = (e) => {
          if (suppressNavIntercept)
            return;
          if (!e.canIntercept || e.hashChange || e.downloadRequest !== null) {
            return;
          }
          const url = new URL(globalThis.location.origin + normalizeHref(e.destination.url));
          if (url.origin !== globalThis.location.origin)
            return;
          const destState = e.destination?.state;
          const destTab = destState && typeof destState.tabId === "string" ? destState.tabId : null;
          if (destTab && destTab !== getActiveTabId()) {
            setActiveTabId(destTab);
          }
          if (destTab && destState) {
            if (destState.title !== void 0 || destState.icon !== void 0) {
              state.tabMeta[destTab] = {
                ...state.tabMeta[destTab] || {},
                ...destState.title !== void 0 ? { title: destState.title } : {},
                ...destState.icon !== void 0 ? { icon: destState.icon } : {}
              };
            }
          }
          e.intercept({
            async handler() {
              await updateRoute(url.href);
            }
          });
        };
        if ("navigation" in globalThis) {
          globalThis.navigation.addEventListener("navigate", onNavigate);
        }
        const onPopState = (event) => {
          const st = event && event.state;
          const tab = st && typeof st.tabId === "string" ? st.tabId : null;
          if (tab && tab !== getActiveTabId()) {
            setActiveTabId(tab);
          }
          if (tab && st) {
            if (st.title !== void 0 || st.icon !== void 0) {
              state.tabMeta[tab] = {
                ...state.tabMeta[tab] || {},
                ...st.title !== void 0 ? { title: st.title } : {},
                ...st.icon !== void 0 ? { icon: st.icon } : {}
              };
            }
          }
          updateRoute(globalThis.location.href);
        };
        const popStateEvent = `${CUSTOM_EVENT_PREFIX}popstate`;
        if (!("navigation" in globalThis)) {
          globalThis.addEventListener("popstate", onPopState);
        }
        document.addEventListener(popStateEvent, onPopState);
        queueMicrotask(() => {
          buildManifest();
          updateRoute(globalThis.location.href);
        });
        return () => {
          if ("navigation" in globalThis) {
            globalThis.navigation.removeEventListener("navigate", onNavigate);
          }
          if (!("navigation" in globalThis)) {
            globalThis.removeEventListener("popstate", onPopState);
          }
          document.removeEventListener(popStateEvent, onPopState);
        };
      } catch (e) {
        reportError(e instanceof Error ? e : new Error(String(e)), el);
      }
    }
  };
  var router_default = routerAttributeModule;

  // src/modules/attributes/pwa.ts
  var pwa_exports = {};
  __export(pwa_exports, {
    default: () => pwa_default
  });
  init_debug();
  var pwaModule = {
    name: "pwa",
    attribute: "pwa",
    handle: (el, expression, runtime) => {
      let config;
      try {
        config = runtime.evaluate(el, expression);
      } catch (e) {
        reportError(new Error(`PWA: Evaluation error: ${e}`), el);
        return;
      }
      if (!config)
        return;
      const pwaState = runtime.reactive({
        isOnline: navigator.onLine,
        isInstalled: false,
        updateAvailable: false,
        deferredPrompt: null,
        _waitingWorker: null,
        install: async () => {
          if (!pwaState.deferredPrompt) {
            runtime.log("PWA: No install prompt available yet.");
            return false;
          }
          pwaState.deferredPrompt.prompt();
          const { outcome } = await pwaState.deferredPrompt.userChoice;
          if (outcome === "accepted") {
            pwaState.deferredPrompt = null;
            return true;
          }
          return false;
        },
        update: () => {
          if (pwaState._waitingWorker) {
            pwaState._waitingWorker.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }
        }
      });
      runtime.setGlobalSignal("$pwa", pwaState);
      const cleanupFns = [];
      const updateOnlineStatus = () => {
        pwaState.isOnline = navigator.onLine;
      };
      globalThis.addEventListener("online", updateOnlineStatus);
      globalThis.addEventListener("offline", updateOnlineStatus);
      cleanupFns.push(
        () => globalThis.removeEventListener("online", updateOnlineStatus),
        () => globalThis.removeEventListener("offline", updateOnlineStatus)
      );
      if (config.sw && "serviceWorker" in navigator) {
        navigator.serviceWorker.register(config.sw).then((reg) => {
          runtime.log(`PWA: ServiceWorker registered for scope: ${reg.scope}`);
          if (reg.waiting) {
            pwaState.updateAvailable = true;
            pwaState._waitingWorker = reg.waiting;
          }
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  pwaState.updateAvailable = true;
                  pwaState._waitingWorker = installingWorker;
                }
              };
            }
          };
        }).catch((err2) => reportError(new Error(`PWA: ServiceWorker registration failed: ${err2}`), el));
        let refreshing = false;
        const onControllerChange = () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
        cleanupFns.push(() => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange));
      }
      if (config.themeColor) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "theme-color");
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", config.themeColor);
      }
      if (config.manifest) {
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          manifestLink = document.createElement("link");
          manifestLink.setAttribute("rel", "manifest");
          document.head.appendChild(manifestLink);
        }
        manifestLink.setAttribute("href", config.manifest);
      }
      if (config.icon) {
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
          appleIcon = document.createElement("link");
          appleIcon.setAttribute("rel", "apple-touch-icon");
          document.head.appendChild(appleIcon);
        }
        appleIcon.setAttribute("href", config.icon);
      }
      const onBeforeInstall = (e) => {
        e.preventDefault();
        pwaState.deferredPrompt = e;
      };
      globalThis.addEventListener("beforeinstallprompt", onBeforeInstall);
      cleanupFns.push(() => globalThis.removeEventListener("beforeinstallprompt", onBeforeInstall));
      const onAppInstalled = () => {
        pwaState.isInstalled = true;
        pwaState.deferredPrompt = null;
      };
      globalThis.addEventListener("appinstalled", onAppInstalled);
      cleanupFns.push(() => globalThis.removeEventListener("appinstalled", onAppInstalled));
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var pwa_default = pwaModule;

  // src/modules/attributes/var.ts
  var var_exports = {};
  __export(var_exports, {
    default: () => var_default
  });
  init_debug();
  var varModule = {
    name: "var",
    attribute: "var",
    handle: (el, value, runtime) => {
      if (hasScope(el)) {
        return () => {
        };
      }
      try {
        const initialData = runtime.evaluate(el, value);
        if (typeof initialData === "object" && initialData !== null) {
          const reactiveData = runtime.reactive(initialData);
          const removeScope = addScopeToNode(el, reactiveData);
          return removeScope;
        } else {
          throw new Error("data-var must evaluate to an object");
        }
      } catch (e) {
        initError("var", `Failed to init var: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var var_default = varModule;

  // src/modules/attributes/style.ts
  var style_exports = {};
  __export(style_exports, {
    default: () => style_default
  });
  init_debug();
  var styleModule = {
    name: "style",
    attribute: "style",
    handle: (el, value, runtime) => {
      const attrs = matchAttributes(el, "style", value);
      const cleanupFns = [];
      attrs.forEach((attr) => {
        const parsed = runtime.parseAttribute(attr.name, runtime, el);
        if (!parsed || parsed.argument)
          return;
        try {
          const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
            const result = runtime.evaluate(el, value);
            runtime.reconcileStyle(el, result);
          });
          cleanupFns.push(cleanup);
        } catch (e) {
          initError("style", `Failed to reconcile style: ${e instanceof Error ? e.message : String(e)}`, el, value);
        }
      });
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var style_default = styleModule;

  // src/modules/attributes/theme.ts
  var theme_exports = {};
  __export(theme_exports, {
    default: () => theme_default
  });
  init_debug();
  var themeModule = {
    name: "ux-theme",
    attribute: "ux-theme",
    metadata: {
      before: ["signal", "switcher", "class", "style", "attr", "on", "text", "html"]
    },
    handle: (el, expression, runtime) => {
      let rawConfig;
      try {
        rawConfig = runtime.evaluate(el, expression);
      } catch (e) {
        console.error(`Nexus Theme: Failed to evaluate data-ux-theme expression`, e);
        return;
      }
      if (!rawConfig || typeof rawConfig !== "object") {
        rawConfig = { default: "auto", auto: {}, light: {}, dark: {} };
      }
      let initialMode = rawConfig.default || "auto";
      let stored = null;
      if (el === document.documentElement && typeof localStorage !== "undefined") {
        try {
          stored = localStorage.getItem("ux_themeMode");
        } catch (_) {
        }
        if (stored && rawConfig.modes && rawConfig.modes[stored]) {
          initialMode = stored;
        }
      }
      if (!rawConfig.modes || typeof rawConfig.modes !== "object") {
        rawConfig.modes = { auto: {}, light: {}, dark: {} };
      }
      const modes = Object.keys(rawConfig.modes);
      const themeState = runtime.reactive({
        mode: initialMode,
        config: rawConfig.modes,
        modes
      });
      let mq = null;
      let listener = null;
      const systemDark = runtime.ref(false);
      if (typeof window !== "undefined" && window.matchMedia) {
        mq = window.matchMedia("(prefers-color-scheme: dark)");
        systemDark.value = mq.matches;
        listener = (e) => {
          systemDark.value = e.matches;
        };
        mq.addEventListener("change", listener);
      }
      const activeMode = runtime.computed(() => {
        let m = themeState.mode;
        if (m === "auto") {
          m = systemDark.value ? "dark" : "light";
        }
        return m;
      });
      const activeUiTheme = runtime.computed(() => {
        const m = activeMode.value;
        const modeConfig = themeState.config[m];
        return modeConfig?.theme || m;
      });
      const themeIcon = runtime.computed(() => {
        return themeState.config[themeState.mode]?.icon || "";
      });
      const helpers = {
        $theme: themeState,
        $switchTheme: () => {
          const currentIdx = themeState.modes.indexOf(themeState.mode);
          let nextIdx = currentIdx + 1;
          if (nextIdx >= themeState.modes.length)
            nextIdx = 0;
          const newMode = themeState.modes[nextIdx] || "auto";
          themeState.mode = newMode;
          if (el === document.documentElement && typeof localStorage !== "undefined") {
            try {
              localStorage.setItem("ux_themeMode", newMode);
            } catch (_) {
            }
          }
        },
        $setTheme: (m) => {
          if (themeState.modes.includes(m)) {
            themeState.mode = m;
            if (el === document.documentElement && typeof localStorage !== "undefined") {
              try {
                localStorage.setItem("ux_themeMode", m);
              } catch (_) {
              }
            }
          }
        },
        get $activeTheme() {
          return activeUiTheme.value;
        },
        get $activeMode() {
          return activeMode.value;
        },
        get $themeIcon() {
          return themeIcon.value;
        }
      };
      addScopeToNode(el, helpers);
      try {
        const [_runner, cleanupEffect2] = runtime.elementBoundEffect(el, () => {
          const themeToApply = activeUiTheme.value;
          const modeValue = activeMode.value;
          if (themeToApply && themeToApply !== "auto") {
            el.setAttribute("data-theme", themeToApply);
          } else {
            el.removeAttribute("data-theme");
          }
          if (modeValue === "dark") {
            el.classList.add("dark");
            el.classList.remove("light");
          } else {
            el.classList.add("light");
            el.classList.remove("dark");
          }
        });
        return () => {
          if (mq && listener)
            mq.removeEventListener("change", listener);
          cleanupEffect2();
        };
      } catch (e) {
        initError("ux-theme", `Failed to bind theme: ${e instanceof Error ? e.message : String(e)}`, el, expression);
      }
    }
  };
  var theme_default = themeModule;

  // src/modules/attributes/teleport.ts
  var teleport_exports = {};
  __export(teleport_exports, {
    default: () => teleport_default,
    teleportAttribute: () => teleportAttribute
  });
  init_consts();
  var teleportAttribute = {
    name: "teleport",
    attribute: "teleport",
    handle: (element, value, runtime, parsed) => {
      const modifiers = parsed?.modifiers ?? [];
      if (parsed?.argument === "mode" && !modifiers.length)
        return;
      if (modifiers.includes("drop")) {
        const mode = element.getAttribute("data-teleport-mode") || "move";
        const onDragOver = (e) => {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = mode === "clone" ? "copy" : "move";
          }
        };
        const onDrop = (e) => {
          try {
            e.preventDefault();
            e.stopPropagation();
            const dragState = globalThis._dragState;
            if (!dragState) {
              console.warn("[teleport] No drag state \u2014 was the source dragged?");
              return;
            }
            const { fromIndex, sourceContainer, element: draggedEl, sourceList, reorderEngine } = dragState;
            if (!Array.isArray(sourceList)) {
              console.warn("[teleport] sourceList is not an array - check expression evaluation");
              return;
            }
            const targetList = runtime.evaluate(element, value);
            if (!Array.isArray(targetList)) {
              console.warn("[teleport] targetList expression did not evaluate to an array");
              return;
            }
            const isSameList = sourceList === targetList;
            let toIndex;
            if (reorderEngine && isSameList) {
              toIndex = reorderEngine.getFinalToIndex();
              if (toIndex === -1) {
                console.warn("[teleport] Reorder engine active but no final index available");
                return;
              }
            } else {
              const dropTarget = e.target.closest("[data-drag]");
              const draggableChildren = [];
              for (let i = 0; i < element.children.length; i++) {
                const child = element.children[i];
                if (child.hasAttribute("data-drag") && child.getAttribute("draggable") === "true" && getComputedStyle(child).display !== "none" && !child.hasAttribute("data-ux-template") && child.closest("[data-teleport\\:drop]") === element) {
                  draggableChildren.push(child);
                }
              }
              if (dropTarget && draggableChildren.includes(dropTarget)) {
                toIndex = draggableChildren.indexOf(dropTarget);
                const rect = dropTarget.getBoundingClientRect();
                const cursorY = e.clientY - rect.top;
                if (cursorY > rect.height / 2) {
                  toIndex += 1;
                }
              } else {
                toIndex = draggableChildren.length;
              }
            }
            const doMutate = () => {
              try {
                if (reorderEngine && isSameList) {
                  return;
                }
                if (mode === "clone") {
                  const item = sourceList[fromIndex];
                  if (item !== void 0) {
                    targetList.splice(toIndex, 0, { ...item });
                  }
                } else if (mode === "swap") {
                  if (sourceList !== targetList)
                    return;
                  if (fromIndex === toIndex)
                    return;
                  const tmp = sourceList[fromIndex];
                  sourceList[fromIndex] = targetList[toIndex];
                  targetList[toIndex] = tmp;
                } else {
                  if (sourceList === targetList) {
                    if (fromIndex === toIndex)
                      return;
                    const [item] = sourceList.splice(fromIndex, 1);
                    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
                    sourceList.splice(insertIndex, 0, item);
                  } else {
                    const [item] = sourceList.splice(fromIndex, 1);
                    if (item !== void 0) {
                      targetList.splice(toIndex, 0, item);
                    }
                  }
                }
              } catch (err2) {
                runtime.reportError(err2 instanceof Error ? err2 : new Error(String(err2)), element, "teleport-mutate");
              }
            };
            if ("startViewTransition" in document && doMutate) {
              document.startViewTransition(doMutate);
            } else {
              doMutate();
            }
            runtime.globalSignals()["drag:drop"] = {
              sourceList,
              targetList,
              fromIndex,
              toIndex,
              mode,
              item: targetList[toIndex]
            };
          } catch (err2) {
            runtime.reportError(err2 instanceof Error ? err2 : new Error(String(err2)), element, "teleport-drop");
          }
        };
        element.addEventListener("dragover", onDragOver);
        element.addEventListener("drop", onDrop);
        return () => {
          element.removeEventListener("dragover", onDragOver);
          element.removeEventListener("drop", onDrop);
        };
      }
      if (element.tagName.toLowerCase() !== "template") {
        runtime.warn?.("[Teleport] DOM teleportation should be used on <template> tags.", element);
      }
      const targetSelector = value.trim();
      if (!targetSelector)
        return;
      let clone;
      if (element.tagName.toLowerCase() === "template") {
        clone = element.content.cloneNode(true).firstElementChild;
      } else {
        clone = element.cloneNode(true);
        clone.removeAttribute("data-teleport");
      }
      if (element[DATA_STACK_KEY]) {
        clone[DATA_STACK_KEY] = element[DATA_STACK_KEY];
      }
      const placeInDom = () => {
        const target2 = document.querySelector(targetSelector);
        if (!target2) {
          runtime.warn?.(`[Teleport] Target "${targetSelector}" not found.`);
          return;
        }
        if (modifiers.includes("prepend")) {
          target2.insertBefore(clone, target2.firstChild);
        } else {
          target2.appendChild(clone);
        }
      };
      placeInDom();
      runtime.processElement?.(clone);
      return () => {
        if (clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
      };
    }
  };
  var teleport_default = teleportAttribute;

  // src/modules/attributes/build.ts
  var build_exports = {};
  __export(build_exports, {
    default: () => build_default
  });
  init_debug();
  var BUILD_STORE = "builds";
  async function writeToIDB(key, data, meta) {
    await writeIDB(BUILD_STORE, key, { data, meta, updatedAt: Date.now() });
  }
  function minifyCSS(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").replace(/;}/g, "}").trim();
  }
  function minifyJS(js) {
    return js.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  }
  function collectStyles(root, shouldMinify) {
    const sheets = [];
    const managedRules = stylesheet.collectRules();
    if (managedRules)
      sheets.push(managedRules);
    document.querySelectorAll("head style").forEach((style) => {
      if (style.textContent)
        sheets.push(style.textContent);
    });
    root.querySelectorAll("style").forEach((style) => {
      if (style.textContent)
        sheets.push(style.textContent);
    });
    const combined = sheets.join("\n\n");
    return shouldMinify ? minifyCSS(combined) : combined;
  }
  function collectScripts(root, shouldMinify) {
    const scripts = [];
    root.querySelectorAll("script:not([src])").forEach((script) => {
      if (script.textContent)
        scripts.push(script.textContent);
    });
    const combined = scripts.join("\n\n");
    return shouldMinify ? minifyJS(combined) : combined;
  }
  function serializeDOM(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll("[data-nexus-loading]").forEach((el) => el.removeAttribute("data-nexus-loading"));
    clone.querySelectorAll("[data-nexus-ready]").forEach((el) => el.removeAttribute("data-nexus-ready"));
    clone.querySelectorAll(".nexus-loading").forEach((el) => el.classList.remove("nexus-loading"));
    clone.querySelectorAll(".nexus-ready").forEach((el) => el.classList.remove("nexus-ready"));
    clone.querySelectorAll('[class=""]').forEach((el) => el.removeAttribute("class"));
    return clone.innerHTML;
  }
  function buildStandaloneDocument(htmlContent, styles, scripts, config, title) {
    const nexusSrc = config.nexusSrc || "https://cdn.nexus-ux.dev/nexus-ux.js";
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script type="module" src="${nexusSrc}"><\/script>
${styles ? `    <style>
${styles}
    </style>` : ""}
</head>
<body data-ux-init>
${htmlContent}
${scripts ? `<script>
${scripts}
<\/script>` : ""}
</body>
</html>`;
  }
  var buildModule = {
    name: "build",
    attribute: "build",
    handle: (el, expression, runtime) => {
      const doBuild = async () => {
        let config;
        try {
          const evaluated = runtime.evaluate(el, expression);
          if (typeof evaluated === "string") {
            config = { target: evaluated };
          } else if (typeof evaluated === "object" && evaluated !== null) {
            config = evaluated;
          } else {
            throw new Error("Invalid build configuration");
          }
        } catch (e) {
          reportError(new Error(`Build: Failed to evaluate configuration: ${e}`), el);
          return { success: false, error: String(e) };
        }
        if (!config.target) {
          reportError(new Error("Build: Missing target URI"), el);
          return { success: false, error: "Missing target URI" };
        }
        const shouldMinify = config.minify ?? false;
        const includeStyles = config.includeStyles ?? true;
        const includeScripts = config.includeScripts ?? true;
        const standalone = config.standalone ?? true;
        try {
          const scopeSelector = config.scope || "html";
          const scopeRoot = scopeSelector === "html" ? document.documentElement : document.querySelector(scopeSelector) || document.documentElement;
          const htmlContent = serializeDOM(scopeRoot);
          const styles = includeStyles ? collectStyles(scopeRoot, shouldMinify) : "";
          const scripts = includeScripts ? collectScripts(scopeRoot, shouldMinify) : "";
          let output;
          if (standalone) {
            const title = document.title || "Nexus-UX Application";
            output = buildStandaloneDocument(htmlContent, styles, scripts, config, title);
          } else {
            output = htmlContent;
          }
          const targetKey = config.target.replace(/^idb:\/\//, "");
          await writeToIDB(targetKey, output, {
            builtAt: Date.now(),
            scope: config.scope || "html",
            minified: shouldMinify,
            standalone,
            size: output.length
          });
          runtime.log(`Nexus Build: Bundle written to ${config.target} (${output.length} bytes)`);
          return {
            success: true,
            target: config.target,
            size: output.length,
            timestamp: Date.now()
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          reportError(new Error(`Build failed: ${msg}`), el);
          return { success: false, error: msg };
        }
      };
      runtime.setGlobalSignal("$build", doBuild);
      return () => {
      };
    }
  };
  var build_default = buildModule;

  // src/modules/attributes/show.ts
  var show_exports = {};
  __export(show_exports, {
    default: () => show_default
  });
  init_debug();
  var showModule = {
    name: "show",
    attribute: "show",
    handle: (el, value, runtime) => {
      const originalDisplay = el.style.display === "none" ? "" : el.style.display;
      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const show = Boolean(runtime.evaluate(el, value));
          reconcileStyle(el, { display: show ? originalDisplay || "" : "none" });
        });
        return cleanup;
      } catch (e) {
        initError("show", `Failed to initialize show: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var show_default = showModule;

  // src/modules/attributes/route.ts
  var route_exports = {};
  __export(route_exports, {
    default: () => route_default,
    routeAttributeModule: () => routeAttributeModule
  });
  init_debug();
  var routeAttributeModule = {
    name: "route-attribute",
    attribute: "route",
    // maps to data-route
    handle: (el, routePath, runtime, parsed) => {
      try {
        if (parsed?.argument)
          return;
        const globalSignals = runtime.globalSignals();
        const router = globalSignals["router"];
        if (!router || !router.addRoute) {
          reportError(
            new Error("data-route used but #router not found. Ensure data-router is present."),
            el
          );
          return;
        }
        const name = el.getAttribute("data-route-name") || void 0;
        const redirect = el.getAttribute("data-route-redirect") || void 0;
        const layout = el.getAttribute("data-route-layout") || void 0;
        const component = el.getAttribute("data-component") || void 0;
        const metaStr = el.getAttribute("data-route-meta");
        const beforeEnterExpr = el.getAttribute("data-route-before-enter");
        const afterEnterExpr = el.getAttribute("data-route-after-enter");
        const beforeLeaveExpr = el.getAttribute("data-route-before-leave");
        const afterLeaveExpr = el.getAttribute("data-route-after-leave");
        const handlerExpr = el.getAttribute("data-route-handler");
        const shadowAttr = el.getAttribute("data-route-shadow");
        const internal = shadowAttr === "" || shadowAttr === "true" || shadowAttr === "shadow";
        let meta = {};
        if (metaStr) {
          try {
            meta = runtime.evaluate(el, metaStr);
          } catch (e) {
            reportError(new Error(`Invalid data-route-meta: ${e}`), el);
          }
        }
        const readSignal = (dotted) => {
          const parts = String(dotted).split(".");
          let cur = runtime.globalSignals();
          for (const p of parts) {
            if (cur && typeof cur === "object" && p in cur) {
              cur = cur[p];
            } else {
              return void 0;
            }
          }
          return cur;
        };
        const makeHook = (expr) => expr ? (to, from) => runtime.evaluate(el, expr, {
          $to: to,
          $from: from,
          ctx: { to, from, signals: { value: readSignal } }
        }) : void 0;
        const routeRecord = {
          path: routePath,
          element: el,
          name,
          redirect,
          layout,
          component,
          meta,
          internal,
          source: "declared",
          beforeEnter: makeHook(beforeEnterExpr),
          afterEnter: makeHook(afterEnterExpr),
          beforeLeave: makeHook(beforeLeaveExpr),
          afterLeave: makeHook(afterLeaveExpr),
          handler: makeHook(handlerExpr)
        };
        router.addRoute(routeRecord);
        return () => {
          router.removeRoute(routeRecord);
        };
      } catch (e) {
        reportError(e instanceof Error ? e : new Error(String(e)), el);
      }
    }
  };
  var route_default = routeAttributeModule;

  // src/modules/attributes/class.ts
  var class_exports = {};
  __export(class_exports, {
    default: () => class_default
  });
  init_debug();
  var classModule = {
    name: "class",
    attribute: "class",
    handle: (el, value, runtime) => {
      const attrs = matchAttributes(el, "class", value);
      const cleanupFns = [];
      attrs.forEach((attr) => {
        const parsed = runtime.parseAttribute(attr.name, runtime, el);
        if (!parsed)
          return;
        try {
          const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
            const result = runtime.evaluate(el, value);
            if (parsed.argument) {
              if (result) {
                el.classList.add(parsed.argument);
              } else {
                el.classList.remove(parsed.argument);
              }
            } else {
              runtime.reconcileClass(el, result);
            }
          });
          cleanupFns.push(cleanup);
        } catch (e) {
          initError("class", `Failed to reconcile class: ${e instanceof Error ? e.message : String(e)}`, el, value);
        }
      });
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var class_default = classModule;

  // src/modules/attributes/debug.ts
  var debug_exports = {};
  __export(debug_exports, {
    default: () => debug_default
  });
  var debugModule = {
    name: "debug",
    attribute: "debug",
    handle: (el, value, runtime) => {
      const stack = getDataStack(el);
      console.group(`[Nexus Debug] Element:`, el);
      console.log("Value:", value);
      console.log("Data Stack:", stack);
      console.log("Global Signals:", runtime.globalSignals());
      console.groupEnd();
      if (value) {
        try {
          const result = runtime.evaluate(el, value);
          console.log(`[Nexus Debug] Expression "${value}" result:`, result);
        } catch (e) {
          console.error(`[Nexus Debug] Evaluation failed:`, e);
        }
      }
    }
  };
  var debug_default = debugModule;

  // src/modules/attributes/html.ts
  var html_exports = {};
  __export(html_exports, {
    default: () => html_default
  });
  init_debug();
  var htmlModule = {
    name: "html",
    attribute: "html",
    handle: (el, value, runtime) => {
      try {
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const content = runtime.evaluate(el, value);
          const html = content === void 0 || content === null ? "" : String(content);
          if (el.innerHTML !== html) {
            el.innerHTML = html;
            runtime.processElement(el);
          }
        });
        return cleanup;
      } catch (e) {
        initError("html", `Failed to bind html: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    }
  };
  var html_default = htmlModule;

  // src/modules/attributes/signal.ts
  var signal_exports = {};
  __export(signal_exports, {
    default: () => signal_default
  });
  function cloneValue(val) {
    if (Array.isArray(val)) {
      return val.map(cloneValue);
    }
    if (val !== null && typeof val === "object") {
      const res = {};
      for (const key of Object.keys(val)) {
        res[key] = cloneValue(val[key]);
      }
      return res;
    }
    return val;
  }
  var signalModule = {
    name: "signal",
    attribute: "signal",
    metadata: { after: ["ingest"] },
    handle: (el, value, runtime, parsedAttr) => {
      runtime.log(`[Nexus Signal] Handling signal on <${el.tagName}> with value:`, value.substring(0, 50) + "...");
      let expression = value;
      if (!expression && el.tagName === "SCRIPT") {
        expression = el.textContent || "";
      }
      if (!expression.trim())
        return;
      const parsed = parsedAttr || runtime.parseAttribute("data-signal", runtime, el);
      const isGlobal = parsed?.argument === "global" || parsed?.modifiers.includes("global") || el.hasAttribute("data-ux-init");
      const { ghostKeys, typeHints } = parseGhostKeys(expression);
      const initialGhostState = {};
      ghostKeys.forEach((key) => initialGhostState[key] = void 0);
      const scopeId = el.id || `el_${Math.random().toString(36).slice(2)}`;
      const stateRef = isGlobal ? runtime.ref(runtime.globalSignals()) : unifiedRef(initialGhostState, scopeId, typeHints);
      const scopeProxy = createScopeProxy(
        stateRef,
        (key, value2) => {
          if (isGlobal) {
            const globals = runtime.globalSignals();
            globals[key] = value2;
          }
        },
        () => runtime.triggerRef(stateRef)
      );
      let addCleanup;
      let lastEvaluatedState = null;
      let isEvaluating = false;
      const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
        if (isEvaluating)
          return;
        isEvaluating = true;
        try {
          let newState;
          try {
            newState = runtime.evaluate(el, expression);
          } catch (e) {
            runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, expression);
            return;
          }
          if (typeof newState === "object" && newState !== null) {
            if (!lastEvaluatedState) {
              const seeded = {};
              if (isGlobal) {
                const globals = runtime.globalSignals();
                Object.keys(newState).forEach((key) => {
                  if (!(key in globals)) {
                    globals[key] = newState[key];
                  }
                  seeded[key] = cloneValue(globals[key]);
                });
                lastEvaluatedState = seeded;
                stateRef.value = globals;
              } else {
                lastEvaluatedState = cloneValue(newState);
                stateRef.value = newState;
              }
            } else {
              const currentEval = newState;
              if (isGlobal) {
                const globals = runtime.globalSignals();
                Object.keys(currentEval).forEach((key) => {
                  const curVal = currentEval[key];
                  const lastVal = lastEvaluatedState[key];
                  let changed = curVal !== lastVal;
                  if (changed && typeof curVal === "object" && curVal !== null) {
                    changed = !deepEqual(curVal, lastVal);
                  }
                  if (changed) {
                    globals[key] = curVal;
                    lastEvaluatedState[key] = cloneValue(curVal);
                  }
                });
              } else {
                const value2 = stateRef.value;
                Object.keys(currentEval).forEach((key) => {
                  const curVal = currentEval[key];
                  const lastVal = lastEvaluatedState[key];
                  let changed = curVal !== lastVal;
                  if (changed && typeof curVal === "object" && curVal !== null) {
                    changed = !deepEqual(curVal, lastVal);
                  }
                  if (changed) {
                    value2[key] = curVal;
                    lastEvaluatedState[key] = cloneValue(curVal);
                  }
                });
              }
            }
          }
        } finally {
          isEvaluating = false;
        }
      });
      if (!isGlobal) {
        addCleanup = addScopeToNode(el, scopeProxy);
      }
      return () => {
        if (addCleanup)
          addCleanup();
        effectCleanup();
      };
    }
  };
  var signal_default = signalModule;

  // src/modules/attributes/raf.ts
  var raf_exports = {};
  __export(raf_exports, {
    default: () => raf_default
  });
  init_debug();
  var rafModule = {
    name: "raf",
    attribute: "on-raf",
    handle: (el, expression, runtime) => {
      let frame;
      let lastTime = performance.now();
      const loop = (time) => {
        const delta = time - lastTime;
        lastTime = time;
        try {
          runtime.evaluate(el, expression, {
            $time: time,
            $delta: delta
          });
        } catch (e) {
          reportError(new Error(`RAF error: ${e}`), el);
          return;
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frame);
    }
  };
  var raf_default = rafModule;

  // src/modules/sprites/gql.ts
  var gql_exports = {};
  __export(gql_exports, {
    configureGqlClient: () => configureGqlClient,
    default: () => gql_default,
    gqlSprite: () => gqlSprite
  });
  var defaultEndpoint = "/graphql";
  function configureGqlClient(config) {
    if (config.endpoint)
      defaultEndpoint = config.endpoint;
  }
  async function executeGraphQL(endpoint, query, variables, operationName) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: variables || {},
        operationName
      })
    });
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    if (result.errors) {
      return result;
    }
    return result;
  }
  function gqlSprite(runtime) {
    const endpoint = runtime.config?.gqlEndpoint || defaultEndpoint;
    return async (query, variables, options) => {
      const actualEndpoint = options?.endpoint || endpoint;
      const operationName = options?.operationName;
      const result = runtime.reactive({
        data: null,
        errors: null,
        loading: true,
        status: "loading"
      });
      try {
        const numericFields = [];
        const fieldMatch = query.match(/\{[\s\S]*?\}\s*$/m);
        if (fieldMatch) {
          const queryBody = fieldMatch[0];
          const topLevelFields = queryBody.match(/(?:query|mutation)\s*(?:\([^)]*\))?\s*\{([^{}]+)\{/);
          if (topLevelFields) {
            const fields = topLevelFields[1].split(",").map((f) => f.trim().split(" ")[0]);
            fields.forEach((f) => {
              if (/_id|_count|_amount|_price|_qty|num|age|year$/i.test(f)) {
                numericFields.push(f);
                heap.allocateNumeric(f);
              }
            });
          }
        }
        const response = await executeGraphQL(actualEndpoint, query, variables, operationName);
        if (response.data && typeof response.data === "object" && numericFields.length > 0) {
          const dataObj = response.data;
          Object.entries(dataObj).forEach(([key, value]) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              const nested = value;
              Object.entries(nested).forEach(([field, fieldValue]) => {
                if (typeof fieldValue === "number" && numericFields.includes(field)) {
                  heap.setNumeric(`${field}_0`, fieldValue);
                }
              });
            }
          });
        }
        result.data = response.data;
        result.errors = response.errors || null;
        result.status = response.errors ? "error" : "success";
      } catch (err2) {
        result.errors = [{
          message: err2 instanceof Error ? err2.message : String(err2)
        }];
        result.status = "error";
      } finally {
        result.loading = false;
      }
      return result;
    };
  }
  function gql_default(runtime) {
    return {
      $gql: gqlSprite(runtime)
    };
  }

  // src/modules/sprites/mcp.ts
  var mcp_exports2 = {};
  __export(mcp_exports2, {
    mcpModule: () => mcpModule
  });
  var mcpModule = {
    name: "mcp",
    key: "$mcp",
    sprites: (context) => {
      const client = context.mcp;
      class StreamBuffer {
        buffer = "";
        lastFlush = 0;
        signal;
        constructor(targetSignal) {
          this.signal = targetSignal;
        }
        append(chunk) {
          this.buffer += chunk;
          const now = performance.now();
          if (now - this.lastFlush > 16) {
            this.flush();
          }
        }
        flush() {
          this.signal.value = this.buffer;
          this.lastFlush = performance.now();
        }
      }
      return {
        /**
         * AI Sampling: $mcp.ask(prompt)
         */
        ask: (prompt) => {
          if (!client)
            return "Error: No MCP Server configured.";
          const output = reactive({ value: "" });
          const buffer = new StreamBuffer(output);
          client.sendRequest("sampling/createMessage", {
            messages: [{ role: "user", content: { type: "text", text: prompt } }]
          }).then((res) => {
            if (res?.content?.text) {
              buffer.append(res.content.text);
              buffer.flush();
            }
          });
          client.onNotification("notifications/sampling/delta", (params) => {
            if (params.delta?.text) {
              buffer.append(params.delta.text);
            }
          });
          return output;
        },
        /**
         * Resource Reading: $mcp.read(uri)
         */
        read: async (uri) => {
          if (!client)
            throw new Error("No MCP Server configured.");
          const res = await client.sendRequest("resources/read", { uri });
          return res?.contents?.[0]?.text || null;
        },
        /**
         * Tool Calling: $mcp.call(name, args)
         */
        call: async (name, args = {}) => {
          if (!client)
            throw new Error("No MCP Server configured.");
          const res = await client.sendRequest("tools/call", { name, arguments: args });
          return res?.content?.[0] || null;
        }
      };
    }
  };

  // src/modules/sprites/periodicSync.ts
  var periodicSync_exports = {};
  __export(periodicSync_exports, {
    default: () => periodicSyncFactory
  });
  function periodicSyncFactory(runtime) {
    return {
      $periodicSync: {
        /**
         * Register a periodic background sync.
         * Returns reactive { status, error }.
         */
        register(tag, options) {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker not available";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("periodicSync" in reg)) {
                op.error = "Periodic Background Sync API not supported";
                op.status = "error";
                return;
              }
              await reg.periodicSync.register(tag, options || {});
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Unregister a periodic sync tag.
         */
        unregister(tag) {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("periodicSync" in reg)) {
                op.error = "Periodic Background Sync API not supported";
                op.status = "error";
                return;
              }
              await reg.periodicSync.unregister(tag);
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Get all registered periodic sync tags.
         */
        get tags() {
          const op = runtime.reactive({
            data: [],
            status: "loading",
            error: null
          });
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("periodicSync" in reg)) {
                op.error = "Periodic Background Sync API not supported";
                op.status = "error";
                return;
              }
              const tags = await reg.periodicSync.getTags();
              op.data = tags;
              op.status = "ready";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        }
      }
    };
  }

  // src/modules/sprites/flow.ts
  var flow_exports2 = {};
  __export(flow_exports2, {
    default: () => flow_default2,
    flowModule: () => flowModule
  });
  var flowModule = {
    name: "flow",
    key: "$flow",
    sprites: (context) => {
      const calculateControlOffset = (distance, curvature) => distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
      const controlWithCurvature = (side, x1, y1, x2, y2, c) => {
        switch (side) {
          case "left":
            return [x1 - calculateControlOffset(x1 - x2, c), y1];
          case "right":
            return [x1 + calculateControlOffset(x2 - x1, c), y1];
          case "top":
            return [x1, y1 - calculateControlOffset(y1 - y2, c)];
          case "bottom":
            return [x1, y1 + calculateControlOffset(y2 - y1, c)];
        }
      };
      const bezierPath = (sx, sy, ssIde, tx, ty, tSide, curvature = 0.25) => {
        const [scx, scy] = controlWithCurvature(ssIde, sx, sy, tx, ty, curvature);
        const [tcx, tcy] = controlWithCurvature(tSide, tx, ty, sx, sy, curvature);
        return `M${sx},${sy} C${scx},${scy} ${tcx},${tcy} ${tx},${ty}`;
      };
      const straightPath = (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`;
      const stepPath = (x1, y1, x2, y2) => {
        const mx = x1 + (x2 - x1) / 2;
        return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
      };
      const viewportOf = (el) => {
        const flow = el?.closest("[data-flow]");
        const vp = flow?.__nexusFlowViewport;
        return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
      };
      const flowContainer = (el) => el?.closest("[data-flow]") || null;
      const screenToFlow = (clientX, clientY, container, vp) => {
        const r = container.getBoundingClientRect();
        return {
          x: (clientX - r.left - vp.x) / vp.zoom,
          y: (clientY - r.top - vp.y) / vp.zoom
        };
      };
      const anchorFlow = (el, container, vp) => {
        const r = el.getBoundingClientRect();
        return screenToFlow(r.left + r.width / 2, r.top + r.height / 2, container, vp);
      };
      const inferSide = (handle, node) => {
        const declared = (handle.getAttribute("data-flow-side") || "").toLowerCase();
        if (declared === "left" || declared === "right" || declared === "top" || declared === "bottom") {
          return declared;
        }
        const h = handle.getBoundingClientRect();
        const n = node.getBoundingClientRect();
        const hx = h.left + h.width / 2;
        const hy = h.top + h.height / 2;
        const relX = (hx - n.left) / (n.width || 1);
        const relY = (hy - n.top) / (n.height || 1);
        const dl = relX, dr = 1 - relX, dt = relY, db = 1 - relY;
        const min = Math.min(dl, dr, dt, db);
        if (min === dl)
          return "left";
        if (min === dr)
          return "right";
        if (min === dt)
          return "top";
        return "bottom";
      };
      const findHandle = (node, role) => {
        const real = (sel) => Array.from(node.querySelectorAll(sel)).find((el) => !el.hasAttribute("data-ux-template") && !el.hasAttribute("data-for")) || null;
        return real(`[data-nexus-flow-handle="${role}"]`) || real("[data-nexus-flow-handle]");
      };
      const $flow = {
        /** Screen coordinates -> flow-space (public, xyflow pointToRendererPoint). */
        screenToFlow: (container, x, y, state) => screenToFlow(x, y, container, state),
        /** Bounding box of a node collection in flow-space. */
        getBounds: (nodes) => {
          if (!nodes || nodes.length === 0)
            return { x: 0, y: 0, w: 0, h: 0 };
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          nodes.forEach((n) => {
            const p = n.position || n;
            const x = p.x || 0, y = p.y || 0, w = n.w || n.width || 160, h = n.h || n.height || 90;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
          });
          return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        },
        /** Center + zoom the viewport to fit all nodes (mutates viewport state). */
        fitView: (container, state, nodes, padding = 40) => {
          const bounds = $flow.getBounds(nodes);
          if (bounds.w <= 0 || bounds.h <= 0)
            return;
          const rect = container.getBoundingClientRect();
          const zoom = Math.min(
            (rect.width - padding * 2) / bounds.w,
            (rect.height - padding * 2) / bounds.h,
            1.5
          );
          state.x = (rect.width - bounds.w * zoom) / 2 - bounds.x * zoom;
          state.y = (rect.height - bounds.h * zoom) / 2 - bounds.y * zoom;
          state.zoom = zoom;
        },
        /**
         * Synchronous edge path string between two nodes (by DOM id), computed in
         * flow-space so it is independent of the current pan/zoom. The edges SVG
         * lives inside the transformed viewport, so this flow-space `d` renders
         * correctly and stays attached to handles as the canvas pans/zooms.
         *
         * Uses the real xyflow directional bezier anchored at the source/target
         * handle elements, inferring each handle's side from its geometry.
         */
        edge: (sourceId, targetId, options = {}) => {
          const a = document.getElementById(sourceId);
          const b = document.getElementById(targetId);
          if (!a || !b)
            return "";
          const container = options.container || flowContainer(a) || flowContainer(b);
          if (!container)
            return "";
          const vp = viewportOf(a);
          const srcHandle = findHandle(a, "source");
          const tgtHandle = findHandle(b, "target");
          const sAnchor = srcHandle || a;
          const tAnchor = tgtHandle || b;
          const s = anchorFlow(sAnchor, container, vp);
          const t = anchorFlow(tAnchor, container, vp);
          const type = options.type || "bezier";
          if (type === "straight")
            return straightPath(s.x, s.y, t.x, t.y);
          if (type === "step")
            return stepPath(s.x, s.y, t.x, t.y);
          const sSide = srcHandle ? inferSide(srcHandle, a) : "right";
          const tSide = tgtHandle ? inferSide(tgtHandle, b) : "left";
          return bezierPath(s.x, s.y, sSide, t.x, t.y, tSide, options.curvature ?? 0.25);
        },
        /**
         * Reactive edge attached to two live DOM elements. Returns a reactive
         * `{ d }` that self-updates every frame — used for the connection preview
         * and any imperative edge rendering.
         */
        connect: (elA, elB, options = {}) => {
          const pathData = reactive({ d: "" });
          const update = () => {
            if (!elA || !elB || typeof elA.getBoundingClientRect !== "function")
              return;
            const container = flowContainer(elA) || flowContainer(elB);
            if (!container)
              return;
            const vp = viewportOf(elA);
            const s = anchorFlow(elA, container, vp);
            const t = anchorFlow(elB, container, vp);
            const type = options.type || "bezier";
            if (type === "straight") {
              pathData.d = straightPath(s.x, s.y, t.x, t.y);
              return;
            }
            if (type === "step") {
              pathData.d = stepPath(s.x, s.y, t.x, t.y);
              return;
            }
            pathData.d = bezierPath(
              s.x,
              s.y,
              inferSide(elA, elA.parentElement || elA),
              t.x,
              t.y,
              inferSide(elB, elB.parentElement || elB),
              options.curvature ?? 0.25
            );
          };
          const ticker = () => {
            update();
            requestAnimationFrame(ticker);
          };
          ticker();
          return pathData;
        }
      };
      context.$flow = $flow;
      return $flow;
    }
  };
  var flow_default2 = flowModule;

  // src/modules/sprites/bgSync.ts
  var bgSync_exports = {};
  __export(bgSync_exports, {
    default: () => bgSyncFactory
  });
  function bgSyncFactory(runtime) {
    return {
      $bgSync: {
        /**
         * Register a one-time background sync.
         * Returns reactive { status, error }.
         */
        register(tag) {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker not available";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("sync" in reg)) {
                op.error = "Background Sync API not supported";
                op.status = "error";
                return;
              }
              await reg.sync.register(tag);
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Get all registered sync tags.
         * Returns reactive { data: string[], status, error }.
         */
        get tags() {
          const op = runtime.reactive({
            data: [],
            status: "loading",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker not available";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("sync" in reg)) {
                op.error = "Background Sync API not supported";
                op.status = "error";
                return;
              }
              const tags = await reg.sync.getTags();
              op.data = tags;
              op.status = "ready";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        }
      }
    };
  }

  // src/modules/sprites/bgFetch.ts
  var bgFetch_exports = {};
  __export(bgFetch_exports, {
    default: () => bgFetchFactory
  });
  function bgFetchFactory(runtime) {
    return {
      $bgFetch: {
        /**
         * Start a background fetch.
         * Returns reactive { data: BackgroundFetchRegistration | null, status, error }.
         */
        fetch(id, requests, options) {
          const op = runtime.reactive({
            data: null,
            status: "pending",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker not available";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("backgroundFetch" in reg)) {
                op.error = "Background Fetch API not supported";
                op.status = "error";
                return;
              }
              const bgFetch = await reg.backgroundFetch.fetch(id, requests, options || {});
              op.data = bgFetch;
              op.status = "done";
              bgFetch.addEventListener("progress", () => {
                op.data = { ...bgFetch, downloaded: bgFetch.downloaded, downloadTotal: bgFetch.downloadTotal };
              });
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Get an existing background fetch registration.
         */
        get(id) {
          const op = runtime.reactive({
            data: null,
            status: "loading",
            error: null
          });
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("backgroundFetch" in reg)) {
                op.error = "Background Fetch API not supported";
                op.status = "error";
                return;
              }
              const bgFetch = await reg.backgroundFetch.get(id);
              op.data = bgFetch;
              op.status = "ready";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Abort a background fetch.
         */
        abort(id) {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (!("backgroundFetch" in reg)) {
                op.error = "Background Fetch API not supported";
                op.status = "error";
                return;
              }
              const bgFetch = await reg.backgroundFetch.get(id);
              if (bgFetch) {
                await bgFetch.abort();
                op.status = "done";
              } else {
                op.error = `No background fetch with id '${id}'`;
                op.status = "error";
              }
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        }
      }
    };
  }

  // src/modules/sprites/push.ts
  var push_exports = {};
  __export(push_exports, {
    default: () => pushFactory
  });
  function pushFactory(runtime) {
    const state = runtime.reactive({
      subscription: null,
      status: "idle",
      error: null
    });
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            state.subscription = sub;
            state.status = "active";
          }
        }).catch(() => {
        });
      }).catch(() => {
      });
    }
    return {
      $push: {
        get subscription() {
          return state.subscription;
        },
        get status() {
          return state.status;
        },
        /**
         * Subscribe to push notifications.
         * @param applicationServerKey - VAPID public key (base64 or Uint8Array)
         */
        subscribe(applicationServerKey) {
          const op = runtime.reactive({
            data: null,
            status: "pending",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker not available";
            op.status = "error";
            return op;
          }
          state.status = "subscribing";
          (async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              let key;
              if (typeof applicationServerKey === "string") {
                const raw = atob(applicationServerKey.replace(/-/g, "+").replace(/_/g, "/"));
                key = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++)
                  key[i] = raw.charCodeAt(i);
              } else {
                key = applicationServerKey;
              }
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: key
              });
              state.subscription = sub;
              state.status = "active";
              op.data = sub;
              op.status = "done";
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              op.error = msg;
              op.status = "error";
              state.error = msg;
              state.status = "error";
            }
          })();
          return op;
        },
        /**
         * Unsubscribe from push notifications.
         */
        unsubscribe() {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (!state.subscription) {
            op.error = "No active subscription";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              await state.subscription.unsubscribe();
              state.subscription = null;
              state.status = "idle";
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        }
      }
    };
  }

  // src/manifest.ts
  init_predictive();

  // src/modules/sprites/sql.ts
  var sql_exports = {};
  __export(sql_exports, {
    configureSqlClient: () => configureSqlClient,
    default: () => sql_default,
    sqlSprite: () => sqlSprite
  });
  var connectionPool = /* @__PURE__ */ new Map();
  var pendingRequests = /* @__PURE__ */ new Map();
  var liveQueries = /* @__PURE__ */ new Map();
  var requestId = 0;
  var defaultNs = "test";
  var defaultDb = "test";
  var authToken = null;
  function getConnection(url) {
    if (!connectionPool.has(url)) {
      connectionPool.set(url, {
        ws: null,
        connected: false,
        ready: false
      });
    }
    return connectionPool.get(url);
  }
  function connect(url, ns, db) {
    return new Promise((resolve, reject) => {
      const conn = getConnection(url);
      if (conn.ready) {
        resolve(true);
        return;
      }
      if (conn.ws) {
        conn.ws.close();
      }
      conn.ws = new WebSocket(url);
      conn.connected = false;
      conn.ready = false;
      conn.ws.onopen = () => {
        conn.connected = true;
        if (ns || defaultNs || db || defaultDb) {
          sendRequest(conn.ws, "use", {
            namespace: ns || defaultNs,
            database: db || defaultDb
          }).then(() => {
            conn.ready = true;
            resolve(true);
          }).catch(reject);
        } else {
          conn.ready = true;
          resolve(true);
        }
      };
      conn.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.id && pendingRequests.has(response.id)) {
            const { resolve: res, reject: rej } = pendingRequests.get(response.id);
            pendingRequests.delete(response.id);
            if (response.error) {
              rej(new Error(response.error.message));
            } else {
              res(response.result);
            }
          }
          if (response.method === "notify" && response.params) {
            const [notification] = response.params;
            if (notification.id && liveQueries.has(notification.id)) {
              liveQueries.get(notification.id)(notification.result);
            }
          }
        } catch (e) {
          console.error("[Nexus SQL] Failed to parse WebSocket message:", e);
        }
      };
      conn.ws.onerror = () => {
        conn.connected = false;
        conn.ready = false;
        reject(new Error("WebSocket connection failed"));
      };
      conn.ws.onclose = () => {
        conn.connected = false;
        conn.ready = false;
        pendingRequests.forEach(({ reject: reject2 }) => reject2(new Error("Connection closed")));
        pendingRequests.clear();
      };
    });
  }
  function sendRequest(ws, method, params) {
    return new Promise((resolve, reject) => {
      const id = String(++requestId);
      pendingRequests.set(id, { resolve, reject });
      const message = JSON.stringify({
        id,
        method,
        params: params || []
      });
      ws.send(message);
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 3e4);
    });
  }
  async function executeQuery(url, query, vars, ns, db) {
    await connect(url, ns, db);
    const conn = getConnection(url);
    if (authToken && conn.ws) {
      try {
        await sendRequest(conn.ws, "authenticate", { token: authToken });
      } catch (e) {
        console.warn("[Nexus SQL] Authentication failed:", e);
      }
    }
    return sendRequest(conn.ws, "query", {
      sql: query,
      vars: vars || {}
    });
  }
  async function subscribeLive(url, query, callback, ns, db) {
    await connect(url, ns, db);
    const conn = getConnection(url);
    const result = await sendRequest(conn.ws, "query", {
      sql: query,
      vars: {}
    });
    const liveId = result[0]?.id;
    if (liveId) {
      liveQueries.set(liveId, callback);
    }
    return liveId;
  }
  function configureSqlClient(config) {
    if (config.namespace)
      defaultNs = config.namespace;
    if (config.database)
      defaultDb = config.database;
    if (config.token)
      authToken = config.token;
  }
  function sqlSprite(runtime) {
    const url = runtime.config?.sqlUrl || "ws://localhost:8000/rpc";
    const ns = runtime.config?.sqlNs || defaultNs;
    const db = runtime.config?.sqlDb || defaultDb;
    return async (query, vars) => {
      const isLive = query.trim().toUpperCase().startsWith("LIVE");
      const result = runtime.reactive({
        data: [],
        status: isLive ? "connecting" : "loading",
        error: null,
        liveId: null
      });
      try {
        if (isLive) {
          const numericFields = [];
          const fieldMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
          if (fieldMatch) {
            const fields = fieldMatch[1].split(",").map((f) => f.trim());
            fields.forEach((f) => {
              if (f !== "*" && !f.includes("(")) {
                const fieldName = f.split(" AS ").pop()?.trim() || f.trim();
                if (/_id|_count|_at|_time|_amount|_price|_qty$/.test(fieldName.toLowerCase())) {
                  numericFields.push(fieldName);
                  heap.allocateNumeric(fieldName);
                }
              }
            });
          }
          const liveId = await subscribeLive(url, query, (data) => {
            const arr = Array.isArray(data) ? data : [];
            if (numericFields.length > 0) {
              arr.forEach((row, idx) => {
                if (row && typeof row === "object") {
                  numericFields.forEach((field) => {
                    if (typeof row[field] === "number") {
                      heap.setNumeric(`${field}_${idx}`, row[field]);
                    }
                  });
                }
              });
            }
            result.data = arr;
            result.status = "live";
          }, ns, db);
          result.liveId = liveId;
          result.status = "live";
        } else {
          const response = await executeQuery(url, query, vars, ns, db);
          const queryResult = response[0]?.result || response;
          if (Array.isArray(queryResult) && queryResult.length > 10) {
            const sample = queryResult[0];
            if (sample && typeof sample === "object") {
              const keys = Object.keys(sample);
              const numericCount = keys.filter((k) => typeof sample[k] === "number").length;
              if (numericCount / keys.length >= 0.5) {
                keys.forEach((k) => {
                  if (typeof sample[k] === "number") {
                    heap.allocateNumeric(k);
                  }
                });
                queryResult.forEach((row, idx) => {
                  if (row && typeof row === "object") {
                    keys.forEach((k) => {
                      if (typeof row[k] === "number") {
                        heap.setNumeric(`${k}_${idx}`, row[k]);
                      }
                    });
                  }
                });
              }
            }
          }
          result.data = queryResult;
          result.status = "ready";
        }
      } catch (err2) {
        result.error = err2 instanceof Error ? err2.message : String(err2);
        result.status = "error";
      }
      return result;
    };
  }
  function sql_default(runtime) {
    return {
      $sql: sqlSprite(runtime)
    };
  }

  // src/modules/sprites/sw.ts
  var sw_exports = {};
  __export(sw_exports, {
    default: () => swFactory
  });
  function swFactory(runtime) {
    const state = runtime.reactive({
      status: "idle",
      controller: null,
      registration: null,
      error: null,
      updateAvailable: false
    });
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const sw = navigator.serviceWorker;
      if (sw.controller) {
        state.status = "active";
        state.controller = sw.controller;
      }
      sw.addEventListener("controllerchange", () => {
        state.controller = sw.controller;
        state.status = sw.controller ? "active" : "idle";
      });
      sw.addEventListener("message", (event) => {
        runtime.evaluate(document.body, `$dispatch('sw:message', ${JSON.stringify(event.data)})`, {});
      });
    }
    return {
      $sw: {
        /**
         * Reactive status of the service worker.
         */
        get status() {
          return state.status;
        },
        /**
         * Reactive reference to the active controller.
         */
        get controller() {
          return state.controller;
        },
        /**
         * Whether an update is waiting to be activated.
         */
        get updateAvailable() {
          return state.updateAvailable;
        },
        /**
         * Register a service worker.
         * Returns reactive { status, error } container.
         */
        register(scriptURL, options) {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            op.error = "Service Worker API not available";
            op.status = "error";
            return op;
          }
          state.status = "registering";
          (async () => {
            try {
              const registration = await navigator.serviceWorker.register(scriptURL, options);
              state.registration = registration;
              if (registration.waiting) {
                state.updateAvailable = true;
                state.status = "waiting";
              }
              registration.addEventListener("updatefound", () => {
                const installing = registration.installing;
                if (installing) {
                  installing.addEventListener("statechange", () => {
                    if (installing.state === "installed") {
                      if (navigator.serviceWorker.controller) {
                        state.updateAvailable = true;
                        state.status = "waiting";
                      } else {
                        state.status = "active";
                      }
                    }
                  });
                }
              });
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
              state.error = op.error;
              state.status = "error";
            }
          })();
          return op;
        },
        /**
         * Check for service worker updates.
         */
        update() {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (!state.registration) {
            op.error = "No service worker registered";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              await state.registration.update();
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Unregister the active service worker.
         */
        unregister() {
          const op = runtime.reactive({
            status: "pending",
            error: null
          });
          if (!state.registration) {
            op.error = "No service worker registered";
            op.status = "error";
            return op;
          }
          (async () => {
            try {
              const success = await state.registration.unregister();
              if (success) {
                state.status = "idle";
                state.controller = null;
                state.registration = null;
                state.updateAvailable = false;
              }
              op.status = "done";
            } catch (e) {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = "error";
            }
          })();
          return op;
        },
        /**
         * Send a message to the active service worker.
         */
        postMessage(data) {
          if (state.controller) {
            state.controller.postMessage(data);
          }
        },
        /**
         * Skip waiting — activate the waiting worker immediately.
         */
        skipWaiting() {
          if (state.registration?.waiting) {
            state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }
    };
  }

  // src/modules/sprites/svg.ts
  var svg_exports = {};
  __export(svg_exports, {
    svgModule: () => svgModule
  });
  var svgModule = {
    name: "svg",
    key: "$svg",
    sprites: (context) => {
      const generators = {
        straight: (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`,
        bezier: (x1, y1, x2, y2) => {
          const dx = Math.abs(x1 - x2) / 2;
          return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        },
        step: (x1, y1, x2, y2) => {
          const mx = x1 + (x2 - x1) / 2;
          return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
        }
      };
      return {
        /**
         * Connects two elements with a reactive SVG path.
         */
        connect: (elA, elB, options = {}) => {
          const type = options.type || "bezier";
          const pathData = reactive({ d: "" });
          const update = () => {
            if (!elA || !elB)
              return;
            try {
              const rA = typeof elA.getBoundingClientRect === "function" ? elA.getBoundingClientRect() : null;
              const rB = typeof elB.getBoundingClientRect === "function" ? elB.getBoundingClientRect() : null;
              if (!rA || !rB)
                return;
              const x1 = rA.left + rA.width / 2;
              const y1 = rA.top + rA.height / 2;
              const x2 = rB.left + rB.width / 2;
              const y2 = rB.top + rB.height / 2;
              const generator = generators[type] || generators.bezier;
              pathData.d = generator(x1, y1, x2, y2);
            } catch (e) {
            }
          };
          const ticker = () => {
            update();
            requestAnimationFrame(ticker);
          };
          ticker();
          return pathData;
        },
        /**
         * Generates a reactive path string from a point array.
         */
        path: (points, closed = false) => {
          if (points.length < 2)
            return "";
          let d = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
          }
          if (closed)
            d += " Z";
          return d;
        },
        /**
         * Animates any SVG attribute using native WAAPI.
         */
        animate: (el, keyframes, options) => {
          return el.animate(keyframes, options);
        },
        /**
         * Pulse an element using a native scale transform.
         */
        pulse: (el, options = {}) => {
          return el.animate([
            { transform: "scale(1)" },
            { transform: `scale(${options.scale || 1.1})` },
            { transform: "scale(1)" }
          ], {
            duration: options.duration || 1e3,
            iterations: Infinity,
            easing: "ease-in-out"
          });
        },
        /**
         * Morph one path into another.
         * Uses path() notation for WAAPI support in modern browsers.
         */
        morph: (el, targetD, options = {}) => {
          const currentD = el.getAttribute("d") || "";
          return el.animate([
            { d: `path("${currentD}")` },
            { d: `path("${targetD}")` }
          ], {
            duration: options.duration || 500,
            easing: options.easing || "ease-in-out",
            fill: "forwards"
          });
        }
      };
    }
  };

  // src/modules/scopes/view.ts
  var viewScope = reactive({
    width: typeof window !== "undefined" ? globalThis.innerWidth : 1024,
    height: typeof window !== "undefined" ? globalThis.innerHeight : 768,
    scrollX: typeof window !== "undefined" ? globalThis.scrollX : 0,
    scrollY: typeof window !== "undefined" ? globalThis.scrollY : 0,
    orientation: typeof window !== "undefined" && globalThis.screen.orientation ? globalThis.screen.orientation.type : "landscape-primary",
    devicePixelRatio: typeof window !== "undefined" ? globalThis.devicePixelRatio : 1,
    isPortrait: typeof window !== "undefined" ? globalThis.innerHeight > globalThis.innerWidth : false,
    isLandscape: typeof window !== "undefined" ? globalThis.innerWidth >= globalThis.innerHeight : true
  });

  // src/modules/scopes/auth.ts
  var authScope = reactive({
    user: null,
    isAuthenticated: false,
    roles: [],
    token: null,
    // Methods to simulate login/logout for now
    login: (userData) => {
      authScope.user = userData;
      authScope.isAuthenticated = true;
      authScope.roles = userData.roles || [];
    },
    logout: () => {
      authScope.user = null;
      authScope.isAuthenticated = false;
      authScope.roles = [];
      authScope.token = null;
    }
  });

  // src/modules/scopes/os.ts
  var getOS = () => {
    if (typeof navigator === "undefined")
      return "unknown";
    const ua = navigator.userAgent;
    if (/Mac/.test(ua))
      return "macos";
    if (/Win/.test(ua))
      return "windows";
    if (/Linux/.test(ua))
      return "linux";
    if (/Android/.test(ua))
      return "android";
    if (/iPhone|iPad|iPod/.test(ua))
      return "ios";
    return "unknown";
  };
  var getTheme = () => {
    if (typeof window === "undefined")
      return "light";
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  var osScope = reactive({
    platform: getOS(),
    theme: getTheme(),
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    isDesktop: !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  });

  // src/modules/scopes/native.ts
  var nativeScope = reactive({
    isPresent: false,
    platform: "web",
    bridge: null
  });
  if (typeof window !== "undefined" && window.nexusNative) {
    const native = window.nexusNative;
    nativeScope.isPresent = true;
    nativeScope.platform = native.platform || "unknown";
    nativeScope.bridge = native;
  }

  // src/modules/modifiers/drag.ts
  var drag_exports2 = {};
  __export(drag_exports2, {
    default: () => drag_default2,
    dragModifier: () => dragModifier
  });
  var dragModifier = {
    name: "drag",
    handle: (_payload, _element, _argument, _runtime) => {
    },
    interceptPipeline: (evaluate2, element, _argument, _runtime) => {
      let startX = 0;
      let startY = 0;
      let isDragging = false;
      return (el, expression, extras) => {
        return evaluate2(el, expression, {
          ...extras,
          $drag: {
            start: (e) => {
              element.setPointerCapture(e.pointerId);
              startX = e.clientX;
              startY = e.clientY;
              isDragging = true;
            },
            move: (e) => {
              if (!isDragging)
                return null;
              return {
                dx: e.clientX - startX,
                dy: e.clientY - startY,
                x: e.clientX,
                y: e.clientY
              };
            },
            stop: (e) => {
              isDragging = false;
              element.releasePointerCapture(e.pointerId);
            }
          }
        });
      };
    }
  };
  var drag_default2 = dragModifier;

  // src/modules/modifiers/zoom.ts
  var zoom_exports = {};
  __export(zoom_exports, {
    default: () => zoom_default,
    zoomModifier: () => zoomModifier
  });
  var zoomModifier = {
    name: "zoom",
    handle: (_payload, _element, _argument, _runtime) => {
    },
    interceptPipeline: (evaluate2, _element, _argument, _runtime) => {
      return (el, expression, extras) => {
        return evaluate2(el, expression, {
          ...extras,
          $zoom: (e) => {
            if (e instanceof WheelEvent) {
              const delta = e.deltaY;
              return {
                delta: delta > 0 ? 0.9 : 1.1,
                x: e.clientX,
                y: e.clientY
              };
            }
            return { delta: 1, x: 0, y: 0 };
          }
        });
      };
    }
  };
  var zoom_default = zoomModifier;

  // src/modules/modifiers/stop.ts
  var stop_exports = {};
  __export(stop_exports, {
    default: () => stop_default,
    stopModifier: () => stopModifier
  });
  var stopModifier = {
    name: "stop",
    handle: (payload, _el, _arg, _runtime) => {
      if (typeof payload === "function") {
        return (e) => {
          e.stopPropagation();
          return payload(e);
        };
      }
      return payload;
    }
  };
  var stop_default = stopModifier;

  // src/modules/modifiers/keys.ts
  var keys_exports = {};
  __export(keys_exports, {
    altModifier: () => altModifier,
    ctrlModifier: () => ctrlModifier,
    default: () => keys_default,
    deleteModifier: () => deleteModifier,
    downModifier: () => downModifier,
    enterModifier: () => enterModifier,
    escModifier: () => escModifier,
    escapeModifier: () => escapeModifier,
    leftModifier: () => leftModifier,
    metaModifier: () => metaModifier,
    rightModifier: () => rightModifier,
    shiftModifier: () => shiftModifier,
    spaceModifier: () => spaceModifier,
    tabModifier: () => tabModifier,
    upModifier: () => upModifier
  });
  var isKeyboardEvent = (e) => "key" in e;
  var createKeyModifier = (name, check) => ({
    name,
    handle: (payload, _el, _arg, _runtime) => {
      if (typeof payload === "function") {
        return (e) => {
          if (isKeyboardEvent(e) && check(e)) {
            return payload(e);
          }
        };
      }
      return payload;
    }
  });
  var enterModifier = createKeyModifier("enter", (e) => e.key === "Enter");
  var escapeModifier = createKeyModifier("escape", (e) => e.key === "Escape");
  var escModifier = createKeyModifier("esc", (e) => e.key === "Escape");
  var spaceModifier = createKeyModifier("space", (e) => e.key === " " || e.key === "Spacebar");
  var upModifier = createKeyModifier("up", (e) => e.key === "ArrowUp" || e.key === "Up");
  var downModifier = createKeyModifier("down", (e) => e.key === "ArrowDown" || e.key === "Down");
  var leftModifier = createKeyModifier("left", (e) => e.key === "ArrowLeft" || e.key === "Left");
  var rightModifier = createKeyModifier("right", (e) => e.key === "ArrowRight" || e.key === "Right");
  var tabModifier = createKeyModifier("tab", (e) => e.key === "Tab");
  var deleteModifier = createKeyModifier("delete", (e) => e.key === "Delete" || e.key === "Backspace");
  var ctrlModifier = createKeyModifier("ctrl", (e) => e.ctrlKey);
  var altModifier = createKeyModifier("alt", (e) => e.altKey);
  var shiftModifier = createKeyModifier("shift", (e) => e.shiftKey);
  var metaModifier = createKeyModifier("meta", (e) => e.metaKey);
  var keys_default = {
    enter: enterModifier,
    escape: escapeModifier,
    esc: escModifier,
    space: spaceModifier,
    up: upModifier,
    down: downModifier,
    left: leftModifier,
    right: rightModifier,
    tab: tabModifier,
    delete: deleteModifier,
    ctrl: ctrlModifier,
    alt: altModifier,
    shift: shiftModifier,
    meta: metaModifier
  };

  // src/modules/modifiers/self.ts
  var self_exports = {};
  __export(self_exports, {
    default: () => self_default,
    selfModifier: () => selfModifier
  });
  var selfModifier = {
    name: "self",
    handle: (payload, el, _arg, _runtime) => {
      if (typeof payload === "function") {
        return (e) => {
          if (e.target === el)
            return payload(e);
        };
      }
      return payload;
    }
  };
  var self_default = selfModifier;

  // src/modules/modifiers/prevent.ts
  var prevent_exports = {};
  __export(prevent_exports, {
    default: () => prevent_default,
    preventModifier: () => preventModifier
  });
  var preventModifier = {
    name: "prevent",
    handle: (payload, _el, _arg, _runtime) => {
      if (typeof payload === "function") {
        return (e) => {
          e.preventDefault();
          return payload(e);
        };
      }
      return payload;
    }
  };
  var prevent_default = preventModifier;

  // src/modules/modifiers/throttle.ts
  var throttle_exports = {};
  __export(throttle_exports, {
    default: () => throttle_default,
    throttleModifier: () => throttleModifier
  });
  init_consts();
  var throttleModifier = {
    name: "throttle",
    handle: (payload, _el, arg, _runtime) => {
      const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
      let last = 0;
      if (typeof payload === "function") {
        return (e) => {
          const now = performance.now();
          if (now - last > wait) {
            last = now;
            return payload(e);
          }
        };
      }
      return (...args) => {
        const now = performance.now();
        if (now - last > wait) {
          last = now;
          return typeof payload === "function" ? payload(...args) : payload;
        }
      };
    }
  };
  var throttle_default = throttleModifier;

  // src/modules/modifiers/once.ts
  var once_exports = {};
  __export(once_exports, {
    default: () => once_default,
    onceModifier: () => onceModifier
  });
  var onceModifier = {
    name: "once",
    handle: (payload, _el, _arg, _runtime) => {
      let fired = false;
      if (typeof payload === "function") {
        return (e) => {
          if (!fired) {
            fired = true;
            return payload(e);
          }
        };
      }
      return (...args) => {
        if (!fired) {
          fired = true;
          return typeof payload === "function" ? payload(...args) : payload;
        }
      };
    }
  };
  var once_default = onceModifier;

  // src/modules/modifiers/debounce.ts
  var debounce_exports = {};
  __export(debounce_exports, {
    debounceModifier: () => debounceModifier,
    default: () => debounce_default
  });
  init_consts();
  var debounceModifier = {
    name: "debounce",
    handle: (payload, _el, arg, _runtime) => {
      const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
      let timeout;
      if (typeof payload === "function") {
        return (e) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => payload(e), wait);
        };
      }
      return (...args) => {
        return new Promise((resolve) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            resolve(typeof payload === "function" ? payload(...args) : payload);
          }, wait);
        });
      };
    }
  };
  var debounce_default = debounceModifier;

  // src/modules/modifiers/morph.ts
  var morph_exports = {};
  __export(morph_exports, {
    default: () => morph_default,
    morphModifier: () => morphModifier
  });
  var morphModifier = {
    name: "morph",
    handle: (payload, _el, _arg, _runtime) => {
      return payload;
    },
    interceptPipeline: (evaluate2, element, arg, runtime) => {
      return (evalEl, expression, extras) => {
        const result = evaluate2(evalEl, expression, extras);
        const applyMorph = (htmlString) => {
          const target2 = arg ? resolveSelector(element, arg) : element;
          const realTarget = Array.isArray(target2) ? target2[0] : target2;
          if (realTarget)
            morphDOM(realTarget, htmlString);
        };
        if (result instanceof Promise) {
          return result.then((res) => {
            if (typeof res === "string")
              applyMorph(res);
            return res;
          });
        } else if (typeof result === "string") {
          applyMorph(result);
        }
        return result;
      };
    }
  };
  var morph_default = morphModifier;

  // src/modules/listeners/executeScript.ts
  var executeScript_exports = {};
  __export(executeScript_exports, {
    default: () => executeScript_default
  });
  init_debug();
  var executeScriptModule = {
    name: "executeScript",
    event: "execute-script",
    listen: (el, runtime) => {
      const handler = (event) => {
        if (event instanceof CustomEvent && event.detail && typeof event.detail.script === "string") {
          try {
            new Function("element", "runtime", event.detail.script)(el, runtime);
          } catch (e) {
            reportError(new Error(`Execute script error: ${e instanceof Error ? e.message : String(e)}`), el);
          }
        }
      };
      el.addEventListener("execute-script", handler);
      return () => el.removeEventListener("execute-script", handler);
    }
  };
  var executeScript_default = executeScriptModule;

  // src/modules/listeners/linkRewriter.ts
  var linkRewriter_exports = {};
  __export(linkRewriter_exports, {
    default: () => linkRewriter_default
  });
  init_debug();
  init_consts();
  var linkRewriterModule = {
    name: "linkRewriter",
    event: "click",
    listen: (el, context) => {
      const appBase = globalThis.location.href;
      const handler = (event) => {
        try {
          if (event.defaultPrevented)
            return;
          if (event.button !== 0)
            return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          const anchor = event.target.closest("a");
          if (!anchor)
            return;
          if (anchor.origin !== globalThis.location.origin)
            return;
          if (anchor.target && anchor.target !== "_self")
            return;
          if (anchor.hasAttribute("download") || anchor.hasAttribute("data-ignore"))
            return;
          const rawHref = anchor.getAttribute("href") || "";
          let sameOrigin = true;
          try {
            sameOrigin = new URL(rawHref, appBase).origin === globalThis.location.origin;
          } catch {
          }
          if (!sameOrigin)
            return;
          const path = rawHref + anchor.search + anchor.hash;
          anchor.dispatchEvent(
            new CustomEvent(`${CUSTOM_EVENT_PREFIX}navigate`, {
              bubbles: true,
              cancelable: false,
              detail: { path, anchor }
            })
          );
          event.preventDefault();
          const title = anchor.getAttribute("data-tab-title") || void 0;
          const icon = anchor.getAttribute("data-tab-icon") || void 0;
          const signals = context.globalSignals();
          const router = signals["router"];
          if (router && typeof router.navigate === "function") {
            router.navigate(path, { title, icon });
          } else {
            globalThis.history.pushState({ scrollY: globalThis.scrollY }, "", path);
            document.dispatchEvent(
              new CustomEvent(`${CUSTOM_EVENT_PREFIX}popstate`, {
                detail: { url: globalThis.location.href }
              })
            );
          }
        } catch (e) {
          reportError(
            new Error(`LinkRewriter error: ${e instanceof Error ? e.message : String(e)}`),
            el
          );
        }
      };
      el.addEventListener("click", handler);
      return () => el.removeEventListener("click", handler);
    }
  };
  var linkRewriter_default = linkRewriterModule;

  // src/modules/listeners/bfcache.ts
  var bfcache_exports = {};
  __export(bfcache_exports, {
    default: () => bfcache_default
  });
  var bfcacheListener = {
    name: "bfcache",
    event: "pageshow",
    listen(element, runtime) {
      if (typeof globalThis.window === "undefined")
        return;
      const handlePageShow = (event) => {
        if (event.persisted) {
          if (runtime.isDevMode) {
            runtime.debug("[bfcache] Page restored from bfcache, dispatching bfcache:restore");
          }
          element.dispatchEvent(new CustomEvent("bfcache:restore", {
            bubbles: true,
            detail: {
              timestamp: Date.now(),
              persisted: true
            }
          }));
        }
      };
      const handlePageHide = (event) => {
        if (runtime.isDevMode) {
          runtime.debug(`[bfcache] pagehide - persisted: ${event.persisted}`);
        }
        element.dispatchEvent(new CustomEvent("bfcache:freeze", {
          bubbles: true,
          detail: {
            timestamp: Date.now(),
            persisted: event.persisted
          }
        }));
      };
      const handleFreeze = () => {
        if (runtime.isDevMode) {
          runtime.debug("[bfcache] Page frozen");
        }
        element.dispatchEvent(new CustomEvent("bfcache:freeze", {
          bubbles: true,
          detail: { timestamp: Date.now() }
        }));
      };
      const handleResume = () => {
        if (runtime.isDevMode) {
          runtime.debug("[bfcache] Page resumed from freeze");
        }
        element.dispatchEvent(new CustomEvent("bfcache:restore", {
          bubbles: true,
          detail: { timestamp: Date.now(), fromFreeze: true }
        }));
      };
      globalThis.addEventListener("pageshow", handlePageShow);
      globalThis.addEventListener("pagehide", handlePageHide);
      if ("onfreeze" in document) {
        document.addEventListener("freeze", handleFreeze);
        document.addEventListener("resume", handleResume);
      }
      return () => {
        globalThis.removeEventListener("pageshow", handlePageShow);
        globalThis.removeEventListener("pagehide", handlePageHide);
        if ("onfreeze" in document) {
          document.removeEventListener("freeze", handleFreeze);
          document.removeEventListener("resume", handleResume);
        }
      };
    }
  };
  var bfcache_default = bfcacheListener;

  // src/modules/listeners/history.ts
  var history_exports = {};
  __export(history_exports, {
    default: () => history_default
  });
  init_debug();
  init_consts();
  var historyModule = {
    name: "history",
    event: "popstate",
    listen: (_el, _context) => {
      if ("navigation" in globalThis) {
        return () => {
        };
      }
      const popStateEvent = `${CUSTOM_EVENT_PREFIX}popstate`;
      const handler = (event) => {
        try {
          if (event instanceof PopStateEvent) {
            document.dispatchEvent(
              new CustomEvent(popStateEvent, {
                detail: { url: globalThis.location.href, state: event.state }
              })
            );
          }
        } catch (e) {
          reportError(
            new Error(`History listener error: ${e instanceof Error ? e.message : String(e)}`),
            document.body
          );
        }
      };
      globalThis.addEventListener("popstate", handler);
      return () => globalThis.removeEventListener("popstate", handler);
    }
  };
  var history_default = historyModule;

  // src/engine/mutation.ts
  var mutation_exports = {};
  __export(mutation_exports, {
    default: () => mutation_default
  });
  init_debug();
  init_consts();
  var movedNodes = /* @__PURE__ */ new WeakSet();
  var movedNodeTimers = /* @__PURE__ */ new Map();
  function isExternalOverlay(node) {
    let current = node;
    while (current) {
      if (current.id && (current.id.includes("preact-") || current.id.includes("jetski") || current.id.includes("webpack-") || current.id.includes("chrome-extension"))) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
  var mutationObserverModule = {
    name: "mutationObserver",
    observerType: "MutationObserver",
    observe: (el, context) => {
      try {
        let isProcessing = false;
        const observer = new MutationObserver((mutationsList) => {
          if (isProcessing)
            return;
          isProcessing = true;
          const addedThisBatch = /* @__PURE__ */ new Set();
          const now = performance.now();
          for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement) {
                  if (isExternalOverlay(node))
                    return;
                  addedThisBatch.add(node);
                }
              });
            }
          }
          for (const [node, ts] of movedNodeTimers) {
            if (now - ts > 32) {
              movedNodeTimers.delete(node);
              movedNodes.delete(node);
            }
          }
          try {
            for (const mutation of mutationsList) {
              if (mutation.type === "childList") {
                if (mutation.addedNodes.length > 0) {
                  mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                      if (isExternalOverlay(node))
                        return;
                      const enhancedTarget = node;
                      if (enhancedTarget[MARKER_KEY])
                        return;
                      context.processElement(node);
                    }
                  });
                }
                mutation.removedNodes.forEach((node) => {
                  if (node instanceof HTMLElement) {
                    if (isExternalOverlay(node))
                      return;
                    if (node.isConnected || addedThisBatch.has(node) || movedNodes.has(node))
                      return;
                    const enhancedTarget = node;
                    if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                      enhancedTarget[CLEANUP_FUNCTIONS_KEY].forEach((cleanup) => cleanup());
                      delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                    }
                    delete enhancedTarget[MARKER_KEY];
                  }
                });
              } else if (mutation.type === "attributes") {
                const target2 = mutation.target;
                if (!target2)
                  return;
                const attrName = mutation.attributeName;
                if (attrName === "class") {
                  context.adoptStyle(target2);
                }
                if (attrName === "style" || attrName === "draggable" || attrName?.startsWith("data-") || attrName?.startsWith("nexus-"))
                  return;
                const borrows = ownership.getBorrowers(target2);
                borrows.forEach((borrow) => {
                  const borrower = borrow.borrower;
                  try {
                    borrower[RUN_EFFECT_RUNNERS_KEY]?.();
                  } catch (err2) {
                    console.error(
                      `[Nexus Isolation] Borrower <${borrower.tagName}> failed during ownership pulse from <${target2.tagName}>:`,
                      err2
                    );
                  }
                });
              }
            }
            document.dispatchEvent(new CustomEvent("nexus:dom-mutated", { bubbles: true }));
            addedThisBatch.forEach((node) => {
              movedNodes.add(node);
              movedNodeTimers.set(node, performance.now());
            });
          } finally {
            isProcessing = false;
          }
        });
        observer.observe(el, { childList: true, subtree: true, attributes: true });
        return () => observer.disconnect();
      } catch (e) {
        reportError(new Error(`Failed to init MutationObserver: ${e instanceof Error ? e.message : String(e)}`), el);
      }
    }
  };
  var mutation_default = mutationObserverModule;

  // src/manifest.ts
  var autoAttributes = [
    { name: "mask", module: mask_exports2 },
    { name: "drag", module: drag_exports },
    { name: "markdown", module: markdown_exports },
    { name: "preserve", module: preserve_exports },
    { name: "bind", module: bind_exports },
    { name: "computed", module: computed_exports },
    { name: "on", module: on_exports },
    { name: "assert", module: assert_exports },
    { name: "switcher", module: switcher_exports },
    { name: "import", module: import_exports },
    { name: "if", module: if_exports },
    { name: "effect", module: effect_exports },
    { name: "component", module: component_exports },
    { name: "flow", module: flow_exports },
    { name: "for", module: for_exports },
    { name: "router", module: router_exports },
    { name: "pwa", module: pwa_exports },
    { name: "var", module: var_exports },
    { name: "style", module: style_exports },
    { name: "theme", module: theme_exports },
    { name: "stylesheet", module: stylesheet_exports },
    { name: "teleport", module: teleport_exports },
    { name: "build", module: build_exports },
    { name: "show", module: show_exports },
    { name: "route", module: route_exports },
    { name: "class", module: class_exports },
    { name: "debug", module: debug_exports },
    { name: "html", module: html_exports },
    { name: "signal", module: signal_exports },
    { name: "raf", module: raf_exports }
  ];
  var autoSprites = [
    { name: "mask", module: mask_exports },
    { name: "animate", module: animate_exports },
    { name: "gql", module: gql_exports },
    { name: "mcp", module: mcp_exports2 },
    { name: "periodicSync", module: periodicSync_exports },
    { name: "flow", module: flow_exports2 },
    { name: "bgSync", module: bgSync_exports },
    { name: "bgFetch", module: bgFetch_exports },
    { name: "push", module: push_exports },
    { name: "selector", module: selector_exports },
    { name: "predictive", module: predictive_exports },
    { name: "sql", module: sql_exports },
    { name: "sw", module: sw_exports },
    { name: "svg", module: svg_exports }
  ];
  var autoModifiers = [
    { name: "drag", module: drag_exports2 },
    { name: "zoom", module: zoom_exports },
    { name: "stop", module: stop_exports },
    { name: "keys", module: keys_exports },
    { name: "self", module: self_exports },
    { name: "prevent", module: prevent_exports },
    { name: "throttle", module: throttle_exports },
    { name: "once", module: once_exports },
    { name: "debounce", module: debounce_exports },
    { name: "morph", module: morph_exports }
  ];
  var autoListeners = [
    { name: "executeScript", module: executeScript_exports },
    { name: "linkRewriter", module: linkRewriter_exports },
    { name: "bfcache", module: bfcache_exports },
    { name: "history", module: history_exports }
  ];
  var autoObservers = [{ name: "mutation", module: mutation_exports }];
  var PACKED_COMPONENTS = ".draggable-chosen{background-color:var(--color-base-300,#d4d4d8);box-shadow:inset 0 0 0 2px var(--color-primary,#3b82f6)}.draggable-drag{opacity:1;background-color:var(--color-base-300,#d4d4d8);box-shadow:0 25px 50px -12px rgba(0,0,0,.25);transform:scale(1.05);cursor:grabbing;z-index:9999}.draggable-ghost{opacity:1;background-color:var(--color-base-300,#d4d4d8);border:2px solid var(--color-primary,#3b82f6);box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}.draggable-selected{box-shadow:inset 0 0 0 2px var(--color-accent,var(--color-secondary,#ec4899))}.draggable-swap-highlight{background-color:color-mix(in srgb,var(--color-warning,#eab308) 20%,transparent);box-shadow:inset 0 0 0 2px var(--color-warning,#eab308)}.drop-target-before{background:linear-gradient(to bottom,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 2px 0 0 var(--color-primary,#3b82f6)}.drop-target-after{background:linear-gradient(to top,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 -2px 0 0 var(--color-primary,#3b82f6)}";
  var PACKED_KEYFRAMES = "@keyframes spin{to{transform:rotate(360deg)}}@keyframes ping{75%,100%{transform:scale(2);opacity:0}}@keyframes pulse{50%{opacity:.5}}@keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:none;animation-timing-function:cubic-bezier(0,0,.2,1)}}";
  var PACKED_THEME_CSS = "";

  // src/modules/attributes/stylesheet.ts
  var PREFLIGHT_CSS = PACKED_COMPONENTS;
  async function resolveImports(cssText, baseUrl, onUpdate) {
    const defaultBase = typeof window !== "undefined" ? window.location.href : "http://localhost";
    const currentBase = baseUrl || defaultBase;
    const imports = [];
    if (typeof document !== "undefined") {
      try {
        const parserDoc = document.implementation.createHTMLDocument("");
        const styleEl = parserDoc.createElement("style");
        styleEl.textContent = cssText;
        parserDoc.head.appendChild(styleEl);
        const sheet = styleEl.sheet;
        if (sheet) {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSImportRule) {
              imports.push({
                href: rule.href,
                media: rule.media ? rule.media.mediaText : "",
                layer: rule.layerName || ""
              });
            }
          }
        }
      } catch {
      }
    }
    const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*[^;]*;/g;
    let m;
    while ((m = importRegex.exec(cssText)) !== null) {
      const href = m[1];
      if (!imports.some((i) => href.endsWith(i.href) || i.href.endsWith(href))) {
        imports.push({ href, media: "", layer: "" });
      }
    }
    let resolved = cssText;
    for (const imp of imports) {
      try {
        const absoluteUrl = new URL(imp.href, currentBase).href;
        const content = await fetchWithCache(absoluteUrl, 3e3, () => {
          if (onUpdate)
            onUpdate();
        });
        const nestedResolved = await resolveImports(content, absoluteUrl, onUpdate);
        let wrapper = nestedResolved;
        if (imp.media)
          wrapper = `@media ${imp.media} { ${nestedResolved} }`;
        else if (imp.layer)
          wrapper = `@layer ${imp.layer} { ${nestedResolved} }`;
        const escaped = imp.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const targetRegex = new RegExp(`@import\\s+(?:url\\()?['"]?${escaped}['"]?\\)?[^;]*;`, "g");
        resolved = resolved.replace(targetRegex, wrapper);
      } catch (err2) {
        console.warn(`[NexusStyleSheet] Failed to resolve import "${imp.href}" relative to "${currentBase}":`, err2);
      }
    }
    return resolved;
  }
  var NexusStyleSheet = class extends (typeof CSSStyleSheet !== "undefined" ? CSSStyleSheet : class {
  }) {
    _rawCSSText = "";
    constructor() {
      super();
    }
    async replace(cssText) {
      this._rawCSSText = cssText;
      if (typeof super.replace === "function") {
        const resolved = await resolveImports(cssText, void 0, async () => {
          const freshResolved = await resolveImports(this._rawCSSText);
          if (typeof super.replace === "function") {
            await super.replace(freshResolved);
          }
        });
        return await super.replace(resolved);
      }
      return this;
    }
    replaceSync(cssText) {
      this._rawCSSText = cssText;
      const hasImports = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*[^;]*;/g.test(cssText);
      if (typeof super.replaceSync === "function") {
        try {
          super.replaceSync(cssText);
        } catch {
          if (!hasImports)
            throw err;
        }
      }
      if (hasImports) {
        resolveImports(cssText, void 0, async () => {
          const freshResolved = await resolveImports(this._rawCSSText);
          if (typeof super.replace === "function") {
            super.replace(freshResolved).catch((err2) => console.error(err2));
          }
        }).then((resolved) => {
          if (typeof super.replace === "function") {
            super.replace(resolved).catch((err2) => {
              console.error("[NexusStyleSheet] Dynamic replace of resolved imports failed:", err2);
            });
          }
        }).catch((err2) => {
          console.error("[NexusStyleSheet] Failed to resolve imports in background:", err2);
        });
      }
    }
  };
  var jitSheet = typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : {};
  function discoverColorTokens() {
    const tokens = /* @__PURE__ */ new Set();
    try {
      const style = window.getComputedStyle(document.documentElement);
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (prop.startsWith("--color-")) {
          tokens.add(prop.slice(8));
        }
      }
    } catch {
    }
    return tokens;
  }
  function buildTailwindThemeBridge(tokens) {
    if (tokens.size === 0)
      return "";
    const decls = Array.from(tokens).map((name) => `  --color-${name}: var(--color-${name});`).join("\n");
    return `@theme {
${decls}
}`;
  }
  var compileFn = null;
  var coreCss = null;
  var tailwindCompiler = null;
  var compilerReadyPromise = null;
  var externalStylesSettled = false;
  var _rebuildingBridge = false;
  var compiledClassesSet = /* @__PURE__ */ new Set();
  var pendingClasses = [];
  function coreLoadStylesheet(id) {
    if (!coreCss)
      return { path: id, base: "/", content: "" };
    if (id === "tailwindcss" || id === "tailwindcss/index.css") {
      return { path: "tailwindcss/index.css", base: "/", content: coreCss.indexCss };
    }
    if (id === "./theme.css" || id === "tailwindcss/theme.css") {
      return { path: "tailwindcss/theme.css", base: "/", content: coreCss.themeCss };
    }
    if (id === "./preflight.css" || id === "tailwindcss/preflight.css") {
      return { path: "tailwindcss/preflight.css", base: "/", content: coreCss.preflightCss };
    }
    if (id === "./utilities.css" || id === "tailwindcss/utilities.css") {
      return { path: "tailwindcss/utilities.css", base: "/", content: coreCss.utilitiesCss };
    }
    return { path: id, base: "/", content: "" };
  }
  async function ensureCompiler() {
    if (compilerReadyPromise)
      return compilerReadyPromise;
    compilerReadyPromise = (async () => {
      const [indexCss, themeCss, preflightCss, utilitiesCss, compilerJs] = await Promise.all([
        fetchWithCache("https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css"),
        fetchWithCache("https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css"),
        fetchWithCache("https://cdn.jsdelivr.net/npm/tailwindcss@4/preflight.css"),
        fetchWithCache("https://cdn.jsdelivr.net/npm/tailwindcss@4/utilities.css"),
        fetchWithCache("https://cdn.jsdelivr.net/npm/tailwindcss@4/+esm")
      ]);
      coreCss = { indexCss, themeCss, preflightCss, utilitiesCss };
      const blob = new Blob([compilerJs], { type: "text/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      const mod = await import(blobUrl);
      URL.revokeObjectURL(blobUrl);
      compileFn = mod.compile;
      tailwindCompiler = await compileFn(`@import "tailwindcss";`, {
        base: "/",
        loadStylesheet: coreLoadStylesheet
      });
      await refreshThemeBridge();
      while (pendingClasses.length > 0) {
        const { className, el, runtime } = pendingClasses.shift();
        stylesheet.adoptClass(className, el, runtime);
      }
    })().catch((err2) => {
      compilerReadyPromise = null;
      console.error("[Nexus] Tailwind JIT init failed:", err2);
      throw err2;
    });
    return compilerReadyPromise;
  }
  async function refreshThemeBridge() {
    if (!tailwindCompiler || !compileFn || !coreCss)
      return;
    if (_rebuildingBridge)
      return;
    _rebuildingBridge = true;
    try {
      const tokens = discoverColorTokens();
      const bridge = buildTailwindThemeBridge(tokens);
      tailwindCompiler = await compileFn(`@import "tailwindcss";
${bridge}`, {
        base: "/",
        loadStylesheet: coreLoadStylesheet
      });
      const compiledCSS = tailwindCompiler.build(Array.from(compiledClassesSet));
      jitSheet.replaceSync(compiledCSS);
    } catch (err2) {
      console.error("[Nexus] Theme bridge refresh failed:", err2);
    } finally {
      _rebuildingBridge = false;
    }
  }
  async function fetchWithCache(url, timeoutMs = 3e3, onUpdate) {
    const cacheKey = `nexus-cache:${url}`;
    let cached = null;
    if (typeof localStorage !== "undefined") {
      try {
        cached = localStorage.getItem(cacheKey);
      } catch {
      }
    }
    if (cached) {
      const cachedVal = cached;
      console.log(`[Nexus Cache] INSTANT HIT: Loading ${url} from localStorage cache.`);
      setTimeout(async () => {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          if (!res.ok)
            return;
          const freshText = await res.text();
          if (hashString(cachedVal) !== hashString(freshText)) {
            console.log(`[Nexus Cache] UPDATE DETECTED: CDN changed for ${url}. Caching for next load.`);
            if (typeof localStorage !== "undefined") {
              try {
                localStorage.setItem(cacheKey, freshText);
              } catch {
              }
            }
            if (onUpdate)
              onUpdate(freshText);
          } else {
            console.log(`[Nexus Cache] VERIFIED: Cache matches CDN for ${url}.`);
          }
        } catch (err2) {
          console.warn(`[Nexus Cache] Background CDN hash check failed for ${url}:`, err2);
        }
      }, 5e3);
      return cachedVal;
    }
    console.log(`[Nexus Cache] CACHE MISS: Fetching local/CDN resource for ${url}.`);
    let localUrl = "";
    if (url.includes("tailwindcss@4/")) {
      const file = url.split("tailwindcss@4/")[1];
      localUrl = `/node_modules/tailwindcss/${file}`;
    }
    const doFetch = async (targetUrl) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok)
          throw new Error(`HTTP error ${res.status}`);
        return await res.text();
      } catch (err2) {
        clearTimeout(id);
        throw err2;
      }
    };
    if (localUrl) {
      try {
        console.log(`[Nexus Cache] Trying local relative fallback path: ${localUrl}`);
        const text = await doFetch(localUrl);
        console.log(`[Nexus Cache] SUCCESS: Loaded local resource for ${url} from ${localUrl}`);
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(cacheKey, text);
          } catch {
          }
        }
        return text;
      } catch {
        console.log(`[Nexus Cache] Local relative fallback failed for ${url}. Falling back to CDN.`);
      }
    }
    try {
      const text = await doFetch(url);
      console.log(`[Nexus Cache] SUCCESS: Loaded resource from CDN for ${url}`);
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(cacheKey, text);
        } catch {
        }
      }
      return text;
    } catch (err2) {
      console.error(`[Nexus Cache] Failed CDN fetch for ${url}:`, err2);
      throw err2;
    }
  }
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
  var StyleSheetManager = class {
    _adoptedSheets = /* @__PURE__ */ new Map();
    _knownClasses = /* @__PURE__ */ new Set();
    _nextId = 0;
    _preflightEmitted = false;
    _getJitSheet() {
      return jitSheet;
    }
    clearCache() {
      this._knownClasses.clear();
    }
    emitPreflightAndTheme(rootEl) {
      if (typeof document === "undefined")
        return;
      if (this._preflightEmitted)
        return;
      initializeJitEngine();
      if (PACKED_COMPONENTS.length > 0) {
        this.adoptCSSSync(PACKED_COMPONENTS, "nexus-components");
      }
      if (PACKED_KEYFRAMES.length > 0) {
        this.adoptCSSSync(PACKED_KEYFRAMES, "nexus-keyframes");
      }
      this._preflightEmitted = true;
      if (rootEl) {
        rootEl.classList.forEach((cls) => this.adoptClass(cls, rootEl));
        const all = rootEl.querySelectorAll("*");
        all.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.classList.forEach((cls) => this.adoptClass(cls, el));
          }
        });
      }
    }
    adoptClass(className, el, runtime) {
      if (!className || className.trim() === "")
        return;
      if (el && el.closest && el.closest("[data-ignore\\:style]"))
        return;
      if (this._knownClasses.has(className))
        return;
      const hasSignalMatch = className.match(/^[a-z]+-\$([a-zA-Z_$][\w$]*)$/);
      if (hasSignalMatch && el && runtime) {
        this.adoptSignalBinding(el, hasSignalMatch[1], runtime);
        this._knownClasses.add(className);
        return;
      }
      if (el && !el.closest("[data-stylesheet]")) {
        return;
      }
      if (PACKED_THEME_CSS.length > 0) {
        this._knownClasses.add(className);
        return;
      }
      if (!tailwindCompiler) {
        pendingClasses.push({ className, el, runtime });
        ensureCompiler().catch((err2) => console.error("[Nexus] JIT init failed:", err2));
        return;
      }
      try {
        if (className.includes("{") || className.includes("}") || className.includes("$") || className.includes("?") || className.includes("<") || className.includes(">") || className.includes("&") || className.includes("=")) {
          return;
        }
        compiledClassesSet.add(className);
        const compiledCSS = tailwindCompiler.build(Array.from(compiledClassesSet));
        jitSheet.replaceSync(compiledCSS);
        this._knownClasses.add(className);
      } catch (err2) {
        console.debug(`Nexus-UX JIT compile check: "${className}":`, err2);
      }
    }
    adoptSignalBinding(el, signalName, runtime) {
      if (!el.hasAttribute("data-class")) {
        const currentBindings = el._signalBindings || [];
        if (!currentBindings.includes(signalName)) {
          currentBindings.push(signalName);
          el._signalBindings = currentBindings;
          const varName = signalName.replace(/[#.]/g, "-");
          runtime.effect(() => {
            const val = runtime.evaluate(el, signalName);
            el.style.setProperty(`--nx-${varName}`, String(val !== void 0 ? val : ""));
          });
        }
      }
    }
    ensureRule(className, cssText) {
      if (this._knownClasses.has(className))
        return;
      const sheet = this._getJitSheet();
      try {
        sheet.insertRule(cssText, sheet.cssRules.length);
        this._knownClasses.add(className);
      } catch {
      }
    }
    collectRules() {
      const sheets = [];
      this._adoptedSheets.forEach((sheet) => {
        const rules2 = [];
        try {
          for (const rule of sheet.cssRules)
            rules2.push(rule.cssText);
        } catch {
        }
        if (rules2.length)
          sheets.push(rules2.join("\n"));
      });
      const rules = [];
      try {
        for (const rule of jitSheet.cssRules)
          rules.push(rule.cssText);
      } catch {
      }
      if (rules.length)
        sheets.push(rules.join("\n"));
      return sheets.join("\n\n");
    }
    adoptCSSSync(cssText, id, root = document) {
      const processedCSS = this.processAtRules(cssText);
      const sheetId = id || `_auto_${this._nextId++}`;
      const existing = this._adoptedSheets.get(sheetId);
      if (existing) {
        existing.replaceSync(processedCSS);
        return () => this.removeSheet(sheetId, root);
      }
      if (typeof CSSStyleSheet === "undefined")
        return () => {
        };
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(processedCSS);
      this._adoptedSheets.set(sheetId, sheet);
      if (root && "adoptedStyleSheets" in root) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
      return () => this.removeSheet(sheetId, root);
    }
    async adoptCSS(cssText, id, root = document) {
      const processedCSS = this.processAtRules(cssText);
      const sheetId = id || `_auto_${this._nextId++}`;
      const existing = this._adoptedSheets.get(sheetId);
      if (existing) {
        await existing.replace(processedCSS);
        return () => this.removeSheet(sheetId, root);
      }
      if (typeof CSSStyleSheet === "undefined")
        return () => {
        };
      const sheet = new NexusStyleSheet();
      await sheet.replace(processedCSS);
      this._adoptedSheets.set(sheetId, sheet);
      if (root && "adoptedStyleSheets" in root) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
      return () => this.removeSheet(sheetId, root);
    }
    async adoptRawCSS(cssText, id, root = document) {
      const sheetId = id || `_auto_${this._nextId++}`;
      const existing = this._adoptedSheets.get(sheetId);
      if (existing) {
        await existing.replace(cssText);
        return () => this.removeSheet(sheetId, root);
      }
      if (typeof CSSStyleSheet === "undefined")
        return () => {
        };
      const sheet = new NexusStyleSheet();
      await sheet.replace(cssText);
      this._adoptedSheets.set(sheetId, sheet);
      if (root && "adoptedStyleSheets" in root) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
      return () => this.removeSheet(sheetId, root);
    }
    processAtRules(css) {
      return css;
    }
    removeSheet(id, root = document) {
      const sheet = this._adoptedSheets.get(id);
      if (!sheet)
        return;
      if (root && "adoptedStyleSheets" in root) {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
      }
      this._adoptedSheets.delete(id);
    }
    dispose() {
      this._adoptedSheets.forEach((_sheet, id) => this.removeSheet(id));
      this._adoptedSheets.clear();
      this._knownClasses.clear();
      this._nextId = 0;
    }
  };
  var stylesheet = new StyleSheetManager();
  var _isJitEngineBooted = false;
  function initializeJitEngine() {
    if (_isJitEngineBooted)
      return;
    _isJitEngineBooted = true;
    if (PACKED_THEME_CSS.length > 0) {
      stylesheet.adoptCSSSync(PACKED_THEME_CSS, "nexus-theme");
    } else {
      ensureCompiler().catch((err2) => console.error("[Nexus] JIT init failed:", err2));
    }
  }
  function markExternalStylesSettled() {
    externalStylesSettled = true;
    if (compilerReadyPromise) {
      refreshThemeBridge().catch((err2) => console.error("[Nexus] bridge refresh failed:", err2));
    }
  }
  var stylesheetModule = {
    name: "stylesheet",
    attribute: "stylesheet",
    handle(el, expression, _runtime) {
      const cleanupFns = [];
      if (expression && expression.trim()) {
        const css = expression.trim();
        cleanupFns.push(stylesheet.adoptCSSSync(css, void 0, document));
      }
      const root = el.getRootNode();
      if (root && "adoptedStyleSheets" in root) {
        const sheetsList = Array.from(root.adoptedStyleSheets);
        if (!sheetsList.includes(jitSheet)) {
          root.adoptedStyleSheets = [...sheetsList, jitSheet];
        }
      }
      stylesheet.emitPreflightAndTheme(el);
      cleanupFns.push(() => {
        stylesheet.emitPreflightAndTheme(el);
      });
      return () => cleanupFns.forEach((fn) => fn());
    }
  };
  var stylesheet_default = stylesheetModule;

  // src/engine/reconciler.ts
  var noOp = () => true;
  var defaults = {
    morphStyle: "innerHTML",
    ignoreActiveValue: true,
    // Never clobber what the user is currently typing
    callbacks: {
      beforeNodeAdded: noOp,
      afterNodeAdded: noOp,
      beforeNodeMorphed: (from, to) => {
        if (from instanceof Element && from.hasAttribute(DATA_PRESERVE_ATTR)) {
          return false;
        }
        if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement || from instanceof HTMLSelectElement) {
          if (from === document.activeElement) {
            if (to instanceof HTMLInputElement || to instanceof HTMLTextAreaElement || to instanceof HTMLSelectElement) {
              to.value = from.value;
              if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement) {
                to.selectionStart = from.selectionStart;
                to.selectionEnd = from.selectionEnd;
              }
            }
          }
        }
        if (from instanceof HTMLElement && to instanceof HTMLElement) {
          if (from.style.viewTransitionName) {
            to.style.viewTransitionName = from.style.viewTransitionName;
          }
          if ("_nexus_key" in from) {
            to._nexus_key = from._nexus_key;
          }
        }
        if (from instanceof Element) {
          const enhancedFrom = from;
          if (enhancedFrom[CLEANUP_FUNCTIONS_KEY]) {
            enhancedFrom[CLEANUP_FUNCTIONS_KEY].forEach((cleanup) => cleanup());
            enhancedFrom[CLEANUP_FUNCTIONS_KEY].clear();
          }
          delete enhancedFrom[MARKER_KEY];
        }
        return true;
      },
      afterNodeMorphed: noOp,
      beforeNodeRemoved: (node) => {
        if (node instanceof Element) {
          const enhancedNode = node;
          if (enhancedNode[CLEANUP_FUNCTIONS_KEY]) {
            enhancedNode[CLEANUP_FUNCTIONS_KEY].forEach((cleanup) => cleanup());
            enhancedNode[CLEANUP_FUNCTIONS_KEY].clear();
          }
        }
        return true;
      },
      afterNodeRemoved: noOp,
      beforeAttributeUpdated: noOp
    }
  };
  function runCallback(config, name, ...args) {
    if (config.callbacks && typeof config.callbacks[name] === "function") {
      return config.callbacks[name](...args);
    }
    return true;
  }
  function parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (html.includes("<html") || html.includes("<body") || html.includes("<head")) {
      return doc.documentElement;
    }
    const fragment = document.createDocumentFragment();
    const body = doc.body;
    while (body.firstChild) {
      fragment.appendChild(body.firstChild);
    }
    return fragment;
  }
  function hashString2(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
  function getHeadElementKey(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.tagName === "LINK") {
        return `link:${el.getAttribute("href") || ""}:${el.getAttribute("rel") || ""}`;
      }
      if (el.tagName === "STYLE") {
        return `style:${hashString2(el.textContent || "")}`;
      }
      if (el.tagName === "SCRIPT") {
        return `script:${el.getAttribute("src") || ""}:${hashString2(el.textContent || "")}`;
      }
      if (el.tagName === "TITLE") {
        return "title";
      }
    }
    return null;
  }
  function morphHead(fromHead, toHead, config) {
    const toTitle = toHead.querySelector("title");
    if (toTitle) {
      document.title = toTitle.textContent || "";
    }
    const fromChildren = Array.from(fromHead.childNodes);
    const toChildren = Array.from(toHead.childNodes);
    const fromMap = /* @__PURE__ */ new Map();
    fromChildren.forEach((child) => {
      const key = getHeadElementKey(child);
      if (key)
        fromMap.set(key, child);
    });
    toChildren.forEach((toChild) => {
      const key = getHeadElementKey(toChild);
      if (!key)
        return;
      if (fromMap.has(key)) {
        const fromChild = fromMap.get(key);
        fromMap.delete(key);
        if (fromChild.nodeType === Node.ELEMENT_NODE && toChild.nodeType === Node.ELEMENT_NODE) {
          if (fromChild.textContent !== toChild.textContent) {
            fromChild.textContent = toChild.textContent;
          }
        }
      } else {
        const newNode = toChild.cloneNode(true);
        if (newNode instanceof HTMLScriptElement) {
          const activeScript = document.createElement("script");
          Array.from(newNode.attributes).forEach((attr) => activeScript.setAttribute(attr.name, attr.value));
          activeScript.textContent = newNode.textContent;
          fromHead.appendChild(activeScript);
        } else {
          fromHead.appendChild(newNode);
        }
      }
    });
    fromMap.forEach((node) => {
      if (node instanceof HTMLLinkElement || node instanceof HTMLStyleElement) {
        node.parentNode?.removeChild(node);
      }
    });
  }
  function morphScript(fromScript, toScript) {
    if (fromScript.textContent === toScript.textContent && fromScript.getAttribute("src") === toScript.getAttribute("src")) {
      return;
    }
    const activeScript = document.createElement("script");
    Array.from(toScript.attributes).forEach((attr) => activeScript.setAttribute(attr.name, attr.value));
    activeScript.textContent = toScript.textContent;
    fromScript.parentNode?.replaceChild(activeScript, fromScript);
  }
  function getElementKey(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      return el.getAttribute("data-key") || el.getAttribute("key") || el.id || null;
    }
    return null;
  }
  function removeNode(node, config) {
    if (runCallback(config, "beforeNodeRemoved", node) === false)
      return;
    node.parentNode?.removeChild(node);
    runCallback(config, "afterNodeRemoved", node);
  }
  function morphChildren(fromParent, toParent, config) {
    const fromChildren = Array.from(fromParent.childNodes);
    const toChildren = Array.from(toParent.childNodes);
    const fromKeyMap = /* @__PURE__ */ new Map();
    const fromNoKeyList = [];
    fromChildren.forEach((child) => {
      const key = getElementKey(child);
      if (key) {
        fromKeyMap.set(key, child);
      } else {
        fromNoKeyList.push(child);
      }
    });
    let currentFromChild = fromParent.firstChild;
    toChildren.forEach((toChild) => {
      const isIframe = toChild instanceof HTMLIFrameElement;
      const key = getElementKey(toChild);
      let matchedFromChild = null;
      if (key) {
        matchedFromChild = fromKeyMap.get(key) || null;
        if (matchedFromChild) {
          fromKeyMap.delete(key);
        }
      } else {
        const matchIdx = fromNoKeyList.findIndex(
          (node) => node.nodeType === toChild.nodeType && (node.nodeType !== Node.ELEMENT_NODE || node.tagName === toChild.tagName)
        );
        if (matchIdx !== -1) {
          matchedFromChild = fromNoKeyList.splice(matchIdx, 1)[0];
        }
      }
      if (matchedFromChild) {
        if (isIframe && matchedFromChild instanceof HTMLIFrameElement) {
          const fromEl = matchedFromChild;
          const toEl = toChild;
          Array.from(fromEl.attributes).forEach((attr) => {
            if (!toEl.hasAttribute(attr.name))
              fromEl.removeAttribute(attr.name);
          });
          Array.from(toEl.attributes).forEach((attr) => {
            if (attr.name === "src" && fromEl.getAttribute("src") === attr.value)
              return;
            fromEl.setAttribute(attr.name, attr.value);
          });
        } else {
          if (matchedFromChild !== currentFromChild) {
            fromParent.insertBefore(matchedFromChild, currentFromChild);
          } else {
            currentFromChild = currentFromChild.nextSibling;
          }
          morphNodes(matchedFromChild, toChild, config);
        }
      } else {
        const newNode = toChild.cloneNode(true);
        if (runCallback(config, "beforeNodeAdded", newNode) !== false) {
          fromParent.insertBefore(newNode, currentFromChild);
          runCallback(config, "afterNodeAdded", newNode);
          if (newNode instanceof HTMLElement) {
            const scripts = newNode.querySelectorAll("script");
            scripts.forEach((script) => {
              const activeScript = document.createElement("script");
              Array.from(script.attributes).forEach((attr) => activeScript.setAttribute(attr.name, attr.value));
              activeScript.textContent = script.textContent;
              script.parentNode?.replaceChild(activeScript, script);
            });
          }
        }
      }
    });
    fromKeyMap.forEach((node) => {
      removeNode(node, config);
    });
    fromNoKeyList.forEach((node) => {
      removeNode(node, config);
    });
  }
  function morphNodes(from, to, config) {
    if (runCallback(config, "beforeNodeMorphed", from, to) === false) {
      return;
    }
    if (from instanceof HTMLHeadElement && to instanceof HTMLHeadElement) {
      morphHead(from, to, config);
      return;
    }
    if (from instanceof HTMLScriptElement && to instanceof HTMLScriptElement) {
      morphScript(from, to);
      return;
    }
    if (from.nodeType !== to.nodeType) {
      from.parentElement?.replaceChild(to.cloneNode(true), from);
      return;
    }
    if (from.nodeType === Node.TEXT_NODE || from.nodeType === Node.COMMENT_NODE) {
      if (from.nodeValue !== to.nodeValue) {
        from.nodeValue = to.nodeValue;
      }
      return;
    }
    if (from.nodeType !== Node.ELEMENT_NODE)
      return;
    const fromEl = from;
    const toEl = to;
    if (fromEl.tagName !== toEl.tagName) {
      fromEl.parentElement?.replaceChild(toEl.cloneNode(true), fromEl);
      return;
    }
    const fromAttrs = fromEl.attributes;
    const toAttrs = toEl.attributes;
    for (let i = fromAttrs.length - 1; i >= 0; i--) {
      const attr = fromAttrs[i];
      if (!toEl.hasAttribute(attr.name)) {
        fromEl.removeAttribute(attr.name);
      }
    }
    for (let i = 0; i < toAttrs.length; i++) {
      const attr = toAttrs[i];
      if (fromEl.getAttribute(attr.name) !== attr.value) {
        fromEl.setAttribute(attr.name, attr.value);
      }
    }
    if (fromEl instanceof HTMLInputElement && toEl instanceof HTMLInputElement) {
      if (fromEl.type === "checkbox" || fromEl.type === "radio") {
        fromEl.checked = toEl.checked;
      } else if (fromEl.type !== "file") {
        if (fromEl !== document.activeElement || !config.ignoreActiveValue) {
          fromEl.value = toEl.value;
        }
      }
    } else if (fromEl instanceof HTMLTextAreaElement && toEl instanceof HTMLTextAreaElement) {
      if (fromEl !== document.activeElement || !config.ignoreActiveValue) {
        fromEl.value = toEl.value;
      }
    } else if (fromEl instanceof HTMLSelectElement && toEl instanceof HTMLSelectElement) {
      fromEl.value = toEl.value;
    }
    morphChildren(fromEl, toEl, config);
    runCallback(config, "afterNodeMorphed", fromEl, toEl);
  }
  function morphDOM(from, to, options = {}) {
    const config = { ...defaults, ...options };
    let toNode;
    if (typeof to === "string") {
      toNode = parseHTML(to);
    } else {
      toNode = to;
    }
    if (from === document.documentElement || from.tagName === "HTML") {
      const fromHTML = from;
      const toHTML = toNode;
      const fromHead = fromHTML.querySelector("head");
      const toHead = toHTML.querySelector("head");
      if (fromHead && toHead) {
        morphHead(fromHead, toHead, config);
      }
      const fromBody = fromHTML.querySelector("body");
      const toBody = toHTML.querySelector("body");
      if (fromBody && toBody) {
        morphNodes(fromBody, toBody, config);
      }
      const fromAttrs = fromHTML.attributes;
      const toAttrs = toHTML.attributes;
      for (let i = fromAttrs.length - 1; i >= 0; i--) {
        const attr = fromAttrs[i];
        if (!toHTML.hasAttribute(attr.name))
          fromHTML.removeAttribute(attr.name);
      }
      for (let i = 0; i < toAttrs.length; i++) {
        const attr = toAttrs[i];
        fromHTML.setAttribute(attr.name, attr.value);
      }
    } else {
      if (config.morphStyle === "innerHTML") {
        const toParent = toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE || toNode.nodeType === Node.ELEMENT_NODE ? toNode : parseHTML(`<div>${to}</div>`);
        morphChildren(from, toParent, config);
      } else {
        const targetNode = toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? toNode.firstChild || toNode : toNode;
        morphNodes(from, targetNode, config);
        if (toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE && toNode.childNodes.length > 1) {
          let sibling = from.nextSibling;
          const parent = from.parentNode;
          if (parent) {
            Array.from(toNode.childNodes).slice(1).forEach((node) => {
              parent.insertBefore(node.cloneNode(true), sibling);
            });
          }
        }
      }
    }
    from.dispatchEvent(new CustomEvent("nexus:dom-morphed", { bubbles: true }));
  }
  var nexusClassMap = /* @__PURE__ */ new WeakMap();
  function reconcileClass(el, value) {
    const currentAdded = nexusClassMap.get(el) || /* @__PURE__ */ new Set();
    const toAdd = /* @__PURE__ */ new Set();
    const process = (val) => {
      if (!val)
        return;
      if (typeof val === "string") {
        val.split(/\s+/).filter(Boolean).forEach((c) => toAdd.add(c));
      } else if (Array.isArray(val)) {
        val.forEach(process);
      } else if (typeof val === "object") {
        Object.entries(val).forEach(([cls, cond]) => {
          let isMatch = false;
          if (typeof cond === "object" && cond !== null) {
            isMatch = Object.values(cond).every((v) => !!v);
          } else {
            isMatch = !!cond;
          }
          if (isMatch)
            cls.split(/\s+/).filter(Boolean).forEach((c) => toAdd.add(c));
        });
      }
    };
    process(value);
    currentAdded.forEach((cls) => {
      if (!toAdd.has(cls)) {
        el.classList.remove(cls);
        currentAdded.delete(cls);
      }
    });
    toAdd.forEach((cls) => {
      if (!el.classList.contains(cls)) {
        el.classList.add(cls);
        currentAdded.add(cls);
        stylesheet.adoptClass(cls, el);
      }
    });
    if (currentAdded.size > 0)
      nexusClassMap.set(el, currentAdded);
  }
  var nexusStyleMap = /* @__PURE__ */ new WeakMap();
  function reconcileStyle(el, value) {
    if (!value)
      return;
    const currentAdded = nexusStyleMap.get(el) || /* @__PURE__ */ new Set();
    const toAdd = /* @__PURE__ */ new Set();
    let styleObj = {};
    if (typeof value === "string") {
      value.split(";").forEach((pair) => {
        const [prop, val] = pair.split(":").map((s) => s.trim());
        if (prop && val)
          styleObj[prop] = val;
      });
    } else if (typeof value === "object" && value !== null) {
      styleObj = value;
    } else {
      return;
    }
    Object.entries(styleObj).forEach(([prop, val]) => {
      const cssProp = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      if (val !== null && val !== void 0 && val !== false) {
        el.style.setProperty(cssProp, String(val));
        toAdd.add(cssProp);
        currentAdded.add(cssProp);
      } else {
        el.style.removeProperty(cssProp);
        currentAdded.delete(cssProp);
      }
    });
    currentAdded.forEach((prop) => {
      if (!(prop in styleObj) && !(prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()) in styleObj)) {
        el.style.removeProperty(prop);
        currentAdded.delete(prop);
      }
    });
    if (currentAdded.size > 0)
      nexusStyleMap.set(el, currentAdded);
  }
  function deepEqual(a, b) {
    if (a === b)
      return true;
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null)
      return false;
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i]))
          return false;
      }
      return true;
    }
    if (Array.isArray(b))
      return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
      return false;
    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  // src/engine/fetch.ts
  init_debug();
  init_consts();
  var fetchCache = /* @__PURE__ */ new Map();
  var fetchCacheTimers = /* @__PURE__ */ new Map();
  var fetchUtilities = {
    request: (url, options, el) => {
      const cacheKey = `${url}:${options.method || "GET"}:${options.responseType || "text"}`;
      if (fetchCache.has(cacheKey))
        return fetchCache.get(cacheKey);
      const promise = (async () => {
        let controller;
        try {
          controller = new AbortController();
          const signal = controller.signal;
          const fetchOptions = {
            ...options,
            signal
          };
          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          let data;
          switch (options.responseType) {
            case "json":
              data = await response.json();
              break;
            case "blob":
              data = await response.blob();
              break;
            case "arrayBuffer":
              data = await response.arrayBuffer();
              break;
            case "formData":
              data = await response.formData();
              break;
            case "text":
            default:
              data = await response.text();
              break;
          }
          el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-success`, {
            bubbles: true,
            cancelable: false,
            detail: { url, options, data, response }
          }));
          return data;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            if (document.documentElement.hasAttribute("data-debug")) {
              console.warn(`Fetch request to ${url} was aborted.`);
            }
          } else {
            reportError(new Error(`Failed to fetch from ${url}: ${e instanceof Error ? e.message : String(e)}`), el);
          }
          el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-error`, {
            bubbles: true,
            cancelable: false,
            detail: { url, options, error: e }
          }));
          throw e;
        }
      })();
      fetchCache.set(cacheKey, promise);
      promise.finally(() => {
        if (fetchCacheTimers.has(cacheKey))
          clearTimeout(fetchCacheTimers.get(cacheKey));
        fetchCacheTimers.set(cacheKey, setTimeout(() => {
          fetchCache.delete(cacheKey);
          fetchCacheTimers.delete(cacheKey);
        }, 2e3));
      });
      return promise;
    },
    /**
     * Creates a deeply reactive Suspense proxy that throws its pending Promise when accessed.
     * This allows Nexus-UX to gracefully pause elementBoundEffect until the fetch completes.
     */
    createSuspenseProxy: (promise) => {
      let isResolved = false;
      let isRejected = false;
      let result;
      let error;
      promise.then(
        (res) => {
          isResolved = true;
          result = res;
        },
        (err2) => {
          isRejected = true;
          error = err2;
        }
      );
      return new Proxy(promise, {
        get(target2, prop) {
          if (prop === "then")
            return target2.then.bind(target2);
          if (prop === "catch")
            return target2.catch.bind(target2);
          if (prop === "finally")
            return target2.finally.bind(target2);
          if (prop === "__v_isRef" || prop === "__v_isReactive")
            return false;
          if (isRejected)
            throw error;
          if (!isResolved)
            throw promise;
          if (result === void 0 || result === null)
            return void 0;
          let finalResult = result;
          if (typeof result === "string") {
            try {
              finalResult = JSON.parse(result);
            } catch (_e) {
            }
          }
          if (finalResult && typeof finalResult === "object") {
            const envelopes = ["data", "results", "items", "value", "_embedded", "entries"];
            for (const envelope of envelopes) {
              if (finalResult[envelope] !== void 0) {
                finalResult = finalResult[envelope];
                break;
              }
            }
          }
          const val = finalResult && typeof finalResult === "object" ? finalResult[prop] : void 0;
          return typeof val === "function" ? val.bind(finalResult) : val;
        }
      });
    }
  };
  var fetchModule = {
    name: "fetch",
    install: (context) => {
      context.fetch = fetchUtilities;
    }
  };

  // src/engine/evaluator.ts
  init_debug();

  // src/engine/mirror.ts
  init_consts();
  var mirrorCache = /* @__PURE__ */ new Map();
  var activeListeners = /* @__PURE__ */ new Set();
  var LAYOUT_METRIC_PROPS = /* @__PURE__ */ new Set([
    "innerWidth",
    "innerHeight",
    "outerWidth",
    "outerHeight",
    "screenX",
    "screenY",
    "scrollX",
    "scrollY",
    "devicePixelRatio"
  ]);
  var rafDirtyProps = /* @__PURE__ */ new Set();
  var rafScheduled = false;
  function flushLayoutMetrics() {
    rafScheduled = false;
    const props = rafDirtyProps;
    rafDirtyProps.clear();
    for (const prop of props) {
      if (mirrorCache.has(prop)) {
        mirrorCache.get(prop).value = globalThis.window[prop];
      }
    }
  }
  function attachListenerIfNeeded(prop) {
    if (activeListeners.has(prop))
      return;
    const update = () => {
      if (mirrorCache.has(prop)) {
        mirrorCache.get(prop).value = globalThis.window[prop];
      }
    };
    const updateCoalesced = () => {
      rafDirtyProps.add(prop);
      if (rafScheduled)
        return;
      rafScheduled = true;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(flushLayoutMetrics);
      } else {
        queueMicrotask(flushLayoutMetrics);
      }
    };
    switch (prop) {
      case "innerWidth":
      case "innerHeight":
      case "outerWidth":
      case "outerHeight":
      case "screenX":
      case "screenY":
      case "scrollX":
      case "scrollY":
      case "devicePixelRatio":
        window.addEventListener("resize", LAYOUT_METRIC_PROPS.has(prop) ? updateCoalesced : update, { passive: true });
        window.addEventListener("scroll", LAYOUT_METRIC_PROPS.has(prop) ? updateCoalesced : update, { passive: true });
        activeListeners.add(prop);
        break;
      case "localStorage":
      case "sessionStorage":
        window.addEventListener("storage", update);
        activeListeners.add(prop);
        break;
      case "location":
      case "navigation":
        if ("navigation" in window) {
          window.navigation.addEventListener("currententrychange", update);
        } else {
          window.addEventListener("popstate", update);
          window.addEventListener("hashchange", update);
        }
        activeListeners.add(prop);
        break;
      case "navigator":
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        activeListeners.add(prop);
        break;
      case "matchMedia":
        break;
    }
  }
  function createHeapBackedRef(target2, prop, heapKey, globalSignals, scheduler2) {
    const isStringCoercingAPI = typeof target2?.getItem === "function" && typeof target2?.setItem === "function";
    if (!heap.has(heapKey)) {
      let initial = void 0;
      try {
        initial = isStringCoercingAPI ? target2.getItem(prop) : target2[prop];
      } catch {
      }
      if (typeof initial === "string") {
        const trimmed = initial.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            initial = JSON.parse(trimmed);
          } catch {
          }
        }
      }
      heap.set(heapKey, initial);
    }
    return customRef((track2, trigger2) => ({
      get() {
        track2();
        return heap.get(heapKey);
      },
      set(newValue) {
        heap.set(heapKey, newValue);
        try {
          if (isStringCoercingAPI) {
            const strValue = newValue && typeof newValue === "object" ? JSON.stringify(toRaw(newValue)) : String(newValue);
            target2.setItem(prop, strValue);
          } else {
            if (newValue && typeof newValue === "object") {
              Reflect.set(target2, prop, newValue);
            } else {
              Reflect.set(target2, prop, newValue);
            }
          }
        } catch (e) {
          console.warn(`[Nexus Mirror] Dynamic write failed for ${prop}:`, e);
        }
        trigger2();
      }
    }));
  }
  var idbConnectionCache = /* @__PURE__ */ new WeakMap();
  function detectAccessProtocol(target2) {
    if (typeof target2?.open === "function" && typeof target2?.deleteDatabase === "function") {
      return "db-factory";
    }
    if (typeof target2?.get === "function" && typeof target2?.set === "function" && typeof target2?.getItem !== "function") {
      return "async-kv";
    }
    return "direct";
  }
  function openFactoryConnection(factory) {
    const cached = idbConnectionCache.get(factory);
    if (cached)
      return cached;
    const dbName = typeof location !== "undefined" ? location.origin : "nexus-ux";
    const promise = new Promise((resolve, reject) => {
      const req = factory.open(dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv");
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => {
        idbConnectionCache.delete(factory);
        reject(e.target.error);
      };
    });
    idbConnectionCache.set(factory, promise);
    return promise;
  }
  function createDBFactoryRef(factory, mirrorName, prop, heapKey, scheduler2) {
    const kvKey = `${mirrorName}:${prop}`;
    if (!heap.has(heapKey))
      heap.set(heapKey, void 0);
    let _trigger = null;
    openFactoryConnection(factory).then((db) => new Promise((resolve, reject) => {
      const req = db.transaction("kv", "readonly").objectStore("kv").get(kvKey);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    })).then((value) => {
      if (heap.get(heapKey) === void 0) {
        heap.set(heapKey, value !== void 0 ? value : null);
        _trigger?.();
      }
    }).catch((e) => console.warn(`[Nexus Mirror] DB factory read failed for ${kvKey}:`, e));
    return customRef((track2, trigger2) => {
      _trigger = trigger2;
      return {
        get() {
          track2();
          return heap.get(heapKey);
        },
        set(newValue) {
          heap.set(heapKey, newValue);
          openFactoryConnection(factory).then((db) => new Promise((resolve, reject) => {
            const req = db.transaction("kv", "readwrite").objectStore("kv").put(toRaw(newValue), kvKey);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
          })).catch((e) => console.warn(`[Nexus Mirror] DB factory write failed for ${kvKey}:`, e));
          trigger2();
        }
      };
    });
  }
  function createAsyncKVRef(target2, prop, heapKey, scheduler2) {
    if (!heap.has(heapKey))
      heap.set(heapKey, void 0);
    let _trigger = null;
    Promise.resolve(target2.get(prop)).then((value) => {
      if (heap.get(heapKey) === void 0) {
        heap.set(heapKey, value !== void 0 ? value : null);
        _trigger?.();
      }
    }).catch((e) => console.warn(`[Nexus Mirror] Async KV read failed for ${prop}:`, e));
    return customRef((track2, trigger2) => {
      _trigger = trigger2;
      return {
        get() {
          track2();
          return heap.get(heapKey);
        },
        set(newValue) {
          heap.set(heapKey, newValue);
          Promise.resolve(target2.set(prop, toRaw(newValue))).catch((e) => console.warn(`[Nexus Mirror] Async KV write failed for ${prop}:`, e));
          trigger2();
        }
      };
    });
  }
  function getObjectMirror(target2, name, globalSignals, scheduler2) {
    const localCache = /* @__PURE__ */ new Map();
    const protocol = detectAccessProtocol(target2);
    function getOrCreateRef(prop) {
      if (localCache.has(prop))
        return localCache.get(prop);
      const heapKey = `${name}.${prop}`;
      let ref2;
      switch (protocol) {
        case "db-factory":
          ref2 = createDBFactoryRef(target2, name, prop, heapKey, scheduler2);
          break;
        case "async-kv":
          ref2 = createAsyncKVRef(target2, prop, heapKey, scheduler2);
          break;
        default:
          ref2 = createHeapBackedRef(target2, prop, heapKey, globalSignals, scheduler2);
      }
      localCache.set(prop, ref2);
      return ref2;
    }
    return new Proxy(target2, {
      get(t, prop) {
        if (typeof prop === "string") {
          const value = getOrCreateRef(prop).value;
          if (typeof value === "function")
            return value.bind(t);
          if (value && typeof value === "object" && !Array.isArray(value)) {
            return getObjectMirror(value, `${name}_${prop}`, globalSignals, scheduler2);
          }
          return value;
        }
        return Reflect.get(t, prop);
      },
      set(_t, prop, value, _receiver) {
        if (typeof prop === "string") {
          getOrCreateRef(prop).value = value;
          return true;
        }
        return Reflect.set(_t, prop, value, _receiver);
      }
    });
  }
  var singletonRegistry = /* @__PURE__ */ new Map();
  function isElementBasedObserver(name) {
    return ["IntersectionObserver", "ResizeObserver", "MutationObserver"].includes(name);
  }
  function registerToSingletonObserver(name, callback, scheduler2, element) {
    let entry = singletonRegistry.get(name);
    if (!entry) {
      const RealCtor = globalThis[name];
      const isElementBased = isElementBasedObserver(name);
      const entryCallbacks = /* @__PURE__ */ new Map();
      let entryGlobalCallbacks;
      const observer = new RealCtor((entries) => {
        for (const obsEntry of entries) {
          if (isElementBased && obsEntry.target) {
            const cbs = entryCallbacks.get(obsEntry.target);
            if (cbs) {
              cbs.forEach((cb) => scheduler2.enqueueEffect(() => cb(obsEntry)));
            }
          } else {
            entryGlobalCallbacks?.forEach(
              (cb) => scheduler2.enqueueEffect(() => cb(entries))
            );
          }
        }
      });
      entry = { observer, callbacks: entryCallbacks, globalCallbacks: entryGlobalCallbacks };
      singletonRegistry.set(name, entry);
      if (!isElementBased) {
        entry.globalCallbacks = /* @__PURE__ */ new Set();
        observer.observe({ entryTypes: ["navigation", "resource", "paint", "largest-contentful-paint"] });
      }
    }
    if (isElementBasedObserver(name)) {
      let cbs = entry.callbacks.get(element);
      if (!cbs) {
        cbs = /* @__PURE__ */ new Set();
        entry.callbacks.set(element, cbs);
        entry.observer.observe(element);
      }
      cbs.add(callback);
      return () => {
        cbs?.delete(callback);
        if (cbs?.size === 0) {
          entry.callbacks.delete(element);
          entry.observer.unobserve(element);
        }
      };
    } else {
      if (!entry.globalCallbacks) {
        entry.globalCallbacks = /* @__PURE__ */ new Set();
      }
      entry.globalCallbacks.add(callback);
      return () => {
        entry.globalCallbacks?.delete(callback);
        if (entry.globalCallbacks?.size === 0) {
          entry.globalCallbacks = void 0;
        }
      };
    }
  }
  var streamRegistry = /* @__PURE__ */ new Map();
  function registerToStreamMultiplexer(name, urlOrName, callback, scheduler2) {
    const cacheKey = `${name}:${urlOrName}`;
    let entry = streamRegistry.get(cacheKey);
    if (!entry) {
      const RealCtor = globalThis[name];
      const stream = new RealCtor(urlOrName);
      const newEntry = {
        stream,
        listeners: /* @__PURE__ */ new Set(),
        ownerCount: 0
      };
      entry = newEntry;
      stream.onmessage = (msg) => {
        entry.listeners.forEach((cb) => scheduler2.enqueueEffect(() => cb(msg)));
      };
      streamRegistry.set(cacheKey, entry);
    }
    entry.listeners.add(callback);
    entry.ownerCount++;
    return () => {
      entry.listeners.delete(callback);
      entry.ownerCount--;
      if (entry.ownerCount === 0) {
        if (typeof entry.stream.close === "function")
          entry.stream.close();
        if (typeof entry.stream.terminate === "function")
          entry.stream.terminate();
        streamRegistry.delete(cacheKey);
      }
    };
  }
  function attachAutoCleanup(instance, element) {
    const disconnect = () => {
      if (typeof instance.disconnect === "function") {
        instance.disconnect();
      }
    };
    const enhanced = element;
    if (!enhanced[CLEANUP_FUNCTIONS_KEY]) {
      enhanced[CLEANUP_FUNCTIONS_KEY] = /* @__PURE__ */ new Map();
    }
    const cleanupMap = enhanced[CLEANUP_FUNCTIONS_KEY];
    if (cleanupMap instanceof Map) {
      const key = `disconnect-${Math.random().toString(36).slice(2)}`;
      cleanupMap.set(key, disconnect);
    } else if (Array.isArray(cleanupMap)) {
      cleanupMap.push(disconnect);
    }
  }
  function generateDynamicMirror(name, target2, runtime, element) {
    const { scheduler: scheduler2 } = runtime;
    if (typeof target2 !== "function") {
      return getObjectMirror(target2, name, runtime.globalSignals(), scheduler2);
    }
    return new Proxy(target2, {
      construct(_ctor, args) {
        const instance = new target2(...args);
        if (element) {
          attachAutoCleanup(instance, element);
        }
        return getObjectMirror(instance, name, runtime.globalSignals(), scheduler2);
      },
      apply(_ctor, _thisArg, args) {
        if (name === "IntersectionObserver" || name === "ResizeObserver" || name === "MutationObserver" || name === "PerformanceObserver") {
          if (element) {
            return registerToSingletonObserver(name, args[0], scheduler2, element);
          }
        }
        if (name === "WebSocket" || name === "Worker" || name === "BroadcastChannel") {
          return registerToStreamMultiplexer(name, args[0], args[1], scheduler2);
        }
        return Reflect.apply(target2, globalThis, args);
      }
    });
  }
  var MirrorProxy = typeof window !== "undefined" ? new Proxy(globalThis.window, {
    get(target2, prop) {
      if (typeof prop === "string") {
        if (!mirrorCache.has(prop)) {
          mirrorCache.set(prop, shallowRef(target2[prop]));
          attachListenerIfNeeded(prop);
        }
        const v = mirrorCache.get(prop).value;
        return typeof v === "function" ? v.bind(target2) : v;
      }
      return Reflect.get(target2, prop);
    },
    set(target2, prop, value) {
      if (typeof prop === "string") {
        const success = Reflect.set(target2, prop, value);
        if (success && mirrorCache.has(prop)) {
          mirrorCache.get(prop).value = value;
        }
        return success;
      }
      return Reflect.set(target2, prop, value);
    }
  }) : {};

  // src/engine/evaluator.ts
  registerScopeProvider("__global", (_, runtime) => runtime.globalSignals());
  var shouldAutoEvaluateFunctions = true;
  var currentEvalDepth = 0;
  var MAX_EVAL_DEPTH = 50;
  function evaluate(el, expression, runtime, extras = {}) {
    if (typeof expression !== "string" || !expression || expression.trim() === "")
      return {};
    const runner = evaluateLater(el, expression, runtime);
    let res;
    runner((v) => res = v, extras);
    return res;
  }
  function preProcessExpression(expression) {
    let processed = expression;
    if (processed.includes("@")) {
      processed = processed.replace(/@(\w+)\s*\((.*?)\)\s*\{([^}]*)\}/g, (_match, name, arg, body) => {
        const safeArg = arg.trim().replace(/`/g, "\\`");
        return `_scopes.${name}(\`${safeArg}\`, () => { return ${body.trim()} })`;
      });
    }
    if (processed.includes("#")) {
      processed = processed.replace(/(^|[^a-zA-Z0-9_$'"`])#([a-zA-Z_$][\w$]*)/g, "$1__global.$2");
    }
    return processed;
  }
  function checkBalanced(expr) {
    const stack = [];
    const pairs = { "{": "}", "[": "]", "(": ")" };
    let inString = null;
    let escape = false;
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (inString) {
        if (char === inString)
          inString = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        inString = char;
        continue;
      }
      if (pairs[char]) {
        stack.push({ char, pos: i });
      } else if (char === "}" || char === "]" || char === ")") {
        const last = stack.pop();
        if (!last || pairs[last.char] !== char) {
          return { type: "bracket", expected: last ? pairs[last.char] : "none", position: i };
        }
      }
    }
    if (inString) {
      return { type: "quote", expected: inString, position: expr.length };
    }
    if (stack.length > 0) {
      const last = stack[stack.length - 1];
      return { type: "bracket", expected: pairs[last.char], position: last.pos };
    }
    return null;
  }
  function validateExpression(expression, el) {
    const trimmed = expression.trim();
    let attrName = "";
    if (el instanceof Element) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.value === expression) {
          attrName = attr.name;
          break;
        }
      }
    }
    if (attrName === "data-for") {
      if (!trimmed.includes(" in ")) {
        return {
          severity: "error",
          message: `Invalid data-for syntax: "${trimmed}". Expected "item in items".`,
          suggestion: trimmed.includes(" of ") ? `Replace 'of' with 'in': "${trimmed.replace(" of ", " in ")}"` : `Use pattern: "(item, index) in list"`,
          element: el,
          expression: trimmed
        };
      }
    }
    if (attrName === "data-var") {
      if (!trimmed.startsWith("{") && !trimmed.startsWith("({")) {
        return {
          severity: "error",
          message: `data-var must evaluate to an object literal. Got: "${trimmed.substring(0, 40)}..."`,
          suggestion: `Wrap in braces: "{ ${trimmed} }"`,
          element: el,
          expression: trimmed
        };
      }
    }
    const balanced = checkBalanced(trimmed);
    if (balanced) {
      return {
        severity: "error",
        message: `Unbalanced ${balanced.type} in expression: "${trimmed.substring(0, 60)}..."`,
        suggestion: `Check for missing closing '${balanced.expected}' near position ${balanced.position}`,
        element: el,
        expression: trimmed
      };
    }
    return null;
  }
  function evaluateLater(el, expression, runtime, initialExtras = {}) {
    const processedExpression = preProcessExpression(expression);
    const baseScope = {
      ...runtime,
      ...initialExtras
    };
    const scope = new Proxy(baseScope, {
      has(target2, key) {
        if (key === Symbol.unscopables)
          return false;
        if (typeof key === "string") {
          if (key.startsWith("_"))
            return true;
          if (hasScopeProvider(key))
            return true;
          const globalSignals = runtime.globalSignals();
          const globalActions = runtime.globalActions();
          const dataStack = getDataStack(el);
          return key in target2 || key in globalSignals || key in globalActions || dataStack.some((data) => key in data);
        }
        return false;
      },
      get(target2, key) {
        if (key === Symbol.unscopables)
          return void 0;
        if (typeof key === "string") {
          if (key.startsWith("_")) {
            if (key === "_" || key === "_window")
              return MirrorProxy;
            const realName = key.slice(1);
            const globalSignals2 = runtime.globalSignals();
            let val = globalSignals2[key];
            if (val !== void 0)
              return val;
            try {
              const nativeTarget = globalThis[realName];
              if (nativeTarget !== void 0) {
                const wrapped = generateDynamicMirror(realName, nativeTarget, runtime, el);
                globalSignals2[key] = wrapped;
                return wrapped;
              }
            } catch (e) {
              if (runtime.isDevMode) {
                console.warn(`[Nexus Evaluator] Blocked or failed to get native target for ${realName}:`, e);
              }
            }
            return void 0;
          }
          if (hasScopeProvider(key))
            return resolveScopeProvider(key, el, runtime);
          const dataStack = getDataStack(el);
          for (const data of dataStack) {
            if (key in data) {
              const val = data[key];
              return runtime.unref(val);
            }
          }
          const globalSignals = runtime.globalSignals();
          if (key in globalSignals) {
            const val = globalSignals[key];
            return runtime.unref(val);
          }
          const globalActions = runtime.globalActions();
          if (key in globalActions) {
            return globalActions[key];
          }
        }
        return void 0;
      },
      set(target2, key, value) {
        if (typeof key === "string") {
          const globalSignals = runtime.globalSignals();
          if (key in globalSignals) {
            globalSignals[key] = value;
            return true;
          }
          const dataStack = getDataStack(el);
          for (const data of dataStack) {
            if (key in data) {
              data[key] = value;
              return true;
            }
          }
          if (dataStack.length > 0) {
            dataStack[0][key] = value;
            return true;
          }
          if (key in target2) {
            target2[key] = value;
            return true;
          }
          globalSignals[key] = value;
          return true;
        }
        return false;
      }
    });
    const diagnostic = validateExpression(expression, el);
    if (diagnostic) {
      syntaxError(
        diagnostic.element ? diagnostic.element.tagName.toLowerCase() : "unknown",
        expression,
        `${diagnostic.message}
\u{1F4A1} Suggestion: ${diagnostic.suggestion}`,
        el instanceof HTMLElement ? el : void 0
      );
    }
    let func;
    try {
      func = new Function("scope", `with (scope) { return (${processedExpression}) }`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        try {
          func = new Function("scope", `with (scope) { ${processedExpression} }`);
        } catch (e2) {
          if (e2 instanceof SyntaxError) {
            syntaxError("eval", expression, e2.message, el instanceof HTMLElement ? el : void 0);
          }
          throw e2;
        }
      } else {
        throw e;
      }
    }
    return (receiver, callExtras = {}) => {
      if (currentEvalDepth > MAX_EVAL_DEPTH) {
        console.warn(`[Nexus Loop Guard] Stopped runaway evaluation at depth ${currentEvalDepth} for expression: "${expression}"`);
        receiver(void 0);
        return;
      }
      currentEvalDepth++;
      try {
        const currentScope = new Proxy(callExtras, {
          has(target2, key) {
            if (key === Symbol.unscopables)
              return false;
            if (typeof key === "string")
              return key in target2 || key in scope;
            return key in target2;
          },
          get(target2, key) {
            if (key === Symbol.unscopables)
              return void 0;
            if (typeof key === "string") {
              if (key in target2)
                return target2[key];
              return scope[key];
            }
            return void 0;
          },
          set(target2, key, value) {
            if (typeof key === "string") {
              if (key in target2) {
                target2[key] = value;
                return true;
              }
              scope[key] = value;
              return true;
            }
            return false;
          }
        });
        const result = func.call(el, currentScope);
        if (shouldAutoEvaluateFunctions && typeof result === "function") {
          receiver(result.call(el, currentScope));
        } else {
          receiver(result);
        }
      } catch (e) {
        if (e instanceof Promise)
          throw e;
        if (e instanceof TypeError && e.message.includes("Cannot read properties of") || e instanceof ReferenceError) {
          if (runtime.isDevMode) {
            try {
              getSelfHealAgent().reportResolutionFailure("expression", expression, {
                error: e.message,
                node: el
              });
            } catch (_err) {
            }
          }
          receiver(void 0);
        } else {
          console.error(`[Evaluator Error] Expression "${expression}" failed:`, e);
          evaluationError(expression, e instanceof Error ? e : new Error(String(e)), el);
        }
      } finally {
        currentEvalDepth--;
      }
    };
  }

  // src/engine/modules.ts
  init_scheduler();
  init_debug();
  init_debug();

  // src/engine/utils/hash.ts
  init_consts();
  var Hash = class {
    #value = 0;
    #prefix;
    constructor(prefix = STATE) {
      this.#prefix = prefix;
    }
    /**
     * Incorporates a value into the hash.
     */
    with(x) {
      if (typeof x === "string") {
        const len = x.length;
        for (let i = 0; i < len; i++) {
          this.with(x.charCodeAt(i));
        }
      } else if (typeof x === "boolean") {
        this.with(1 << (x ? 7 : 3));
      } else {
        this.#value = this.#value * 33 ^ x;
      }
      return this;
    }
    get value() {
      return this.#value;
    }
    /**
     * Returns the hash as a base36 string prefixed with the state key.
     */
    get string() {
      return this.#prefix + Math.abs(this.#value).toString(36);
    }
  };
  function elUniqId(el) {
    if (el.id)
      return el.id;
    const key = el.getAttribute("data-ux-id") || el.getAttribute("data-key") || el.getAttribute("data-id");
    if (key) {
      const hash2 = new Hash();
      hash2.with(el.tagName).with(key);
      return hash2.string;
    }
    const hash = new Hash();
    let currentEl = el;
    while (currentEl) {
      hash.with(currentEl.tagName || "");
      if (currentEl.id) {
        hash.with(currentEl.id);
        break;
      }
      const p = currentEl?.parentNode || null;
      if (p && (p instanceof Element || p instanceof DocumentFragment || typeof ShadowRoot !== "undefined" && p instanceof ShadowRoot)) {
        const children = p.children || [];
        if (children.length > 0) {
          hash.with(Array.from(children).indexOf(currentEl));
        }
      }
      currentEl = p instanceof Element ? p : typeof ShadowRoot !== "undefined" && p instanceof ShadowRoot ? p.host : p instanceof DocumentFragment ? null : null;
      if (p instanceof DocumentFragment && !currentEl) {
      }
    }
    return hash.string;
  }
  function attrHash(key, val) {
    return new Hash().with(key).with(val).value;
  }

  // src/engine/modules.ts
  init_consts();

  // src/engine/observers.ts
  var registry = /* @__PURE__ */ new Map();
  function registerObserver(name, module) {
    registry.set(name, {
      module,
      activeCleanups: /* @__PURE__ */ new Map()
    });
  }
  function attachObserver(name, el, runtime) {
    const entry = registry.get(name);
    if (!entry)
      return void 0;
    if (entry.activeCleanups.has(el))
      return void 0;
    const cleanup = entry.module.observe(el, runtime);
    if (cleanup) {
      entry.activeCleanups.set(el, cleanup);
      return () => {
        cleanup();
        entry.activeCleanups.delete(el);
      };
    }
    return void 0;
  }
  function disposeObservers() {
    registry.forEach((entry) => {
      entry.activeCleanups.forEach((cleanup) => cleanup());
      entry.activeCleanups.clear();
    });
    registry.clear();
  }

  // src/engine/modules.ts
  init_mcp();
  var globalReactiveState = reactive({});
  var ModuleCoordinator = class {
    attributeModules = /* @__PURE__ */ new Map();
    actionModules = /* @__PURE__ */ new Map();
    modifierModules = /* @__PURE__ */ new Map();
    listenerModules = /* @__PURE__ */ new Map();
    observerModules = /* @__PURE__ */ new Map();
    utilityModules = /* @__PURE__ */ new Map();
    mirrorModules = /* @__PURE__ */ new Map();
    spriteModules = /* @__PURE__ */ new Map();
    scopeModules = /* @__PURE__ */ new Map();
    directiveOrder = [];
    runtimeContext;
    initContext;
    markerDispenser = 1;
    constructor() {
      this.runtimeContext = {
        effect,
        stop,
        reactive,
        toRaw,
        isReactive,
        isReadonly,
        isProxy,
        readonly,
        shallowReactive,
        shallowReadonly,
        customRef,
        triggerRef,
        unref,
        ref,
        shallowRef,
        isRef,
        toRefs,
        toRef,
        computed,
        watch,
        onEffectCleanup,
        elementBoundEffect,
        morphDOM,
        fetch: fetchUtilities,
        evaluate: (el, expression, extras) => evaluate(el, expression, this.runtimeContext, extras),
        globalSignals: getGlobalSignals.bind(this),
        setGlobalSignal: setGlobalSignal.bind(this),
        localSignals: getLocalSignals.bind(this),
        localActions: getLocalActions.bind(this),
        globalActions: getGlobalActions.bind(this),
        getModifier: (name) => this.modifierModules.get(name),
        processElement: this.processElement.bind(this),
        reconcileClass: (el, val) => reconcileClass(el, val),
        reconcileStyle: (el, val) => reconcileStyle(el, val),
        adoptStyle: (el) => el.classList.forEach((cls) => stylesheet.adoptClass(cls, el)),
        parseAttribute,
        scheduler,
        reportError: (err2, el, expr) => logger.error(this.runtimeContext, err2.message, el, expr),
        $: (selector) => {
          if (typeof document === "undefined")
            return null;
          return resolveSelector(document.body, selector);
        },
        isDevMode: typeof document !== "undefined" ? document.documentElement.hasAttribute("data-debug") : false,
        elUniqId,
        attrHash,
        // Engine Topology (Tier 0-3)
        topology: {
          getTier: () => topology.getTier(),
          getConfig: () => topology.getTierConfig(),
          getActiveWorkers: () => topology.getActiveWorkers(),
          isSABAvailable: () => topology.isSABAvailable(),
          getLagVariance: () => topology.getLagVariance()
        },
        log: (...args) => logger.log(this.runtimeContext, ...args),
        warn: (...args) => logger.warn(this.runtimeContext, ...args),
        info: (...args) => logger.info(this.runtimeContext, ...args),
        debug: (...args) => logger.debug(this.runtimeContext, ...args),
        mcp: void 0,
        // Placeholder for initialization below
        sprites: {},
        // Namespace for all registered sprites
        update: (fn) => fn()
        // Immediate execution for now
      };
      if (typeof document !== "undefined") {
        const mcpUrl = document.querySelector('meta[name="nexus-mcp-server"]')?.getAttribute("content");
        if (mcpUrl) {
          this.runtimeContext.mcp = new MCPClient(mcpUrl);
          this.runtimeContext.mcp.connect().catch(() => {
            this.runtimeContext.debug(`[Coordinator] MCP Connection skipped: ${mcpUrl}`);
          });
        }
      }
      initSanitizingEngine(this.runtimeContext);
      this.initContext = {
        registerAttributeModule: this.registerAttributeModule.bind(this),
        registerActionModule: this.registerActionModule.bind(this),
        registerModifierModule: this.registerModifierModule.bind(this),
        registerListenerModule: this.registerListenerModule.bind(this),
        registerObserverModule: this.registerObserverModule.bind(this),
        registerUtilityModule: this.registerUtilityModule.bind(this),
        registerMirrorModule: this.registerMirrorModule.bind(this),
        registerSpriteModule: this.registerSpriteModule.bind(this),
        registerScopeModule: this.registerScopeModule.bind(this),
        runtime: this.runtimeContext
      };
    }
    dispose() {
      disposeSanitizingEngine();
      this.attributeModules.clear();
      this.actionModules.clear();
      this.modifierModules.clear();
      this.listenerModules.clear();
      this.observerModules.clear();
      this.utilityModules.clear();
      disposeObservers();
    }
    initializeModules(rootElement) {
      this.utilityModules.forEach((module, name) => {
        if (module.onGlobalInit) {
          try {
            module.onGlobalInit(this.runtimeContext);
          } catch (e) {
            this.runtimeContext.reportError(
              e instanceof Error ? e : new Error(String(e)),
              void 0,
              `Failed to initialize module: ${name}`
            );
          }
        }
      });
      this.processElement(rootElement);
      const cleanup = attachObserver("mutationObserver", rootElement, this.runtimeContext);
      if (cleanup) {
        const enhanced = rootElement;
        if (!enhanced[CLEANUP_FUNCTIONS_KEY])
          enhanced[CLEANUP_FUNCTIONS_KEY] = /* @__PURE__ */ new Map();
        enhanced[CLEANUP_FUNCTIONS_KEY].set("__rootMutationObserver__", cleanup);
      }
      this.listenerModules.forEach((module, name) => {
        try {
          const cleanupFn = module.listen(rootElement, this.runtimeContext);
          if (typeof cleanupFn === "function") {
            const enhanced = rootElement;
            if (!enhanced[CLEANUP_FUNCTIONS_KEY])
              enhanced[CLEANUP_FUNCTIONS_KEY] = /* @__PURE__ */ new Map();
            enhanced[CLEANUP_FUNCTIONS_KEY].set(`__listener_${name}__`, cleanupFn);
          }
        } catch (e) {
          this.runtimeContext.reportError(
            e instanceof Error ? e : new Error(String(e)),
            void 0,
            `Failed to start listener module: ${name}`
          );
        }
      });
    }
    registerModifierModule(name, module) {
      this.modifierModules.set(name, module);
    }
    registerAttributeModule(name, module) {
      const key = module.attribute || name;
      this.attributeModules.set(key, module);
      const index = this.directiveOrder.indexOf(key);
      if (index === -1) {
        if (module.metadata?.after?.[0]) {
          const afterIndex = this.directiveOrder.indexOf(module.metadata.after[0]);
          if (afterIndex !== -1)
            this.directiveOrder.splice(afterIndex + 1, 0, key);
          else
            this.directiveOrder.push(key);
        } else if (module.metadata?.before?.[0]) {
          const beforeIndex = this.directiveOrder.indexOf(module.metadata.before[0]);
          if (beforeIndex !== -1)
            this.directiveOrder.splice(beforeIndex, 0, key);
          else
            this.directiveOrder.unshift(key);
        } else {
          this.directiveOrder.push(key);
        }
      }
      this.triggerScan();
    }
    registerActionModule(name, module) {
      this.actionModules.set(name, module);
    }
    registerListenerModule(name, module) {
      this.listenerModules.set(name, module);
    }
    registerObserverModule(name, module) {
      this.observerModules.set(name, module);
      registerObserver(name, module);
    }
    registerUtilityModule(name, module) {
      this.utilityModules.set(name, module);
    }
    registerMirrorModule(name, module) {
      this.mirrorModules.set(name, module);
      const proxy = module.create(this.runtimeContext);
      this.runtimeContext.setGlobalSignal(`_${module.prefix}`, proxy);
    }
    registerSpriteModule(name, module) {
      this.spriteModules.set(name, module);
      const sprites = module.sprites(this.runtimeContext);
      const spriteKey = module.key || `$${name}`;
      this.runtimeContext.sprites[spriteKey] = sprites;
      registerScopeProvider(spriteKey, () => sprites);
      Object.entries(sprites).forEach(([spriteName, handler]) => {
        this.registerActionModule(spriteName, {
          name: spriteName,
          handle: (_el, ...args) => handler(...args)
        });
      });
    }
    registerScopeModule(name, module) {
      this.scopeModules.set(name, module);
    }
    scanTimeout = null;
    triggerScan() {
      if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined")
        return;
      if (this.scanTimeout !== null)
        cancelAnimationFrame(this.scanTimeout);
      this.scanTimeout = requestAnimationFrame(() => {
        const roots = document.querySelectorAll(ROOT_SELECTOR);
        roots.forEach((root) => {
          if (root instanceof HTMLElement) {
            this.processElement(root, true);
          }
        });
        this.scanTimeout = null;
      });
    }
    getInitContext() {
      return this.initContext;
    }
    /**
     * Processes a DOM element and its children, applying directive modules.
     * Now supports recursive Isolation Firewalls via data-ignore.
     */
    processElement(element, forceReWalk = false, isolationLevel = "none") {
      let currentIsolation = isolationLevel;
      if (element.hasAttribute("data-ignore:off")) {
        currentIsolation = "none";
      } else if (element.hasAttribute("data-nexus-ignore")) {
        currentIsolation = "total";
      } else if (element.hasAttribute("data-ux-ignore")) {
        currentIsolation = "ux";
      } else if (element.hasAttribute("data-style-ignore")) {
        currentIsolation = "style";
      }
      if (currentIsolation === "total")
        return;
      if (!forceReWalk && element[MARKER_KEY])
        return;
      if (this.runtimeContext.isDevMode && !forceReWalk)
        this.runtimeContext.debug(`[Coordinator] Processing <${element.tagName}> (Isolation: ${currentIsolation})`, element);
      element[MARKER_KEY] = this.markerDispenser++;
      if (currentIsolation !== "style" && element.classList && element.classList.length > 0) {
        element.classList.forEach((cls) => stylesheet.adoptClass(cls, element, this.runtimeContext));
      }
      if (currentIsolation !== "ux") {
        const handlersToExecute = [];
        Array.from(element.attributes).forEach((attr, index) => {
          const parsedAttr = this.runtimeContext.parseAttribute(attr.name, this.runtimeContext, element);
          if (parsedAttr?.directive) {
            const module = this.attributeModules.get(parsedAttr.directive);
            if (module) {
              handlersToExecute.push({
                directiveName: parsedAttr.directive,
                handle: () => {
                  let scopedRuntime = this.runtimeContext;
                  if (parsedAttr.modifiers && parsedAttr.modifiers.length > 0) {
                    scopedRuntime = { ...this.runtimeContext };
                    let currentEvaluate = scopedRuntime.evaluate;
                    parsedAttr.modifiers.forEach((modFull) => {
                      let modName = modFull;
                      let modArg = "";
                      const dashIdx = modFull.indexOf("-");
                      if (dashIdx !== -1) {
                        modName = modFull.substring(0, dashIdx);
                        modArg = modFull.substring(dashIdx + 1);
                      }
                      const modModule = this.modifierModules.get(modName);
                      if (modModule && typeof modModule.interceptPipeline === "function") {
                        currentEvaluate = modModule.interceptPipeline(currentEvaluate, element, modArg || parsedAttr.target || "", scopedRuntime);
                      }
                    });
                    scopedRuntime.evaluate = currentEvaluate;
                  }
                  return module.handle(element, attr.value, scopedRuntime, parsedAttr);
                },
                originalIndex: index
              });
            }
          }
        });
        handlersToExecute.sort((a, b) => {
          const indexA = this.directiveOrder.indexOf(a.directiveName);
          const indexB = this.directiveOrder.indexOf(b.directiveName);
          const effA = indexA === -1 ? this.directiveOrder.length : indexA;
          const effB = indexB === -1 ? this.directiveOrder.length : indexB;
          return effA === effB ? a.originalIndex - b.originalIndex : effA - effB;
        });
        handlersToExecute.forEach((handler) => {
          const enhancedEl = element;
          const fullAttrName = Array.from(element.attributes)[handler.originalIndex]?.name || handler.directiveName;
          const hashKey = `${fullAttrName}:${this.runtimeContext.attrHash(handler.directiveName, element.getAttribute(fullAttrName) || "")}`;
          let elRemovals = enhancedEl[CLEANUP_FUNCTIONS_KEY];
          if (elRemovals?.has(hashKey))
            return;
          try {
            const cleanup = handler.handle();
            if (cleanup) {
              if (!elRemovals) {
                elRemovals = /* @__PURE__ */ new Map();
                enhancedEl[CLEANUP_FUNCTIONS_KEY] = elRemovals;
              }
              elRemovals.set(hashKey, cleanup);
            }
          } catch (e) {
            this.runtimeContext.reportError(
              e instanceof Error ? e : new Error(String(e)),
              element,
              `Attribute compilation failed for: ${fullAttrName}`
            );
          }
        });
      }
      if (element.hasAttribute("data-ux-template")) {
        return;
      }
      Array.from(element.children).forEach((child) => {
        if (child instanceof HTMLElement || child instanceof SVGElement) {
          this.processElement(child, forceReWalk, currentIsolation);
        } else if (child instanceof Element && child.classList && child.classList.length > 0) {
          if (currentIsolation !== "style") {
            child.classList.forEach((cls) => stylesheet.adoptClass(cls, child, this.runtimeContext));
            Array.from(child.children).forEach((grandchild) => {
              if (grandchild instanceof Element && grandchild.classList && grandchild.classList.length > 0) {
                grandchild.classList.forEach((cls) => stylesheet.adoptClass(cls, grandchild, this.runtimeContext));
              }
            });
          }
        }
      });
    }
  };
  function getGlobalSignals() {
    return globalReactiveState;
  }
  function setGlobalSignal(key, value) {
    globalReactiveState[key] = value;
  }
  function getLocalSignals(el) {
    const dataStack = getDataStack(el);
    return dataStack.length > 0 ? dataStack[0] : reactive({});
  }
  function getLocalActions(_el) {
    return {};
  }
  function getGlobalActions() {
    const actions = {};
    this.actionModules.forEach((module, name) => {
      const action = (...args) => module.handle(document.body, ...args);
      const proxyAction = new Proxy(action, {
        get(target2, key) {
          if (key in target2)
            return target2[key];
          const val = module.handle[key];
          return typeof val === "function" ? val.bind(module.handle) : val;
        }
      });
      actions[name] = proxyAction;
    });
    return actions;
  }

  // src/index.ts
  init_consts();

  // src/engine/scrollbarGutter.ts
  var injected = false;
  function ensureScrollbarGutter() {
    if (injected)
      return;
    if (typeof document === "undefined")
      return;
    if (!document.documentElement)
      return;
    injected = true;
    document.documentElement.style.scrollbarGutter = "stable";
  }

  // src/index.ts
  var _idCounters = {};
  function $id(groupName = "default") {
    if (!_idCounters[groupName]) {
      _idCounters[groupName] = 1;
    } else {
      _idCounters[groupName]++;
    }
    return `${groupName}-${_idCounters[groupName]}`;
  }
  function $nextTick() {
    return new Promise((resolve) => {
      Promise.resolve().then(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
  var UX = class {
    coordinator;
    constructor() {
      this.coordinator = new ModuleCoordinator();
      registerScopeProvider("$el", (el) => el);
      registerScopeProvider("$dispatch", (el) => (eventName, detail) => {
        if (!(el instanceof Element))
          return;
        el.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
      });
      registerScopeProvider("$global", (_el, runtime) => runtime.globalSignals());
      registerScopeProvider("$actions", (_el, runtime) => runtime.globalActions());
      this.coordinator.registerActionModule("$id", {
        name: "$id",
        handle: (_el, ...args) => $id(...args)
      });
      this.coordinator.registerActionModule("$nextTick", {
        name: "$nextTick",
        handle: (_el, ...args) => $nextTick(...args)
      });
      this.coordinator.registerAttributeModule("import", import_default);
      this.coordinator.registerAttributeModule("signal", signal_default);
      this.coordinator.registerAttributeModule("computed", computed_default);
      this.coordinator.registerAttributeModule("switcher", switcher_default);
      this.coordinator.registerAttributeModule("ux-theme", theme_default);
      autoAttributes.forEach(({ name, module }) => {
        let registeredAny = false;
        for (const maybe of Object.values(module)) {
          if (maybe && typeof maybe === "object" && "attribute" in maybe && typeof maybe.handle === "function") {
            this.coordinator.registerAttributeModule(maybe.attribute || name, maybe);
            registeredAny = true;
          }
        }
        if (!registeredAny) {
          const attrMod = module.default || Object.values(module)[0];
          if (attrMod) {
            this.coordinator.registerAttributeModule(attrMod.attribute || name, attrMod);
          }
        }
      });
      autoSprites.forEach(({ name, module }) => {
        const spriteMod = module.default || Object.values(module).find((m) => m && typeof m.sprites === "function");
        if (spriteMod && typeof spriteMod.sprites === "function") {
          this.coordinator.registerSpriteModule(spriteMod.name || name, spriteMod);
        } else {
          let exportsObj = module;
          if (typeof module.default === "function") {
            exportsObj = module.default(this.coordinator.runtimeContext);
          }
          Object.entries(exportsObj).forEach(([exportName, handler]) => {
            if (exportName === "default")
              return;
            const handle = (_el, ...args) => handler(...args);
            const proxyHandle = new Proxy(handle, {
              get(target2, key) {
                if (key in target2)
                  return target2[key];
                const val = handler[key];
                return typeof val === "function" ? val.bind(handler) : val;
              }
            });
            this.coordinator.registerActionModule(exportName, {
              name: exportName,
              handle: proxyHandle
            });
          });
        }
      });
      autoModifiers.forEach(({ module }) => {
        let exportsObj = module.default || module;
        if (exportsObj && exportsObj.name && typeof exportsObj.handle === "function") {
          this.coordinator.registerModifierModule(exportsObj.name, exportsObj);
        } else if (typeof exportsObj === "object") {
          Object.values(exportsObj).forEach((mod) => {
            if (mod && mod.name && typeof mod.handle === "function") {
              this.coordinator.registerModifierModule(mod.name, mod);
            }
          });
        }
      });
      this.coordinator.runtimeContext.setGlobalSignal("$predictive", (async () => {
        const { predictive: predictive2 } = await Promise.resolve().then(() => (init_predictive(), predictive_exports));
        return predictive2;
      })());
      registerScopeProvider("$", (el) => (selector) => resolveSelector(el, selector));
      registerScopeProvider("$animate", () => animate);
      this.coordinator.registerUtilityModule("fetch", fetchModule);
      autoObservers.forEach(({ name, module }) => {
        const obsMod = module.default || Object.values(module)[0];
        if (obsMod) {
          this.coordinator.registerObserverModule(obsMod.name || name, obsMod);
        }
      });
      autoListeners.forEach(({ name, module }) => {
        const listenerMod = module.default || Object.values(module)[0];
        if (listenerMod) {
          this.coordinator.registerListenerModule(listenerMod.name || name, listenerMod);
        }
      });
      initSelfHeal(this.coordinator.runtimeContext, {
        enabled: true,
        emitToConsole: this.coordinator.runtimeContext.isDevMode ?? false,
        emitToPlatform: false
      });
      ensureScrollbarGutter();
      this.init();
      if (typeof document !== "undefined") {
        const html = document.documentElement;
        if (document.querySelector("[data-import]")) {
          html.classList.add("nexus-loading");
        } else {
          html.classList.add("nexus-ready");
        }
        document.dispatchEvent(new CustomEvent("nexus-ready", { bubbles: true }));
      }
    }
    init() {
      if (typeof window === "undefined")
        return;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.scan());
      } else {
        this.scan();
      }
    }
    scan() {
      const roots = document.querySelectorAll(ROOT_SELECTOR);
      roots.forEach((root) => {
        if (root instanceof HTMLElement) {
          this.coordinator.initializeModules(root);
        }
      });
    }
    get coordinate() {
      return this.coordinator;
    }
    register(type, name, module) {
      const c = this.coordinator;
      switch (type) {
        case "attribute":
          c.registerAttributeModule(name, module);
          break;
        case "action":
          c.registerActionModule(name, module);
          break;
        case "modifier":
          c.registerModifierModule(name, module);
          break;
        case "listener":
          c.registerListenerModule(name, module);
          break;
        case "observer":
          c.registerObserverModule(name, module);
          break;
        case "utility":
          c.registerUtilityModule(name, module);
          break;
      }
    }
  };
  var isWorker = typeof globalThis.WorkerGlobalScope !== "undefined" && typeof document === "undefined";
  var Nexus = typeof document !== "undefined" ? new UX() : null;
  if (isWorker) {
    self.onmessage = (e) => {
      if (e.data.type === "INIT_HEAP")
        console.log("[Nexus Worker] Predictive Heap Handshake OK");
    };
  } else if (typeof document !== "undefined") {
    topology.start();
    if (!document.querySelector("style[data-nexus-tailwind-bridge]") && document.querySelector('script[src*="tailwindcss/browser"]')) {
      const tokens = discoverColorTokens();
      const bridge = buildTailwindThemeBridge(tokens);
      if (bridge) {
        const bridgeStyle = document.createElement("style");
        bridgeStyle.setAttribute("type", "text/tailwindcss");
        bridgeStyle.setAttribute("data-nexus-tailwind-bridge", "");
        bridgeStyle.textContent = bridge;
        document.head.appendChild(bridgeStyle);
      }
    }
  }
  if (typeof window !== "undefined" && Nexus) {
    globalThis.Nexus = Nexus;
    globalThis.Nexus.selfHeal = { getHistory: getBeaconHistory };
    globalThis._NEXUS_RUNTIME = Nexus.coordinator.runtimeContext;
  }
  return __toCommonJS(src_exports);
})();
