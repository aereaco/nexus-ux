var UX = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
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
  var ROOT_SELECTOR, STATE, ATTRIBUTE_PREFIX, CUSTOM_EVENT_PREFIX, DATA_PRESERVE_ATTR, NEG_TOKENS, MODIFIER_DELIMITER, DATA_STACK_KEY, LOCAL_SCOPES_KEY, COMPONENT_CONTEXT_KEY, CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, MARKER_KEY, IS_TEMPLATE_KEY, TIMER_MAP_KEY, DEFAULT_DEBOUNCE_TIME, DEFAULT_THROTTLE_TIME;
  var init_consts = __esm({
    "src/engine/consts.ts"() {
      ROOT_SELECTOR = "[data-init], [data-ux-init], [data-signal], [data-router], [data-import], [data-stylesheet], [data-ux-theme], body";
      STATE = "nexus";
      ATTRIBUTE_PREFIX = "data-";
      CUSTOM_EVENT_PREFIX = "ux-";
      DATA_PRESERVE_ATTR = "data-preserve";
      NEG_TOKENS = {
        INTENT: "-",
        PATH: ".",
        GLOBAL: "#",
        MODIFIER: "_",
        LOGIC: "$",
        RULE: "@",
        CONTEXT: "&",
        OVERRIDE: "!",
        PSEUDO: "::",
        GRID: "||"
      };
      MODIFIER_DELIMITER = NEG_TOKENS.MODIFIER;
      DATA_STACK_KEY = Symbol.for("__data_stack__");
      LOCAL_SCOPES_KEY = Symbol.for("__local_scopes__");
      COMPONENT_CONTEXT_KEY = Symbol.for("__component_context__");
      CLEANUP_FUNCTIONS_KEY = Symbol.for("__cleanup_functions__");
      EFFECT_RUNNERS_KEY = Symbol.for("__effect_runners__");
      RUN_EFFECT_RUNNERS_KEY = Symbol.for("__run_effect_runners__");
      MARKER_KEY = Symbol.for("__nexus_marker__");
      IS_TEMPLATE_KEY = Symbol.for("__nexus_is_template__");
      TIMER_MAP_KEY = Symbol.for("__nexus_timer_map__");
      DEFAULT_DEBOUNCE_TIME = 250;
      DEFAULT_THROTTLE_TIME = 250;
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
              this.eventSource.onerror = (err) => {
                reportError(new Error(`MCP Connection failed: ${this.url}`));
                reject(err);
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
            }).catch((err) => {
              this.pendingRequests.delete(id);
              reject(err);
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
              const target = mutation.target;
              const debugValue = target.getAttribute("data-debug");
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
  async function yieldToBrowser() {
    if (typeof globalThis.scheduler === "object" && typeof globalThis.scheduler?.yield === "function") {
      return globalThis.scheduler.yield();
    }
    if (yieldChannel) {
      return new Promise((resolve) => {
        yieldResolve = resolve;
        yieldChannel.port2.postMessage(null);
      });
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
          let startTime = performance.now();
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
            const shouldYield = performance.now() - startTime > this.stallBudget || typeof navigator !== "undefined" && navigator.scheduling?.isInputPending?.() === true;
            if (shouldYield) {
              this.syncSharedState();
              await yieldToBrowser();
              startTime = performance.now();
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

  // src/engine/reactivity.ts
  function track(target, key) {
    if (!activeEffect)
      return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      depsMap = /* @__PURE__ */ new Map();
      targetMap.set(target, depsMap);
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
  function trigger(target, key) {
    const depsMap = targetMap.get(target);
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
    if (Array.isArray(target)) {
      if (key === "length") {
        depsMap.forEach((effects, k) => {
          if (k === "length" || typeof k === "string" && Number(k) >= target.length) {
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
  function reactive(target) {
    if (!target || typeof target !== "object")
      return target;
    if (rawMap.has(target))
      return target;
    let proxy = reactiveMap.get(target);
    if (proxy)
      return proxy;
    proxy = new Proxy(target, {
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
    reactiveMap.set(target, proxy);
    rawMap.set(proxy, target);
    return proxy;
  }
  function shallowReactive(target) {
    return reactive(target);
  }
  function readonly(target) {
    return reactive(target);
  }
  function shallowReadonly(target) {
    return reactive(target);
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
      let cleanupFns4 = activeEffect.cleanupFns;
      if (!cleanupFns4) {
        cleanupFns4 = [];
        activeEffect.cleanupFns = cleanupFns4;
        const originalRun = activeEffect.run;
        activeEffect.run = function() {
          for (const cleanup of cleanupFns4) {
            try {
              cleanup();
            } catch {
            }
          }
          cleanupFns4.length = 0;
          return originalRun.apply(this, arguments);
        };
      }
      cleanupFns4.push(fn);
    }
  }
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
      } catch (err) {
        if (err instanceof Promise) {
          if (pendingPromises.has(err))
            return;
          if (window._nexusDebug)
            console.debug(`[Nexus Suspense] <${el.tagName}> suspended pending network resolution.`);
          pendingCount++;
          pendingPromises.add(err);
          err.finally(() => {
            pendingCount--;
            pendingPromises.delete(err);
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
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === lastErrorMessage)
            consecutiveFailures++;
          else {
            consecutiveFailures = 1;
            lastErrorMessage = msg;
          }
          if (consecutiveFailures >= 3) {
            console.error(`[Nexus Diagnostic] Persistent error on <${el.tagName}> (${consecutiveFailures}x):`, err);
            reportError(err instanceof Error ? err : new Error(msg), el, `Persistent failure (${consecutiveFailures}x) \u2014 effect quarantined`);
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
          } catch (err) {
            console.error(`[Nexus Isolation] Effect failed on <${enhancedEl.tagName}>, isolated from ${enhancedEl[EFFECT_RUNNERS_KEY].size - 1} sibling effects:`, err);
            reportError(err instanceof Error ? err : new Error(String(err)), enhancedEl, "Isolated effect failure");
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
  var ZCZS_SUPPORTED, SignalHeap, heap, OWNERSHIP_KEY, BORROW_KEY, OwnershipTracker, ownership, ITERATE_KEY, targetMap, activeEffect, reactiveMap, rawMap, RefImpl, ComputedRefImpl, ObjectRefImpl, effectIdCounter;
  var init_reactivity = __esm({
    "src/engine/reactivity.ts"() {
      init_consts();
      init_debug();
      init_scheduler();
      ZCZS_SUPPORTED = typeof SharedArrayBuffer !== "undefined";
      SignalHeap = class {
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
      heap = new SignalHeap();
      OWNERSHIP_KEY = Symbol.for("nexus.ownership");
      BORROW_KEY = Symbol.for("nexus.borrow");
      OwnershipTracker = class {
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
      ownership = new OwnershipTracker();
      ITERATE_KEY = Symbol("iterate");
      targetMap = /* @__PURE__ */ new WeakMap();
      activeEffect = null;
      reactiveMap = /* @__PURE__ */ new WeakMap();
      rawMap = /* @__PURE__ */ new WeakMap();
      RefImpl = class {
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
      ComputedRefImpl = class {
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
      ObjectRefImpl = class {
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
      effectIdCounter = 0;
    }
  });

  // src/engine/cache.ts
  function getIDB() {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return Promise.resolve(null);
    }
    if (dbPromise)
      return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn("[Nexus Cache] IndexedDB open failed, falling back.");
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }
  async function getIDBItem(key) {
    const db = await getIDB();
    if (!db)
      return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  async function setIDBItem(key, entry) {
    const db = await getIDB();
    if (!db)
      return;
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(entry, key);
    } catch {
    }
  }
  var DB_NAME, DB_VERSION, STORE_NAME, dbPromise, UniversalCacheEngine, cacheEngine;
  var init_cache = __esm({
    "src/engine/cache.ts"() {
      DB_NAME = "nexus-media-cache";
      DB_VERSION = 1;
      STORE_NAME = "media_blobs";
      dbPromise = null;
      UniversalCacheEngine = class {
        inMemoryCache = /* @__PURE__ */ new Map();
        /**
         * Retrieves a resource with 0ms instant cache hit, followed by background
         * ETag revalidation.
         */
        async fetchWithCache(url, options = {}) {
          const {
            storage = url.startsWith("http") && !url.includes(location?.host || "") ? "local" : "session",
            responseType = "text",
            timeoutMs = 5e3,
            onUpdate
          } = options;
          const cacheKey = `nx_cache:${url}`;
          let cachedEntry = this.inMemoryCache.get(cacheKey) || null;
          if (!cachedEntry) {
            if (storage === "db" || responseType === "blob" || responseType === "arrayBuffer") {
              cachedEntry = await getIDBItem(cacheKey);
            } else if (typeof window !== "undefined") {
              try {
                const store = storage === "local" ? localStorage : sessionStorage;
                const raw = store.getItem(cacheKey);
                if (raw) {
                  cachedEntry = JSON.parse(raw);
                }
              } catch {
              }
            }
          }
          if (cachedEntry) {
            this.inMemoryCache.set(cacheKey, cachedEntry);
            if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
              console.log(`[Cache Engine] INSTANT HIT (0ms): ${url}`);
            }
            this.revalidateInBackground(url, cacheKey, cachedEntry, options);
            return cachedEntry.content;
          }
          if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
            console.log(`[Cache Engine] MISS: Fetching ${url}`);
          }
          const freshEntry = await this.performNetworkFetch(url, options, void 0);
          await this.saveCacheEntry(cacheKey, freshEntry, storage, responseType);
          this.inMemoryCache.set(cacheKey, freshEntry);
          return freshEntry.content;
        }
        /**
         * Non-blocking background HTTP fetch with If-None-Match header
         */
        revalidateInBackground(url, cacheKey, cachedEntry, options) {
          setTimeout(async () => {
            try {
              const isSameOrigin = typeof location === "undefined" || url.startsWith("/") || url.startsWith(location.origin);
              const headers = {};
              if (cachedEntry.etag && isSameOrigin) {
                headers["If-None-Match"] = cachedEntry.etag;
              }
              const res = await fetch(url, { headers });
              if (res.status === 304) {
                if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
                  console.log(`[Cache Engine] VERIFIED 304 (Not Modified): ${url}`);
                }
                return;
              }
              if (res.status === 200) {
                const etag = res.headers.get("ETag") || res.headers.get("etag") || void 0;
                let content;
                switch (options.responseType) {
                  case "json":
                    content = await res.json();
                    break;
                  case "blob":
                    content = await res.blob();
                    break;
                  case "arrayBuffer":
                    content = await res.arrayBuffer();
                    break;
                  case "text":
                  default:
                    content = await res.text();
                    break;
                }
                const newEntry = { content, etag, timestamp: Date.now() };
                await this.saveCacheEntry(cacheKey, newEntry, options.storage || "session", options.responseType || "text");
                this.inMemoryCache.set(cacheKey, newEntry);
                if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
                  console.log(`[Cache Engine] UPDATE DETECTED (200 OK): ${url}`);
                }
                if (options.onUpdate) {
                  options.onUpdate(content);
                }
              }
            } catch {
            }
          }, 100);
        }
        async performNetworkFetch(url, options, etagHeader) {
          const isSameOrigin = typeof location === "undefined" || url.startsWith("/") || url.startsWith(location.origin);
          const headers = {};
          if (etagHeader && isSameOrigin)
            headers["If-None-Match"] = etagHeader;
          let controller;
          let timer;
          if (options.timeoutMs) {
            controller = new AbortController();
            timer = setTimeout(() => controller?.abort(), options.timeoutMs);
          }
          let res;
          try {
            res = await fetch(url, { signal: controller?.signal, headers });
          } finally {
            if (timer)
              clearTimeout(timer);
          }
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const etag = res.headers.get("ETag") || res.headers.get("etag") || void 0;
          let content;
          switch (options.responseType) {
            case "json":
              content = await res.json();
              break;
            case "blob":
              content = await res.blob();
              break;
            case "arrayBuffer":
              content = await res.arrayBuffer();
              break;
            case "text":
            default:
              content = await res.text();
              break;
          }
          return { content, etag, timestamp: Date.now() };
        }
        async saveCacheEntry(key, entry, storage, responseType) {
          if (storage === "db" || responseType === "blob" || responseType === "arrayBuffer") {
            await setIDBItem(key, entry);
          } else if (typeof window !== "undefined") {
            try {
              const store = storage === "local" ? localStorage : sessionStorage;
              store.setItem(key, JSON.stringify(entry));
            } catch {
            }
          }
        }
        clearMemoryCache() {
          this.inMemoryCache.clear();
        }
      };
      cacheEngine = new UniversalCacheEngine();
    }
  });

  // src/modules/attributes/assert.ts
  var assert_exports = {};
  __export(assert_exports, {
    default: () => assert_default
  });
  var assertModule, assert_default;
  var init_assert = __esm({
    "src/modules/attributes/assert.ts"() {
      init_debug();
      assertModule = {
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
      assert_default = assertModule;
    }
  });

  // src/modules/attributes/bind.ts
  var bind_exports = {};
  __export(bind_exports, {
    default: () => bind_default
  });
  function extractNativeApis(value) {
    const apis = [];
    const seen = /* @__PURE__ */ new Set();
    for (const pattern of NATIVE_API_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        const [, prop] = match;
        const key = `${pattern.source.split("\\b")[1]?.split(".")[0] || "unknown"}.${prop}`;
        if (!seen.has(key)) {
          seen.add(key);
          let target;
          if (pattern.source.includes("window") || pattern.source.includes("globalThis")) {
            target = globalThis;
          } else if (pattern.source.includes("localStorage")) {
            target = globalThis.localStorage;
          } else if (pattern.source.includes("sessionStorage")) {
            target = globalThis.sessionStorage;
          } else if (pattern.source.includes("navigator")) {
            target = globalThis.navigator;
          } else if (pattern.source.includes("document")) {
            target = globalThis.document;
          } else if (pattern.source.includes("screen")) {
            target = globalThis.screen;
          } else {
            target = globalThis;
          }
          apis.push({ target, property: prop });
        }
      }
    }
    return apis;
  }
  function isNativeApiExpression(value) {
    const trimmed = value.trim();
    return extractNativeApis(trimmed).length > 0;
  }
  function setValuePreservingCursor(el, value) {
    if (el.value === value)
      return;
    const isFocused = typeof document !== "undefined" && document.activeElement === el;
    if (isFocused && typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = value;
      try {
        el.setSelectionRange(start, end);
      } catch (_) {
      }
    } else {
      el.value = value;
    }
  }
  function applyBindingResult(result, el) {
    if (result !== void 0 && result !== null) {
      if (typeof result === "object" && !Array.isArray(result)) {
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
      } else {
        if (el instanceof HTMLInputElement) {
          if (el.type === "checkbox") {
            el.checked = Boolean(result);
          } else if (el.type === "radio") {
            el.checked = el.value === String(result);
          } else {
            const strVal = result !== void 0 && result !== null ? String(result) : "";
            setValuePreservingCursor(el, strVal);
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
          const strVal = result !== void 0 && result !== null ? String(result) : "";
          setValuePreservingCursor(el, strVal);
        } else {
          const strVal = result !== void 0 && result !== null ? String(result) : "";
          if (el.textContent !== strVal) {
            el.textContent = strVal;
          }
        }
      }
    }
  }
  function createNativeBinding(value, runtime, el) {
    const cleanupFns4 = [];
    const trimmed = value.trim();
    const nativeApis = extractNativeApis(trimmed);
    if (nativeApis.length === 0) {
      return () => {
      };
    }
    const [runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
      const result = runtime.evaluate(el, value);
      applyBindingResult(result, el);
    });
    cleanupFns4.push(effectCleanup);
    for (const api of nativeApis) {
      const property = api.property;
      if (api.target === globalThis) {
        if (property === "innerWidth" || property === "innerHeight") {
          const onResize = () => {
            runner();
          };
          globalThis.addEventListener("resize", onResize);
          cleanupFns4.push(() => globalThis.removeEventListener("resize", onResize));
        } else if (property === "scrollX" || property === "scrollY") {
          const onScroll = () => {
            runner();
          };
          globalThis.addEventListener("scroll", onScroll);
          cleanupFns4.push(() => globalThis.removeEventListener("scroll", onScroll));
        }
      }
      if (api.target === globalThis.localStorage || api.target === globalThis.sessionStorage) {
        const onStorage = (e) => {
          if (e.key === property) {
            runner();
          }
        };
        globalThis.addEventListener("storage", onStorage);
        cleanupFns4.push(() => globalThis.removeEventListener("storage", onStorage));
      }
    }
    return () => cleanupFns4.forEach((fn) => fn());
  }
  var NATIVE_API_PATTERNS, bindModule, bind_default;
  var init_bind = __esm({
    "src/modules/attributes/bind.ts"() {
      init_debug();
      NATIVE_API_PATTERNS = [
        /\bwindow\.(\w+)/g,
        /\bglobalThis\.(\w+)/g,
        /\blocalStorage\.(\w+)/g,
        /\bsessionStorage\.(\w+)/g,
        /\bnavigator\.(\w+)/g,
        /\bdocument\.(\w+)/g,
        /\bscreen\.(\w+)/g
      ];
      bindModule = {
        name: "bind",
        attribute: "bind",
        handle: (el, value, runtime, parsedAttr) => {
          if (!value)
            return;
          const parsed = parsedAttr || runtime.parseAttribute("data-bind", runtime, el);
          const target = parsed?.argument;
          if (isNativeApiExpression(value)) {
            return createNativeBinding(value, runtime, el);
          }
          if (!target) {
            const cleanupFns5 = [];
            try {
              const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
                const result = runtime.evaluate(el, value);
                applyBindingResult(result, el);
              });
              cleanupFns5.push(cleanup);
              const isFormInput = el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el.isContentEditable;
              if (isFormInput) {
                const isLazy = el.hasAttribute("data-bind_lazy") || parsed?.modifiers?.includes("lazy") === true;
                const eventName = isLazy ? "change" : el instanceof HTMLSelectElement || el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? "change" : "input";
                const inputHandler = (_e) => {
                  let newValue;
                  if (el instanceof HTMLInputElement && el.type === "checkbox") {
                    newValue = el.checked;
                  } else if (el instanceof HTMLInputElement && el.type === "radio") {
                    newValue = el.checked ? el.value : void 0;
                    if (newValue === void 0)
                      return;
                  } else if (el instanceof HTMLSelectElement && el.multiple) {
                    newValue = Array.from(el.selectedOptions).map((opt) => opt.value);
                  } else if (el instanceof HTMLInputElement && (el.type === "range" || el.type === "number")) {
                    newValue = el.value === "" ? "" : Number(el.value);
                  } else if ("value" in el) {
                    newValue = el.value;
                  }
                  const trimmedVal = value.trim();
                  const isValidLValue = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[[^\]]+\])*$/.test(trimmedVal);
                  if (isValidLValue) {
                    try {
                      const current = runtime.evaluate(el, value);
                      if (current && typeof current === "object" && "value" in current) {
                        runtime.evaluate(el, `${value}.value = $newValue`, { $newValue: newValue });
                      } else {
                        runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
                      }
                    } catch {
                    }
                  }
                };
                el.addEventListener(eventName, inputHandler);
                cleanupFns5.push(() => el.removeEventListener(eventName, inputHandler));
              }
            } catch (e) {
              runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, `Auto-bind failed: ${value}`);
            }
            return () => cleanupFns5.forEach((fn) => fn());
          }
          const cleanupFns4 = [];
          try {
            const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
              const result = runtime.evaluate(el, value);
              const attrValue = result !== void 0 && result !== null ? String(result) : "";
              if (target === "value" || target === "checked") {
                if (el instanceof HTMLInputElement && el.type === "checkbox") {
                  if (el.checked !== Boolean(result))
                    el.checked = Boolean(result);
                } else if (el instanceof HTMLInputElement && el.type === "radio") {
                  if (target === "checked") {
                    if (el.checked !== Boolean(result))
                      el.checked = Boolean(result);
                  } else {
                    if (el.value !== attrValue)
                      el.value = attrValue;
                  }
                } else if ("value" in el) {
                  setValuePreservingCursor(el, attrValue);
                }
              } else if (target === "text") {
                if (el.textContent !== attrValue)
                  el.textContent = attrValue;
              } else if (target === "html") {
                if (el.innerHTML !== attrValue)
                  el.innerHTML = attrValue;
              } else if (target === "style") {
                runtime.reconcileStyle(el, result);
              } else if (target === "draggable") {
                const newVal = result ? "true" : "false";
                if (el.getAttribute("draggable") !== newVal) {
                  el.setAttribute("draggable", newVal);
                }
              } else if (target === "dir") {
                if (el.getAttribute("dir") !== attrValue) {
                  el.setAttribute("dir", attrValue);
                }
                if (document.documentElement.getAttribute("dir") !== attrValue) {
                  document.documentElement.setAttribute("dir", attrValue);
                }
              } else {
                if (result === false || result === null || result === void 0) {
                  if (el.hasAttribute(target))
                    el.removeAttribute(target);
                } else {
                  if (el.getAttribute(target) !== attrValue)
                    el.setAttribute(target, attrValue);
                }
              }
            });
            cleanupFns4.push(cleanup);
            if (target === "value" || target === "checked") {
              const isLazy = el.hasAttribute("data-bind_lazy") || parsed?.modifiers?.includes("lazy") === true;
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
                runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
              };
              el.addEventListener(eventName, inputHandler);
              cleanupFns4.push(() => el.removeEventListener(eventName, inputHandler));
            }
          } catch (e) {
            initError("bind", `Failed to bind ${target}: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
          return () => cleanupFns4.forEach((fn) => fn());
        }
      };
      bind_default = bindModule;
    }
  });

  // src/engine/scope.ts
  function getDataStack(element) {
    const stack = [];
    let curr = element;
    while (curr) {
      const enhanced = curr;
      if (enhanced[DATA_STACK_KEY] && enhanced[DATA_STACK_KEY].length > 0) {
        stack.push(...enhanced[DATA_STACK_KEY]);
        break;
      }
      if (enhanced[LOCAL_SCOPES_KEY] && enhanced[LOCAL_SCOPES_KEY].length > 0) {
        stack.push(...enhanced[LOCAL_SCOPES_KEY]);
      }
      if (typeof ShadowRoot !== "undefined" && curr instanceof ShadowRoot) {
        curr = curr.host;
      } else {
        const parent = curr.parentElement || curr.parentNode || curr.__scopeParent;
        if (typeof ShadowRoot !== "undefined" && parent instanceof ShadowRoot) {
          const shadow = parent;
          if (shadow[LOCAL_SCOPES_KEY] && shadow[LOCAL_SCOPES_KEY].length > 0) {
            stack.push(...shadow[LOCAL_SCOPES_KEY]);
          } else if (shadow[DATA_STACK_KEY] && shadow[DATA_STACK_KEY].length > 0) {
            stack.push(...shadow[DATA_STACK_KEY]);
          }
          curr = parent.host;
        } else if (parent instanceof DocumentFragment) {
          curr = parent.host || curr.__scopeParent || null;
        } else {
          curr = parent;
        }
      }
    }
    return stack;
  }
  function addScopeToNode(element, data, referenceNode) {
    const node = element;
    if (!node[LOCAL_SCOPES_KEY]) {
      node[LOCAL_SCOPES_KEY] = [];
    }
    node[LOCAL_SCOPES_KEY].unshift(data);
    if (referenceNode && !node.parentElement) {
      node.__scopeParent = referenceNode;
    }
    return () => {
      if (node[LOCAL_SCOPES_KEY]) {
        node[LOCAL_SCOPES_KEY] = node[LOCAL_SCOPES_KEY].filter((item) => item !== data);
        if (node[LOCAL_SCOPES_KEY].length === 0) {
          delete node[LOCAL_SCOPES_KEY];
        }
      }
    };
  }
  function disposeScope(target) {
    if (Array.isArray(target)) {
      for (const fn of target) {
        try {
          fn();
        } catch (err) {
          console.error("Error disposing scope:", err);
        }
      }
      target.length = 0;
      return;
    }
    if (target) {
      const node = target;
      if (node[LOCAL_SCOPES_KEY]) {
        delete node[LOCAL_SCOPES_KEY];
      }
      if (node[DATA_STACK_KEY]) {
        delete node[DATA_STACK_KEY];
      }
    }
  }
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
        const target = stateRef.value;
        if (typeof key === "string")
          track(target, key);
        return Reflect.has(target, key);
      },
      get(_, key) {
        const target = stateRef.value;
        if (typeof key === "string")
          track(target, key);
        return Reflect.get(target, key);
      },
      set(_, key, value) {
        const target = stateRef.value;
        const res = Reflect.set(target, key, value);
        if (typeof key === "string")
          trigger(target, key);
        if (onSet)
          onSet(key, value);
        if (onTrigger)
          onTrigger();
        return res;
      },
      ownKeys() {
        const target = stateRef.value;
        track(target, Symbol.for("iterate"));
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(_, key) {
        const target = stateRef.value;
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
    });
  }
  async function openAndEnsureStore(storeName) {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not supported in this environment");
    }
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DEFAULT_IDB_DATABASE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => {
        const udb = e.target.result;
        if (!udb.objectStoreNames.contains(storeName)) {
          udb.createObjectStore(storeName);
        }
      };
    });
    if (db.objectStoreNames.contains(storeName)) {
      return db;
    }
    const nextVersion = db.version + 1;
    db.close();
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DEFAULT_IDB_DATABASE, nextVersion);
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
  function createStoreOperations(storeName) {
    const baseOps = {
      async all() {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => {
              db.close();
              resolve(req.result || []);
            };
            req.onerror = () => {
              db.close();
              resolve([]);
            };
          } catch {
            db.close();
            resolve([]);
          }
        });
      },
      async keys(prefix) {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAllKeys();
            req.onsuccess = () => {
              db.close();
              const rawKeys = (req.result || []).map(String);
              resolve(prefix ? rawKeys.filter((k) => k.startsWith(prefix)) : rawKeys);
            };
            req.onerror = () => {
              db.close();
              resolve([]);
            };
          } catch {
            db.close();
            resolve([]);
          }
        });
      },
      async list(prefix) {
        return baseOps.keys(prefix);
      },
      async get(key) {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => {
              db.close();
              resolve(req.result ?? null);
            };
            req.onerror = () => {
              db.close();
              resolve(null);
            };
          } catch {
            db.close();
            resolve(null);
          }
        });
      },
      async put(item, key) {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            if (store.keyPath) {
              if (key !== void 0 && typeof item === "object" && item !== null && typeof store.keyPath === "string" && !(store.keyPath in item)) {
                item[store.keyPath] = key;
              }
              store.put(item);
            } else {
              if (key !== void 0) {
                store.put(item, key);
              } else {
                store.put(item);
              }
            }
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          } catch (e) {
            db.close();
            reject(e);
          }
        });
      },
      async delete(key) {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.delete(key);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          } catch (e) {
            db.close();
            reject(e);
          }
        });
      },
      async clear() {
        const db = await openAndEnsureStore(storeName);
        return new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.clear();
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          } catch (e) {
            db.close();
            reject(e);
          }
        });
      }
    };
    return new Proxy(baseOps, {
      set(target, prop, value) {
        if (typeof prop === "string" && !(prop in target)) {
          target.put(value, prop);
          return true;
        }
        target[prop] = value;
        return true;
      }
    });
  }
  function getIndexedDBProxy() {
    if (cachedIDBProxy)
      return cachedIDBProxy;
    if (typeof indexedDB === "undefined")
      return globalThis.indexedDB;
    const storeOpsCache = /* @__PURE__ */ new Map();
    cachedIDBProxy = new Proxy(globalThis.indexedDB, {
      get(target, prop) {
        if (typeof prop === "symbol" || prop in target) {
          const val = target[prop];
          return typeof val === "function" ? val.bind(target) : val;
        }
        if (typeof prop === "string") {
          if (!storeOpsCache.has(prop)) {
            storeOpsCache.set(prop, createStoreOperations(prop));
          }
          return storeOpsCache.get(prop);
        }
        return void 0;
      }
    });
    return cachedIDBProxy;
  }
  function wrapGlobalFunction(fn, globalContext) {
    let proxy = globalFnProxyCache.get(fn);
    if (!proxy) {
      proxy = new Proxy(fn, {
        apply(target, thisArg, args) {
          return Reflect.apply(target, thisArg == null || thisArg === proxy ? globalContext : thisArg, args);
        },
        construct(target, args, newTarget) {
          return Reflect.construct(target, args, newTarget === proxy ? target : newTarget);
        },
        get(target, prop) {
          if (prop === "prototype")
            return target.prototype;
          const val = Reflect.get(target, prop);
          return typeof val === "function" ? val.bind(target) : val;
        }
      });
      globalFnProxyCache.set(fn, proxy);
    }
    return proxy;
  }
  function buildNativeApiScope(_runtime) {
    return new Proxy({}, {
      has(_, key) {
        return typeof key === "string" && (key === "indexedDB" || key in globalThis);
      },
      get(_, key) {
        if (typeof key !== "string")
          return void 0;
        if (key === "indexedDB" && typeof indexedDB !== "undefined") {
          return getIndexedDBProxy();
        }
        if (key in globalThis) {
          const val = globalThis[key];
          return typeof val === "function" ? wrapGlobalFunction(val, globalThis) : val;
        }
        return void 0;
      }
    });
  }
  var scopeProviderRegistry, DEFAULT_IDB_DATABASE, cachedIDBProxy, globalFnProxyCache;
  var init_scope = __esm({
    "src/engine/scope.ts"() {
      init_consts();
      init_reactivity();
      scopeProviderRegistry = /* @__PURE__ */ new Map();
      DEFAULT_IDB_DATABASE = "nexus-store";
      cachedIDBProxy = null;
      globalFnProxyCache = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/modules/attributes/build.ts
  var build_exports = {};
  __export(build_exports, {
    default: () => build_default
  });
  async function writeToIDB(key, data, meta) {
    await getIndexedDBProxy()[BUILD_STORE].put({ id: key, data, meta, updatedAt: Date.now() }, key);
  }
  function minifyCSS(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").replace(/;}/g, "}").trim();
  }
  function minifyJS(js) {
    return js.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  }
  function collectStyles(root, shouldMinify) {
    const sheets = [];
    const managedRules = stylesheet2.collectRules();
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
<body data-init>
${htmlContent}
${scripts ? `<script>
${scripts}
<\/script>` : ""}
</body>
</html>`;
  }
  var BUILD_STORE, buildModule, build_default;
  var init_build = __esm({
    "src/modules/attributes/build.ts"() {
      init_debug();
      init_scope();
      init_stylesheet();
      BUILD_STORE = "builds";
      buildModule = {
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
      build_default = buildModule;
    }
  });

  // src/modules/attributes/class.ts
  var class_exports = {};
  __export(class_exports, {
    default: () => class_default
  });
  var classModule, class_default;
  var init_class = __esm({
    "src/modules/attributes/class.ts"() {
      init_debug();
      init_stylesheet();
      classModule = {
        name: "class",
        attribute: "class",
        handle: (el, value, runtime, parsedAttr) => {
          const parsed = parsedAttr || runtime.parseAttribute("data-class", runtime, el);
          if (!parsed)
            return;
          try {
            const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
              const result = runtime.evaluate(el, value);
              if (parsed.argument) {
                if (result) {
                  stylesheet2.adoptClass(parsed.argument, el, runtime);
                  el.classList.add(parsed.argument);
                } else {
                  el.classList.remove(parsed.argument);
                }
              } else {
                runtime.reconcileClass(el, result);
              }
            });
            return cleanup;
          } catch (e) {
            initError("class", `Failed to reconcile class: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
        }
      };
      class_default = classModule;
    }
  });

  // src/modules/attributes/component.ts
  var component_exports = {};
  __export(component_exports, {
    BaseComponent: () => BaseComponent,
    default: () => component_default
  });
  function teardownComponentSubtree(root) {
    const disposeNode = (node) => {
      if (node instanceof Element) {
        const enhanced = node;
        if (enhanced[CLEANUP_FUNCTIONS_KEY]) {
          enhanced[CLEANUP_FUNCTIONS_KEY].forEach((cleanup) => cleanup());
          enhanced[CLEANUP_FUNCTIONS_KEY].clear();
        }
        delete enhanced[MARKER_KEY];
        Array.from(node.children).forEach(disposeNode);
      }
    };
    Array.from(root.childNodes).forEach(disposeNode);
    if (root instanceof Element) {
      root.replaceChildren();
    } else {
      while (root.firstChild)
        root.removeChild(root.firstChild);
    }
  }
  function extractResourceMetadata(htmlText, path, runtime) {
    const meta = {};
    if (!htmlText || typeof htmlText !== "string")
      return meta;
    try {
      const fmMatch = htmlText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      let hasFmTitle = false;
      if (fmMatch) {
        const lines = fmMatch[1].split(/\r?\n/);
        for (const l of lines) {
          const idx = l.indexOf(":");
          if (idx > 0) {
            const k = l.substring(0, idx).trim().toLowerCase();
            const v = l.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
            meta[k] = v;
            if (k === "title")
              hasFmTitle = true;
          }
        }
      }
      if (!hasFmTitle) {
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlText, "text/html");
        const titles = Array.from(parsedDoc.querySelectorAll("title"));
        const titleEl = titles.find((t) => !t.closest("svg"));
        if (titleEl && titleEl.textContent) {
          meta.title = titleEl.textContent.trim();
        }
        parsedDoc.querySelectorAll("meta").forEach((metaEl) => {
          const key = metaEl.getAttribute("name") || metaEl.getAttribute("property");
          const content = metaEl.getAttribute("content");
          if (key && content && !meta[key]) {
            meta[key] = content.trim();
          }
        });
      }
      const globals = runtime.globalSignals ? runtime.globalSignals() : {};
      if (globals) {
        const norm = path.startsWith("/") ? path : "/" + path;
        const unnorm = path.startsWith("/") ? path.slice(1) : path;
        const curMeta = globals.meta || {};
        const nextMeta = {
          ...curMeta,
          [path]: meta,
          [norm]: meta,
          [unnorm]: meta
        };
        if (runtime.setGlobalSignal) {
          runtime.setGlobalSignal("meta", nextMeta);
        }
        const routerState = globals.router || globals.appRouter;
        if (routerState) {
          routerState.meta = nextMeta;
          if (Array.isArray(routerState.routes)) {
            const routeRecord = routerState.routes.find((r) => r.path === path || r.path === norm || r.path === unnorm);
            if (routeRecord) {
              routeRecord.meta = { ...routeRecord.meta || {}, ...meta };
            }
          }
        }
      }
    } catch (e) {
      console.error(`[Component] Failed to extract metadata for ${path}:`, e);
    }
    return meta;
  }
  function ensureCustomElementRegistered(tagName) {
    if (typeof customElements === "undefined")
      return;
    const tag = tagName.toLowerCase();
    if (tag.includes("-") && !customElements.get(tag)) {
      try {
        customElements.define(
          tag,
          class extends BaseComponent {
            constructor() {
              super();
            }
          }
        );
      } catch {
      }
    }
  }
  function createInheritedShadowScope(host, ctx) {
    return new Proxy(ctx, {
      has(target, key) {
        if (key in target)
          return true;
        return getDataStack(host).some((scope) => key in scope);
      },
      get(target, key) {
        if (key in target)
          return Reflect.get(target, key);
        const stack = getDataStack(host);
        for (const scope of stack) {
          if (key in scope)
            return scope[key];
        }
        return void 0;
      },
      set(target, key, value) {
        const stack = getDataStack(host);
        for (const scope of stack) {
          if (key in scope) {
            scope[key] = value;
            return true;
          }
        }
        return Reflect.set(target, key, value);
      },
      ownKeys(target) {
        const keys = new Set(Reflect.ownKeys(target));
        for (const scope of getDataStack(host)) {
          for (const k of Object.keys(scope))
            keys.add(k);
        }
        return Array.from(keys);
      },
      getOwnPropertyDescriptor(target, key) {
        if (key in target)
          return Reflect.getOwnPropertyDescriptor(target, key);
        for (const scope of getDataStack(host)) {
          if (key in scope) {
            return {
              configurable: true,
              enumerable: true,
              writable: true,
              value: scope[key]
            };
          }
        }
        return void 0;
      }
    });
  }
  var ElementBase, BaseComponent, componentModule, component_default;
  var init_component = __esm({
    "src/modules/attributes/component.ts"() {
      init_scope();
      init_consts();
      init_cache();
      init_debug();
      init_stylesheet();
      ElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {
      };
      BaseComponent = class extends ElementBase {
        root;
        internals;
        _templateContent;
        _styles;
        _scripts;
        _cleanupFunctions = [];
        _componentSrc = null;
        _isRendered = false;
        constructor(isShadowDOM) {
          super();
          if (isShadowDOM) {
            this.root = this.attachShadow({ mode: "open" });
          } else {
            this.root = this;
          }
          if (typeof this.attachInternals === "function") {
            try {
              this.internals = this.attachInternals();
            } catch {
            }
          }
        }
        connectedCallback() {
          this._isRendered = true;
        }
        disconnectedCallback() {
          this._cleanupFunctions.forEach((fn) => fn());
          this._cleanupFunctions = [];
        }
        registerCleanup(fn) {
          this._cleanupFunctions.push(fn);
        }
      };
      componentModule = {
        name: "component",
        attribute: "component",
        handle: (el, value, runtime) => {
          try {
            if (el.hasAttribute("data-route"))
              return;
            if (el.hasAttribute("data-nx-cmp-done"))
              return;
            if (el.__component_init)
              return;
            el.__component_init = true;
            ensureCustomElementRegistered(el.tagName);
            const componentState = runtime.reactive({
              isConnected: false,
              isLoading: false,
              hasError: false,
              errorMessage: "",
              templateContent: "",
              meta: {}
            });
            const ctx = componentState;
            ctx.element = el;
            el[COMPONENT_CONTEXT_KEY] = ctx;
            let tabObj = null;
            const isTabOutlet = el.tagName.toLowerCase() === "tab-content";
            if (isTabOutlet) {
              const dataStack = getDataStack(el);
              for (const scope of dataStack) {
                if (scope && typeof scope === "object" && "tab" in scope) {
                  const t = scope.tab;
                  if (t && typeof t === "object") {
                    tabObj = t;
                    if (tabObj.linkedContent !== componentState) {
                      tabObj.linkedContent = componentState;
                    }
                  }
                  break;
                }
              }
            }
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
                  if (evaluated.trim().startsWith("{")) {
                    try {
                      config = new Function("return (" + evaluated + ")")();
                    } catch {
                      config = { path: evaluated };
                    }
                  } else {
                    config = { path: evaluated };
                  }
                }
              } else {
                return;
              }
              if (!config.path || config.path === "none" || config.path === "undefined" || config.path === "null")
                return;
              if (config.path === __lastPath)
                return;
              const previousPath = __lastPath;
              __lastPath = config.path;
              const load = async () => {
                componentState.isLoading = true;
                componentState.hasError = false;
                if (isTabOutlet && tabObj && typeof tabObj === "object") {
                  if (tabObj.isLoading !== true) {
                    tabObj.isLoading = true;
                  }
                  if (tabObj.linkedContent !== componentState) {
                    tabObj.linkedContent = componentState;
                  }
                }
                try {
                  let html = "";
                  let targetPath = config.path.trim();
                  if (targetPath.startsWith("'") && targetPath.endsWith("'") || targetPath.startsWith('"') && targetPath.endsWith('"')) {
                    targetPath = targetPath.slice(1, -1).trim();
                  }
                  if (targetPath.startsWith("<")) {
                    html = targetPath;
                  } else {
                    console.log("[Component load]:", targetPath, "tag:", el.tagName);
                  }
                  if (targetPath.startsWith("<")) {
                  } else if (targetPath.startsWith("#")) {
                    const rootNode = el.getRootNode();
                    const template = (rootNode?.querySelector ? rootNode.querySelector(targetPath) : null) || document.querySelector(targetPath);
                    if (!template)
                      throw new Error(`Template ${targetPath} not found`);
                    html = template.innerHTML;
                  } else {
                    const result = await cacheEngine.fetchWithCache(targetPath, {
                      storage: "session",
                      responseType: "text",
                      onUpdate: (fresh) => {
                        if (typeof fresh === "string" && fresh !== componentState.templateContent) {
                          componentState.templateContent = fresh;
                          const extracted2 = extractResourceMetadata(fresh, targetPath, runtime);
                          componentState.meta = extracted2;
                          if (tabObj && extracted2) {
                            tabObj.meta = { ...tabObj.meta || {}, ...extracted2 };
                          }
                        }
                      }
                    });
                    html = typeof result === "string" ? result : String(result);
                  }
                  const rawText = html;
                  const isMarkdown = targetPath.endsWith(".md") || targetPath.endsWith(".markdown");
                  if (isMarkdown) {
                    const fmMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                    let cleanMd = rawText;
                    if (fmMatch) {
                      cleanMd = rawText.slice(fmMatch[0].length).trim();
                    }
                    const escapedMd = cleanMd.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    html = `<div style="padding: 1.5rem; max-width: 64rem; margin-inline: auto;"><article data-markdown>${escapedMd}</article></div>`;
                  } else if (rawText.includes("<!DOCTYPE") || rawText.includes("data-init") && el.tagName.toLowerCase() !== "html") {
                    throw new Error(`Invalid component fragment returned for "${targetPath}": received full HTML shell.`);
                  }
                  if (runtime.isDevMode) {
                    console.log(`[Component] Template loaded for <${el.tagName}>, length: ${html.length}`);
                  }
                  componentState.templateContent = html;
                  const extracted = extractResourceMetadata(rawText, config.path, runtime);
                  componentState.meta = extracted;
                  if (tabObj && extracted && (extracted.title || extracted.icon)) {
                    tabObj.meta = { ...tabObj.meta || {}, ...extracted };
                  }
                  const isPathChange = previousPath !== void 0 && previousPath !== targetPath;
                  if (isPathChange) {
                    const targetRoot = config.shadowrootmode ? el.shadowRoot : el;
                    if (targetRoot)
                      teardownComponentSubtree(targetRoot);
                  }
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
                    if (isPathChange) {
                      shadow.innerHTML = html;
                    } else {
                      runtime.morphDOM(shadow, html);
                    }
                    stylesheet2.adoptElementSubtree(shadow);
                    Array.from(shadow.children).forEach((child) => {
                      if (child instanceof HTMLElement || child instanceof SVGElement) {
                        runtime.processElement(child);
                      }
                    });
                  } else {
                    if (isPathChange) {
                      el.innerHTML = html;
                    } else {
                      runtime.morphDOM(el, html);
                    }
                    stylesheet2.adoptElementSubtree(el);
                    Array.from(el.children).forEach((child) => {
                      if (child instanceof HTMLElement || child instanceof SVGElement) {
                        runtime.processElement(child);
                      }
                    });
                    el.setAttribute("data-nx-cmp-done", "true");
                  }
                  const focusable = (config.shadowrootmode ? el.shadowRoot : el)?.querySelector("[autofocus], [data-autofocus]");
                  if (focusable instanceof HTMLElement) {
                    focusable.focus();
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
                  if (isTabOutlet && tabObj && typeof tabObj === "object") {
                    if (tabObj.isLoading !== false) {
                      tabObj.isLoading = false;
                    }
                    if (componentState.meta?.title && (!tabObj.meta || !tabObj.meta.title)) {
                      tabObj.meta = Object.assign(tabObj.meta || {}, { title: componentState.meta.title });
                    }
                    if (componentState.meta?.icon && (!tabObj.meta || !tabObj.meta.icon)) {
                      tabObj.meta = Object.assign(tabObj.meta || {}, { icon: componentState.meta.icon });
                    }
                  }
                }
              };
              load();
            });
            return () => {
              delete el.__component_init;
              if (el instanceof BaseComponent) {
                el.disconnectedCallback();
              }
            };
          } catch (e) {
            initError(
              "component",
              `Failed to init component: ${e instanceof Error ? e.message : String(e)}`,
              el,
              value
            );
          }
        }
      };
      component_default = componentModule;
    }
  });

  // src/modules/attributes/computed.ts
  var computed_exports = {};
  __export(computed_exports, {
    default: () => computed_default
  });
  var computedModule, computed_default;
  var init_computed = __esm({
    "src/modules/attributes/computed.ts"() {
      init_scope();
      init_reactivity();
      computedModule = {
        name: "computed",
        attribute: "computed",
        metadata: { after: ["signal"] },
        handle: (el, value, runtime) => {
          const computedCleanup = [];
          const isGlobal = el.hasAttribute("data-computed_global");
          const { ghostKeys } = parseGhostKeys(value);
          const initialGhostState = {};
          ghostKeys.forEach((key) => initialGhostState[key] = void 0);
          const stateRef = unifiedRef(initialGhostState);
          const scopeId = el.id || `computed_${Math.random().toString(36).slice(2)}`;
          if (el.hasAttribute("data-computed")) {
            const scopeProxy = createScopeProxy(stateRef);
            const addCleanup = addScopeToNode(el, scopeProxy);
            computedCleanup.push(addCleanup);
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
                  const stop2 = runtime.watch(computedVal, (val) => {
                    stateRef.value[propName] = val;
                  }, { immediate: true });
                  computedCleanup.push(stop2);
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
      computed_default = computedModule;
    }
  });

  // src/modules/attributes/debug.ts
  var debug_exports = {};
  __export(debug_exports, {
    default: () => debug_default
  });
  var debugModule, debug_default;
  var init_debug2 = __esm({
    "src/modules/attributes/debug.ts"() {
      init_scope();
      debugModule = {
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
      debug_default = debugModule;
    }
  });

  // src/engine/animation.ts
  async function flip(targets, changeCallback, options = {}) {
    const { duration = 300, easing = "ease-out" } = options;
    let targetArray = [];
    if (typeof targets === "string") {
      targetArray = Array.from(document.querySelectorAll(targets));
    } else if (targets instanceof Element) {
      targetArray = [targets];
    } else if (targets && (Array.isArray(targets) || typeof targets[Symbol.iterator] === "function")) {
      targetArray = Array.from(targets);
    }
    const initialRects = /* @__PURE__ */ new Map();
    targetArray.forEach((el) => {
      if (el && typeof el.getBoundingClientRect === "function") {
        initialRects.set(el, el.getBoundingClientRect());
      }
    });
    await changeCallback();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    targetArray.forEach((el) => {
      const initialRect = initialRects.get(el);
      if (!initialRect || !el || typeof el.getBoundingClientRect !== "function")
        return;
      const finalRect = el.getBoundingClientRect();
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
  var init_animation = __esm({
    "src/engine/animation.ts"() {
    }
  });

  // src/modules/sprites/drag.ts
  var drag_exports = {};
  __export(drag_exports, {
    $drag: () => $drag,
    default: () => drag_default,
    dragSprite: () => dragSprite,
    dragState: () => dragState
  });
  var dragState, $drag, dragSprite, drag_default;
  var init_drag = __esm({
    "src/modules/sprites/drag.ts"() {
      init_reactivity();
      dragState = reactive({
        isDragging: false,
        activeItem: null,
        sourceList: "",
        targetList: "",
        fromIndex: -1,
        toIndex: -1
      });
      $drag = {
        get isDragging() {
          return dragState.isDragging;
        },
        get activeItem() {
          return dragState.activeItem;
        },
        get sourceList() {
          return dragState.sourceList;
        },
        get targetList() {
          return dragState.targetList;
        },
        get fromIndex() {
          return dragState.fromIndex;
        },
        get toIndex() {
          return dragState.toIndex;
        },
        /** Programmatic in-place list reordering */
        move(list, fromIndex, toIndex) {
          if (!Array.isArray(list) || fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
            return list;
          }
          const [item] = list.splice(fromIndex, 1);
          list.splice(toIndex, 0, item);
          return list;
        },
        /** Programmatic cross-list transfer */
        transfer(fromList, toList, fromIndex, toIndex) {
          if (!Array.isArray(fromList) || !Array.isArray(toList) || fromIndex < 0 || fromIndex >= fromList.length) {
            return false;
          }
          const [item] = fromList.splice(fromIndex, 1);
          const dest = typeof toIndex === "number" && toIndex >= 0 ? toIndex : toList.length;
          toList.splice(dest, 0, item);
          return true;
        },
        /** Abort active drag */
        cancel() {
          dragState.isDragging = false;
          dragState.activeItem = null;
          dragState.sourceList = "";
          dragState.targetList = "";
          dragState.fromIndex = -1;
          dragState.toIndex = -1;
        }
      };
      dragSprite = {
        name: "drag",
        key: "$drag",
        sprites: (_runtime) => $drag
      };
      drag_default = dragSprite;
    }
  });

  // src/engine/utils/styles.ts
  function ensureAdoptedStylesheet(css, ref2, root) {
    if (typeof CSSStyleSheet === "undefined")
      return void 0;
    if (!ref2.sheet) {
      ref2.sheet = new CSSStyleSheet();
      ref2.sheet.replaceSync(css);
    }
    const sheet = ref2.sheet;
    const targetRoot = root && "adoptedStyleSheets" in root ? root : null;
    if (targetRoot) {
      if (!targetRoot.adoptedStyleSheets.includes(sheet)) {
        targetRoot.adoptedStyleSheets = [...targetRoot.adoptedStyleSheets, sheet];
      }
    }
    if (typeof document !== "undefined" && "adoptedStyleSheets" in document) {
      if (!document.adoptedStyleSheets.includes(sheet)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
    }
    return sheet;
  }
  var init_styles = __esm({
    "src/engine/utils/styles.ts"() {
    }
  });

  // src/modules/attributes/drag.ts
  var drag_exports2 = {};
  __export(drag_exports2, {
    CONTAINER_SELECTOR: () => CONTAINER_SELECTOR,
    DragReorderEngine: () => DragReorderEngine,
    Draggable: () => Draggable,
    buildReorderContext: () => buildReorderContext,
    default: () => drag_default2,
    dragAttribute: () => dragAttribute,
    dragHandleAttribute: () => dragHandleAttribute,
    dragItemAttribute: () => dragItemAttribute,
    dragNoDragAttribute: () => dragNoDragAttribute,
    ensureDragStyles: () => ensureDragStyles,
    getClosestContainer: () => getClosestContainer,
    isContainerElement: () => isContainerElement
  });
  function ensureDragStyles(root) {
    ensureAdoptedStylesheet(DRAG_CSS, dragSheetRef, root);
  }
  function isContainerElement(el) {
    if (!el)
      return false;
    if (el.hasAttribute("data-drag-item"))
      return false;
    if (el.hasAttribute("data-drag-container") || el.hasAttribute("data-teleport_drop")) {
      return true;
    }
    if (el.hasAttribute("data-drag")) {
      const val = el.getAttribute("data-drag");
      if (val && (val.includes("{") || val.includes(".") || val.trim().length > 0)) {
        return true;
      }
      return !!el.__draggable;
    }
    return false;
  }
  function getClosestContainer(el) {
    let curr = el;
    while (curr) {
      if (isContainerElement(curr))
        return curr;
      curr = curr.parentElement;
    }
    return null;
  }
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
  function getBoundItemFromElement(el, runtime) {
    if (!el)
      return null;
    if (runtime) {
      try {
        const itm = runtime.evaluate(el, "item");
        if (itm && typeof itm === "object")
          return itm;
        const tab = runtime.evaluate(el, "tab");
        if (tab && typeof tab === "object")
          return tab;
      } catch {
      }
    }
    const stack = getDataStack(el);
    for (const s of stack) {
      if (s && typeof s === "object") {
        if ("item" in s && s.item)
          return s.item;
        if ("tab" in s && s.tab)
          return s.tab;
        for (const key of Object.keys(s)) {
          if (key !== "index" && s[key] && typeof s[key] === "object") {
            return s[key];
          }
        }
      }
    }
    return null;
  }
  function matchesItemIdentity(a, b) {
    if (!a || !b)
      return false;
    if (a === b)
      return true;
    if (typeof a !== "object" || typeof b !== "object")
      return false;
    const idA = a.id ?? a.href ?? a.key ?? a.path ?? a.name;
    const idB = b.id ?? b.href ?? b.key ?? b.path ?? b.name;
    return idA !== void 0 && idB !== void 0 && idA === idB;
  }
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
        try {
          if (listExpr.startsWith("#")) {
            const sigName = listExpr.slice(1);
            if (runtime.setGlobalSignal) {
              runtime.setGlobalSignal(sigName, [...list]);
            }
          } else if (listExpr.includes(".")) {
            const parts = listExpr.split(".");
            const prop = parts.pop();
            const targetObj = runtime.evaluate(container, parts.join("."));
            if (targetObj && typeof targetObj === "object") {
              targetObj[prop] = [...list];
            }
          } else {
            const stack = getDataStack(container);
            for (const s of stack) {
              if (s && typeof s === "object" && listExpr in s) {
                s[listExpr] = [...list];
                break;
              }
            }
            if (runtime.setGlobalSignal && runtime.globalSignals && listExpr in runtime.globalSignals()) {
              runtime.setGlobalSignal(listExpr, [...list]);
            }
          }
        } catch {
        }
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
  var DRAG_CSS, dragSheetRef, CONTAINER_SELECTOR, Draggable, DragReorderEngine, dragItemAttribute, dragHandleAttribute, dragNoDragAttribute, dragAttribute, drag_default2;
  var init_drag2 = __esm({
    "src/modules/attributes/drag.ts"() {
      init_animation();
      init_scope();
      init_consts();
      init_drag();
      init_styles();
      DRAG_CSS = `
[data-drag-item], [data-drag]:not([data-drag*="{"]):not([data-drag*="="]):not([data-drag-container]) {
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

[data-drag-item]:not([data-drag-handle]),
[data-drag]:not([data-drag-handle]):not([data-drag*="{"]):not([data-drag*="="]):not([data-drag-container]) {
  cursor: grab;
}

[data-drag-item]:not([data-drag-handle]):active,
[data-drag]:not([data-drag-handle]):not([data-drag*="{"]):not([data-drag*="="]):not([data-drag-container]):active {
  cursor: grabbing;
}

[data-drag-handle], .handle {
  cursor: grab;
  touch-action: none;
}

[data-drag-handle]:active, .handle:active {
  cursor: grabbing;
}

[data-drag-nodrag] {
  cursor: default !important;
  touch-action: auto !important;
  pointer-events: auto !important;
}

.draggable-drag, .drag-active {
  opacity: 1 !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
  transform: scale(1.03) !important;
  cursor: grabbing !important;
  z-index: 9999 !important;
  pointer-events: none !important;
}

.draggable-ghost, .drag-ghost {
  opacity: 0.4 !important;
  pointer-events: none !important;
  border: 2px dashed color-mix(in srgb, currentColor 25%, transparent) !important;
  background-color: color-mix(in srgb, currentColor 10%, transparent) !important;
}

.draggable-chosen, .drag-chosen {
  cursor: grabbing !important;
  opacity: 0.85;
}

.draggable-selected, [data-drag-item].selected {
  outline: 2px solid var(--color-primary, #3b82f6) !important;
  outline-offset: 2px !important;
}

.draggable-swap-highlight {
  outline: 2px dashed var(--color-warning, #f59e0b) !important;
  outline-offset: 2px !important;
  transition: outline 0.15s ease !important;
}
`;
      dragSheetRef = { sheet: null };
      if (typeof document !== "undefined") {
        ensureDragStyles();
      }
      CONTAINER_SELECTOR = "[data-drag], [data-drag-container], [data-teleport_drop], [data-teleport\\:drop]";
      Draggable = class _Draggable {
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
            draggable: '[data-drag-item], [data-drag]:not([data-drag*="{"]):not([data-drag*="="]):not([data-drag-container])',
            sort: true,
            ...options
          };
          this._pointerDownBound = this._onPointerDown.bind(this);
          this._pointerMoveBound = this._onPointerMove.bind(this);
          this._pointerUpBound = this._onPointerUp.bind(this);
          this._touchStartBound = (e) => {
            const target = e.target;
            const dragEl = target.closest(this.options.draggable);
            if (dragEl && this.el.contains(dragEl)) {
              const closestContainer = getClosestContainer(dragEl);
              if (closestContainer !== this.el)
                return;
              if (dragEl.getAttribute("draggable") === "false")
                return;
              if (target.closest("[data-drag-nodrag]"))
                return;
              const itemHasHandle = dragEl.querySelector("[data-drag-handle]");
              if (this.options.handle && !target.closest(this.options.handle))
                return;
              else if (itemHasHandle && !target.closest("[data-drag-handle]"))
                return;
              if (this.options.filter && target.closest(this.options.filter))
                return;
              const tagName = target.tagName.toUpperCase();
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
          const target = e.target;
          const dragEl = target.closest(this.options.draggable);
          if (!dragEl || !this.el.contains(dragEl))
            return;
          const closestDraggableContainer = getClosestContainer(dragEl);
          if (closestDraggableContainer !== this.el) {
            return;
          }
          if (dragEl.getAttribute("draggable") === "false") {
            return;
          }
          if (target.closest("[data-drag-nodrag]")) {
            return;
          }
          const itemHasHandle = dragEl.querySelector("[data-drag-handle]");
          if (this.options.handle) {
            if (!target.closest(this.options.handle))
              return;
          } else if (itemHasHandle) {
            if (!target.closest("[data-drag-handle]"))
              return;
          }
          if (this.options.filter) {
            if (target.closest(this.options.filter)) {
              return;
            }
          }
          const targetTag = target.tagName.toUpperCase();
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
            if (child.matches(this.options.draggable) && child.getAttribute("draggable") !== "false" && !child[IS_TEMPLATE_KEY]) {
              child.draggableIndex = draggableIdx;
              this.originalIndices.set(child, draggableIdx);
              draggableIdx++;
            }
          });
          dragState.isDragging = true;
          dragState.activeItem = getBoundItemFromElement(this.dragEl, this._runtime);
          dragState.sourceList = this.el.__dragListExpr || "";
          dragState.targetList = this.el.__dragListExpr || "";
          const startIdx = this.originalIndices.get(this.dragEl) ?? -1;
          dragState.fromIndex = startIdx;
          dragState.toIndex = startIdx;
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
          const target = this._findTargetUnderCursor(e.clientX, e.clientY);
          if (!target || target === this.dragEl) {
            this._clearDragOverState();
            return;
          }
          if (this.dragEl.contains(target)) {
            this._clearDragOverState();
            return;
          }
          const targetParent = isContainerElement(target) ? target : getClosestContainer(target);
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
          dragState.targetList = targetParent.__dragListExpr || "";
          this._updateDragOverState(targetParent, e);
          if (isContainerElement(target)) {
            if (this.dragEl.parentElement !== target) {
              const srcBefore = this._captureRects(this.dragEl.parentElement);
              const destBefore = this._captureRects(target);
              target.appendChild(this.dragEl);
              this._animateShift(this.dragEl.parentElement, srcBefore);
              this._animateShift(target, destBefore);
            }
            this._updateDocked();
            return;
          }
          const targetRect = target.getBoundingClientRect();
          const dragRect = this.dragEl.getBoundingClientRect();
          const vertical = this._detectDirection(targetParent) === "vertical";
          const differentLevel = this.dragEl.parentNode !== targetParent;
          const differentRowCol = !this._dragElInRowColumn(dragRect, targetRect, vertical);
          const side1 = vertical ? "top" : "left";
          if (this.lastTarget !== target) {
            this.targetBeforeFirstSwap = targetRect[side1];
            this.pastFirstInvertThresh = false;
            this.isCircumstantialInvert = !differentRowCol && this.options.invertSwap || differentLevel;
          }
          const direction = this._getSwapDirection(
            e,
            target,
            targetRect,
            vertical,
            differentRowCol ? 1 : this.options.swapThreshold,
            this.options.invertedSwapThreshold,
            this.isCircumstantialInvert,
            this.lastTarget === target
          );
          if (this.options.swap) {
            if (direction !== 0 && target !== this.dragEl) {
              this._setSwapHighlight(target);
            } else if (target === this.dragEl) {
              this._clearSwapHighlight();
            }
            this._updateDocked();
            return;
          }
          if (direction !== 0) {
            let sibling = null;
            let dragIndex = Array.from(this.dragEl.parentElement.children).indexOf(this.dragEl);
            if (dragIndex !== -1) {
              do {
                dragIndex -= direction;
                sibling = this.dragEl.parentElement.children[dragIndex];
              } while (sibling && (getComputedStyle(sibling).display === "none" || sibling === _Draggable.ghost));
            }
            if (sibling === target) {
              return;
            }
            this.lastTarget = target;
            this.lastDirection = direction;
            const srcBefore = this._captureRects(this.dragEl.parentElement);
            const destBefore = isSameContainer ? srcBefore : this._captureRects(targetParent);
            const nextSibling = target.nextElementSibling;
            const after = direction === 1;
            if (after && !nextSibling) {
              targetParent.appendChild(this.dragEl);
            } else {
              targetParent.insertBefore(this.dragEl, after ? nextSibling : target);
            }
            this._animateShift(this.dragEl.parentElement, srcBefore);
            if (!isSameContainer) {
              this._animateShift(targetParent, destBefore);
            }
            this._updateDocked();
            if (this.targetBeforeFirstSwap !== void 0 && !this.isCircumstantialInvert) {
              const newTargetRect = target.getBoundingClientRect();
              this.targetMoveDistance = Math.abs(this.targetBeforeFirstSwap - newTargetRect[side1]);
            }
          }
        }
        _onPointerUp(e) {
          this._cleanupDragListeners();
          const swapTarget = this._swapHighlightTarget;
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
              const oldIndex = this.originalIndices.get(this.dragEl);
              if (this.options.swap) {
                if (swapTarget && swapTarget !== this.dragEl) {
                  const targetIndex = this.originalIndices.get(swapTarget);
                  const srcContainer = this.dragEl.parentElement;
                  const destContainer = swapTarget.parentElement;
                  const isSame = srcContainer === destContainer;
                  const srcBefore = this._captureRects(srcContainer);
                  const destBefore = isSame ? srcBefore : this._captureRects(destContainer);
                  this._swapNodes(this.dragEl, swapTarget);
                  this._animateShift(srcContainer, srcBefore);
                  if (!isSame) {
                    this._animateShift(destContainer, destBefore);
                  }
                  if (this.options.onEnd) {
                    this.options.onEnd({
                      item: this.dragEl,
                      from: this.parentEl,
                      to: destContainer,
                      oldIndex,
                      newIndex: targetIndex,
                      originalEvent: e,
                      items: [],
                      oldIndicies: [],
                      swapItem: swapTarget
                    });
                  }
                } else {
                  if (this.options.onEnd) {
                    this.options.onEnd({
                      item: this.dragEl,
                      from: this.parentEl,
                      to: this.dragEl.parentElement,
                      oldIndex,
                      newIndex: oldIndex,
                      originalEvent: e,
                      items: [],
                      oldIndicies: []
                    });
                  }
                }
              } else {
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
                  if (child[IS_TEMPLATE_KEY])
                    continue;
                  if (child.getAttribute("draggable") === "false")
                    continue;
                  if (child.matches(this.options.draggable)) {
                    finalIndex++;
                  }
                }
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
          dragState.isDragging = false;
          dragState.activeItem = null;
          dragState.sourceList = "";
          dragState.targetList = "";
          dragState.fromIndex = -1;
          dragState.toIndex = -1;
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
          const container = getClosestContainer(this.dragEl);
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
        _setSwapHighlight(target) {
          if (this._swapHighlightTarget && this._swapHighlightTarget !== target) {
            this._swapHighlightTarget.classList.remove(this.options.swapClass);
          }
          target.classList.add(this.options.swapClass);
          this._swapHighlightTarget = target;
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
          const container = getClosestContainer(el);
          if (!container || !container.__draggable)
            return null;
          const children = Array.from(container.children).filter(
            (c) => c.nodeName.toUpperCase() !== "TEMPLATE" && c !== this.dragEl && c !== _Draggable.ghost && c.style.display !== "none" && !c[IS_TEMPLATE_KEY] && !c.classList.contains("draggable-ghost")
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
        _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
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
                return this._getInsertDirection(evt, target, targetRect, vertical);
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
        _getInsertDirection(evt, target, targetRect, vertical) {
          const mouseOnAxis = vertical ? evt.clientY : evt.clientX;
          const targetS1 = vertical ? targetRect.top : targetRect.left;
          const targetLength = vertical ? targetRect.height : targetRect.width;
          return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
        }
        _swapNodes(n1, n2) {
          if (!n1 || !n2 || n1 === n2)
            return;
          const p1 = n1.parentNode;
          const p2 = n2.parentNode;
          if (!p1 || !p2)
            return;
          const tempMarker = document.createComment("swap-marker");
          p1.insertBefore(tempMarker, n1);
          p2.insertBefore(n1, n2);
          p1.insertBefore(n2, tempMarker);
          p1.removeChild(tempMarker);
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
      DragReorderEngine = class {
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
          const rawDragVal = container.getAttribute("data-drag");
          let config = {};
          if (rawDragVal && rawDragVal.trim()) {
            try {
              const evaluated = this.runtime?.evaluate(container, rawDragVal);
              if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)) {
                config = evaluated;
              } else if (typeof evaluated === "string") {
                config = { list: evaluated };
              }
            } catch {
              try {
                config = JSON.parse(rawDragVal);
              } catch {
                config = { list: rawDragVal.trim() };
              }
            }
          }
          const isMulti = config.multiDrag ?? config.multi ?? container.getAttribute("data-drag-multi") === "true";
          const selectedClass = config.selectedClass || container.getAttribute("data-drag-selected-class") || "draggable-selected";
          const swap = config.swap ?? (container.hasAttribute("data-drag-swap") || container.getAttribute("data-drag-swap") === "true");
          const swapClass = config.swapClass || container.getAttribute("data-drag-swap-class") || "draggable-swap-highlight";
          const groupOpt = config.group || container.getAttribute("data-drag-group");
          let group = void 0;
          if (groupOpt) {
            if (typeof groupOpt === "object") {
              group = { ...groupOpt };
            } else {
              group = { name: String(groupOpt) };
            }
            const pullAttr = container.getAttribute("data-drag-pull");
            const pull = group.pull !== void 0 ? group.pull : pullAttr !== "false" ? container.hasAttribute("data-drag-clone") || container.getAttribute("data-drag-clone") === "true" ? "clone" : true : false;
            const put = group.put !== void 0 ? group.put : container.getAttribute("data-drag-put") !== "false";
            const revertClone = group.revertClone ?? container.getAttribute("data-drag-revert-clone") === "true";
            group.pull = pull;
            group.put = put;
            group.revertClone = revertClone;
          }
          const directionOpt = config.direction || container.getAttribute("data-drag-direction");
          const direction = directionOpt === "grid" ? void 0 : directionOpt;
          const isNested = (typeof groupOpt === "string" ? groupOpt : groupOpt?.name) === "nested";
          const swapThresholdAttr = container.getAttribute("data-drag-swap-threshold");
          const swapThreshold = config.swapThreshold !== void 0 ? Number(config.swapThreshold) : swapThresholdAttr ? parseFloat(swapThresholdAttr) : isNested ? 0.65 : 1;
          const invertSwapAttr = container.getAttribute("data-drag-invert-swap");
          const invertSwap = config.invertSwap ?? (invertSwapAttr === "true" || isNested);
          this.draggable = new Draggable(container, {
            animation: config.animation ?? this.ctx.animationDuration ?? 150,
            ghostClass: config.ghostClass ?? this.ctx.ghostClass ?? "draggable-ghost",
            dragClass: config.dragClass ?? this.ctx.dragClass ?? "draggable-drag",
            ghostOpacity: config.ghostOpacity ?? this.ctx.ghostOpacity ?? 0.4,
            fallbackOnBody: config.fallbackOnBody ?? this.ctx.fallbackOnBody !== false,
            swapThreshold,
            invertSwap,
            direction,
            handle: config.handle || container.getAttribute("data-drag-handle") || void 0,
            filter: config.filter || container.getAttribute("data-drag-filter") || void 0,
            draggable: config.draggable || "[data-drag-item], [data-drag]:not([data-drag*='{']):not([data-drag*='=']):not([data-drag-container])",
            multiDrag: isMulti,
            selectedClass,
            swap,
            swapClass,
            group,
            sort: config.sort ?? this.ctx.sort !== false,
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
              const fromExpr = fromContainer.__dragListExpr || fromContainer.getAttribute("data-drag-container") || fromContainer.getAttribute("data-teleport_drop") || fromContainer.getAttribute("data-drag") || "";
              const toExpr = toContainer.__dragListExpr || toContainer.getAttribute("data-drag-container") || toContainer.getAttribute("data-teleport_drop") || toContainer.getAttribute("data-drag") || "";
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
                  if (swap) {
                    if (typeof oldIndex === "number" && typeof newIndex === "number" && oldIndex >= 0 && newIndex >= 0) {
                      const temp = sourceList[oldIndex];
                      sourceList[oldIndex] = targetList[newIndex];
                      targetList[newIndex] = temp;
                    }
                    if (this.runtime) {
                      this.updateEmptyState(fromContainer);
                      this.updateEmptyState(toContainer);
                    }
                    return;
                  }
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
                          const draggedItem = getBoundItemFromElement(evt.item, this.runtime);
                          let srcIndex = -1;
                          if (draggedItem) {
                            srcIndex = list.findIndex((x) => matchesItemIdentity(x, draggedItem));
                          }
                          if (srcIndex === -1 && typeof oldIndex === "number" && oldIndex >= 0 && oldIndex < list.length) {
                            srcIndex = oldIndex;
                          }
                          let destIndex = typeof newIndex === "number" ? newIndex : -1;
                          const nextSib = evt.item.nextElementSibling;
                          if (nextSib) {
                            const nextItem = getBoundItemFromElement(nextSib, this.runtime);
                            if (nextItem) {
                              const targetIdx = list.findIndex((x) => matchesItemIdentity(x, nextItem));
                              if (targetIdx !== -1) {
                                destIndex = srcIndex < targetIdx ? targetIdx - 1 : targetIdx;
                              }
                            }
                          } else {
                            destIndex = list.length - 1;
                          }
                          if (srcIndex >= 0 && srcIndex < list.length && destIndex >= 0 && destIndex < list.length) {
                            if (srcIndex !== destIndex) {
                              const [moved] = list.splice(srcIndex, 1);
                              if (moved !== void 0) {
                                list.splice(destIndex, 0, moved);
                              }
                            }
                          }
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
            const hasChildren = container.querySelector(":scope > [data-drag-item], :scope > [data-drag]:not([data-for])") != null;
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
      dragItemAttribute = {
        name: "dragItem",
        attribute: "drag-item",
        handle: (element) => {
          ensureDragStyles(element.getRootNode());
        }
      };
      dragHandleAttribute = {
        name: "dragHandle",
        attribute: "drag-handle",
        handle: (element) => {
          ensureDragStyles(element.getRootNode());
        }
      };
      dragNoDragAttribute = {
        name: "dragNoDrag",
        attribute: "drag-nodrag",
        handle: () => {
        }
      };
      dragAttribute = {
        name: "drag",
        attribute: "drag",
        handle: (element, value, runtime, parsedAttr) => {
          ensureDragStyles(element.getRootNode());
          const arg = parsedAttr?.argument;
          if (arg === "item" || element.hasAttribute("data-drag-item")) {
            return dragItemAttribute.handle(element, value, runtime, parsedAttr);
          }
          if (arg === "handle" || element.hasAttribute("data-drag-handle")) {
            return dragHandleAttribute.handle(element, value, runtime, parsedAttr);
          }
          if (arg === "nodrag" || element.hasAttribute("data-drag-nodrag")) {
            return dragNoDragAttribute.handle(element, value, runtime, parsedAttr);
          }
          const isContainer = isContainerElement(element);
          if (!isContainer && !value) {
            return dragItemAttribute.handle(element, value, runtime, parsedAttr);
          }
          if (element.__nexusDragBound)
            return element.__nexusDragCleanup;
          element.__nexusDragBound = true;
          const container = element;
          let cleanupEffect2 = void 0;
          let listExpr = "";
          if (value && value.trim()) {
            try {
              const evaluated = runtime.evaluate(container, value);
              if (evaluated && typeof evaluated === "object" && !Array.isArray(evaluated) && evaluated.list) {
                listExpr = evaluated.list;
              } else if (typeof evaluated === "string") {
                listExpr = evaluated;
              } else {
                listExpr = value.trim();
              }
            } catch {
              listExpr = value.trim();
            }
          }
          if (!listExpr) {
            listExpr = container.getAttribute("data-drag-container") || container.getAttribute("data-teleport_drop") || "";
          }
          container.__dragListExpr = listExpr;
          const [_, stopEffect] = runtime.elementBoundEffect(container, () => {
            const swapThreshExpr = container.getAttribute("data-bind-data-drag-swap-threshold") || container.getAttribute("data-bind_data-drag-swap-threshold");
            const swapThreshVal = swapThreshExpr ? runtime.evaluate(container, swapThreshExpr) : void 0;
            const invertThreshExpr = container.getAttribute("data-bind-data-drag-invert-swap-threshold") || container.getAttribute("data-bind_data-drag-invert-swap-threshold");
            const invertThreshVal = invertThreshExpr ? runtime.evaluate(container, invertThreshExpr) : void 0;
            if (!container.__draggable) {
              try {
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
                  delete container.__dragListExpr;
                };
                if (containerCleanups instanceof Map) {
                  containerCleanups.set("draggable-cleanup", cleanupFn);
                } else if (Array.isArray(containerCleanups)) {
                  containerCleanups.push(cleanupFn);
                }
              } catch (err) {
                runtime.reportError(err instanceof Error ? err : new Error(String(err)), container, "drag-init");
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
      drag_default2 = dragAttribute;
    }
  });

  // src/modules/attributes/effect.ts
  var effect_exports = {};
  __export(effect_exports, {
    default: () => effect_default
  });
  var effectModule, effect_default;
  var init_effect = __esm({
    "src/modules/attributes/effect.ts"() {
      init_debug();
      effectModule = {
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
      effect_default = effectModule;
    }
  });

  // src/engine/utils/pointer.ts
  function trackPointerDrag(element, callbacks) {
    let isTracking = false;
    let startX = 0;
    let startY = 0;
    let currentPointerId = null;
    const onPointerMove = (e) => {
      if (!isTracking)
        return;
      callbacks.onMove?.(e, {
        dx: e.clientX - startX,
        dy: e.clientY - startY,
        startX,
        startY
      });
    };
    const onPointerUp = (e) => {
      if (!isTracking)
        return;
      isTracking = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (callbacks.capture && currentPointerId !== null) {
        try {
          element.releasePointerCapture(currentPointerId);
        } catch {
        }
      }
      callbacks.onEnd?.(e, {
        dx: e.clientX - startX,
        dy: e.clientY - startY,
        startX,
        startY
      });
      currentPointerId = null;
    };
    const onPointerDown = (e) => {
      if (callbacks.onStart) {
        const allowed = callbacks.onStart(e);
        if (allowed === false)
          return;
      }
      isTracking = true;
      startX = e.clientX;
      startY = e.clientY;
      currentPointerId = e.pointerId;
      if (callbacks.capture) {
        try {
          element.setPointerCapture(e.pointerId);
        } catch {
        }
      }
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };
    element.addEventListener("pointerdown", onPointerDown);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }
  var init_pointer = __esm({
    "src/engine/utils/pointer.ts"() {
    }
  });

  // src/modules/attributes/flow.ts
  var flow_exports = {};
  __export(flow_exports, {
    default: () => flow_default,
    flowAttribute: () => flowAttribute,
    flowEdgesAttribute: () => flowEdgesAttribute,
    flowGridAttribute: () => flowGridAttribute,
    flowHandleAttribute: () => flowHandleAttribute,
    flowMinimapAttribute: () => flowMinimapAttribute,
    flowNoDragAttribute: () => flowNoDragAttribute,
    flowNodeAttribute: () => flowNodeAttribute,
    flowResizerAttribute: () => flowResizerAttribute,
    flowSideAttribute: () => flowSideAttribute,
    flowSnapAttribute: () => flowSnapAttribute,
    flowViewportAttribute: () => flowViewportAttribute
  });
  function ensureFlowStyles(root) {
    ensureAdoptedStylesheet(FLOW_CSS, flowSheetRef, root);
  }
  var SVG_NS, MIN_ZOOM, MAX_ZOOM, NO_PAN, sharedViewport, FLOW_CSS, flowSheetRef, flowViewportAttribute, flowAttribute, flowNodeAttribute, flowHandleAttribute, flowEdgesAttribute, flowResizerAttribute, flowMinimapAttribute, flowSideAttribute, flowNoDragAttribute, flowGridAttribute, flowSnapAttribute, flow_default;
  var init_flow = __esm({
    "src/modules/attributes/flow.ts"() {
      init_reactivity();
      init_styles();
      init_pointer();
      SVG_NS = "http://www.w3.org/2000/svg";
      MIN_ZOOM = 0.2;
      MAX_ZOOM = 4;
      NO_PAN = "[data-flow-node],[data-flow-handle],[data-flow-nodrag],[data-flow-resizer],[data-flow-minimap],button,a,input,textarea,select,label";
      sharedViewport = (el) => {
        const flow = el?.closest("[data-flow]");
        const vp = flow?.__flowViewport;
        return vp ? { x: vp.x || 0, y: vp.y || 0, zoom: vp.zoom || 1 } : { x: 0, y: 0, zoom: 1 };
      };
      FLOW_CSS = `
[data-flow] {
  position: relative;
  overflow: hidden;
  user-select: none;
  cursor: grab;
}
[data-flow]:active {
  cursor: grabbing;
}
[data-flow-viewport], [data-flow] > .flow-viewport, [data-flow] > [data-flow="viewport"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}
[data-flow-edges], .flow-edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
[data-flow-node] {
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
  user-select: none;
}
[data-flow-node]:active {
  cursor: grabbing;
}
[data-flow-node].selected > *:first-child {
  box-shadow: 0 0 0 2px var(--color-primary, #3b82f6), 0 20px 25px -5px rgba(0, 0, 0, 0.25);
}
[data-flow-handle] {
  position: absolute;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background-color: var(--color-primary, currentColor);
  border: 2px solid var(--color-base-100, #ffffff);
  cursor: crosshair;
  z-index: 20;
  box-sizing: border-box;
  transition: transform 0.15s ease;
}
[data-flow-handle]:hover {
  transform: scale(1.25);
}
[data-flow-handle-side="left"], [data-flow-side="left"], [data-flow-handle="target"]:not([data-flow-side]):not([data-flow-handle-side]) {
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
}
[data-flow-handle-side="left"]:hover, [data-flow-side="left"]:hover, [data-flow-handle="target"]:not([data-flow-side]):not([data-flow-handle-side]):hover {
  transform: translate(-50%, -50%) scale(1.25);
}
[data-flow-handle-side="right"], [data-flow-side="right"], [data-flow-handle="source"]:not([data-flow-side]):not([data-flow-handle-side]) {
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
}
[data-flow-handle-side="right"]:hover, [data-flow-side="right"]:hover, [data-flow-handle="source"]:not([data-flow-side]):not([data-flow-handle-side]):hover {
  transform: translate(50%, -50%) scale(1.25);
}
[data-flow-handle-side="top"], [data-flow-side="top"] {
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
}
[data-flow-handle-side="top"]:hover, [data-flow-side="top"]:hover {
  transform: translate(-50%, -50%) scale(1.25);
}
[data-flow-handle-side="bottom"], [data-flow-side="bottom"] {
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%);
}
[data-flow-handle-side="bottom"]:hover, [data-flow-side="bottom"]:hover {
  transform: translate(-50%, 50%) scale(1.25);
}
.flow-edge {
  fill: none;
  stroke: currentColor;
  stroke-width: 2px;
  opacity: 0.75;
  transition: opacity 0.15s ease, stroke-width 0.15s ease;
}
.flow-edge:hover {
  opacity: 1;
  stroke-width: 2.5px;
}
.flow-edge-preview {
  pointer-events: none;
  stroke-dasharray: 4 4;
}
.flow-selection-rect {
  position: absolute;
  border: 1.5px dashed var(--color-primary, #3b82f6);
  background-color: color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent);
  pointer-events: none;
  z-index: 50;
  border-radius: 4px;
}
[data-flow-node].selected > * {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}
.flow-resizer {
  position: absolute;
  inset: -2px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
[data-flow-node]:hover .flow-resizer,
[data-flow-node].selected .flow-resizer {
  opacity: 1;
}
.flow-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: var(--color-base-100, #ffffff);
  border: 1.5px solid var(--color-primary, #3b82f6);
  border-radius: 2px;
  z-index: 30;
  box-sizing: border-box;
  pointer-events: all;
}
.flow-resize-handle.top-left { top: -4px; left: -4px; cursor: nwse-resize; }
.flow-resize-handle.top-right { top: -4px; right: -4px; cursor: nesw-resize; }
.flow-resize-handle.bottom-left { bottom: -4px; left: -4px; cursor: nesw-resize; }
.flow-resize-handle.bottom-right { bottom: -4px; right: -4px; cursor: nwse-resize; }
.flow-resize-handle.top { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.flow-resize-handle.bottom { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.flow-resize-handle.left { left: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
.flow-resize-handle.right { right: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }

.flow-minimap {
  position: absolute;
  width: 12rem;
  height: 8rem;
  background: color-mix(in srgb, var(--color-base-100, #1e293b) 85%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 40;
  user-select: none;
}
.flow-minimap-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.flow-minimap-node {
  fill: var(--color-primary, #3b82f6);
  opacity: 0.75;
  rx: 3px;
}
.flow-minimap-lens {
  fill: color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
  stroke: var(--color-primary, #3b82f6);
  stroke-width: 1.5px;
  cursor: grab;
  rx: 4px;
}
.flow-minimap-lens:active {
  cursor: grabbing;
}
.flow-edge-label-group {
  pointer-events: all;
  cursor: pointer;
}
.flow-edge-label-bg {
  fill: var(--color-base-100, #1e293b);
  stroke: color-mix(in srgb, currentColor 15%, transparent);
  stroke-width: 1px;
  rx: 4px;
}
.flow-edge-label-text {
  fill: currentColor;
  font-size: 10px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}
`;
      flowSheetRef = { sheet: null };
      if (typeof document !== "undefined") {
        ensureFlowStyles();
      }
      flowViewportAttribute = {
        name: "flowViewport",
        attribute: "flow-viewport",
        handle: (element) => {
          ensureFlowStyles(element.getRootNode());
        }
      };
      flowAttribute = {
        name: "flow",
        attribute: "flow",
        handle: (element, value, runtime, parsedAttr) => {
          const arg = parsedAttr?.argument;
          if (arg === "viewport")
            return flowViewportAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "node")
            return flowNodeAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "handle")
            return flowHandleAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "edges")
            return flowEdgesAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "minimap")
            return flowMinimapAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "resizer")
            return flowResizerAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "side")
            return flowSideAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "nodrag")
            return flowNoDragAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "grid")
            return flowGridAttribute.handle(element, value, runtime, parsedAttr);
          if (arg === "snap")
            return flowSnapAttribute.handle(element, value, runtime, parsedAttr);
          ensureFlowStyles(element.getRootNode());
          let config = {};
          if (value && value.trim()) {
            try {
              config = runtime.evaluate(element, value);
            } catch {
              config = {};
            }
          }
          const isViewportObj = config && typeof config === "object" && !Array.isArray(config) && ("zoom" in config || "x" in config || "y" in config);
          let state;
          if (isViewportObj) {
            state = config;
          } else {
            let inScopeVp = null;
            try {
              inScopeVp = runtime.evaluate(element, "viewport");
            } catch {
            }
            if (inScopeVp && typeof inScopeVp === "object" && ("zoom" in inScopeVp || "x" in inScopeVp || "y" in inScopeVp)) {
              state = inScopeVp;
            } else {
              state = reactive({ x: 0, y: 0, zoom: 1, tick: 0 });
            }
          }
          if (state.zoom === void 0)
            state.zoom = 1;
          if (state.x === void 0)
            state.x = 0;
          if (state.y === void 0)
            state.y = 0;
          if (state.tick === void 0)
            state.tick = 0;
          const content = element.querySelector("[data-flow-viewport], .flow-viewport") || element.firstElementChild || element;
          element.__flowViewport = state;
          const gridAttr = element.getAttribute("data-flow-grid");
          const gridSize = config?.grid ?? (gridAttr !== null ? parseFloat(gridAttr) || 0 : 0);
          let isPanning = false;
          let startX = 0;
          let startY = 0;
          let isSelecting = false;
          let selStartX = 0;
          let selStartY = 0;
          let selRectEl = null;
          let didMove = false;
          const screenToFlowLocal = (clientX, clientY) => {
            const r = element.getBoundingClientRect();
            const z = state.zoom || 1;
            return {
              x: (clientX - r.left - (state.x || 0)) / z,
              y: (clientY - r.top - (state.y || 0)) / z
            };
          };
          const canPan = (e) => {
            if (e.button === 1)
              return true;
            if (e.button === 0 && e.altKey)
              return true;
            if (e.button === 0)
              return !e.target.closest(NO_PAN);
            return false;
          };
          const stopCanvasDrag = trackPointerDrag(element, {
            capture: true,
            onStart: (e) => {
              if (!canPan(e))
                return false;
              didMove = false;
              if (e.button === 0 && e.shiftKey) {
                isSelecting = true;
                const pt = screenToFlowLocal(e.clientX, e.clientY);
                selStartX = pt.x;
                selStartY = pt.y;
                selRectEl = document.createElement("div");
                selRectEl.className = "flow-selection-rect";
                content.appendChild(selRectEl);
                return true;
              }
              isPanning = true;
              startX = e.clientX - state.x;
              startY = e.clientY - state.y;
              element.style.cursor = "grabbing";
              return true;
            },
            onMove: (e) => {
              if (isSelecting && selRectEl) {
                didMove = true;
                const pt = screenToFlowLocal(e.clientX, e.clientY);
                const minX = Math.min(selStartX, pt.x);
                const minY = Math.min(selStartY, pt.y);
                const w = Math.abs(pt.x - selStartX);
                const h = Math.abs(pt.y - selStartY);
                selRectEl.style.left = `${minX}px`;
                selRectEl.style.top = `${minY}px`;
                selRectEl.style.width = `${w}px`;
                selRectEl.style.height = `${h}px`;
                const nodes = runtime.evaluate(element, "nodes");
                if (Array.isArray(nodes)) {
                  nodes.forEach((n) => {
                    const p = n.position || n;
                    const nx = p.x || 0;
                    const ny = p.y || 0;
                    const nw = n.w || n.width || 176;
                    const nh = n.h || n.height || 90;
                    const inside = nx < minX + w && nx + nw > minX && ny < minY + h && ny + nh > minY;
                    n.selected = inside;
                  });
                  state.tick = (state.tick || 0) + 1;
                }
                return;
              }
              if (!isPanning)
                return;
              didMove = true;
              state.x = e.clientX - startX;
              state.y = e.clientY - startY;
              state.tick = (state.tick || 0) + 1;
            },
            onEnd: (e) => {
              if (isSelecting) {
                isSelecting = false;
                selRectEl?.remove();
                selRectEl = null;
                return;
              }
              if (!isPanning)
                return;
              isPanning = false;
              element.style.cursor = "";
              if (!didMove && !e.shiftKey) {
                const nodes = runtime.evaluate(element, "nodes");
                if (Array.isArray(nodes) && nodes.some((n) => n.selected)) {
                  nodes.forEach((n) => {
                    n.selected = false;
                  });
                  state.tick = (state.tick || 0) + 1;
                }
              }
            }
          });
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
            state.tick = (state.tick || 0) + 1;
          };
          const onKeyDown = (e) => {
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
              return;
            }
            let nodes = [];
            try {
              nodes = runtime.evaluate(element, "nodes") || [];
            } catch {
              nodes = [];
            }
            if (!Array.isArray(nodes))
              return;
            if (e.key === "Delete" || e.key === "Backspace") {
              const hasSelected = nodes.some((n) => n.selected);
              if (hasSelected) {
                e.preventDefault();
                try {
                  runtime.evaluate(element, `
              edges = (typeof edges !== 'undefined' && Array.isArray(edges)) ? edges.filter(e => !nodes.some(n => n.selected && (String(n.id) === String(e.source) || String(n.id) === String(e.target)))) : [];
              nodes = nodes.filter(n => !n.selected);
            `);
                } catch {
                  const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => String(n.id)));
                  const remaining = nodes.filter((n) => !selectedIds.has(String(n.id)));
                  nodes.length = 0;
                  nodes.push(...remaining);
                }
                state.tick = (state.tick || 0) + 1;
              }
            } else if (e.key.startsWith("Arrow")) {
              const selectedNodes = nodes.filter((n) => n.selected);
              if (selectedNodes.length > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                selectedNodes.forEach((n) => {
                  const p = n.position || n;
                  if (e.key === "ArrowLeft")
                    p.x = (p.x || 0) - step;
                  if (e.key === "ArrowRight")
                    p.x = (p.x || 0) + step;
                  if (e.key === "ArrowUp")
                    p.y = (p.y || 0) - step;
                  if (e.key === "ArrowDown")
                    p.y = (p.y || 0) + step;
                });
                state.tick = (state.tick || 0) + 1;
              }
            } else if (e.key === "Escape") {
              nodes.forEach((n) => {
                n.selected = false;
              });
              state.tick = (state.tick || 0) + 1;
            }
          };
          element.addEventListener("wheel", onWheel, { passive: false });
          window.addEventListener("keydown", onKeyDown);
          let settleFrames = 0;
          const settle = () => {
            state.tick = (state.tick || 0) + 1;
            if (++settleFrames < 24)
              requestAnimationFrame(settle);
          };
          requestAnimationFrame(settle);
          const stop2 = runtime.effect(() => {
            const zoom = state.zoom || 1;
            const x = state.x || 0;
            const y = state.y || 0;
            if (content !== element && !content.hasAttribute("data-flow-viewport")) {
              content.setAttribute("data-flow-viewport", "");
            }
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
            stopCanvasDrag();
            element.removeEventListener("wheel", onWheel);
            window.removeEventListener("keydown", onKeyDown);
            delete element.__flowViewport;
          };
        }
      };
      flowNodeAttribute = {
        name: "flowNode",
        attribute: "flow-node",
        handle: (element, value, runtime) => {
          ensureFlowStyles(element.getRootNode());
          const nodeState = runtime.evaluate(element, value);
          if (!nodeState || typeof nodeState !== "object")
            return;
          const readPos = (n = nodeState) => {
            const p = n.position;
            return p ? { x: p.x || 0, y: p.y || 0 } : { x: n.x || 0, y: n.y || 0 };
          };
          const writePos = (n, x, y) => {
            if (n.position) {
              n.position.x = x;
              n.position.y = y;
            } else {
              n.x = x;
              n.y = y;
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
          let dragGroup = [];
          const stopNodeDrag = trackPointerDrag(element, {
            capture: true,
            onStart: (e) => {
              if (e.button !== 0 || e.altKey)
                return false;
              if (e.target.closest(
                "[data-flow-handle],[data-flow-nodrag],[data-flow-resizer],button,a,input,textarea,select,label"
              ))
                return false;
              e.stopPropagation();
              const flowEl = element.closest("[data-flow]");
              let allNodes = [];
              try {
                allNodes = runtime.evaluate(flowEl || element, "nodes") || [];
              } catch {
                allNodes = [];
              }
              if (e.shiftKey) {
                nodeState.selected = !nodeState.selected;
              } else {
                if (!nodeState.selected) {
                  allNodes.forEach((n) => {
                    n.selected = false;
                  });
                  nodeState.selected = true;
                }
              }
              const selectedNodes = allNodes.filter((n) => n.selected);
              const movingNodes = selectedNodes.length > 0 && nodeState.selected ? selectedNodes : [nodeState];
              const groupSet = new Set(movingNodes);
              allNodes.forEach((n) => {
                if (n.parentId && movingNodes.some((p) => String(p.id) === String(n.parentId))) {
                  groupSet.add(n);
                }
              });
              dragGroup = Array.from(groupSet).map((n) => {
                const p = readPos(n);
                return { node: n, initialX: p.x, initialY: p.y };
              });
              element.style.zIndex = "1000";
            },
            onMove: (_e, delta) => {
              const flowEl = element.closest("[data-flow]");
              const vp = flowEl?.__flowViewport;
              const zoom = vp?.zoom || 1;
              const dx = delta.dx / zoom;
              const dy = delta.dy / zoom;
              const snap = resolveSnap();
              dragGroup.forEach((item) => {
                const snapped = snapPoint(item.initialX + dx, item.initialY + dy, snap);
                writePos(item.node, snapped.x, snapped.y);
              });
              if (vp)
                vp.tick = (vp.tick || 0) + 1;
            },
            onEnd: () => {
              element.style.zIndex = "";
            }
          });
          const stop2 = runtime.effect(() => {
            element.style.position = "absolute";
            element.style.left = "0";
            element.style.top = "0";
            const p = readPos();
            const s = snapPoint(p.x, p.y, resolveSnap());
            element.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
            if (nodeState.width !== void 0) {
              element.style.width = typeof nodeState.width === "number" ? `${nodeState.width}px` : nodeState.width;
            }
            if (nodeState.height !== void 0) {
              element.style.height = typeof nodeState.height === "number" ? `${nodeState.height}px` : nodeState.height;
            }
            if (nodeState.selected) {
              element.classList.add("selected");
            } else {
              element.classList.remove("selected");
            }
          });
          return () => {
            stop2();
            stopNodeDrag();
          };
        }
      };
      flowHandleAttribute = {
        name: "flowHandle",
        attribute: "flow-handle",
        handle: (element, value, runtime) => {
          ensureFlowStyles(element.getRootNode());
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
          element.setAttribute("data-flow-handle-type", kind);
          const sideAttr = element.getAttribute("data-flow-side");
          if (sideAttr) {
            element.setAttribute("data-flow-handle-side", sideAttr);
          }
          const viewport = () => element.closest("[data-flow]");
          const toFlow = (clientX, clientY) => {
            const vp2 = viewport();
            const st = sharedViewport(element);
            const r = vp2.getBoundingClientRect();
            return { x: (clientX - r.left - st.x) / st.zoom, y: (clientY - r.top - st.y) / st.zoom };
          };
          const anchorFlow = (el) => {
            const r = el.getBoundingClientRect();
            return toFlow(r.left + r.width / 2, r.top + r.height / 2);
          };
          const edgesArray = () => {
            const vp2 = viewport();
            if (!vp2)
              return null;
            const svg = vp2.querySelector("[data-flow-edges]");
            const expr = svg?.getAttribute("data-flow-edges-expr") || svg?.getAttribute("data-flow-edges") || "edges";
            try {
              const arr = runtime.evaluate(vp2, expr);
              return Array.isArray(arr) ? arr : null;
            } catch {
              return null;
            }
          };
          let preview = null;
          let srcId = "";
          let start = { x: 0, y: 0 };
          let vp = null;
          const stopHandleDrag = trackPointerDrag(element, {
            onStart: (e) => {
              if (e.button !== 0)
                return false;
              e.stopPropagation();
              e.preventDefault();
              vp = viewport();
              const svg = vp?.querySelector("[data-flow-edges]");
              if (!vp || !svg)
                return false;
              const srcNode = element.closest("[data-flow-node]");
              srcId = srcNode?.id || srcNode?.getAttribute("data-bind-id")?.replace(/^['"]|['"]$/g, "").replace(/^node-/, "") || element.id || "";
              start = anchorFlow(element);
              preview = document.createElementNS(SVG_NS, "path");
              preview.setAttribute("class", "flow-edge flow-edge-preview");
              preview.setAttribute("fill", "none");
              preview.setAttribute("stroke", "currentColor");
              preview.setAttribute("stroke-width", "2");
              preview.setAttribute("stroke-dasharray", "4 4");
              preview.style.pointerEvents = "none";
              svg.appendChild(preview);
            },
            onMove: (ev) => {
              if (!preview)
                return;
              const pt = toFlow(ev.clientX, ev.clientY);
              const dx = Math.abs(start.x - pt.x) / 2;
              preview.setAttribute(
                "d",
                `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${pt.x - dx} ${pt.y}, ${pt.x} ${pt.y}`
              );
            },
            onEnd: (ev) => {
              if (preview) {
                preview.remove();
                preview = null;
              }
              const target = document.elementFromPoint(ev.clientX, ev.clientY);
              const targetNode = target?.closest("[data-flow-node]");
              const tgtId = targetNode?.id || targetNode?.getAttribute("data-bind-id")?.replace(/^['"]|['"]$/g, "").replace(/^node-/, "") || "";
              if (tgtId && tgtId !== srcId) {
                const edges = edgesArray();
                if (edges && !edges.some((ed) => String(ed.source) === String(srcId) && String(ed.target) === String(tgtId))) {
                  edges.push({ source: srcId, target: tgtId });
                  const vpState = vp?.__flowViewport;
                  if (vpState)
                    vpState.tick = (vpState.tick || 0) + 1;
                }
              }
            }
          });
          return () => {
            stopHandleDrag();
          };
        }
      };
      flowEdgesAttribute = {
        name: "flowEdges",
        attribute: "flow-edges",
        handle: (element, value, runtime) => {
          ensureFlowStyles(element.getRootNode());
          const expr = value.trim() || "edges";
          element.setAttribute("data-flow-edges-expr", expr);
          const flowEl = element.closest("[data-flow]");
          const content = flowEl?.querySelector("[data-flow-viewport], .flow-viewport");
          if (content && element.parentElement !== content) {
            content.insertBefore(element, content.firstChild);
          }
          if (!element.querySelector("#flow-defs")) {
            const defs = document.createElementNS(SVG_NS, "defs");
            defs.id = "flow-defs";
            defs.innerHTML = `
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polyline points="0,0 10,5 0,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </marker>
        <marker id="flow-arrow-closed" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" stroke="none" />
        </marker>
      `;
            element.insertBefore(defs, element.firstChild);
          }
          const hasCustomTemplate = element.querySelector("template, path[data-for], path[data-effect]");
          if (hasCustomTemplate)
            return;
          const stop2 = runtime.effect(() => {
            const currentFlow = element.closest("[data-flow]");
            const vp = currentFlow?.__flowViewport;
            const _t = vp?.tick;
            let edgeList = [];
            try {
              const evaluated = runtime.evaluate(element, expr);
              if (Array.isArray(evaluated))
                edgeList = evaluated;
            } catch {
            }
            const existingPaths = /* @__PURE__ */ new Map();
            const existingLabels = /* @__PURE__ */ new Map();
            element.querySelectorAll("path[data-edge-key]").forEach((p) => {
              existingPaths.set(p.getAttribute("data-edge-key"), p);
            });
            element.querySelectorAll("g[data-edge-label-key]").forEach((g) => {
              existingLabels.set(g.getAttribute("data-edge-label-key"), g);
            });
            const activeKeys = /* @__PURE__ */ new Set();
            edgeList.forEach((edge) => {
              const srcId = String(edge.source ?? "");
              const tgtId = String(edge.target ?? "");
              if (!srcId || !tgtId)
                return;
              const key = edge.id || `${srcId}->${tgtId}`;
              activeKeys.add(key);
              let pathEl = existingPaths.get(key);
              if (!pathEl) {
                pathEl = document.createElementNS(SVG_NS, "path");
                pathEl.setAttribute("class", "flow-edge");
                pathEl.setAttribute("data-edge-key", key);
                pathEl.setAttribute("fill", "none");
                pathEl.setAttribute("stroke", "currentColor");
                pathEl.setAttribute("stroke-width", "2");
                element.appendChild(pathEl);
              }
              const edgeRes = runtime.$flow?.edge?.(srcId, tgtId, {
                type: edge.type || "bezier",
                curvature: edge.curvature,
                borderRadius: edge.borderRadius,
                offset: edge.offset,
                container: currentFlow || void 0
              });
              const d = edgeRes?.d || (typeof edgeRes === "string" ? edgeRes : "");
              if (d)
                pathEl.setAttribute("d", d);
              if (edge.markerEnd) {
                const markerId = edge.markerEnd === "arrowclosed" ? "url(#flow-arrow-closed)" : "url(#flow-arrow)";
                pathEl.setAttribute("marker-end", markerId);
              } else {
                pathEl.removeAttribute("marker-end");
              }
              if (edge.label && edgeRes?.labelX !== void 0) {
                let labelG = existingLabels.get(key);
                if (!labelG) {
                  labelG = document.createElementNS(SVG_NS, "g");
                  labelG.setAttribute("class", "flow-edge-label-group");
                  labelG.setAttribute("data-edge-label-key", key);
                  labelG.innerHTML = `
              <rect class="flow-edge-label-bg" x="-32" y="-10" width="64" height="20" />
              <text class="flow-edge-label-text">${edge.label}</text>
            `;
                  element.appendChild(labelG);
                } else {
                  const textEl = labelG.querySelector("text");
                  if (textEl && textEl.textContent !== edge.label)
                    textEl.textContent = edge.label;
                }
                labelG.setAttribute("transform", `translate(${edgeRes.labelX}, ${edgeRes.labelY})`);
              }
            });
            existingPaths.forEach((p, k) => {
              if (!activeKeys.has(k))
                p.remove();
            });
            existingLabels.forEach((g, k) => {
              if (!activeKeys.has(k))
                g.remove();
            });
          });
          return () => {
            stop2();
            element.removeAttribute("data-flow-edges-expr");
          };
        }
      };
      flowResizerAttribute = {
        name: "flowResizer",
        attribute: "flow-resizer",
        handle: (element, _value, runtime) => {
          ensureFlowStyles(element.getRootNode());
          const nodeEl = element.closest("[data-flow-node]");
          if (!nodeEl)
            return;
          element.classList.add("flow-resizer");
          const directions = ["nw", "ne", "se", "sw", "n", "s", "e", "w"];
          const handleClassMap = {
            nw: "top-left",
            ne: "top-right",
            se: "bottom-right",
            sw: "bottom-left",
            n: "top",
            s: "bottom",
            e: "right",
            w: "left"
          };
          directions.forEach((dir2) => {
            if (!element.querySelector(`.flow-resize-handle.${handleClassMap[dir2]}`)) {
              const h = document.createElement("div");
              h.className = `flow-resize-handle ${handleClassMap[dir2]}`;
              h.setAttribute("data-flow-nodrag", "");
              h.setAttribute("data-direction", dir2);
              element.appendChild(h);
            }
          });
          let dir = "se";
          let zoom = 1;
          let nodeState = null;
          let initialPos = { x: 0, y: 0 };
          let initialWidth = 176;
          let initialHeight = 90;
          let vp = void 0;
          const stopResizerDrag = trackPointerDrag(element, {
            onStart: (e) => {
              const handle = e.target.closest(".flow-resize-handle");
              if (!handle || e.button !== 0)
                return false;
              e.stopPropagation();
              e.preventDefault();
              dir = handle.getAttribute("data-direction") || "se";
              const flowEl = element.closest("[data-flow]");
              vp = flowEl?.__flowViewport;
              zoom = vp?.zoom || 1;
              const nodeExpr = nodeEl.getAttribute("data-flow-node") || "";
              try {
                nodeState = runtime.evaluate(nodeEl, nodeExpr);
              } catch {
                nodeState = null;
              }
              if (!nodeState)
                return false;
              initialPos = nodeState.position ? { ...nodeState.position } : { x: nodeState.x || 0, y: nodeState.y || 0 };
              initialWidth = nodeState.width || nodeEl.offsetWidth || 176;
              initialHeight = nodeState.height || nodeEl.offsetHeight || 90;
            },
            onMove: (_ev, delta) => {
              if (!nodeState)
                return;
              const dx = delta.dx / zoom;
              const dy = delta.dy / zoom;
              let newW = initialWidth;
              let newH = initialHeight;
              let newX = initialPos.x;
              let newY = initialPos.y;
              if (dir.includes("e"))
                newW = Math.max(80, initialWidth + dx);
              if (dir.includes("w")) {
                const clamped = Math.max(80, initialWidth - dx);
                newX = initialPos.x + (initialWidth - clamped);
                newW = clamped;
              }
              if (dir.includes("s"))
                newH = Math.max(40, initialHeight + dy);
              if (dir.includes("n")) {
                const clamped = Math.max(40, initialHeight - dy);
                newY = initialPos.y + (initialHeight - clamped);
                newH = clamped;
              }
              nodeState.width = newW;
              nodeState.height = newH;
              if (nodeState.position) {
                nodeState.position.x = newX;
                nodeState.position.y = newY;
              } else {
                nodeState.x = newX;
                nodeState.y = newY;
              }
              if (vp)
                vp.tick = (vp.tick || 0) + 1;
            }
          });
          return () => {
            stopResizerDrag();
          };
        }
      };
      flowMinimapAttribute = {
        name: "flowMinimap",
        attribute: "flow-minimap",
        handle: (element, _value, runtime) => {
          ensureFlowStyles(element.getRootNode());
          let svg;
          if (element instanceof SVGSVGElement) {
            svg = element;
          } else {
            element.classList.add("flow-minimap");
            let existing = element.querySelector("svg.flow-minimap-svg");
            if (!existing) {
              existing = document.createElementNS(SVG_NS, "svg");
              existing.setAttribute("class", "flow-minimap-svg");
              element.appendChild(existing);
            }
            svg = existing;
          }
          const flowEl = element.closest("[data-flow]");
          let minimapBounds = null;
          let currentViewScale = 1;
          let minX = 0;
          let minY = 0;
          const updatePanFromMinimap = (clientX, clientY) => {
            if (!minimapBounds || !flowEl)
              return;
            const vp = flowEl.__flowViewport;
            if (!vp)
              return;
            const px = clientX - minimapBounds.left;
            const py = clientY - minimapBounds.top;
            const flowX = minX + px * currentViewScale;
            const flowY = minY + py * currentViewScale;
            const containerRect = flowEl.getBoundingClientRect();
            vp.x = containerRect.width / 2 - flowX * (vp.zoom || 1);
            vp.y = containerRect.height / 2 - flowY * (vp.zoom || 1);
            vp.tick = (vp.tick || 0) + 1;
          };
          const stopMinimapDrag = trackPointerDrag(svg, {
            onStart: (e) => {
              if (e.button !== 0)
                return false;
              e.stopPropagation();
              e.preventDefault();
              minimapBounds = svg.getBoundingClientRect();
              updatePanFromMinimap(e.clientX, e.clientY);
            },
            onMove: (e) => {
              updatePanFromMinimap(e.clientX, e.clientY);
            }
          });
          const stop2 = runtime.effect(() => {
            if (!flowEl)
              return;
            const vp = flowEl.__flowViewport;
            const _t = vp?.tick;
            let nodesList = [];
            try {
              nodesList = runtime.evaluate(flowEl, "nodes") || [];
            } catch {
              nodesList = [];
            }
            const containerRect = flowEl.getBoundingClientRect();
            const z = vp?.zoom || 1;
            const viewBB = {
              x: -(vp?.x || 0) / z,
              y: -(vp?.y || 0) / z,
              width: (containerRect.width || 800) / z,
              height: (containerRect.height || 600) / z
            };
            let bMinX = viewBB.x;
            let bMinY = viewBB.y;
            let bMaxX = viewBB.x + viewBB.width;
            let bMaxY = viewBB.y + viewBB.height;
            nodesList.forEach((n) => {
              const p = n.position || n;
              const nx = p.x || 0;
              const ny = p.y || 0;
              const nw = n.w || n.width || 176;
              const nh = n.h || n.height || 90;
              bMinX = Math.min(bMinX, nx);
              bMinY = Math.min(bMinY, ny);
              bMaxX = Math.max(bMaxX, nx + nw);
              bMaxY = Math.max(bMaxY, ny + nh);
            });
            const pad = 40;
            minX = bMinX - pad;
            minY = bMinY - pad;
            const totalW = bMaxX - bMinX + pad * 2;
            const totalH = bMaxY - bMinY + pad * 2;
            svg.setAttribute("viewBox", `${minX} ${minY} ${totalW} ${totalH}`);
            currentViewScale = totalW / (svg.clientWidth || 200);
            let html = "";
            nodesList.forEach((n) => {
              const p = n.position || n;
              const nx = p.x || 0;
              const ny = p.y || 0;
              const nw = n.w || n.width || 176;
              const nh = n.h || n.height || 90;
              html += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" class="flow-minimap-node" />`;
            });
            html += `<rect x="${viewBB.x}" y="${viewBB.y}" width="${viewBB.width}" height="${viewBB.height}" class="flow-minimap-lens" />`;
            svg.innerHTML = html;
          });
          return () => {
            stop2();
            stopMinimapDrag();
          };
        }
      };
      flowSideAttribute = {
        name: "flowSide",
        attribute: "flow-side",
        handle: (element, value, runtime) => {
          let side = value.trim();
          if (side) {
            try {
              const resolved = runtime.evaluate(element, side);
              if (typeof resolved === "string")
                side = resolved;
            } catch {
            }
          }
          if (side) {
            element.setAttribute("data-flow-handle-side", side);
          }
        }
      };
      flowNoDragAttribute = {
        name: "flowNoDrag",
        attribute: "flow-nodrag",
        handle: () => {
        }
      };
      flowGridAttribute = {
        name: "flowGrid",
        attribute: "flow-grid",
        handle: () => {
        }
      };
      flowSnapAttribute = {
        name: "flowSnap",
        attribute: "flow-snap",
        handle: () => {
        }
      };
      flow_default = flowAttribute;
    }
  });

  // src/modules/attributes/for.ts
  var for_exports = {};
  __export(for_exports, {
    default: () => for_default
  });
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
  var isFlowNode, forModule, for_default;
  var init_for = __esm({
    "src/modules/attributes/for.ts"() {
      init_debug();
      init_scope();
      init_consts();
      init_reconciler();
      isFlowNode = (n) => n instanceof HTMLElement || n instanceof SVGElement;
      forModule = {
        name: "for",
        attribute: "for",
        handle: (el, value, runtime) => {
          const templateRef = el.getAttribute("data-template");
          const targetTemplate = templateRef ? document.querySelector(templateRef) : null;
          const isTemplate = el instanceof HTMLTemplateElement || !!targetTemplate;
          const blueprint = targetTemplate ? targetTemplate.content : isTemplate ? el.content : el;
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
            el[IS_TEMPLATE_KEY] = true;
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
                delete enhanced[LOCAL_SCOPES_KEY];
                delete enhanced[DATA_STACK_KEY];
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
              const newlyCreatedNodes = [];
              items.forEach((item, index) => {
                let key = item?.id ?? (typeof item === "object" && item !== null ? index : item);
                if (currentKeys.has(key)) {
                  key = `${String(key)}__${index}`;
                }
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
                        delete n[IS_TEMPLATE_KEY];
                      }
                      const cleanClonedMarkers = (target) => {
                        delete target[MARKER_KEY];
                        delete target[CLEANUP_FUNCTIONS_KEY];
                        if (target.childNodes) {
                          target.childNodes.forEach(cleanClonedMarkers);
                        }
                      };
                      cleanClonedMarkers(n);
                      newlyCreatedNodes.push(n);
                    }
                  });
                  mountedMap.set(key, nodes);
                } else {
                  nodes.forEach((n) => {
                    if (isFlowNode(n)) {
                      const enhanced = n;
                      const stack = enhanced[LOCAL_SCOPES_KEY] || enhanced[DATA_STACK_KEY] || enhanced[Symbol.for("__nexus_local_scopes__")] || enhanced[Symbol.for("__data_stack__")];
                      if (stack && stack.length > 0) {
                        const scope = stack[0];
                        if (scope[itemKey] !== item) {
                          scope[itemKey] = item;
                        }
                        if (indexKey && scope[indexKey] !== index) {
                          scope[indexKey] = index;
                        }
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
              newlyCreatedNodes.forEach((n) => {
                runtime.processElement(n, true);
              });
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
      for_default = forModule;
    }
  });

  // src/modules/attributes/html.ts
  var html_exports = {};
  __export(html_exports, {
    default: () => html_default
  });
  var htmlModule, html_default;
  var init_html = __esm({
    "src/modules/attributes/html.ts"() {
      init_debug();
      htmlModule = {
        name: "html",
        attribute: "html",
        handle: (el, value, runtime) => {
          try {
            let lastContent = Symbol();
            const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
              const content = runtime.evaluate(el, value);
              if (content !== lastContent) {
                lastContent = content;
                const html = content === void 0 || content === null ? "" : String(content);
                el.innerHTML = html;
                Array.from(el.children).forEach((child) => {
                  if (child instanceof HTMLElement || child instanceof SVGElement) {
                    runtime.processElement(child, true);
                  }
                });
              }
            });
            return cleanup;
          } catch (e) {
            initError("html", `Failed to bind html: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
        }
      };
      html_default = htmlModule;
    }
  });

  // src/modules/attributes/if.ts
  var if_exports = {};
  __export(if_exports, {
    default: () => if_default
  });
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
  var ifModule, if_default;
  var init_if = __esm({
    "src/modules/attributes/if.ts"() {
      init_debug();
      init_consts();
      ifModule = {
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
            el[IS_TEMPLATE_KEY] = true;
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
              delete clone[IS_TEMPLATE_KEY];
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
      if_default = ifModule;
    }
  });

  // src/modules/attributes/import.ts
  var import_exports = {};
  __export(import_exports, {
    default: () => import_default
  });
  async function readFromIDB(key) {
    const storeName = key.split("/")[0] || "files";
    const result = await getIndexedDBProxy()[storeName].get(key);
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
  function isVFSUri(str) {
    return /^(idb|fs|https?|wss?):\/\//.test(str);
  }
  async function resolveContent(uri) {
    if (isVFSUri(uri) && uri.startsWith("idb://")) {
      const key = uri.replace(/^idb:\/\//, "");
      return readFromIDB(key);
    }
    try {
      const result = await cacheEngine.fetchWithCache(uri, {
        storage: "local",
        responseType: "text",
        onUpdate: (fresh) => {
          if (typeof fresh === "string") {
            assetCache.set(uri, fresh);
          }
        }
      });
      const text = typeof result === "string" ? result : String(result);
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
  async function importLink(id, payload, cleanupFns4, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks2 = items.map(async (item) => {
      let attrs;
      if (typeof item === "string") {
        const parsed = parseInlineAttrs(item);
        attrs = parsed.href ? parsed : { href: item, rel: "stylesheet" };
      } else {
        attrs = { rel: "stylesheet", ...item };
      }
      const href = attrs.href;
      if (!href)
        return;
      if (href.startsWith("idb://")) {
        const cssText = await resolveContent(href);
        if (cssText) {
          const cleanup = await stylesheet2.adoptRawCSS(cssText, `import-${id}-${href}`);
          cleanupFns4.push(cleanup);
          runtime.log(`Nexus Import [${id}]: CSS adopted (idb): ${href}`);
          return;
        }
      }
      await new Promise((resolve) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
          resolve();
          return;
        }
        const timer = setTimeout(() => {
          resolve();
        }, 2500);
        const link = document.createElement("link");
        applyAttributes(link, attrs);
        link.href = href;
        link.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        link.onerror = () => {
          clearTimeout(timer);
          reportError(new Error(`Nexus Import: Failed to load ${href}`), el);
          resolve();
        };
        (document.head || document.documentElement).appendChild(link);
        runtime.log(`Nexus Import [${id}]: Link tag injected: ${href}`);
      });
    });
    await Promise.all(tasks2);
  }
  async function importAdopt(id, payload, cleanupFns4, runtime, _el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks2 = items.map(async (item) => {
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
      const cleanup = await stylesheet2.adoptRawCSS(cssText, `import-adopt-${id}-${href}`);
      cleanupFns4.push(cleanup);
      runtime.log(`Nexus Import [${id}]: CSS adopted (constructable): ${href}`);
    });
    await Promise.all(tasks2);
  }
  async function importScript(id, payload, cleanupFns4, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks2 = items.map(async (item) => {
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
          cleanupFns4.push(() => URL.revokeObjectURL(url));
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
          cleanupFns4.push(() => bridgeStyle.remove());
          runtime.log(`Nexus Import [${id}]: Tailwind theme bridge injected (${tokens.size} color tokens discovered)`);
        }
      }
      await new Promise((resolve) => {
        const existing = document.querySelector(`script[src="${finalSrc}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        applyAttributes(script, attrs);
        script.onload = () => resolve();
        script.onerror = () => {
          reportError(new Error(`Nexus Import: Failed to load script ${src}`), el);
          resolve();
        };
        script.src = finalSrc;
        (document.head || document.documentElement).appendChild(script);
        runtime.log(`Nexus Import [${id}]: Script injected: ${src}`);
      });
    });
    await Promise.all(tasks2);
  }
  async function importESModule(id, payload, cleanupFns4, runtime, el) {
    const globalWin = globalThis;
    const targetObj = {};
    try {
      if (Array.isArray(payload)) {
        const modules = await Promise.all(
          payload.map(async (url) => {
            try {
              return await import(
                /* @vite-ignore */
                url
              );
            } catch (err) {
              reportError(new Error(`Nexus Import [${id}]: Failed to import module ${url}: ${err}`), el);
              return {};
            }
          })
        );
        modules.forEach((mod) => {
          Object.assign(targetObj, mod);
        });
      } else if (typeof payload === "object" && payload !== null) {
        const entries = Object.entries(payload);
        await Promise.all(
          entries.map(async ([key, url]) => {
            try {
              const mod = await import(
                /* @vite-ignore */
                url
              );
              targetObj[key] = mod[key] !== void 0 ? mod[key] : mod.default || mod;
            } catch (err) {
              reportError(new Error(`Nexus Import [${id}]: Failed to import module ${url}: ${err}`), el);
            }
          })
        );
      } else if (typeof payload === "string") {
        try {
          const mod = await import(
            /* @vite-ignore */
            payload
          );
          Object.assign(targetObj, mod);
        } catch (err) {
          reportError(new Error(`Nexus Import [${id}]: Failed to import module ${payload}: ${err}`), el);
        }
      }
      globalWin[id] = Object.assign(globalWin[id] || {}, targetObj);
      cleanupFns4.push(() => {
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(`nexus:${id.toLowerCase()}-ready`, { detail: globalWin[id] }));
        if (id.toLowerCase() === "cm" || id.toLowerCase() === "codemirror") {
          window.dispatchEvent(new CustomEvent("nexus:cm-ready", { detail: globalWin[id] }));
        }
      }
      runtime.log(`Nexus Import [${id}]: ES module(s) imported into window.${id}`);
    } catch (err) {
      reportError(new Error(`Nexus Import [${id}]: Module import error: ${err}`), el);
    }
  }
  async function importStyle(id, payload, cleanupFns4, runtime, el) {
    const items = Array.isArray(payload) ? payload : [payload];
    const tasks2 = items.map(async (item) => {
      const attrs = typeof item === "string" ? { content: item } : item;
      const content = attrs.content || (typeof item === "string" ? item : "");
      if (!content && !attrs.href)
        return;
      if (attrs.href) {
        await importLink(id, attrs, cleanupFns4, runtime, el);
        return;
      }
      const cssText = isVFSUri(content) ? await resolveContent(content) : content;
      if (!cssText)
        return;
      const cleanup = await stylesheet2.adoptCSS(cssText, `import-style-${id}`);
      cleanupFns4.push(cleanup);
      runtime.log(`Nexus Import [${id}]: Style adopted (ZCZS)`);
    });
    await Promise.all(tasks2);
  }
  async function importPattern(id, uri, el, item, cleanupFns4, runtime) {
    const content = await resolveContent(uri);
    if (!content)
      throw new Error(`Pattern not found: ${uri}`);
    const target = item.target ? el.querySelector(item.target) || el : el;
    const position = item.position || "append";
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-import-pattern", id);
    wrapper.innerHTML = content;
    switch (position) {
      case "replace":
        target.innerHTML = "";
        target.appendChild(wrapper);
        break;
      case "prepend":
        target.insertBefore(wrapper, target.firstChild);
        break;
      case "append":
        target.appendChild(wrapper);
        break;
      case "before":
        target.parentElement?.insertBefore(wrapper, target);
        break;
      case "after":
        target.parentElement?.insertBefore(wrapper, target.nextSibling);
        break;
    }
    cleanupFns4.push(() => wrapper.remove());
    runtime.log(`Nexus Import [${id}]: Pattern loaded from ${uri}`);
  }
  async function importComponent(id, uri, cleanupFns4, runtime) {
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
        cleanupFns4.push(() => templateEl.remove());
        runtime.log(`Nexus Import [${id}]: Component "${name}" registered from ${uri}`);
      });
    } else {
      const templateEl = document.createElement("template");
      templateEl.id = `component-${id}`;
      templateEl.innerHTML = content;
      document.body.appendChild(templateEl);
      cleanupFns4.push(() => templateEl.remove());
      runtime.log(`Nexus Import [${id}]: Component registered from ${uri}`);
    }
  }
  var assetCache, importModule, import_default;
  var init_import = __esm({
    "src/modules/attributes/import.ts"() {
      init_debug();
      init_scope();
      init_stylesheet();
      init_cache();
      assetCache = /* @__PURE__ */ new Map();
      importModule = {
        name: "import",
        attribute: "import",
        handle: (el, expression, runtime) => {
          let activeCleanup = null;
          let lastConfigStr = "";
          const stopEffect = runtime.effect(() => {
            const attrExpr = el.getAttribute("data-import") || expression;
            const config = runtime.evaluate(el, attrExpr);
            const configStr = JSON.stringify(config);
            if (configStr === lastConfigStr) {
              el.classList.remove("nexus-loading");
              el.classList.add("nexus-ready");
              el.removeAttribute("data-nexus-loading");
              el.setAttribute("data-nexus-ready", "");
              return;
            }
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
              const tasks2 = ids.map(async (id) => {
                const item = config[id];
                try {
                  const itemTasks = [];
                  if (item.link) {
                    itemTasks.push(importLink(id, item.link, iterationCleanupFns, runtime, el));
                  }
                  if (item.adopt) {
                    itemTasks.push(importAdopt(id, item.adopt, iterationCleanupFns, runtime, el));
                  }
                  if (item.module) {
                    itemTasks.push(importESModule(id, item.module, iterationCleanupFns, runtime, el));
                  }
                  if (item.script) {
                    importScript(id, item.script, iterationCleanupFns, runtime, el).catch(() => {
                    });
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
              await Promise.all(tasks2);
            };
            runImports().then(finalize).catch(() => finalize());
          });
          return () => {
            stopEffect();
            if (activeCleanup)
              activeCleanup();
          };
        }
      };
      import_default = importModule;
    }
  });

  // src/modules/attributes/markdown.ts
  var markdown_exports = {};
  __export(markdown_exports, {
    default: () => markdown_default,
    ensureMarkdownStyles: () => ensureMarkdownStyles,
    parseMarkdown: () => parseMarkdown
  });
  function ensureMarkdownStyles(root) {
    ensureAdoptedStylesheet(MARKDOWN_BASE_CSS, markdownSheetRef, root);
  }
  function slugify(text) {
    return text.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  }
  function parseMarkdown(md) {
    let html = (md || "").replace(/\r\n/g, "\n");
    const codeBlocks = [];
    const inlineCodes = [];
    html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, (_match, rawLang, code) => {
      const id = `%%NEXUS_CODE_BLOCK_${codeBlocks.length}%%`;
      const lang = (rawLang || "text").trim();
      const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      codeBlocks.push(
        `<div class="nexus-code-block"><div class="nexus-code-header"><span class="nexus-code-lang">${lang}</span><button type="button" class="nexus-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.nexus-code-block').querySelector('code').textContent).then(()=>{ const self=this; const prev=self.innerText; self.innerText='Copied!'; setTimeout(()=>self.innerText=prev, 1500); })"><svg width="14" height="14" style="display:inline-block; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> <span>Copy</span></button></div><pre data-ignore class="nexus-code-pre"><code data-ignore class="language-${lang}">${escaped}</code></pre></div>`
      );
      return id;
    });
    html = html.replace(/`([^`]+)`/g, (_m, code) => {
      const id = `%%NEXUS_INLINE_CODE_${inlineCodes.length}%%`;
      const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      inlineCodes.push(
        `<code data-ignore class="nexus-inline-code">${escaped}</code>`
      );
      return id;
    });
    html = html.replace(/(?:^>[^\n]*(?:\n>[^\n]*)*)/gm, (block) => {
      const lines = block.split("\n").map((l) => l.replace(/^>\s?/, ""));
      const firstLine = lines[0].trim();
      const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        const content = lines.slice(1).join("\n").trim();
        const alertConfigs = {
          NOTE: {
            cls: "nexus-alert-note",
            icon: "material-symbols-light:info-outline",
            title: "Note"
          },
          TIP: {
            cls: "nexus-alert-tip",
            icon: "material-symbols-light:lightbulb-outline",
            title: "Tip"
          },
          IMPORTANT: {
            cls: "nexus-alert-important",
            icon: "material-symbols-light:priority-high",
            title: "Important"
          },
          WARNING: {
            cls: "nexus-alert-warning",
            icon: "material-symbols-light:warning-outline",
            title: "Warning"
          },
          CAUTION: {
            cls: "nexus-alert-caution",
            icon: "material-symbols-light:dangerous-outline",
            title: "Caution"
          }
        };
        const cfg = alertConfigs[type] || alertConfigs.NOTE;
        return `<div class="nexus-alert ${cfg.cls}"><iconify-icon icon="${cfg.icon}" class="nexus-alert-icon"></iconify-icon><div class="nexus-alert-body"><div class="nexus-alert-title">${cfg.title}</div><div class="nexus-alert-content">${content}</div></div></div>`;
      }
      const standardBody = lines.join("\n").trim();
      return `<blockquote class="nexus-blockquote">${standardBody}</blockquote>`;
    });
    html = html.replace(/(?:^|\n)(\|[^\n]+\|\r?\n\|[ \t\-:|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (_fullMatch, tableBlock) => {
      const rows = tableBlock.trim().split("\n").map((r) => r.trim());
      if (rows.length < 2)
        return tableBlock;
      const parseCells = (row) => {
        return row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      };
      const headers = parseCells(rows[0]);
      const alignments = parseCells(rows[1]).map((d) => {
        const left = d.startsWith(":");
        const right = d.endsWith(":");
        if (left && right)
          return "center";
        if (right)
          return "right";
        return "left";
      });
      const thead = `<thead><tr>` + headers.map((h, i) => `<th class="nexus-align-${alignments[i] || "left"}">${h}</th>`).join("") + `</tr></thead>`;
      const bodyRows = rows.slice(2).map((row) => {
        const cells = parseCells(row);
        return `<tr>` + cells.map((c, i) => `<td class="nexus-align-${alignments[i] || "left"}">${c || ""}</td>`).join("") + `</tr>`;
      }).join("");
      const tbody = `<tbody>${bodyRows}</tbody>`;
      return `

<div class="nexus-table-wrapper"><table class="nexus-table">${thead}${tbody}</table></div>

`;
    });
    html = html.replace(/^(#{1,6})\s+(.*$)/gm, (_m, hashes, title) => {
      const level = hashes.length;
      const cleanTitle = title.trim();
      const slug = slugify(cleanTitle);
      return `

<h${level} id="${slug}" class="nexus-heading nexus-h${level}"><span>${cleanTitle}</span><a href="#${slug}" class="nexus-anchor-link" aria-label="Permalink to ${cleanTitle}">#</a></h${level}>

`;
    });
    html = html.replace(/^(?:---|[*]{3}|_{3})\s*$/gm, '\n\n<hr class="nexus-divider" />\n\n');
    html = html.replace(/^\s*-\s+\[([ xX])\]\s+(.*$)/gm, (_m, check, text) => {
      const isChecked = check.toLowerCase() === "x";
      const checkedAttr = isChecked ? "checked" : "";
      const textCls = isChecked ? "nexus-task-done" : "";
      return `<li class="nexus-task-item"><input type="checkbox" ${checkedAttr} disabled class="nexus-checkbox" /><span class="${textCls}">${text}</span></li>`;
    });
    html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="nexus-list-item">$1</li>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="nexus-list-item-ordered">$2</li>');
    html = html.replace(/(<li class="nexus-list-item">[\s\S]*?<\/li>\s*)+/g, (match) => `

<ul class="nexus-list-ul">
${match}</ul>

`);
    html = html.replace(/(<li class="nexus-list-item-ordered">[\s\S]*?<\/li>\s*)+/g, (match) => `

<ol class="nexus-list-ol">
${match}</ol>

`);
    html = html.replace(/(<li class="nexus-task-item">[\s\S]*?<\/li>\s*)+/g, (match) => `

<ul class="nexus-task-list">
${match}</ul>

`);
    html = html.replace(/~~(.*?)~~/g, '<del class="nexus-del">$1</del>');
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/(^|\s)_(.*?)_(\s|$)/g, "$1<em>$2</em>$3");
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="nexus-img" loading="lazy" />');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
      const isExt = url.startsWith("http://") || url.startsWith("https://");
      const target = isExt ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${url}" class="nexus-link"${target}>${text}</a>`;
    });
    html = html.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" class="nexus-link" target="_blank" rel="noopener noreferrer">$2</a>');
    html = html.split("\n\n").map((block) => {
      const trimmed = block.trim();
      if (!trimmed)
        return "";
      if (/^<(\/?(?:div|h[1-6]|ul|ol|li|table|blockquote|pre|p|hr)|%%NEXUS_CODE_BLOCK_)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p class="nexus-p">${trimmed.replace(/\n/g, "<br />")}</p>`;
    }).filter(Boolean).join("\n\n");
    html = html.replace(/%%NEXUS_INLINE_CODE_(\d+)%%/g, (_match, idx) => inlineCodes[parseInt(idx, 10)]);
    html = html.replace(/%%NEXUS_CODE_BLOCK_(\d+)%%/g, (_match, idx) => codeBlocks[parseInt(idx, 10)]);
    return html;
  }
  var MARKDOWN_BASE_CSS, markdownSheetRef, markdownModule, markdown_default;
  var init_markdown = __esm({
    "src/modules/attributes/markdown.ts"() {
      init_styles();
      MARKDOWN_BASE_CSS = `
[data-markdown] {
  line-height: 1.65;
  color: inherit;
  word-break: break-word;
}

[data-markdown] h1, [data-markdown] .nexus-h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 1rem;
  letter-spacing: -0.025em;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  padding-bottom: 0.5rem;
}
[data-markdown] h2, [data-markdown] .nexus-h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  padding-bottom: 0.375rem;
}
[data-markdown] h3, [data-markdown] .nexus-h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.625rem;
}
[data-markdown] h4, [data-markdown] .nexus-h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
[data-markdown] h5, [data-markdown] .nexus-h5 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.375rem;
}
[data-markdown] h6, [data-markdown] .nexus-h6 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
[data-markdown] .nexus-heading {
  display: flex;
  align-items: center;
}
[data-markdown] .nexus-anchor-link {
  opacity: 0;
  margin-left: 0.5rem;
  text-decoration: none;
  color: var(--color-primary, #3b82f6);
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  transition: opacity 0.15s ease;
}
[data-markdown] .nexus-heading:hover .nexus-anchor-link {
  opacity: 0.45;
}
[data-markdown] .nexus-heading .nexus-anchor-link:hover {
  opacity: 1 !important;
}

[data-markdown] p, [data-markdown] .nexus-p {
  margin-bottom: 0.75rem;
  line-height: 1.65;
  font-size: 0.875rem;
}

[data-markdown] a.nexus-link, [data-markdown] a:not([class]) {
  color: var(--color-primary, #3b82f6);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
  transition: color 0.15s ease;
}

[data-markdown] code.nexus-inline-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  padding: 0.15em 0.35em;
  border-radius: 0.25rem;
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  color: var(--color-primary, #3b82f6);
}

[data-markdown] .nexus-code-block {
  position: relative;
  margin: 1rem 0;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  background-color: color-mix(in srgb, currentColor 5%, transparent);
}
[data-markdown] .nexus-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
  opacity: 0.8;
}
[data-markdown] .nexus-code-lang {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
[data-markdown] .nexus-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  border-radius: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
[data-markdown] .nexus-copy-btn:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
[data-markdown] .nexus-code-pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

[data-markdown] .nexus-blockquote {
  border-left: 4px solid var(--color-primary, #3b82f6);
  background-color: color-mix(in srgb, var(--color-primary, #3b82f6) 6%, transparent);
  padding: 0.625rem 1rem;
  margin: 1rem 0;
  font-style: italic;
  border-radius: 0 0.5rem 0.5rem 0;
  opacity: 0.95;
}

[data-markdown] .nexus-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
[data-markdown] .nexus-alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}
[data-markdown] .nexus-alert-body {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
}
[data-markdown] .nexus-alert-title {
  font-weight: 700;
  margin-bottom: 0.125rem;
}
[data-markdown] .nexus-alert-content {
  line-height: 1.6;
  opacity: 0.9;
}
[data-markdown] .nexus-alert-note {
  background-color: color-mix(in srgb, var(--color-info, #0284c7) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-info, #0284c7) 30%, transparent);
  color: var(--color-info-content, inherit);
}
[data-markdown] .nexus-alert-tip {
  background-color: color-mix(in srgb, var(--color-success, #16a34a) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-success, #16a34a) 30%, transparent);
  color: var(--color-success-content, inherit);
}
[data-markdown] .nexus-alert-important {
  background-color: color-mix(in srgb, var(--color-secondary, #9333ea) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-secondary, #9333ea) 30%, transparent);
  color: var(--color-secondary-content, inherit);
}
[data-markdown] .nexus-alert-warning {
  background-color: color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-warning, #d97706) 30%, transparent);
  color: var(--color-warning-content, inherit);
}
[data-markdown] .nexus-alert-caution {
  background-color: color-mix(in srgb, var(--color-error, #dc2626) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-error, #dc2626) 30%, transparent);
  color: var(--color-error-content, inherit);
}

[data-markdown] .nexus-table-wrapper {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
[data-markdown] .nexus-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}
[data-markdown] .nexus-table thead tr {
  background-color: color-mix(in srgb, currentColor 6%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
[data-markdown] .nexus-table th {
  padding: 0.625rem 1rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
[data-markdown] .nexus-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 6%, transparent);
}
[data-markdown] .nexus-table tbody tr:hover {
  background-color: color-mix(in srgb, currentColor 4%, transparent);
}
[data-markdown] .nexus-align-left { text-align: left; }
[data-markdown] .nexus-align-center { text-align: center; }
[data-markdown] .nexus-align-right { text-align: right; }

[data-markdown] ul.nexus-list-ul, [data-markdown] ol.nexus-list-ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}
[data-markdown] li.nexus-list-item, [data-markdown] li.nexus-list-item-ordered {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
[data-markdown] ul.nexus-task-list {
  list-style: none;
  padding-left: 0;
  margin: 0.75rem 0;
}
[data-markdown] .nexus-task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}
[data-markdown] .nexus-checkbox {
  margin-top: 0.2rem;
  accent-color: var(--color-primary, #3b82f6);
}
[data-markdown] .nexus-task-done {
  text-decoration: line-through;
  opacity: 0.6;
}

[data-markdown] hr.nexus-divider, [data-markdown] .nexus-divider {
  border: none;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  margin: 1.5rem 0;
}

[data-markdown] .nexus-img {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 1rem 0;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
`;
      markdownSheetRef = { sheet: null };
      if (typeof document !== "undefined") {
        ensureMarkdownStyles();
      }
      markdownModule = {
        name: "markdown",
        attribute: "markdown",
        onRegister(_context) {
          if (typeof document !== "undefined") {
            ensureMarkdownStyles(document);
          }
        },
        handle: (el, value, runtime) => {
          ensureMarkdownStyles(el.getRootNode());
          if (!value && el.__nexusMarkdownDone) {
            return () => {
              delete el.__nexusMarkdownDone;
              delete el.__nexusRawSource;
            };
          }
          if (!value) {
            el.__nexusMarkdownDone = true;
          }
          if (!el.__nexusRawSource) {
            el.__nexusRawSource = value ? null : el.textContent || el.innerText;
          }
          const initialSource = el.__nexusRawSource;
          const render = () => {
            const content = value ? runtime.evaluate(el, value) : initialSource;
            const mdText = String(content || "").trim();
            if (!el.classList.contains("nexus-markdown-body")) {
              el.classList.add("nexus-markdown-body");
            }
            const transpiled = parseMarkdown(mdText);
            if (el.innerHTML !== transpiled) {
              el.innerHTML = transpiled;
            }
          };
          if (value) {
            const [_runner, cleanup] = runtime.elementBoundEffect(el, render);
            return () => {
              delete el.__nexusMarkdownDone;
              delete el.__nexusRawSource;
              cleanup();
            };
          } else {
            render();
            return () => {
              delete el.__nexusMarkdownDone;
              delete el.__nexusRawSource;
            };
          }
        }
      };
      markdown_default = markdownModule;
    }
  });

  // src/modules/sprites/mask.ts
  var mask_exports = {};
  __export(mask_exports, {
    default: () => mask_default,
    format: () => format,
    mask: () => mask,
    maskSpriteModule: () => maskSpriteModule
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
  var mask, maskSpriteModule, mask_default;
  var init_mask = __esm({
    "src/modules/sprites/mask.ts"() {
      mask = {
        format
      };
      maskSpriteModule = {
        name: "mask",
        key: "$mask",
        sprites: () => mask
      };
      mask_default = maskSpriteModule;
    }
  });

  // src/modules/attributes/mask.ts
  var mask_exports2 = {};
  __export(mask_exports2, {
    default: () => mask_default2,
    maskModule: () => maskModule
  });
  var maskModule, mask_default2;
  var init_mask2 = __esm({
    "src/modules/attributes/mask.ts"() {
      init_mask();
      maskModule = {
        name: "mask",
        handle(el, value, runtime) {
          if (!(el instanceof HTMLInputElement)) {
            runtime.warn("data-mask only supported on <input> elements.", el);
            return;
          }
          let lastValue = el.value;
          let template = runtime.evaluate(el, value) || value;
          const onInput = () => {
            if (!template) {
              template = runtime.evaluate(el, value) || value;
            }
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
      mask_default2 = maskModule;
    }
  });

  // src/modules/attributes/on.ts
  var on_exports = {};
  __export(on_exports, {
    default: () => on_default
  });
  var onModule, on_default;
  var init_on = __esm({
    "src/modules/attributes/on.ts"() {
      init_debug();
      onModule = {
        name: "on",
        attribute: "on",
        handle: (el, value, runtime, parsedAttr) => {
          const parsed = parsedAttr || runtime.parseAttribute("data-on", runtime, el);
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
            let target = el;
            let options = false;
            const targetModifiers = /* @__PURE__ */ new Set(["window", "document", "outside"]);
            const optionModifiers = /* @__PURE__ */ new Set(["passive", "capture"]);
            modifiers.forEach((mod) => {
              const dotIdx = mod.indexOf(".");
              const dashIdx = mod.indexOf("-");
              let modName = mod;
              let fullArg = "";
              if (dotIdx !== -1) {
                modName = mod.slice(0, dotIdx);
                fullArg = mod.slice(dotIdx + 1);
              } else if (dashIdx !== -1) {
                modName = mod.slice(0, dashIdx);
                fullArg = mod.slice(dashIdx + 1);
              }
              if (targetModifiers.has(modName)) {
                if (modName === "window")
                  target = window;
                if (modName === "document" || modName === "outside")
                  target = document;
                if (modName !== "outside")
                  return;
              }
              if (optionModifiers.has(modName)) {
                if (modName === "passive")
                  options = { passive: true };
                if (modName === "capture")
                  options = true;
                return;
              }
              const modifierModule = runtime.getModifier(modName);
              if (modifierModule) {
                handler = modifierModule.handle(handler, el, fullArg, runtime);
              }
            });
            target.addEventListener(eventName, handler, options);
            if (eventName === "load" && document.readyState !== "loading" || eventName === "DOMContentLoaded" && document.readyState !== "loading") {
              if (target === window || target === document || target === el) {
                try {
                  handler(new Event(eventName));
                } catch {
                }
              }
            }
            return () => target.removeEventListener(eventName, handler, options);
          } catch (e) {
            initError("on", `Failed to attach listener ${eventName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
        }
      };
      on_default = onModule;
    }
  });

  // src/modules/attributes/preserve.ts
  var preserve_exports = {};
  __export(preserve_exports, {
    default: () => preserve_default
  });
  var preserveModule, preserve_default;
  var init_preserve = __esm({
    "src/modules/attributes/preserve.ts"() {
      init_consts();
      preserveModule = {
        name: "preserve",
        attribute: "preserve",
        handle: (el, _value, _runtime) => {
          el.setAttribute(DATA_PRESERVE_ATTR, "true");
          return () => {
          };
        }
      };
      preserve_default = preserveModule;
    }
  });

  // src/modules/attributes/pwa.ts
  var pwa_exports = {};
  __export(pwa_exports, {
    default: () => pwa_default
  });
  var pwaModule, pwa_default;
  var init_pwa = __esm({
    "src/modules/attributes/pwa.ts"() {
      init_debug();
      pwaModule = {
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
          const cleanupFns4 = [];
          const updateOnlineStatus = () => {
            pwaState.isOnline = navigator.onLine;
          };
          globalThis.addEventListener("online", updateOnlineStatus);
          globalThis.addEventListener("offline", updateOnlineStatus);
          cleanupFns4.push(
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
            }).catch((err) => reportError(new Error(`PWA: ServiceWorker registration failed: ${err}`), el));
            let refreshing = false;
            const onControllerChange = () => {
              if (!refreshing) {
                refreshing = true;
                window.location.reload();
              }
            };
            navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
            cleanupFns4.push(() => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange));
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
          cleanupFns4.push(() => globalThis.removeEventListener("beforeinstallprompt", onBeforeInstall));
          const onAppInstalled = () => {
            pwaState.isInstalled = true;
            pwaState.deferredPrompt = null;
          };
          globalThis.addEventListener("appinstalled", onAppInstalled);
          cleanupFns4.push(() => globalThis.removeEventListener("appinstalled", onAppInstalled));
          return () => cleanupFns4.forEach((fn) => fn());
        }
      };
      pwa_default = pwaModule;
    }
  });

  // src/modules/attributes/raf.ts
  var raf_exports = {};
  __export(raf_exports, {
    default: () => raf_default
  });
  var rafModule, raf_default;
  var init_raf = __esm({
    "src/modules/attributes/raf.ts"() {
      init_debug();
      rafModule = {
        name: "raf",
        attribute: "on-raf",
        handle: (el, expression, runtime) => {
          let frame;
          let lastTime = performance.now();
          const extras = { $time: 0, $delta: 0 };
          const loop = (time) => {
            const delta = time - lastTime;
            lastTime = time;
            extras.$time = time;
            extras.$delta = delta;
            try {
              runtime.evaluate(el, expression, extras);
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
      raf_default = rafModule;
    }
  });

  // src/modules/attributes/route.ts
  var route_exports = {};
  __export(route_exports, {
    default: () => route_default,
    routeAttributeModule: () => routeAttributeModule
  });
  var routeAttributeModule, route_default;
  var init_route = __esm({
    "src/modules/attributes/route.ts"() {
      init_debug();
      routeAttributeModule = {
        name: "route-attribute",
        attribute: "route",
        // maps to data-route
        handle: (el, routePath, runtime, parsed) => {
          try {
            if (parsed?.argument)
              return;
            const registerOrQueue = (record) => {
              const router = runtime.globalSignals()["router"];
              if (router && router.addRoute) {
                router.addRoute(record);
              } else {
                const pending = runtime._pendingDeclaredRoutes || [];
                pending.push(record);
                runtime._pendingDeclaredRoutes = pending;
              }
            };
            let jsonConfig = null;
            if (routePath && routePath.trim().startsWith("{")) {
              try {
                const evaluated = runtime.evaluate(el, routePath);
                if (evaluated && typeof evaluated === "object") {
                  jsonConfig = evaluated;
                }
              } catch {
              }
            }
            if (jsonConfig && Array.isArray(jsonConfig.routes)) {
              const addedRecords = [];
              jsonConfig.routes.forEach((item) => {
                const path = item.route || item.path || "/";
                const component2 = item.path || item.component;
                const isProtected = item.protected === true || item.protected === "yes" || item.shadow === true || item.internal === true;
                const record = {
                  path,
                  element: el,
                  name: item.name,
                  component: component2,
                  redirect: item.redirect,
                  layout: item.layout,
                  meta: item.meta || {},
                  internal: isProtected,
                  source: "declared"
                };
                registerOrQueue(record);
                addedRecords.push(record);
              });
              return () => {
                const router = runtime.globalSignals()["router"];
                if (router && router.removeRoute) {
                  addedRecords.forEach((r) => router.removeRoute(r));
                }
              };
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
            const shadowAttr = el.getAttribute("data-route-shadow") || el.getAttribute("data-route-protected");
            const internal = el.hasAttribute("data-route-shadow") || el.hasAttribute("data-route-protected") || shadowAttr === "" || shadowAttr === "true" || shadowAttr === "shadow" || shadowAttr === "yes";
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
            registerOrQueue(routeRecord);
            return () => {
              const router = runtime.globalSignals()["router"];
              if (router && router.removeRoute) {
                router.removeRoute(routeRecord);
              }
            };
          } catch (e) {
            reportError(e instanceof Error ? e : new Error(String(e)), el);
          }
        }
      };
      route_default = routeAttributeModule;
    }
  });

  // src/modules/attributes/router.ts
  var router_exports = {};
  __export(router_exports, {
    default: () => router_default,
    routerAttributeModule: () => routerAttributeModule
  });
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
  var routerAttributeModule, router_default;
  var init_router = __esm({
    "src/modules/attributes/router.ts"() {
      init_debug();
      init_consts();
      routerAttributeModule = {
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
              return `/${pagesDir}/${raw.replace(/^\/+/, "")}`;
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
                    if (!entry || typeof entry !== "object")
                      continue;
                    const routePath = entry.route !== void 0 ? entry.route : entry.path || "";
                    const compPath = entry.path || entry.component || "";
                    const id = entry.id || entry.name || "";
                    const isInternal = entry.internal === true || !routePath || shadowMatch(routePath) || shadowMatch(compPath);
                    const meta = routePath ? pathToRegex(routePath) : null;
                    const rec = {
                      path: routePath,
                      element: document.documentElement,
                      name: id,
                      redirect: entry.redirect,
                      layout: entry.layout,
                      component: compPath,
                      category: entry.category,
                      keywords: entry.keywords,
                      meta: {
                        title: entry.title,
                        icon: entry.icon,
                        order: entry.order,
                        category: entry.category,
                        keywords: entry.keywords,
                        ...entry.meta || {}
                      },
                      internal: isInternal,
                      source: "manifest",
                      ...meta || {}
                    };
                    if (meta) {
                      rec.matcher = meta.regex;
                    }
                    entries.push(rec);
                  }
                } catch (e) {
                  reportError(new Error(`router: failed to load manifest "${manifestUrl}": ${e}`), el);
                }
              }
              state.manifest = entries.filter((r) => !r.internal).slice();
              state.routes = entries.slice();
              for (const rec of entries) {
                const existing = routeList.find((r) => r.name === rec.name || rec.path && r.path === rec.path);
                if (!existing) {
                  routeList.push(rec);
                  if (rec.matcher) {
                    matchMeta.set(rec, { regex: rec.matcher, keys: rec.keys || [], hasWildcard: rec.hasWildcard || false });
                  }
                } else {
                  if (rec.matcher && !matchMeta.has(existing)) {
                    matchMeta.set(existing, { regex: rec.matcher, keys: rec.keys || [], hasWildcard: rec.hasWildcard || false });
                  }
                }
              }
            };
            const routeList = [];
            const matchMeta = /* @__PURE__ */ new WeakMap();
            if (Array.isArray(cfg.routes)) {
              for (const r of cfg.routes) {
                if (r && (r.route || r.path)) {
                  const path = r.route || r.path || "/";
                  const meta = pathToRegex(path);
                  const rec = {
                    path,
                    element: el,
                    name: r.id || r.name,
                    redirect: r.redirect,
                    layout: r.layout,
                    component: r.path || r.component,
                    meta: r.meta,
                    source: "declared",
                    ...meta
                  };
                  rec.matcher = meta.regex;
                  matchMeta.set(rec, meta);
                  routeList.push(rec);
                }
              }
            }
            const initialRoutes = routeList.map((r) => ({
              id: r.name || r.path,
              name: r.name,
              route: r.path,
              path: r.component || r.path,
              meta: r.meta || {},
              layout: r.layout
            }));
            let state;
            const resolveStaticComponent = (path) => {
              const clean = path.replace(/^\/+/, "");
              if (clean.startsWith("_internal/") || clean.startsWith("_pages/")) {
                const withExt2 = clean.endsWith(".html") || clean.endsWith(".md") ? clean : clean + ".html";
                return applyBase("/" + withExt2);
              }
              const dir = (routerConfig.pagesDir || pagesDir || "_pages").replace(/^\/+|\/+$/g, "");
              const defaultIndex = routerConfig.index || cfg.index || "home.html";
              if (path === "/" || path === "") {
                return applyBase(`/${dir}/${defaultIndex}`);
              }
              const allRoutes = state && state.routes ? state.routes : routeList;
              const matchedRec = allRoutes.find((r) => r.path === path || r.path === "/" + clean);
              if (matchedRec?.component) {
                return applyBase(matchedRec.component);
              }
              if (state && state.pages) {
                const matchedPage = state.pages.find((p) => p.href === path || p.href === "/" + clean);
                if (matchedPage?.path) {
                  return applyBase(matchedPage.path);
                }
              }
              if (clean.startsWith("docs/")) {
                const withExt2 = clean.endsWith(".md") ? clean : clean + ".md";
                return applyBase(`/${dir}/${withExt2}`);
              }
              const withExt = clean.endsWith(".html") || clean.endsWith(".md") ? clean : clean + ".html";
              return applyBase(`/${dir}/${withExt}`);
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
            const initialPath = stripBase(globalThis.location.pathname) || "/";
            const initialMatched = routeList.find((r) => r.path === initialPath);
            const initialSource = initialMatched?.component || resolveStaticComponent(initialPath);
            state = runtime.shallowReactive({
              path: initialPath,
              params: {},
              query: {},
              hash: globalThis.location.hash,
              loading: false,
              error: null,
              errorCode: null,
              basePath,
              mode,
              route: initialSource,
              layout: initialMatched?.layout ?? null,
              outlet: initialSource,
              meta: initialMatched?.meta || {},
              name: initialMatched?.name ?? null,
              previous: null,
              scrollPosition: { x: 0, y: 0 },
              currentRoute: initialMatched || null,
              routes: initialRoutes,
              pages: [],
              async discoverPages() {
                const fetchFn = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
                if (!fetchFn)
                  return;
                const pDir = (state.config.pagesDir || pagesDir || "_pages").replace(/^\/+|\/+$/g, "");
                const manifestUrl = state.config.manifest || `/${pDir}/manifest.json`;
                const dirUrl = `/${pDir}/`;
                let rawList = [];
                try {
                  const manifestRes = await fetchFn(applyBase(manifestUrl));
                  if (manifestRes && manifestRes.ok) {
                    const json = await manifestRes.json();
                    if (Array.isArray(json)) {
                      rawList = json;
                    } else if (Array.isArray(json.routes)) {
                      rawList = json.routes;
                    }
                  }
                } catch {
                }
                if (rawList.length === 0) {
                  try {
                    const dirRes = await fetchFn(applyBase(dirUrl));
                    if (dirRes && dirRes.ok) {
                      const dirHtml = await dirRes.text();
                      const doc = new DOMParser().parseFromString(dirHtml, "text/html");
                      const links = Array.from(doc.querySelectorAll("a[href]"));
                      const validExts = [".html", ".htm", ".md", ".markdown"];
                      for (const a of links) {
                        const hrefAttr = a.getAttribute("href") || "";
                        const fname = hrefAttr.split("/").pop()?.split("?")[0] || "";
                        if (fname && validExts.some((ext) => fname.endsWith(ext)) && !rawList.some((e) => (typeof e === "string" ? e : e.path)?.endsWith(fname))) {
                          rawList.push(fname);
                        }
                      }
                    }
                  } catch {
                  }
                }
                const discovered = [];
                if (rawList.length > 0) {
                  for (const item of rawList) {
                    const isObj = typeof item === "object" && item !== null;
                    if (isObj && (item.internal === true || item.id === "admin" || item.id === "error")) {
                      continue;
                    }
                    const isSubmenu = isObj && (item.isSubmenu || item.path === "" || item.route === "");
                    const fname = isObj ? item.path?.split("/").pop() || item.id || "" : item;
                    const cleanName = isObj ? item.id || item.name || fname.replace(/\.(html|htm|md|markdown)$/i, "") : fname.replace(/\.(html|htm|md|markdown)$/i, "");
                    const parent = isObj ? item.parent !== void 0 ? item.parent : item.meta?.parent !== void 0 ? item.meta.parent : cleanName === "home" ? null : "/" : cleanName === "home" ? null : "/";
                    const defaultRoute = parent && parent !== "/" ? `${parent.replace(/\/+$/, "")}/${cleanName}` : cleanName === "home" ? "/" : `/${cleanName}`;
                    const href = isSubmenu ? "" : isObj ? item.route !== void 0 ? item.route : defaultRoute : defaultRoute;
                    const compPath = isSubmenu ? "" : isObj ? item.path || `/${pDir}/${fname}` : `/${pDir}/${fname}`;
                    let title = isObj ? item.title || item.meta?.title || "" : "";
                    let icon = isObj ? item.icon || item.meta?.icon || "" : "";
                    const order = isObj ? item.order !== void 0 ? item.order : item.meta?.order : void 0;
                    const category = isObj ? item.category !== void 0 ? item.category : item.meta?.category : void 0;
                    const defaultTitle = href === "/" ? "Home" : href ? href.replace(/^\/+/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : cleanName;
                    const finalTitle = title || defaultTitle;
                    const finalIcon = icon || (parent ? void 0 : "material-symbols-light:article-outline");
                    const children = [];
                    if (isObj && Array.isArray(item.children)) {
                      for (const ch of item.children) {
                        const chObj = typeof ch === "object" && ch !== null;
                        const chName = chObj ? ch.id || ch.name || ch.title || "" : ch;
                        const chHref = chObj ? ch.route || `/${chName}` : `/${chName}`;
                        const chPath = chObj ? ch.path || `/${pDir}/${chName}.html` : `/${pDir}/${chName}.html`;
                        const chTitle = chObj ? ch.title || chName : chName;
                        const chParent = chObj ? ch.parent || href : href;
                        children.push({
                          id: chName,
                          href: chHref,
                          title: chTitle,
                          tabTitle: chTitle,
                          path: chPath,
                          parent: chParent,
                          meta: { title: chTitle, parent: chParent }
                        });
                        if (chHref && !state.routes.find((r) => r.path === chHref)) {
                          state.routes.push({
                            path: chHref,
                            component: chPath,
                            name: chName,
                            meta: { title: chTitle, parent: chParent }
                          });
                        }
                      }
                    }
                    discovered.push({
                      id: item.id || cleanName,
                      href,
                      title: finalTitle,
                      icon: finalIcon || "",
                      tabTitle: finalTitle,
                      tabIcon: finalIcon || "",
                      path: compPath,
                      parent,
                      category: category || void 0,
                      children: children.length > 0 ? children : void 0,
                      meta: { title: finalTitle, icon: finalIcon, order, parent, category: category || void 0, isSubmenu }
                    });
                    if (href) {
                      const existing = state.routes.find((r) => r.path === href);
                      if (!existing) {
                        state.routes.push({
                          path: href,
                          component: compPath,
                          name: cleanName,
                          meta: { title: finalTitle, icon: finalIcon, order, parent, category: category || void 0 }
                        });
                      }
                    }
                  }
                  const rootPages = [];
                  const attachChild = (nodes, item, targetParentRoute) => {
                    for (const node of nodes) {
                      if (node.href === targetParentRoute || node.id === targetParentRoute) {
                        node.children = node.children || [];
                        if (!node.children.some((c) => c.href && c.href === item.href || c.id === item.id)) {
                          node.children.push(item);
                          node.children.sort((a, b) => {
                            const aOrder = a.meta?.order;
                            const bOrder = b.meta?.order;
                            if (aOrder !== void 0 && bOrder !== void 0)
                              return aOrder - bOrder;
                            if (aOrder !== void 0)
                              return -1;
                            if (bOrder !== void 0)
                              return 1;
                            return (a.title || a.href).localeCompare(b.title || b.href);
                          });
                        }
                        return true;
                      }
                      if (node.children && attachChild(node.children, item, targetParentRoute)) {
                        return true;
                      }
                    }
                    return false;
                  };
                  for (const p of discovered) {
                    if (!p.parent || p.parent === "/" || p.parent === "") {
                      rootPages.push(p);
                    }
                  }
                  let unattached = discovered.filter((p) => p.parent && p.parent !== "/" && p.parent !== "");
                  let maxPasses = 10;
                  while (unattached.length > 0 && maxPasses-- > 0) {
                    const remaining = [];
                    for (const p of unattached) {
                      const parentRoute = p.parent.startsWith("/") ? p.parent : "/" + p.parent;
                      const attached = attachChild(rootPages, p, parentRoute) || attachChild(discovered, p, parentRoute);
                      if (!attached) {
                        remaining.push(p);
                      }
                    }
                    if (remaining.length === unattached.length) {
                      rootPages.push(...remaining);
                      break;
                    }
                    unattached = remaining;
                  }
                  rootPages.sort((a, b) => {
                    const aOrder = a.meta?.order;
                    const bOrder = b.meta?.order;
                    if (aOrder !== void 0 && bOrder !== void 0)
                      return aOrder - bOrder;
                    if (aOrder !== void 0)
                      return -1;
                    if (bOrder !== void 0)
                      return 1;
                    return (a.title || a.href).localeCompare(b.title || b.href);
                  });
                  discovered.length = 0;
                  discovered.push(...rootPages);
                } else {
                  const publicRoutes = routeList.filter((r) => {
                    const p = r.path || "";
                    const comp = r.component || "";
                    if (p.startsWith("/_internal") || comp.startsWith("/_internal") || comp.startsWith("_internal/"))
                      return false;
                    if (r.name === "error" || r.name === "admin" || r.protected)
                      return false;
                    return true;
                  });
                  for (const r of publicRoutes) {
                    const href = r.path || "/";
                    const compPath = r.component || (href === "/" ? `/${pDir}/home.html` : `/${pDir}/${href.replace(/^\/+/, "")}.html`);
                    let title = r.meta?.title;
                    let icon = r.meta?.icon;
                    try {
                      const res = await fetchFn(compPath);
                      if (res && res.ok) {
                        const html = await res.text();
                        const doc = new DOMParser().parseFromString(html, "text/html");
                        const t = doc.querySelector("title")?.textContent?.trim();
                        const ic = doc.querySelector('meta[name="icon"]')?.getAttribute("content")?.trim();
                        if (t)
                          title = t;
                        if (ic)
                          icon = ic;
                      }
                    } catch {
                    }
                    const defaultTitle = href === "/" ? "Home" : href.replace(/^\/+/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    const finalTitle = title || defaultTitle;
                    const finalIcon = icon || "material-symbols-light:article-outline";
                    discovered.push({
                      href,
                      title: finalTitle,
                      icon: finalIcon,
                      tabTitle: finalTitle,
                      tabIcon: finalIcon,
                      path: compPath,
                      parent: href === "/" ? null : "/",
                      meta: { title: finalTitle, icon: finalIcon, parent: href === "/" ? null : "/" }
                    });
                  }
                }
                state.pages = discovered;
                state.lineage = state.getLineage(state.route || state.path);
                const activeTab = state.pageTabs.find((t) => t.id === state.activePageTabId);
                if (activeTab && activeTab.route) {
                  const findDeep = (pages) => {
                    for (const p of pages) {
                      if (p.href === activeTab.route)
                        return p;
                      if (p.children) {
                        const ch = findDeep(p.children);
                        if (ch)
                          return ch;
                      }
                    }
                    return null;
                  };
                  const resolvedPage = findDeep(state.pages);
                  if (resolvedPage && resolvedPage.path && activeTab.source !== resolvedPage.path) {
                    activeTab.source = resolvedPage.path;
                    if (resolvedPage.title && !activeTab.title)
                      activeTab.title = resolvedPage.title;
                    if (resolvedPage.icon && !activeTab.icon)
                      activeTab.icon = resolvedPage.icon;
                    state.pageTabs = [...state.pageTabs];
                  }
                }
              },
              lineage: [],
              getLineage(targetHref) {
                const raw = targetHref || state.path || state.route || "/";
                const currentHref = raw.startsWith("/_pages/") ? raw.replace("/_pages/", "/").replace(/\.html$/, "") === "/home" ? "/" : raw.replace("/_pages/", "/").replace(/\.html$/, "") : raw;
                const chain = [];
                const visited = /* @__PURE__ */ new Set();
                const findPageDeep = (pages, predicate) => {
                  for (const p of pages) {
                    if (predicate(p))
                      return p;
                    if (p.children) {
                      const ch = findPageDeep(p.children, predicate);
                      if (ch)
                        return ch;
                    }
                  }
                  return null;
                };
                let curr = currentHref;
                while (curr && !visited.has(curr)) {
                  visited.add(curr);
                  let found = findPageDeep(state.pages, (p) => p.href === curr || p.path === curr);
                  if (!found) {
                    found = state.routes.find((r) => r.path === curr);
                  }
                  if (!found && curr === state.route) {
                    found = state.activePageTab;
                  }
                  const title = found?.tabTitle || found?.title || found?.meta?.title || (curr === "/" ? "Home" : curr.replace(/^\/+/, "").replace(/\.html$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
                  const icon = found?.tabIcon || found?.icon || found?.meta?.icon || (curr === "/" ? "material-symbols-light:home-outline" : void 0);
                  const parent = found?.parent !== void 0 ? found.parent : found?.meta?.parent !== void 0 ? found.meta.parent : curr === "/" ? null : "/";
                  chain.unshift({ title, href: curr, icon });
                  if (!parent || curr === "/" || parent === curr) {
                    break;
                  }
                  curr = parent;
                }
                if (chain.length > 0 && chain[0].href !== "/") {
                  const homePage = state.pages.find((p) => p.href === "/");
                  chain.unshift({
                    title: homePage?.title || "Home",
                    href: "/",
                    icon: homePage?.icon || "material-symbols-light:home-outline"
                  });
                }
                return chain.length > 0 ? chain : [{ title: "Home", href: "/", icon: "material-symbols-light:home-outline" }];
              },
              setPageMeta(meta) {
                if (state.activePageTab) {
                  state.activePageTab.meta = { ...state.activePageTab.meta, ...meta };
                  if (meta.title)
                    state.activePageTab.tabTitle = meta.title;
                  if (meta.icon)
                    state.activePageTab.tabIcon = meta.icon;
                }
                state.lineage = state.getLineage(state.path);
              },
              // Declarative strategy snapshot + resolved manifest.
              config: routerConfig,
              manifest: [],
              // --- First-Class Page Tab Workspaces ---
              pageTabs: [
                {
                  id: "tab-0",
                  source: initialSource,
                  route: initialPath,
                  meta: initialMatched?.meta || {},
                  isLoading: true
                }
              ],
              activePageTabId: "tab-0",
              pinnedPageTabs: [],
              tabSeq: 0,
              get activePageTab() {
                return this.pageTabs?.find((t) => t && t.id === this.activePageTabId) || null;
              },
              createPageTab(source, route) {
                if (!source && !route)
                  return;
                state.tabSeq++;
                const id = "tab-" + state.tabSeq;
                const rawSource = (source || "").trim();
                const rawRoute = (route !== void 0 ? route : "").trim();
                const candidatePath = rawRoute || (!rawSource.endsWith(".html") && !rawSource.endsWith(".md") && !rawSource.startsWith("_components/") ? rawSource : "");
                const matched = candidatePath ? routeList.find((r) => r.path === candidatePath || r.path === stripBase(candidatePath)) || null : rawSource ? routeList.find((r) => r.path === rawSource || r.component === rawSource || r.path === stripBase(rawSource)) || null : null;
                let resolvedSource = rawSource;
                let resolvedRoute = rawRoute;
                let resolvedMeta = {};
                if (matched) {
                  resolvedSource = matched.component || resolvedSource || resolveStaticComponent(matched.path);
                  resolvedRoute = matched.path;
                  resolvedMeta = matched.meta || {};
                } else if (rawSource.startsWith("_components/")) {
                  resolvedSource = rawSource;
                  resolvedRoute = rawRoute || "";
                  resolvedMeta = rawRoute ? routeList.find((r) => r.path === rawRoute)?.meta || {} : { title: "New Tab" };
                } else {
                  resolvedSource = rawSource || state.config.newPageTab || "_components/tab-new.html";
                  resolvedRoute = rawRoute || (resolvedSource.startsWith("_components/") ? "" : resolvedSource);
                }
                state.tabPaths[id] = resolvedSource.startsWith("_components/") ? "custom-component" : resolvedRoute || resolvedSource;
                if (resolvedMeta.title || resolvedMeta.icon) {
                  state.tabMeta[id] = { title: resolvedMeta.title, icon: resolvedMeta.icon };
                }
                state.pageTabs = [...state.pageTabs, { id, source: resolvedSource, route: resolvedRoute, meta: resolvedMeta, isLoading: true }];
                state.activePageTabId = id;
                state.setActiveTab(id);
              },
              switchPageTab(id) {
                state.activePageTabId = id;
                state.setActiveTab(id);
                const tab = state.pageTabs.find((t) => t.id === id);
                if (tab && tab.route && typeof globalThis.history !== "undefined") {
                  globalThis.history.replaceState({ pageTabId: id, tabId: id }, "", tab.route);
                }
              },
              closePageTab(id) {
                const wasActive = state.activePageTabId === id;
                state.pageTabs = state.pageTabs.filter((t) => t.id !== id);
                state.pinnedPageTabs = state.pinnedPageTabs.filter((p) => p !== id);
                if (wasActive && state.pageTabs.length > 0) {
                  state.switchPageTab(state.pageTabs[0].id);
                }
              },
              duplicatePageTab(id) {
                const srcTab = state.pageTabs.find((t) => t.id === id);
                if (!srcTab)
                  return;
                state.tabSeq++;
                const newId = "tab-" + state.tabSeq;
                const source = srcTab.source;
                const route = srcTab.route || "";
                state.tabPaths[newId] = source.startsWith("_components/") ? "custom-component" : state.tabPaths[id] || route;
                state.pageTabs = [...state.pageTabs, { id: newId, source, route, meta: { ...srcTab.meta || {} }, isLoading: true }];
                state.activePageTabId = newId;
                state.setActiveTab(newId);
              },
              pinPageTab(id) {
                if (state.pinnedPageTabs.includes(id)) {
                  state.pinnedPageTabs = state.pinnedPageTabs.filter((p) => p !== id);
                } else {
                  state.pinnedPageTabs = [...state.pinnedPageTabs, id];
                }
              },
              // Per-tab history bookkeeping (native history is the single store).
              activeTabId: null,
              tabPaths: {},
              tabMeta: {},
              navigate(url, opts) {
                if (url.startsWith("http") || url.startsWith("//")) {
                  globalThis.location.href = url;
                  return;
                }
                const target = applyBase(url);
                const tabId = opts?.tabId ?? getActiveTabId() ?? state.activePageTabId ?? state.activeTabId ?? null;
                const cleanPath = stripBase(target);
                const matched = routeList.find((r) => r.path === cleanPath || r.path === url);
                const isShadow = matched?.internal || shadowMatch(cleanPath);
                if (tabId) {
                  state.tabPaths[tabId] = cleanPath;
                  if (opts?.title !== void 0 || opts?.icon !== void 0) {
                    state.tabMeta[tabId] = {
                      ...state.tabMeta[tabId] || {},
                      ...opts?.title !== void 0 ? { title: opts.title } : {},
                      ...opts?.icon !== void 0 ? { icon: opts.icon } : {}
                    };
                  }
                }
                const _activeId = tabId || state.activePageTabId || getActiveTabId();
                if (_activeId && state.tabPaths[_activeId] !== "custom-component") {
                  const resolvedSource = matched?.component || resolveStaticComponent(cleanPath);
                  const curPageTab = state.pageTabs.find((t) => t.id === _activeId);
                  const routeMeta = matched?.meta;
                  if (curPageTab) {
                    if (curPageTab.source !== resolvedSource) {
                      curPageTab.source = resolvedSource;
                      if (curPageTab.linkedContent) {
                        curPageTab.linkedContent.isLoading = true;
                      }
                    }
                    if (curPageTab.route !== cleanPath)
                      curPageTab.route = cleanPath;
                    if (routeMeta || opts?.title !== void 0 || opts?.icon !== void 0) {
                      curPageTab.meta = {
                        ...curPageTab.meta || {},
                        ...routeMeta || {},
                        ...opts?.title !== void 0 ? { title: opts.title } : {},
                        ...opts?.icon !== void 0 ? { icon: opts.icon } : {}
                      };
                    }
                    state.pageTabs = [...state.pageTabs];
                  }
                  const _tabs = (runtime.globalSignals ? runtime.globalSignals() : {}).tabs;
                  if (Array.isArray(_tabs)) {
                    const _tab = _tabs.find((t) => t.id === _activeId);
                    if (_tab) {
                      if (_tab.source !== resolvedSource)
                        _tab.source = resolvedSource;
                      if (_tab.route !== cleanPath)
                        _tab.route = cleanPath;
                      if (routeMeta || opts?.title !== void 0 || opts?.icon !== void 0) {
                        _tab.meta = {
                          ..._tab.meta || {},
                          ...routeMeta || {},
                          ...opts?.title !== void 0 ? { title: opts.title } : {},
                          ...opts?.icon !== void 0 ? { icon: opts.icon } : {}
                        };
                      }
                    }
                  }
                }
                if (isShadow) {
                  updateRoute(target);
                  return;
                }
                if ("navigation" in globalThis) {
                  globalThis.navigation.navigate(target, {
                    history: opts?.replace ? "replace" : "push",
                    state: { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon }
                  });
                } else {
                  const histState = { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon };
                  if (opts?.replace)
                    globalThis.history.replaceState(histState, "", target);
                  else
                    globalThis.history.pushState(histState, "", target);
                  updateRoute(target);
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
                let target = fillPath(route.path, params);
                if (query && Object.keys(query).length) {
                  target += "?" + state.buildQuery(query);
                }
                state.navigate(target, opts);
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
              // Intuitive navigate: resolve an ID/name via the manifest or route registry.
              go(target, opts) {
                if (!target)
                  return;
                const named = routeList.find((r) => r.name === target || r.path === target) || (Array.isArray(state.routes) ? state.routes.find((r) => r.name === target || r.id === target || r.path === target) : null);
                if (!named) {
                  reportError(new Error(`router.go: no route with id "${target}"`), el);
                  return;
                }
                if (named.internal || !named.path || named.path === "") {
                  const _activeId = opts?.tabId ?? getActiveTabId() ?? state.activePageTabId ?? state.activeTabId ?? null;
                  if (_activeId) {
                    const comp = named.component || named.path;
                    const curPageTab = state.pageTabs.find((t) => t.id === _activeId);
                    if (curPageTab) {
                      curPageTab.source = comp;
                      if (named.meta?.title || named.meta?.icon || named.name) {
                        curPageTab.meta = {
                          title: named.meta?.title || curPageTab.meta?.title || named.name,
                          icon: named.meta?.icon || curPageTab.meta?.icon
                        };
                      }
                      state.pageTabs = [...state.pageTabs];
                    }
                  }
                  return;
                }
                state.navigate(named.path || named.route, opts);
              },
              // Match a path (default: current) and return the RouteInfo the router
              // would use — without navigating. Useful for guards/preview UI.
              match(path) {
                const p = path ? stripBase(path) : state.path;
                const exact = routeList.find((r) => !r.internal && r.path && r.path === p);
                if (exact) {
                  return buildInfo(exact, p, {}, state.query, state.hash);
                }
                for (const route of routeList) {
                  if (route.internal || !route.path)
                    continue;
                  const meta = matchMeta.get(route);
                  if (!meta)
                    continue;
                  if (meta.keys.length > 0 || meta.hasWildcard) {
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
                  publishOutlet(null);
                  const _ct = globals.tabs?.find((t) => t.id === id);
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
                let matched = routeList.find((r) => !r.internal && r.path && r.path === switchPath) || null;
                const params = {};
                if (!matched) {
                  for (const route of routeList) {
                    if (route.internal || !route.path)
                      continue;
                    const meta = matchMeta.get(route);
                    if (!meta)
                      continue;
                    if (meta.keys.length > 0 || meta.hasWildcard) {
                      const m = switchPath.match(meta.regex);
                      if (m) {
                        matched = route;
                        meta.keys.forEach((key, i) => {
                          params[key] = m[i + 1] || "";
                        });
                        if (meta.hasWildcard)
                          params.wildcard = m[meta.keys.length + 1] || "";
                        break;
                      }
                    }
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
                publishOutlet(state.layout ?? state.route);
                state.error = null;
                commitVisibility(matched);
                if (!matched?.internal && !shadowMatch(switchPath)) {
                  const target = applyBase(switchPath);
                  const meta = state.tabMeta[id] || {};
                  suppressNavIntercept = true;
                  globalThis.history.replaceState(
                    { tabId: id, scrollY: globalThis.scrollY, title: meta.title, icon: meta.icon },
                    "",
                    target
                  );
                  suppressNavIntercept = false;
                }
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
                state.errorCode = String(code);
                const onErr = globalThis.location.pathname === applyBase("/error");
                if (!onErr) {
                  state.navigate("/error", { replace: true });
                }
              },
              // Map an href / name / component URL to its component file URL and
              // fire a (de-duplicated, sticky-cached) fetch so the panel swap is
              // instant on arrival. Driven by the predictive engine for hover-intent
              // pre-warming, and at boot for the known route surface.
              prewarm(ref2) {
                if (!ref2)
                  return;
                let url = null;
                if (ref2.startsWith("_") || ref2.startsWith("/_")) {
                  url = applyBase(ref2.replace(/^\/+/, ""));
                } else {
                  const named = routeList.find((r) => r.name === ref2);
                  if (named?.component) {
                    url = applyBase(named.component.replace(/^\/+/, ""));
                  } else {
                    try {
                      const resolved = resolveStaticComponent(stripBase(ref2));
                      const maps = routeList.some(
                        (r) => r.component && r.component.endsWith(resolved.replace(/^\/+/, ""))
                      );
                      if (maps)
                        url = resolved;
                    } catch {
                    }
                  }
                }
                if (!url)
                  return;
                try {
                  runtime.fetch.request(url, { responseType: "text" }, el);
                } catch {
                }
              }
            });
            const routerSignalName = cfg.signal || "router";
            runtime.setGlobalSignal(routerSignalName, state);
            const pendingRoutes = runtime._pendingDeclaredRoutes;
            if (pendingRoutes && pendingRoutes.length > 0) {
              pendingRoutes.forEach((rec) => state.addRoute(rec));
              runtime._pendingDeclaredRoutes = [];
            }
            const globals = runtime.globalSignals();
            const getActiveTabId = () => typeof globals.activePageTabId === "string" && globals.activePageTabId || typeof globals.activeTabId === "string" && globals.activeTabId || null;
            const setActiveTabId = (id) => {
              runtime.setGlobalSignal("activePageTabId", id);
              runtime.setGlobalSignal("activeTabId", id);
            };
            let tabSwitching = false;
            runtime.watch(
              () => globals.activePageTabId || globals.activeTabId,
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
            const shownDisplay = /* @__PURE__ */ new WeakMap();
            const commitVisibility = (matched) => {
              routeList.forEach((r) => {
                if (!r.element || r.element === document.documentElement || r.element === document.body) {
                  return;
                }
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
            const publishOutlet = (url) => {
              state.outlet = url;
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
              let matched = routeList.find((r) => !r.internal && r.path && r.path === path) || null;
              const params = {};
              if (!matched) {
                for (const route of routeList) {
                  if (route.internal || !route.path)
                    continue;
                  const meta = matchMeta.get(route);
                  if (!meta)
                    continue;
                  if (meta.keys.length > 0 || meta.hasWildcard) {
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
                }
              }
              const errorPage2 = state.config.error ?? resolvePagesPath(void 0, "error.html");
              const cleanErrorPath = "/error";
              let staticComponent = null;
              if (!matched && (mode === "static" || mode === "hybrid")) {
                staticComponent = resolveStaticComponent(path);
                if (staticComponent) {
                  matched = {
                    path,
                    component: staticComponent,
                    name: path.replace(/^\/+/, "").replace(/[-_]/g, " "),
                    meta: {},
                    source: "dynamic"
                  };
                }
              }
              if (matched && matched.internal && path !== "/") {
                const isDirectAddressBarNav = !suppressNavIntercept && typeof globalThis.location !== "undefined" && stripBase(globalThis.location.pathname) === matched.path;
                if (isDirectAddressBarNav) {
                  state.errorCode = "404";
                  staticComponent = errorPage2;
                  if (typeof globalThis.history !== "undefined") {
                    try {
                      globalThis.history.replaceState(null, "", applyBase(cleanErrorPath));
                    } catch {
                    }
                  }
                }
              }
              if (matched && matched.redirect) {
                state.navigate(matched.redirect, { replace: true });
                return;
              }
              if (!matched) {
                matched = routeList.find((r) => r.path === cleanErrorPath) || {
                  path: cleanErrorPath,
                  name: "error",
                  component: errorPage2,
                  meta: { title: "Error", icon: "material-symbols-light:error-outline" },
                  source: "declared"
                };
                state.errorCode = "404";
                path = cleanErrorPath;
                if (typeof globalThis.history !== "undefined") {
                  try {
                    globalThis.history.replaceState(null, "", applyBase(cleanErrorPath));
                  } catch {
                  }
                }
              }
              const toInfo = buildInfo(matched, path, params, query, url.hash);
              const fromRoute = state.currentRoute;
              const fromInfo = previousInfo;
              const resolvedComponent = matched?.component ?? null;
              state.route = resolvedComponent;
              state.layout = matched?.layout ?? null;
              publishOutlet(state.layout ?? state.route);
              state.path = path;
              if (path !== cleanErrorPath && url.pathname !== applyBase(cleanErrorPath)) {
                state.error = null;
                state.errorCode = null;
              }
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
              state.hash = url.hash;
              state.query = query;
              state.params = params;
              state.currentRoute = matched;
              state.meta = matched?.meta ?? {};
              state.name = matched?.name ?? null;
              state.previous = outgoingPrevious;
              state.route = matched?.component ?? null;
              state.layout = matched?.layout ?? null;
              state.lineage = state.getLineage(path);
              publishOutlet(state.layout ?? state.route);
              const _at = state.activePageTabId || getActiveTabId();
              if (_at) {
                const isCustomComp = state.tabPaths[_at] === "custom-component";
                if (!isCustomComp) {
                  state.tabPaths[_at] = path;
                  const resolvedSource = matched?.component ?? null;
                  if (resolvedSource) {
                    const curPageTab = state.pageTabs.find((t) => t.id === _at);
                    if (curPageTab) {
                      if (curPageTab.source !== resolvedSource)
                        curPageTab.source = resolvedSource;
                      if (curPageTab.route !== path)
                        curPageTab.route = path;
                      const routeMeta = matched?.meta;
                      if (routeMeta?.title || routeMeta?.icon) {
                        curPageTab.meta = { ...curPageTab.meta || {}, ...routeMeta };
                      }
                      state.pageTabs = [...state.pageTabs];
                    }
                    const tabs = globals.tabs || [];
                    const atIdx = tabs.findIndex((t) => t.id === _at);
                    if (atIdx >= 0) {
                      const cur = tabs[atIdx];
                      if (cur.source !== resolvedSource)
                        cur.source = resolvedSource;
                      if (cur.route !== path)
                        cur.route = path;
                      const routeMeta = matched?.meta;
                      if (routeMeta?.title || routeMeta?.icon) {
                        cur.meta = { ...cur.meta || {}, ...routeMeta };
                      }
                    }
                  }
                }
              }
              if (matched || staticComponent) {
                commitVisibility(matched);
                state.error = null;
                state.errorCode = null;
                state.loading = false;
                restoreScroll(url.hash);
                if (path && path !== "/index.html" && path !== errorPage2 && !path.startsWith("/_internal/")) {
                  const recent = globals.recent || [];
                  const curTab = state.pageTabs.find((t) => t.id === _at);
                  const routeTitle = curTab?.meta?.title || curTab?.linkedContent?.meta?.title || matched?.meta?.title || path.replace(/^\//, "").replace(/-/g, " ");
                  const routeIcon = curTab?.meta?.icon || curTab?.linkedContent?.meta?.icon || matched?.meta?.icon || "material-symbols-light:article-outline";
                  const entry = { path, title: routeTitle, icon: routeIcon };
                  const next = [entry, ...recent.filter((r) => r.path !== path && r.path !== "/index.html")].slice(0, 5);
                  runtime.setGlobalSignal("recent", next);
                }
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
                state.loading = false;
                const onErrorPage = path === cleanErrorPath || url.pathname === applyBase(cleanErrorPath);
                if (onErrorPage) {
                  staticComponent = errorPage2;
                  commitVisibility(null);
                  state.route = staticComponent;
                  publishOutlet(staticComponent);
                }
              }
            };
            const onNavigate = (e) => {
              if (suppressNavIntercept)
                return;
              if (!e.canIntercept || e.hashChange || e.downloadRequest !== null) {
                return;
              }
              const url = new URL(e.destination.url);
              if (url.origin !== globalThis.location.origin)
                return;
              const destState = e.destination?.state;
              const destTab = destState && (typeof destState.pageTabId === "string" ? destState.pageTabId : typeof destState.tabId === "string" ? destState.tabId : null);
              if (destTab && destTab !== state.activePageTabId) {
                state.switchPageTab(destTab);
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
              const tab = st && (typeof st.pageTabId === "string" ? st.pageTabId : typeof st.tabId === "string" ? st.tabId : null);
              if (tab && tab !== state.activePageTabId) {
                state.switchPageTab(tab);
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
            queueMicrotask(async () => {
              await buildManifest();
              await state.discoverPages();
              updateRoute(globalThis.location.href);
            });
            runtime.effect(() => {
              const activeTab = state.activePageTab;
              if (!activeTab || !activeTab.route || activeTab.route.startsWith("/_internal"))
                return;
              const meta = activeTab.meta || activeTab.linkedContent?.meta;
              const title = meta?.title;
              const icon = meta?.icon;
              if (title || icon) {
                const globals2 = runtime.globalSignals ? runtime.globalSignals() : {};
                const recent = globals2.recent || [];
                const idx = recent.findIndex((r) => r.path === activeTab.route);
                if (idx >= 0 && (recent[idx].title !== title || recent[idx].icon !== icon)) {
                  const updated = [...recent];
                  updated[idx] = {
                    ...updated[idx],
                    title: title || updated[idx].title,
                    icon: icon || updated[idx].icon || "material-symbols-light:article-outline"
                  };
                  runtime.setGlobalSignal("recent", updated);
                }
              }
            });
            runtime.effect(() => {
              const activeTab = state.activePageTab;
              if (!activeTab || typeof document === "undefined")
                return;
              const meta = activeTab.meta || activeTab.linkedContent?.meta;
              const title = meta?.title || (activeTab.source?.includes("tab-new.html") ? "New Tab" : "") || (activeTab.route && activeTab.route !== "/" ? activeTab.route.replace(/^\//, "").replace(/-/g, " ") : "") || "Nexus-UX";
              if (title && document.title !== title) {
                document.title = title;
              }
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
      router_default = routerAttributeModule;
    }
  });

  // src/modules/attributes/scrollbar.ts
  var scrollbar_exports = {};
  __export(scrollbar_exports, {
    OverlayScrollbarInstance: () => OverlayScrollbarInstance,
    attachOverlayScrollbar: () => attachOverlayScrollbar,
    buildScrollbarCSS: () => buildScrollbarCSS,
    default: () => scrollbar_default,
    ensureOverlayInstance: () => ensureOverlayInstance,
    ensureScrollbarStyles: () => ensureScrollbarStyles,
    isGlobalOverlayActive: () => isGlobalOverlayActive,
    isScrollContainer: () => isScrollContainer,
    syncAllOverlayScrollbars: () => syncAllOverlayScrollbars,
    triggerContainerMotion: () => triggerContainerMotion
  });
  function resolveDimension(val, defaultVal = "0.375rem") {
    if (val === void 0 || val === null || val === "")
      return defaultVal;
    if (typeof val === "number")
      return `${val * 0.25}rem`;
    const s = String(val).trim();
    if (!isNaN(Number(s)))
      return `${Number(s) * 0.25}rem`;
    return s;
  }
  function resolveDuration(val, defaultVal) {
    if (val === void 0 || val === null || val === "")
      return defaultVal;
    if (typeof val === "number")
      return `${val}ms`;
    const s = String(val).trim();
    if (!isNaN(Number(s)))
      return `${s}ms`;
    return s;
  }
  function resolveRadius(val, defaultVal = "9999px") {
    if (!val)
      return defaultVal;
    const map = {
      full: "9999px",
      none: "0px",
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
      "2xl": "1rem",
      "3xl": "1.5rem",
      rounded: "0.25rem"
    };
    return map[val.toLowerCase()] || val;
  }
  function resolveColor(val, defaultVal) {
    if (!val)
      return defaultVal;
    const s = val.trim();
    if (s.startsWith("#") || s.startsWith("rgb") || s.startsWith("hsl") || s.startsWith("oklch") || s.startsWith("color-mix") || s.startsWith("var(")) {
      return s;
    }
    const themeMap = {
      primary: "var(--p, var(--color-primary, currentColor))",
      secondary: "var(--s, var(--color-secondary, currentColor))",
      accent: "var(--a, var(--color-accent, currentColor))",
      neutral: "var(--n, var(--color-neutral, currentColor))",
      base: "var(--b1, var(--color-base-100, currentColor))",
      "base-100": "var(--b1, var(--color-base-100, currentColor))",
      "base-200": "var(--b2, var(--color-base-200, currentColor))",
      "base-300": "var(--b3, var(--color-base-300, currentColor))",
      "base-content": "var(--bc, var(--color-base-content, currentColor))",
      info: "var(--in, var(--color-info, currentColor))",
      success: "var(--su, var(--color-success, currentColor))",
      warning: "var(--wa, var(--color-warning, currentColor))",
      error: "var(--er, var(--color-error, currentColor))",
      transparent: "transparent"
    };
    if (themeMap[s])
      return themeMap[s];
    if (s.includes("/")) {
      const [token, opacity] = s.split("/");
      const baseColor = themeMap[token] || `var(--color-${token}, ${token})`;
      const op = Number(opacity) / 100;
      return `color-mix(in srgb, ${baseColor} ${op * 100}%, transparent)`;
    }
    return `var(--color-${s}, ${s})`;
  }
  function buildScrollbarCSS(config) {
    const width = resolveDimension(config?.width, "0.375rem");
    const height = resolveDimension(config?.height, width);
    const thumbColor = resolveColor(config?.thumb, "color-mix(in srgb, currentColor 30%, transparent)");
    const thumbHover = resolveColor(config?.thumbHover, "color-mix(in srgb, currentColor 50%, transparent)");
    const thumbActive = resolveColor(config?.thumbActive, "color-mix(in srgb, currentColor 70%, transparent)");
    const trackColor = resolveColor(config?.track, "transparent");
    const trackHover = resolveColor(config?.trackHover, trackColor);
    const thumbRadius = resolveRadius(config?.thumbRadius || config?.radius, "9999px");
    const trackRadius = resolveRadius(config?.trackRadius || config?.radius, "9999px");
    const fadeIn = resolveDuration(config?.fadeIn, "0.2s");
    const fadeOut = resolveDuration(config?.fadeOut || config?.fade, "0.4s");
    const fadeTiming = config?.fadeTiming || "cubic-bezier(0.4, 0, 0.2, 1)";
    return `
/* ==========================================================================
   Zero-Flash Native Scrollbar Suppression for Overlay Mode
   ========================================================================== */
[style*="overflow"],
[data-scrollbar],
.overflow-y-auto,
.overflow-x-auto,
.overflow-auto,
.scrollbar-none,
.scrollbar-overlay-active {
  scrollbar-width: none !important;
}

[style*="overflow"]::-webkit-scrollbar,
[data-scrollbar]::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar,
.overflow-auto::-webkit-scrollbar,
.scrollbar-none::-webkit-scrollbar,
.scrollbar-overlay-active::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

[data-scrollbar]::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb,
.overflow-auto::-webkit-scrollbar-thumb,
.scrollbar-none::-webkit-scrollbar-thumb,
.scrollbar-overlay-active::-webkit-scrollbar-thumb {
  display: none !important;
  background-color: transparent !important;
}

/* ==========================================================================
   Root Adopted Theme Tokens
   ========================================================================== */
:root, :host, [data-scrollbar_global] {
  --scrollbar-width: ${width};
  --scrollbar-height: ${height};
  --scrollbar-thumb: ${thumbColor};
  --scrollbar-thumb-hover: ${thumbHover};
  --scrollbar-thumb-active: ${thumbActive};
  --scrollbar-track: ${trackColor};
  --scrollbar-track-hover: ${trackHover};
  --scrollbar-thumb-radius: ${thumbRadius};
  --scrollbar-track-radius: ${trackRadius};
  --scrollbar-fade-in: ${fadeIn};
  --scrollbar-fade-out: ${fadeOut};
  --scrollbar-fade-timing: ${fadeTiming};
}

/* ==========================================================================
   1. OVERLAY SCROLLBAR SPRITE STYLES (Modern CSS Logical Properties & rem Units)
   ========================================================================== */
.scrollbar-track-v {
  display: none;
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0.125rem;
  width: var(--scrollbar-width, 0.375rem);
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}

.scrollbar-thumb-v {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: 100%;
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) var(--scrollbar-fade-timing, cubic-bezier(0.4, 0, 0.2, 1)), background-color 0.2s ease-out;
}

.scrollbar-track-h {
  display: none;
  position: absolute;
  inset-block-end: 0.125rem;
  inset-inline-start: 0;
  width: 0;
  height: var(--scrollbar-height, 0.375rem);
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}

.scrollbar-thumb-h {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  height: 100%;
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) var(--scrollbar-fade-timing, cubic-bezier(0.4, 0, 0.2, 1)), background-color 0.2s ease-out;
}

/* Suppress hidden tracks completely from pointer events and layout */
.scrollbar-track-v[style*="display: none"],
.scrollbar-track-h[style*="display: none"],
[style*="display: none"] ~ .scrollbar-track-v,
[style*="display: none"] ~ .scrollbar-track-h {
  display: none !important;
  pointer-events: none !important;
}

.scrollbar-track-v[style*="display: none"] .scrollbar-thumb-v,
.scrollbar-track-h[style*="display: none"] .scrollbar-thumb-h,
[style*="display: none"] ~ .scrollbar-track-v .scrollbar-thumb-v,
[style*="display: none"] ~ .scrollbar-track-h .scrollbar-thumb-h {
  display: none !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* Motion State: Smooth Opacity Reveal */
.is-scrolling > .scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling > .scrollbar-track-h > .scrollbar-thumb-h,
.is-scrolling.scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling.scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-v > .scrollbar-thumb-v,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-track-v:not([style*="display: none"]):hover > .scrollbar-thumb-v,
.scrollbar-track-h:not([style*="display: none"]):hover > .scrollbar-thumb-h,
.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  opacity: 1 !important;
  transition: opacity var(--scrollbar-fade-in, 0.2s) ease-out, background-color 0.2s ease-out !important;
}

.scrollbar-track-v:not([style*="display: none"]):hover > .scrollbar-thumb-v,
.scrollbar-track-h:not([style*="display: none"]):hover > .scrollbar-thumb-h {
  background-color: var(--scrollbar-thumb-hover, color-mix(in srgb, currentColor 50%, transparent)) !important;
}

.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  cursor: grabbing !important;
  background-color: var(--scrollbar-thumb-active, color-mix(in srgb, currentColor 70%, transparent)) !important;
}

/* ==========================================================================
   2. NATIVE SCROLLBAR MODE (Fallback / Standard WebKit CSS)
   ========================================================================== */
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar {
  width: var(--scrollbar-width, 0.375rem);
  height: var(--scrollbar-height, 0.375rem);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
  border-radius: var(--scrollbar-track-radius, 9999px);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: var(--scrollbar-thumb-radius, 9999px);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) !important;
}
`;
  }
  function ensureScrollbarStyles(root, config) {
    const css = buildScrollbarCSS(config || globalConfig);
    if (scrollbarSheetRef.sheet && config) {
      scrollbarSheetRef.sheet.replaceSync(css);
    }
    ensureAdoptedStylesheet(css, scrollbarSheetRef, root);
  }
  function findScrollParent(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.getAttribute("data-scrollbar") === "none" || el.classList.contains("scrollbar-none")) {
        return null;
      }
      const s = window.getComputedStyle(el);
      const hasScrollY = s.overflowY !== "hidden" && s.overflowY !== "clip" && s.overflow !== "hidden" && (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight;
      const hasScrollX = s.overflowX !== "hidden" && s.overflowX !== "clip" && s.overflow !== "hidden" && (s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth;
      if (hasScrollY || hasScrollX) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }
  function ensureOverlayInstance(el) {
    let inst = overlayInstances.get(el);
    if (!inst) {
      inst = new OverlayScrollbarInstance(el);
      overlayInstances.set(el, inst);
    }
    return inst;
  }
  function syncAllOverlayScrollbars() {
    activeInstances.forEach((inst) => inst.scheduleUpdate());
  }
  function isGlobalOverlayActive() {
    return globalConfig.mode === "overlay";
  }
  function isScrollContainer(el) {
    if (!el || !(el instanceof HTMLElement))
      return false;
    if (!el.isConnected || el.getAttribute("data-scrollbar") === "none" || el.classList.contains("scrollbar-none")) {
      return false;
    }
    const s = window.getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden")
      return false;
    if (el.hasAttribute("data-scrollbar"))
      return true;
    if (el.classList.contains("overflow-y-auto") || el.classList.contains("overflow-x-auto") || el.classList.contains("overflow-auto")) {
      return el.scrollHeight - el.clientHeight > 1 || el.scrollWidth - el.clientWidth > 1;
    }
    if (el.hasAttribute("style") && el.getAttribute("style").includes("overflow")) {
      return el.scrollHeight - el.clientHeight > 1 || el.scrollWidth - el.clientWidth > 1;
    }
    return false;
  }
  function attachOverlayScrollbar(el) {
    if (!el || !(el instanceof HTMLElement))
      return null;
    if (el.getAttribute("data-scrollbar") === "none" || el.classList.contains("scrollbar-none")) {
      return null;
    }
    const inst = ensureOverlayInstance(el);
    inst.scheduleUpdate();
    triggerContainerMotion(el);
    return inst;
  }
  function triggerContainerMotion(target) {
    const autohideMs = typeof globalConfig.autohide === "number" ? globalConfig.autohide : 800;
    if (globalConfig.autohide === false || autohideMs <= 0)
      return;
    if (target instanceof HTMLElement) {
      if (!target.isConnected || target.style.display === "none" || target.offsetParent === null) {
        const inst = overlayInstances.get(target);
        if (inst)
          inst.update();
        return;
      }
    }
    if (!target.classList.contains("is-scrolling")) {
      target.classList.add("is-scrolling");
    }
    if (target instanceof HTMLElement && (globalConfig.mode === "overlay" || target.hasAttribute("data-scrollbar"))) {
      const inst = ensureOverlayInstance(target);
      inst.setScrolling(true);
      inst.scheduleUpdate();
    }
    const existingTimer = elementTimers.get(target);
    if (existingTimer !== void 0)
      clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      target.classList.remove("is-scrolling");
      if (target instanceof HTMLElement) {
        const inst = overlayInstances.get(target);
        if (inst)
          inst.setScrolling(false);
      }
      elementTimers.delete(target);
    }, autohideMs);
    elementTimers.set(target, timer);
  }
  function setupGlobalCaptureListeners(runtime) {
    if (globalListenerRegistered || typeof document === "undefined")
      return;
    globalListenerRegistered = true;
    const onGlobalScroll = (e) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        triggerContainerMotion(target);
      }
    };
    let pointerRaf = null;
    const onGlobalPointerMove = (e) => {
      if (pointerRaf !== null)
        return;
      const target = e.target;
      pointerRaf = requestAnimationFrame(() => {
        pointerRaf = null;
        if (target instanceof Element) {
          const scrollContainer = findScrollParent(target);
          if (scrollContainer) {
            triggerContainerMotion(scrollContainer);
          }
        }
      });
    };
    const onWindowResize = () => syncAllOverlayScrollbars();
    document.addEventListener("scroll", onGlobalScroll, { capture: true, passive: true });
    document.addEventListener("pointermove", onGlobalPointerMove, { capture: true, passive: true });
    window.addEventListener("resize", onWindowResize, { passive: true });
    if (runtime && runtime.registerCleanup) {
      runtime.registerCleanup(() => {
        document.removeEventListener("scroll", onGlobalScroll, { capture: true });
        document.removeEventListener("pointermove", onGlobalPointerMove, { capture: true });
        window.removeEventListener("resize", onWindowResize);
        if (pointerRaf !== null)
          cancelAnimationFrame(pointerRaf);
        globalListenerRegistered = false;
      });
    }
  }
  var scrollbarSheetRef, globalConfig, globalListenerRegistered, elementTimers, overlayInstances, activeInstances, OverlayScrollbarInstance, scrollbarModule, scrollbar_default;
  var init_scrollbar = __esm({
    "src/modules/attributes/scrollbar.ts"() {
      init_styles();
      scrollbarSheetRef = { sheet: null };
      if (typeof document !== "undefined") {
        ensureScrollbarStyles();
      }
      globalConfig = {
        mode: "native",
        autohide: 800,
        thin: true,
        width: "0.375rem",
        height: "0.375rem",
        fade: "0.4s",
        fadeIn: "0.2s",
        fadeOut: "0.4s",
        fadeTiming: "cubic-bezier(0.4, 0, 0.2, 1)"
      };
      globalListenerRegistered = false;
      elementTimers = /* @__PURE__ */ new WeakMap();
      overlayInstances = /* @__PURE__ */ new WeakMap();
      activeInstances = /* @__PURE__ */ new Set();
      OverlayScrollbarInstance = class {
        el;
        host;
        trackV = null;
        thumbV = null;
        trackH = null;
        thumbH = null;
        isDragging = false;
        dragStartY = 0;
        dragStartX = 0;
        dragStartScrollTop = 0;
        dragStartScrollLeft = 0;
        activeAxis = "v";
        rafId = null;
        cachedOverflowY = null;
        cachedOverflowX = null;
        cachedRTL = false;
        lastStyleCheck = 0;
        constructor(el) {
          this.el = el;
          this.host = el.parentElement || document.body;
          activeInstances.add(this);
          this.init();
        }
        init() {
          if (this.host !== document.body && window.getComputedStyle(this.host).position === "static") {
            this.host.style.position = "relative";
          }
          this.el.classList.add("scrollbar-overlay-active");
          if (globalConfig.autohide === false) {
            this.el.classList.add("scrollbar-no-autohide");
          }
          this.trackV = document.createElement("div");
          this.trackV.className = "scrollbar-track-v";
          this.trackV.style.display = "none";
          this.thumbV = document.createElement("div");
          this.thumbV.className = "scrollbar-thumb-v";
          this.trackV.appendChild(this.thumbV);
          this.host.appendChild(this.trackV);
          this.trackH = document.createElement("div");
          this.trackH.className = "scrollbar-track-h";
          this.trackH.style.display = "none";
          this.thumbH = document.createElement("div");
          this.thumbH.className = "scrollbar-thumb-h";
          this.trackH.appendChild(this.thumbH);
          this.host.appendChild(this.trackH);
          this.bindEvents();
          this.update();
        }
        setScrolling(active) {
          if (active) {
            this.trackV?.classList.add("is-scrolling");
            this.trackH?.classList.add("is-scrolling");
          } else {
            this.trackV?.classList.remove("is-scrolling");
            this.trackH?.classList.remove("is-scrolling");
          }
        }
        scheduleUpdate() {
          if (this.rafId !== null)
            return;
          this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.update();
          });
        }
        update() {
          const { clientHeight, scrollHeight, clientWidth, scrollWidth, scrollTop, scrollLeft } = this.el;
          if (!this.el.isConnected || this.el.getAttribute("data-scrollbar") === "none" || this.el.classList.contains("scrollbar-none") || clientHeight === 0 || clientWidth === 0 || this.el.style.display === "none" || this.el.offsetParent === null) {
            if (this.trackV) {
              this.trackV.style.display = "none";
              if (this.thumbV) {
                this.thumbV.style.opacity = "0";
                this.thumbV.style.pointerEvents = "none";
              }
            }
            if (this.trackH) {
              this.trackH.style.display = "none";
              if (this.thumbH) {
                this.thumbH.style.opacity = "0";
                this.thumbH.style.pointerEvents = "none";
              }
            }
            return;
          }
          const s = window.getComputedStyle(this.el);
          if (s.display === "none" || s.visibility === "hidden" || this.host !== document.body && window.getComputedStyle(this.host).display === "none") {
            if (this.trackV) {
              this.trackV.style.display = "none";
              if (this.thumbV) {
                this.thumbV.style.opacity = "0";
                this.thumbV.style.pointerEvents = "none";
              }
            }
            if (this.trackH) {
              this.trackH.style.display = "none";
              if (this.thumbH) {
                this.thumbH.style.opacity = "0";
                this.thumbH.style.pointerEvents = "none";
              }
            }
            return;
          }
          const now = performance.now();
          if (this.cachedOverflowY === null || now - this.lastStyleCheck > 250) {
            this.lastStyleCheck = now;
            this.cachedRTL = s.direction === "rtl";
            this.cachedOverflowY = s.overflowY !== "hidden" && s.overflowY !== "clip" && s.overflow !== "hidden" && (s.overflowY === "auto" || s.overflowY === "scroll");
            this.cachedOverflowX = s.overflowX !== "hidden" && s.overflowX !== "clip" && s.overflow !== "hidden" && (s.overflowX === "auto" || s.overflowX === "scroll");
          }
          const isRTL = this.cachedRTL;
          const isFixed = this.host === document.body;
          const canScrollY = this.cachedOverflowY && scrollHeight - clientHeight > 1 && clientHeight > 0;
          if (canScrollY) {
            if (this.trackV && this.trackV.style.display !== "block")
              this.trackV.style.display = "block";
            if (this.trackV) {
              if (isFixed) {
                const rect = this.el.getBoundingClientRect();
                this.trackV.style.position = "fixed";
                this.trackV.style.top = `${rect.top}px`;
                this.trackV.style.height = `${clientHeight}px`;
                if (isRTL) {
                  this.trackV.style.left = `${rect.left + 2}px`;
                  this.trackV.style.right = "auto";
                } else {
                  this.trackV.style.right = `${window.innerWidth - rect.right + 2}px`;
                  this.trackV.style.left = "auto";
                }
              } else {
                this.trackV.style.position = "absolute";
                this.trackV.style.top = `${this.el.offsetTop}px`;
                this.trackV.style.height = `${clientHeight}px`;
                if (isRTL) {
                  this.trackV.style.left = `${this.el.offsetLeft + 2}px`;
                  this.trackV.style.right = "auto";
                } else {
                  const rightOffset = Math.max(2, this.host.clientWidth - (this.el.offsetLeft + this.el.clientWidth) + 2);
                  this.trackV.style.right = `${rightOffset}px`;
                  this.trackV.style.left = "auto";
                }
              }
            }
            const thumbHeight = Math.max(24, clientHeight / scrollHeight * clientHeight);
            const maxScrollTop = scrollHeight - clientHeight;
            const maxThumbTop = clientHeight - thumbHeight;
            const thumbTop = maxScrollTop > 0 ? scrollTop / maxScrollTop * maxThumbTop : 0;
            const heightPx = `${thumbHeight}px`;
            if (this.thumbV.style.height !== heightPx) {
              this.thumbV.style.height = heightPx;
            }
            this.thumbV.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
          } else {
            if (this.trackV && this.trackV.style.display !== "none")
              this.trackV.style.display = "none";
          }
          const canScrollX = this.cachedOverflowX && scrollWidth - clientWidth > 1 && clientWidth > 0;
          if (canScrollX) {
            if (this.trackH && this.trackH.style.display !== "block")
              this.trackH.style.display = "block";
            if (this.trackH) {
              if (isFixed) {
                const rect = this.el.getBoundingClientRect();
                this.trackH.style.position = "fixed";
                this.trackH.style.left = `${rect.left}px`;
                this.trackH.style.width = `${clientWidth}px`;
                this.trackH.style.bottom = `${window.innerHeight - rect.bottom + 2}px`;
              } else {
                this.trackH.style.position = "absolute";
                this.trackH.style.left = `${this.el.offsetLeft}px`;
                this.trackH.style.width = `${clientWidth}px`;
                const bottomOffset = Math.max(2, this.host.clientHeight - (this.el.offsetTop + this.el.clientHeight) + 2);
                this.trackH.style.bottom = `${bottomOffset}px`;
              }
            }
            const thumbWidth = Math.max(24, clientWidth / scrollWidth * clientWidth);
            const maxScrollLeft = scrollWidth - clientWidth;
            const maxThumbLeft = clientWidth - thumbWidth;
            const absScrollLeft = Math.abs(scrollLeft);
            const thumbLeft = maxScrollLeft > 0 ? absScrollLeft / maxScrollLeft * maxThumbLeft : 0;
            const thumbX = isRTL ? -thumbLeft : thumbLeft;
            const widthPx = `${thumbWidth}px`;
            if (this.thumbH.style.width !== widthPx) {
              this.thumbH.style.width = widthPx;
            }
            this.thumbH.style.transform = `translate3d(${thumbX}px, 0, 0)`;
          } else {
            if (this.trackH && this.trackH.style.display !== "none")
              this.trackH.style.display = "none";
          }
        }
        bindEvents() {
          this.thumbV.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDragging = true;
            this.activeAxis = "v";
            this.dragStartY = e.clientY;
            this.dragStartScrollTop = this.el.scrollTop;
            this.thumbV.classList.add("is-dragging");
            this.thumbV.setPointerCapture(e.pointerId);
            const onPointerMove = (moveEvt) => {
              if (!this.isDragging || this.activeAxis !== "v")
                return;
              const deltaY = moveEvt.clientY - this.dragStartY;
              const clientHeight = this.el.clientHeight;
              const scrollHeight = this.el.scrollHeight;
              const thumbHeight = Math.max(24, clientHeight / scrollHeight * clientHeight);
              const maxThumbTop = clientHeight - thumbHeight;
              const maxScrollTop = scrollHeight - clientHeight;
              if (maxThumbTop > 0) {
                const scrollDelta = deltaY / maxThumbTop * maxScrollTop;
                this.el.scrollTop = this.dragStartScrollTop + scrollDelta;
              }
            };
            const onPointerUp = (upEvt) => {
              this.isDragging = false;
              this.thumbV.classList.remove("is-dragging");
              try {
                this.thumbV.releasePointerCapture(upEvt.pointerId);
              } catch {
              }
              window.removeEventListener("pointermove", onPointerMove);
              window.removeEventListener("pointerup", onPointerUp);
              window.removeEventListener("pointercancel", onPointerUp);
            };
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointercancel", onPointerUp);
          });
          this.thumbH.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDragging = true;
            this.activeAxis = "h";
            this.dragStartX = e.clientX;
            this.dragStartScrollLeft = this.el.scrollLeft;
            this.thumbH.classList.add("is-dragging");
            this.thumbH.setPointerCapture(e.pointerId);
            const onPointerMove = (moveEvt) => {
              if (!this.isDragging || this.activeAxis !== "h")
                return;
              const deltaX = moveEvt.clientX - this.dragStartX;
              const clientWidth = this.el.clientWidth;
              const scrollWidth = this.el.scrollWidth;
              const thumbWidth = Math.max(24, clientWidth / scrollWidth * clientWidth);
              const maxThumbLeft = clientWidth - thumbWidth;
              const maxScrollLeft = scrollWidth - clientWidth;
              if (maxThumbLeft > 0) {
                const scrollDelta = deltaX / maxThumbLeft * maxScrollLeft;
                this.el.scrollLeft = this.dragStartScrollLeft + (this.cachedRTL ? -scrollDelta : scrollDelta);
              }
            };
            const onPointerUp = (upEvt) => {
              this.isDragging = false;
              this.thumbH.classList.remove("is-dragging");
              try {
                this.thumbH.releasePointerCapture(upEvt.pointerId);
              } catch {
              }
              window.removeEventListener("pointermove", onPointerMove);
              window.removeEventListener("pointerup", onPointerUp);
              window.removeEventListener("pointercancel", onPointerUp);
            };
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointercancel", onPointerUp);
          });
          this.trackV.addEventListener("pointerdown", (e) => {
            if (e.target === this.thumbV)
              return;
            e.stopPropagation();
            e.preventDefault();
            const rect = this.trackV.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clientHeight = this.el.clientHeight;
            const scrollHeight = this.el.scrollHeight;
            const thumbHeight = Math.max(24, clientHeight / scrollHeight * clientHeight);
            const targetThumbTop = clickY - thumbHeight / 2;
            const maxThumbTop = clientHeight - thumbHeight;
            const maxScrollTop = scrollHeight - clientHeight;
            if (maxThumbTop > 0) {
              this.el.scrollTop = Math.max(0, Math.min(maxScrollTop, targetThumbTop / maxThumbTop * maxScrollTop));
            }
          });
          this.trackH.addEventListener("pointerdown", (e) => {
            if (e.target === this.thumbH)
              return;
            e.stopPropagation();
            e.preventDefault();
            const rect = this.trackH.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clientWidth = this.el.clientWidth;
            const scrollWidth = this.el.scrollWidth;
            const thumbWidth = Math.max(24, clientWidth / scrollWidth * clientWidth);
            const targetThumbLeft = clickX - thumbWidth / 2;
            const maxThumbLeft = clientWidth - thumbWidth;
            const maxScrollLeft = scrollWidth - clientWidth;
            if (maxThumbLeft > 0) {
              this.el.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetThumbLeft / maxThumbLeft * maxScrollLeft));
            }
          });
        }
        destroy() {
          if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
          }
          if (this.trackV) {
            this.trackV.style.display = "none";
            this.trackV.remove();
          }
          if (this.trackH) {
            this.trackH.style.display = "none";
            this.trackH.remove();
          }
          this.el.classList.remove("scrollbar-overlay-active");
          this.el.classList.remove("scrollbar-no-autohide");
          activeInstances.delete(this);
        }
      };
      scrollbarModule = {
        name: "scrollbar",
        attribute: "scrollbar",
        onRegister(_context) {
          if (typeof document !== "undefined") {
            ensureScrollbarStyles(document);
          }
        },
        handle: (el, value, runtime) => {
          const isGlobal = el.hasAttribute("data-scrollbar_global") || el.tagName.toLowerCase() === "html";
          let config = {};
          if (value && value.trim()) {
            try {
              const evaluated = runtime.evaluate(el, value);
              if (typeof evaluated === "object" && evaluated !== null) {
                config = evaluated;
              } else if (typeof evaluated === "string") {
                if (evaluated === "overlay") {
                  config = { mode: "overlay" };
                } else if (evaluated === "native") {
                  config = { mode: "native" };
                } else if (evaluated === "none") {
                  config = { mode: "none" };
                } else if (evaluated === "auto-hide" || evaluated === "autohide") {
                  config = { autohide: 800 };
                } else if (!isNaN(Number(evaluated))) {
                  config = { autohide: Number(evaluated) };
                }
              }
            } catch {
              if (value === "overlay")
                config = { mode: "overlay" };
              if (value === "none")
                config = { mode: "none" };
            }
          }
          if (isGlobal) {
            globalConfig = { ...globalConfig, ...config };
            el.setAttribute("data-scrollbar_global", "true");
            ensureScrollbarStyles(el.getRootNode(), globalConfig);
            setupGlobalCaptureListeners(runtime);
            syncAllOverlayScrollbars();
          } else {
            ensureScrollbarStyles(el.getRootNode());
          }
          const merged = { ...globalConfig, ...config };
          if (merged.mode === "none") {
            el.classList.add("scrollbar-none");
            return;
          }
          if (merged.mode === "overlay") {
            const overlayInst = attachOverlayScrollbar(el);
            if (overlayInst && !isGlobal) {
              return () => {
                overlayInst.destroy();
                overlayInstances.delete(el);
              };
            }
          }
        }
      };
      scrollbar_default = scrollbarModule;
    }
  });

  // src/modules/attributes/show.ts
  var show_exports = {};
  __export(show_exports, {
    default: () => show_default
  });
  var showModule, show_default;
  var init_show = __esm({
    "src/modules/attributes/show.ts"() {
      init_debug();
      showModule = {
        name: "show",
        attribute: "show",
        handle: (el, value, runtime) => {
          const originalDisplay = el.style.display === "none" ? "" : el.style.display;
          try {
            const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
              const show = Boolean(runtime.evaluate(el, value));
              if (show) {
                if (originalDisplay) {
                  el.style.display = originalDisplay;
                } else {
                  el.style.removeProperty("display");
                }
              } else {
                el.style.display = "none";
              }
            });
            return cleanup;
          } catch (e) {
            initError("show", `Failed to initialize show: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
        }
      };
      show_default = showModule;
    }
  });

  // src/modules/attributes/signal.ts
  var signal_exports = {};
  __export(signal_exports, {
    default: () => signal_default
  });
  var signalModule, signal_default;
  var init_signal = __esm({
    "src/modules/attributes/signal.ts"() {
      init_scope();
      init_reactivity();
      signalModule = {
        name: "signal",
        attribute: "signal",
        metadata: {
          after: ["ingest"],
          before: ["class", "bind", "component", "router", "on", "show", "style"]
        },
        handle: (el, value, runtime, parsedAttr) => {
          runtime.log(`[Nexus Signal] Handling signal on <${el.tagName}> with value:`, value.substring(0, 50) + "...");
          let expression = value;
          if (!expression && el.tagName === "SCRIPT") {
            expression = el.textContent || "";
          }
          if (!expression.trim())
            return;
          const parsed = parsedAttr || runtime.parseAttribute("data-signal", runtime, el);
          const isGlobal = parsed?.argument === "global" || parsed?.modifiers.includes("global") || el.hasAttribute("data-init") || el.hasAttribute("data-ux-init");
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
          try {
            const newState = runtime.evaluate(el, expression);
            if (typeof newState === "object" && newState !== null) {
              if (isGlobal) {
                const globals = runtime.globalSignals();
                Object.keys(newState).forEach((key) => {
                  if (!(key in globals)) {
                    globals[key] = newState[key];
                  }
                });
                stateRef.value = globals;
              } else {
                stateRef.value = newState;
              }
            }
          } catch (e) {
            runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, expression);
            return;
          }
          if (!isGlobal) {
            addCleanup = addScopeToNode(el, scopeProxy);
          }
          return () => {
            if (addCleanup)
              addCleanup();
          };
        }
      };
      signal_default = signalModule;
    }
  });

  // src/modules/attributes/style.ts
  var style_exports = {};
  __export(style_exports, {
    default: () => style_default
  });
  var styleModule, style_default;
  var init_style = __esm({
    "src/modules/attributes/style.ts"() {
      init_debug();
      styleModule = {
        name: "style",
        attribute: "style",
        handle: (el, value, runtime, parsedAttr) => {
          const parsed = parsedAttr || runtime.parseAttribute("data-style", runtime, el);
          if (!parsed || parsed.argument)
            return;
          try {
            const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
              const result = runtime.evaluate(el, value);
              runtime.reconcileStyle(el, result);
            });
            return cleanup;
          } catch (e) {
            initError("style", `Failed to reconcile style: ${e instanceof Error ? e.message : String(e)}`, el, value);
          }
        }
      };
      style_default = styleModule;
    }
  });

  // src/modules/attributes/switcher.ts
  var switcher_exports = {};
  __export(switcher_exports, {
    default: () => switcher_default
  });
  var switcherModule, switcher_default;
  var init_switcher = __esm({
    "src/modules/attributes/switcher.ts"() {
      init_debug();
      init_scope();
      switcherModule = {
        name: "switcher",
        attribute: "switcher",
        metadata: {
          after: ["for", "signal"]
        },
        handle: (el, expression, runtime, parsedAttr) => {
          if (parsedAttr?.argument)
            return;
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
      switcher_default = switcherModule;
    }
  });

  // src/modules/attributes/teleport.ts
  var teleport_exports = {};
  __export(teleport_exports, {
    default: () => teleport_default,
    teleportAttribute: () => teleportAttribute
  });
  var teleportAttribute, teleport_default;
  var init_teleport = __esm({
    "src/modules/attributes/teleport.ts"() {
      init_consts();
      init_scope();
      teleportAttribute = {
        name: "teleport",
        attribute: "teleport",
        handle: (element, value, runtime, parsed) => {
          const modifiers = parsed?.modifiers ?? [];
          if (parsed?.argument === "mode" && !modifiers.length)
            return;
          if (modifiers.includes("drop") || parsed?.argument === "drop") {
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
                const dragState2 = globalThis._dragState;
                if (!dragState2) {
                  console.warn("[teleport] No drag state \u2014 was the source dragged?");
                  return;
                }
                const { fromIndex, sourceContainer, element: draggedEl, sourceList, reorderEngine } = dragState2;
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
                    if (child.hasAttribute("data-drag") && child.getAttribute("draggable") === "true" && getComputedStyle(child).display !== "none" && !child[IS_TEMPLATE_KEY] && child.closest("[data-teleport\\:drop]") === element) {
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
                  } catch (err) {
                    runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, "teleport-mutate");
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
              } catch (err) {
                runtime.reportError(err instanceof Error ? err : new Error(String(err)), element, "teleport-drop");
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
          let clone = null;
          if (element instanceof HTMLTemplateElement || element.tagName.toLowerCase() === "template") {
            const templateEl = element;
            let targetChild = null;
            if (templateEl.content) {
              targetChild = templateEl.content.firstElementChild || templateEl.content.children && templateEl.content.children[0];
              if (!targetChild && templateEl.content.childNodes) {
                for (let i = 0; i < templateEl.content.childNodes.length; i++) {
                  const node = templateEl.content.childNodes[i];
                  if (node instanceof HTMLElement || node.nodeType === 1) {
                    targetChild = node;
                    break;
                  }
                }
              }
            }
            if (!targetChild) {
              targetChild = templateEl.firstElementChild || templateEl.children && templateEl.children[0];
            }
            if (!targetChild && templateEl.innerHTML && templateEl.innerHTML.trim()) {
              const temp = document.createElement("div");
              temp.innerHTML = templateEl.innerHTML.trim();
              targetChild = temp.firstElementChild;
            }
            if (targetChild instanceof HTMLElement) {
              clone = targetChild.cloneNode(true);
            }
          } else {
            clone = element.cloneNode(true);
            clone.removeAttribute("data-teleport");
          }
          if (!clone)
            return;
          const stack = element[DATA_STACK_KEY] || getDataStack(element);
          if (stack && stack.length) {
            clone[DATA_STACK_KEY] = stack;
          }
          let isInitialized = false;
          const resolveTargetSelector = () => {
            try {
              const evaluated = runtime.evaluate(element, value);
              if (typeof evaluated === "string" && evaluated.trim()) {
                return evaluated.trim();
              }
            } catch {
            }
            const raw = value.trim();
            if (raw && typeof document !== "undefined") {
              try {
                if (document.querySelector(raw))
                  return raw;
              } catch {
              }
            }
            return "body";
          };
          const updateTarget = () => {
            const targetSelector = resolveTargetSelector();
            if (!targetSelector)
              return;
            const target = document.querySelector(targetSelector);
            if (!target) {
              runtime.warn?.(`[Teleport] Target "${targetSelector}" not found.`);
              return;
            }
            if (clone.parentNode !== target) {
              const wasOpen = typeof clone.matches === "function" && clone.matches(":popover-open");
              if (modifiers.includes("prepend")) {
                target.insertBefore(clone, target.firstChild);
              } else {
                target.appendChild(clone);
              }
              if (wasOpen && typeof clone.showPopover === "function") {
                try {
                  clone.showPopover();
                } catch {
                }
              }
            }
            if (!isInitialized) {
              isInitialized = true;
              runtime.processElement?.(clone);
            }
          };
          updateTarget();
          const [_runner, effectCleanup] = runtime.elementBoundEffect(element, updateTarget);
          return () => {
            if (typeof effectCleanup === "function") {
              effectCleanup();
            }
            if (clone.parentNode) {
              clone.parentNode.removeChild(clone);
            }
          };
        }
      };
      teleport_default = teleportAttribute;
    }
  });

  // src/modules/attributes/theme.ts
  var theme_exports = {};
  __export(theme_exports, {
    default: () => theme_default
  });
  var ALL_DAISYUI_THEMES, themeModule, theme_default;
  var init_theme = __esm({
    "src/modules/attributes/theme.ts"() {
      init_scope();
      init_debug();
      ALL_DAISYUI_THEMES = [
        "light",
        "dark",
        "cupcake",
        "bumblebee",
        "emerald",
        "corporate",
        "synthwave",
        "retro",
        "cyberpunk",
        "valentine",
        "halloween",
        "garden",
        "forest",
        "aqua",
        "lofi",
        "pastel",
        "fantasy",
        "wireframe",
        "black",
        "luxury",
        "dracula",
        "cmyk",
        "autumn",
        "business",
        "acid",
        "lemonade",
        "night",
        "coffee",
        "winter",
        "dim",
        "nord",
        "sunset"
      ];
      themeModule = {
        name: "theme",
        attribute: "theme",
        metadata: {
          before: ["signal", "switcher", "class", "style", "attr", "on", "text", "html"]
        },
        handle: (el, expression, runtime) => {
          let rawConfig = {};
          if (expression && expression.trim()) {
            try {
              rawConfig = runtime.evaluate(el, expression);
            } catch (_) {
              if (expression.startsWith("{")) {
                try {
                  rawConfig = new Function("return (" + expression + ")")();
                } catch (_2) {
                }
              } else {
                rawConfig = { default: expression.trim() };
              }
            }
          }
          if (!rawConfig || typeof rawConfig !== "object") {
            rawConfig = { default: "auto" };
          }
          let initialModeState = 2;
          if (rawConfig.default === "light" || rawConfig.default === 0)
            initialModeState = 0;
          else if (rawConfig.default === "dark" || rawConfig.default === 1)
            initialModeState = 1;
          let savedLight = rawConfig.light?.theme || "light";
          let savedDark = rawConfig.dark?.theme || "dark";
          if (typeof localStorage !== "undefined") {
            try {
              const savedState = localStorage.getItem("ux_theme_state");
              if (savedState !== null)
                initialModeState = Number(savedState);
              const l = localStorage.getItem("ux_theme_light");
              if (l)
                savedLight = l;
              const d = localStorage.getItem("ux_theme_dark");
              if (d)
                savedDark = d;
            } catch (_) {
            }
          }
          const modeState = runtime.ref(initialModeState);
          const lightSelected = runtime.ref(savedLight);
          const darkSelected = runtime.ref(savedDark);
          const systemDark = runtime.ref(false);
          let mq = null;
          let listener = null;
          if (typeof window !== "undefined" && window.matchMedia) {
            mq = window.matchMedia("(prefers-color-scheme: dark)");
            systemDark.value = mq.matches;
            listener = (e) => {
              systemDark.value = e.matches;
            };
            mq.addEventListener("change", listener);
          }
          const currentTheme = runtime.computed(() => {
            const s = modeState.value;
            if (s === 2) {
              return systemDark.value ? darkSelected.value : lightSelected.value;
            }
            return s === 1 ? darkSelected.value : lightSelected.value;
          });
          const activeModeName = runtime.computed(() => {
            const s = modeState.value;
            if (s === 0)
              return "light";
            if (s === 1)
              return "dark";
            return "system";
          });
          const themeIcon = runtime.computed(() => {
            const s = modeState.value;
            if (s === 0)
              return "material-symbols-light:light-mode-outline";
            if (s === 1)
              return "material-symbols-light:dark-mode-outline";
            return "material-symbols-light:light-mode-auto-outline";
          });
          const themeTypesComputed = runtime.computed(() => [
            { type: "light", title: "Light", selected: lightSelected.value },
            { type: "dark", title: "Dark", selected: darkSelected.value },
            { type: "system", title: "System", selected: "system" }
          ]);
          const helpers = {
            $theme: {
              get state() {
                return modeState.value;
              },
              set state(v) {
                modeState.value = v;
              },
              get current() {
                return currentTheme.value;
              },
              get mode() {
                return activeModeName.value;
              },
              get isSystem() {
                return modeState.value === 2;
              },
              get themes() {
                return ALL_DAISYUI_THEMES;
              },
              get types() {
                return themeTypesComputed.value;
              }
            },
            get $activeTheme() {
              return currentTheme.value;
            },
            get $activeMode() {
              return activeModeName.value;
            },
            get $themeIcon() {
              return themeIcon.value;
            },
            $switchTheme: () => {
              modeState.value = (modeState.value + 1) % 3;
              if (typeof localStorage !== "undefined") {
                try {
                  localStorage.setItem("ux_theme_state", String(modeState.value));
                } catch (_) {
                }
              }
            },
            $setTheme: (t) => {
              const isDark = modeState.value === 1 || modeState.value === 2 && systemDark.value;
              if (isDark) {
                darkSelected.value = t;
                if (typeof localStorage !== "undefined") {
                  try {
                    localStorage.setItem("ux_theme_dark", t);
                  } catch (_) {
                  }
                }
              } else {
                lightSelected.value = t;
                if (typeof localStorage !== "undefined") {
                  try {
                    localStorage.setItem("ux_theme_light", t);
                  } catch (_) {
                  }
                }
              }
            }
          };
          addScopeToNode(el, helpers);
          try {
            const [_runner, cleanupEffect2] = runtime.elementBoundEffect(el, () => {
              const themeToApply = currentTheme.value;
              const isDark = activeModeName.value === "dark" || activeModeName.value === "system" && systemDark.value;
              if (themeToApply) {
                el.setAttribute("data-theme", themeToApply);
              }
              if (isDark) {
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
            initError("theme", `Failed to bind theme: ${e instanceof Error ? e.message : String(e)}`, el, expression);
          }
        }
      };
      theme_default = themeModule;
    }
  });

  // src/modules/sprites/animate.ts
  var animate_exports = {};
  __export(animate_exports, {
    animate: () => animate,
    animateSpriteModule: () => animateSpriteModule,
    default: () => animate_default,
    flip: () => flip
  });
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
  var getEffectDurations, applyClasses, removeClasses, animateSpriteModule, animate_default;
  var init_animate = __esm({
    "src/modules/sprites/animate.ts"() {
      init_animation();
      animate.flip = flip;
      animate.out = (el, config, cb) => animate(el, "leave", config, cb);
      getEffectDurations = (el) => {
        const styles = globalThis.window.getComputedStyle(el);
        const parse = (str) => str.split(",").map((s) => parseFloat(s) * 1e3 || 0);
        const trans = parse(styles.transitionDuration);
        const delay = parse(styles.transitionDelay);
        const anim = parse(styles.animationDuration);
        let max = 0;
        trans.forEach((d, i) => max = Math.max(max, d + (delay[i] || 0)));
        return Math.max(max, ...anim, 0);
      };
      applyClasses = (el, s) => s.split(" ").filter(Boolean).forEach((c) => el.classList.add(c));
      removeClasses = (el, s) => s.split(" ").filter(Boolean).forEach((c) => el.classList.remove(c));
      animateSpriteModule = {
        name: "animate",
        key: "$animate",
        sprites: () => animate
      };
      animate_default = animateSpriteModule;
    }
  });

  // src/engine/utils/pwa.ts
  function hasServiceWorker() {
    return typeof navigator !== "undefined" && "serviceWorker" in navigator;
  }
  function createPwaAsyncOp(runtime, initial = {}) {
    return runtime.reactive({
      status: initial.status ?? "pending",
      error: initial.error ?? null,
      ...initial.data !== void 0 ? { data: initial.data } : {}
    });
  }
  function runPwaOp(runtime, fn, options = {}) {
    const initialStatus = options.initialStatus ?? "pending";
    const successStatus = options.successStatus ?? (initialStatus === "loading" ? "ready" : "done");
    const op = runtime.reactive({
      status: initialStatus,
      error: null,
      ...options.initialData !== void 0 ? { data: options.initialData } : {}
    });
    if (!hasServiceWorker()) {
      op.error = options.missingServiceWorkerMsg ?? "Service Worker not available";
      op.status = "error";
      return op;
    }
    (async () => {
      try {
        const result = await fn();
        if (result !== void 0) {
          op.data = result;
        }
        op.status = successStatus;
      } catch (e) {
        op.error = e instanceof Error ? e.message : String(e);
        op.status = "error";
      }
    })();
    return op;
  }
  function runPwaRegistrationOp(runtime, requiredFeature, fn, options = {}) {
    return runPwaOp(
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
  var init_pwa2 = __esm({
    "src/engine/utils/pwa.ts"() {
    }
  });

  // src/modules/sprites/bgFetch.ts
  var bgFetch_exports = {};
  __export(bgFetch_exports, {
    bgFetchSpriteModule: () => bgFetchSpriteModule,
    createBgFetchApi: () => createBgFetchApi,
    default: () => bgFetch_default
  });
  function createBgFetchApi(runtime) {
    return {
      /**
       * Start a background fetch.
       * Returns reactive { data: BackgroundFetchRegistration | null, status, error }.
       */
      fetch(id, requests, options) {
        let opRef;
        opRef = runPwaRegistrationOp(
          runtime,
          "backgroundFetch",
          async (reg) => {
            const bgFetch = await reg.backgroundFetch.fetch(id, requests, options || {});
            bgFetch.addEventListener("progress", () => {
              opRef.data = { ...bgFetch, downloaded: bgFetch.downloaded, downloadTotal: bgFetch.downloadTotal };
            });
            return bgFetch;
          },
          { featureLabel: "Background Fetch API" }
        );
        return opRef;
      },
      /**
       * Get an existing background fetch registration.
       */
      get(id) {
        return runPwaRegistrationOp(
          runtime,
          "backgroundFetch",
          async (reg) => {
            return await reg.backgroundFetch.get(id);
          },
          { initialStatus: "loading", featureLabel: "Background Fetch API" }
        );
      },
      /**
       * Abort a background fetch.
       */
      abort(id) {
        return runPwaRegistrationOp(
          runtime,
          "backgroundFetch",
          async (reg) => {
            const bgFetch = await reg.backgroundFetch.get(id);
            if (bgFetch) {
              await bgFetch.abort();
            } else {
              throw new Error(`No background fetch with id '${id}'`);
            }
          },
          { featureLabel: "Background Fetch API" }
        );
      }
    };
  }
  var bgFetchSpriteModule, bgFetch_default;
  var init_bgFetch = __esm({
    "src/modules/sprites/bgFetch.ts"() {
      init_pwa2();
      bgFetchSpriteModule = {
        name: "bgFetch",
        key: "$bgFetch",
        sprites: (runtime) => createBgFetchApi(runtime)
      };
      bgFetch_default = bgFetchSpriteModule;
    }
  });

  // src/modules/sprites/bgSync.ts
  var bgSync_exports = {};
  __export(bgSync_exports, {
    bgSyncSpriteModule: () => bgSyncSpriteModule,
    createBgSyncApi: () => createBgSyncApi,
    default: () => bgSync_default
  });
  function createBgSyncApi(runtime) {
    return {
      /**
       * Register a one-time background sync.
       * Returns reactive { status, error }.
       */
      register(tag) {
        return runPwaRegistrationOp(
          runtime,
          "sync",
          async (reg) => {
            await reg.sync.register(tag);
          },
          { featureLabel: "Background Sync API" }
        );
      },
      /**
       * Get all registered sync tags.
       * Returns reactive { data: string[], status, error }.
       */
      get tags() {
        return runPwaRegistrationOp(
          runtime,
          "sync",
          async (reg) => {
            return await reg.sync.getTags();
          },
          { initialStatus: "loading", initialData: [], featureLabel: "Background Sync API" }
        );
      }
    };
  }
  var bgSyncSpriteModule, bgSync_default;
  var init_bgSync = __esm({
    "src/modules/sprites/bgSync.ts"() {
      init_pwa2();
      bgSyncSpriteModule = {
        name: "bgSync",
        key: "$bgSync",
        sprites: (runtime) => createBgSyncApi(runtime)
      };
      bgSync_default = bgSyncSpriteModule;
    }
  });

  // src/modules/sprites/flow.ts
  var flow_exports2 = {};
  __export(flow_exports2, {
    default: () => flow_default2,
    flowModule: () => flowModule
  });
  var flowModule, flow_default2;
  var init_flow2 = __esm({
    "src/modules/sprites/flow.ts"() {
      init_reactivity();
      init_consts();
      flowModule = {
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
          const handleDirections = {
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
            top: { x: 0, y: -1 },
            bottom: { x: 0, y: 1 }
          };
          const getDirection = (source, sourcePosition, target) => {
            if (sourcePosition === "left" || sourcePosition === "right") {
              return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
            }
            return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
          };
          const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
          const getBend = (a, b, c, size) => {
            const bendSize = Math.min(dist(a, b) / 2, dist(b, c) / 2, size);
            const { x, y } = b;
            if (bendSize <= 0 || a.x === x && x === c.x || a.y === y && y === c.y) {
              return `L ${x} ${y}`;
            }
            if (a.y === y) {
              const xDir2 = a.x < c.x ? -1 : 1;
              const yDir2 = a.y < c.y ? 1 : -1;
              return `L ${x + bendSize * xDir2},${y} Q ${x},${y} ${x},${y + bendSize * yDir2}`;
            }
            const xDir = a.x < c.x ? 1 : -1;
            const yDir = a.y < c.y ? -1 : 1;
            return `L ${x},${y + bendSize * yDir} Q ${x},${y} ${x + bendSize * xDir},${y}`;
          };
          const smoothStepPath = (sx, sy, sSide, tx, ty, tSide, borderRadius = 5, offset = 20, stepPosition = 0.5) => {
            const source = { x: sx, y: sy };
            const target = { x: tx, y: ty };
            const sourceDir = handleDirections[sSide];
            const targetDir = handleDirections[tSide];
            const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
            const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
            const dir = getDirection(sourceGapped, sSide, targetGapped);
            const dirAccessor = dir.x !== 0 ? "x" : "y";
            const currDir = dir[dirAccessor];
            let points = [];
            let centerX = (sx + tx) / 2;
            let centerY = (sy + ty) / 2;
            if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
              if (dirAccessor === "x") {
                centerX = sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
                centerY = (sourceGapped.y + targetGapped.y) / 2;
              } else {
                centerX = (sourceGapped.x + targetGapped.x) / 2;
                centerY = sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
              }
              const verticalSplit = [
                { x: centerX, y: sourceGapped.y },
                { x: centerX, y: targetGapped.y }
              ];
              const horizontalSplit = [
                { x: sourceGapped.x, y: centerY },
                { x: targetGapped.x, y: centerY }
              ];
              points = sourceDir[dirAccessor] === currDir ? dirAccessor === "x" ? verticalSplit : horizontalSplit : dirAccessor === "x" ? horizontalSplit : verticalSplit;
            } else {
              const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }];
              const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }];
              points = dirAccessor === "x" ? sourceDir.x === currDir ? targetSource : sourceTarget : sourceDir.y === currDir ? sourceTarget : targetSource;
            }
            const pathPoints = [source, sourceGapped, ...points, targetGapped, target];
            const deduped = [];
            for (let i = 0; i < pathPoints.length; i++) {
              const p = pathPoints[i];
              const prev = deduped[deduped.length - 1];
              if (!prev || prev.x !== p.x || prev.y !== p.y) {
                deduped.push(p);
              }
            }
            let path = `M ${deduped[0].x} ${deduped[0].y}`;
            for (let i = 1; i < deduped.length - 1; i++) {
              path += " " + getBend(deduped[i - 1], deduped[i], deduped[i + 1], borderRadius);
            }
            path += ` L ${deduped[deduped.length - 1].x} ${deduped[deduped.length - 1].y}`;
            return { path, labelX: centerX, labelY: centerY };
          };
          const bezierPath = (sx, sy, ssIde, tx, ty, tSide, curvature = 0.25) => {
            const [scx, scy] = controlWithCurvature(ssIde, sx, sy, tx, ty, curvature);
            const [tcx, tcy] = controlWithCurvature(tSide, tx, ty, sx, sy, curvature);
            const path = `M${sx},${sy} C${scx},${scy} ${tcx},${tcy} ${tx},${ty}`;
            const labelX = sx * 0.125 + scx * 0.375 + tcx * 0.375 + tx * 0.125;
            const labelY = sy * 0.125 + scy * 0.375 + tcy * 0.375 + ty * 0.125;
            return { path, labelX, labelY };
          };
          const straightPath = (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`;
          const viewportOf = (el) => {
            const flow = el?.closest("[data-flow]");
            const vp = flow?.__flowViewport;
            if (vp) {
              const _t = vp.tick;
              return vp;
            }
            return { x: 0, y: 0, zoom: 1 };
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
          const findNode = (id, container) => {
            if (!id)
              return null;
            let el = document.getElementById(id);
            if (el)
              return el;
            el = document.getElementById(`node-${id}`);
            if (el)
              return el;
            if (id.startsWith("node-")) {
              el = document.getElementById(id.slice(5));
              if (el)
                return el;
            }
            const root = container || document;
            return root.querySelector(`[data-id="${id}"], [data-node-id="${id}"]`);
          };
          const findHandle = (node, role) => {
            const real = (sel) => Array.from(node.querySelectorAll(sel)).find((el) => !el[IS_TEMPLATE_KEY] && !el.hasAttribute("data-for")) || null;
            return real(`[data-flow-handle="${role}"]`) || real(`[data-flow-handle-type="${role}"]`) || real("[data-flow-handle]");
          };
          const $flow = {
            /** Screen coordinates -> flow-space (public, xyflow pointToRendererPoint). */
            screenToFlow: (container, x, y, state) => screenToFlow(x, y, container, state),
            /** Bounding box of a node collection in flow-space (supports parentId sub-flows). */
            getBounds: (nodes) => {
              if (!nodes || nodes.length === 0)
                return { x: 0, y: 0, w: 0, h: 0 };
              const nodeMap = /* @__PURE__ */ new Map();
              nodes.forEach((n) => {
                if (n.id)
                  nodeMap.set(String(n.id), n);
              });
              const getAbsolutePos = (n) => {
                const p = n.position || n;
                let x = p.x || 0;
                let y = p.y || 0;
                if (n.parentId && nodeMap.has(String(n.parentId))) {
                  const parentPos = getAbsolutePos(nodeMap.get(String(n.parentId)));
                  x += parentPos.x;
                  y += parentPos.y;
                }
                return { x, y };
              };
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              nodes.forEach((n) => {
                const abs = getAbsolutePos(n);
                const w = n.w || n.width || 160, h = n.h || n.height || 90;
                minX = Math.min(minX, abs.x);
                minY = Math.min(minY, abs.y);
                maxX = Math.max(maxX, abs.x + w);
                maxY = Math.max(maxY, abs.y + h);
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
            /** Zoom in on canvas viewport */
            zoomIn: (target, delta = 0.2) => {
              const container = target instanceof Element ? flowContainer(target) || document.querySelector("[data-flow]") : document.querySelector("[data-flow]");
              const vp = container?.__flowViewport;
              if (vp) {
                vp.zoom = Math.min(4, (vp.zoom || 1) + delta);
                vp.tick = (vp.tick || 0) + 1;
              }
            },
            /** Zoom out on canvas viewport */
            zoomOut: (target, delta = 0.2) => {
              const container = target instanceof Element ? flowContainer(target) || document.querySelector("[data-flow]") : document.querySelector("[data-flow]");
              const vp = container?.__flowViewport;
              if (vp) {
                vp.zoom = Math.max(0.2, (vp.zoom || 1) - delta);
                vp.tick = (vp.tick || 0) + 1;
              }
            },
            /** Reset canvas viewport position and zoom */
            reset: (target) => {
              const container = target instanceof Element ? flowContainer(target) || document.querySelector("[data-flow]") : document.querySelector("[data-flow]");
              const vp = container?.__flowViewport;
              if (vp) {
                vp.x = 0;
                vp.y = 0;
                vp.zoom = 1;
                vp.tick = (vp.tick || 0) + 1;
              }
            },
            /** Fit canvas view to current nodes */
            fit: (target, nodes, padding = 40) => {
              const container = target instanceof Element ? flowContainer(target) || document.querySelector("[data-flow]") : document.querySelector("[data-flow]");
              if (!container)
                return;
              const flow = container;
              const vp = flow?.__flowViewport;
              if (vp && nodes && nodes.length > 0) {
                $flow.fitView(container, vp, nodes, padding);
                vp.tick = (vp.tick || 0) + 1;
              }
            },
            /** Return SVG marker URL reference for arrowhead ends */
            marker: (type = "arrow") => `url(#flow-${type === "arrowclosed" ? "arrow-closed" : "arrow"})`,
            /**
             * Synchronous edge path string between two nodes (by DOM id), computed in
             * flow-space so it is independent of the current pan/zoom.
             *
             * Supports bezier, smoothstep, step, and straight edge types with
             * handle side awareness, corner radiuses, and midpoint label coordinates.
             */
            edge: (sourceId, targetId, options = {}) => {
              const a = findNode(sourceId, options.container);
              const b = findNode(targetId, options.container);
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
              const sSide = srcHandle ? inferSide(srcHandle, a) : "right";
              const tSide = tgtHandle ? inferSide(tgtHandle, b) : "left";
              const type = options.type || "bezier";
              let res;
              if (type === "straight") {
                res = { path: straightPath(s.x, s.y, t.x, t.y), labelX: (s.x + t.x) / 2, labelY: (s.y + t.y) / 2 };
              } else if (type === "step") {
                res = smoothStepPath(s.x, s.y, sSide, t.x, t.y, tSide, 0, options.offset ?? 20, options.stepPosition ?? 0.5);
              } else if (type === "smoothstep") {
                res = smoothStepPath(s.x, s.y, sSide, t.x, t.y, tSide, options.borderRadius ?? 5, options.offset ?? 20, options.stepPosition ?? 0.5);
              } else {
                res = bezierPath(s.x, s.y, sSide, t.x, t.y, tSide, options.curvature ?? 0.25);
              }
              const out = {
                d: res.path,
                labelX: res.labelX,
                labelY: res.labelY,
                toString() {
                  return this.d;
                },
                valueOf() {
                  return this.d;
                }
              };
              return out;
            },
            /**
             * Reactive edge attached to two live DOM elements. Returns a reactive
             * `{ d, labelX, labelY }` that self-updates every frame.
             */
            connect: (elA, elB, options = {}) => {
              const pathData = reactive({ d: "", labelX: 0, labelY: 0 });
              const update = () => {
                if (!elA || !elB || typeof elA.getBoundingClientRect !== "function")
                  return;
                const container = flowContainer(elA) || flowContainer(elB);
                if (!container)
                  return;
                const vp = viewportOf(elA);
                const s = anchorFlow(elA, container, vp);
                const t = anchorFlow(elB, container, vp);
                const sSide = inferSide(elA, elA.parentElement || elA);
                const tSide = inferSide(elB, elB.parentElement || elB);
                const type = options.type || "bezier";
                let res;
                if (type === "straight") {
                  res = { path: straightPath(s.x, s.y, t.x, t.y), labelX: (s.x + t.x) / 2, labelY: (s.y + t.y) / 2 };
                } else if (type === "step") {
                  res = smoothStepPath(s.x, s.y, sSide, t.x, t.y, tSide, 0);
                } else if (type === "smoothstep") {
                  res = smoothStepPath(s.x, s.y, sSide, t.x, t.y, tSide, options.borderRadius ?? 5);
                } else {
                  res = bezierPath(s.x, s.y, sSide, t.x, t.y, tSide, options.curvature ?? 0.25);
                }
                pathData.d = res.path;
                pathData.labelX = res.labelX;
                pathData.labelY = res.labelY;
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
      flow_default2 = flowModule;
    }
  });

  // src/modules/sprites/gql.ts
  var gql_exports = {};
  __export(gql_exports, {
    configureGqlClient: () => configureGqlClient,
    default: () => gql_default,
    gqlSprite: () => gqlSprite,
    gqlSpriteModule: () => gqlSpriteModule
  });
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
      } catch (err) {
        result.errors = [{
          message: err instanceof Error ? err.message : String(err)
        }];
        result.status = "error";
      } finally {
        result.loading = false;
      }
      return result;
    };
  }
  var defaultEndpoint, gqlSpriteModule, gql_default;
  var init_gql = __esm({
    "src/modules/sprites/gql.ts"() {
      init_reactivity();
      defaultEndpoint = "/graphql";
      gqlSpriteModule = {
        name: "gql",
        key: "$gql",
        sprites: (runtime) => gqlSprite(runtime)
      };
      gql_default = gqlSpriteModule;
    }
  });

  // src/modules/sprites/mcp.ts
  var mcp_exports2 = {};
  __export(mcp_exports2, {
    default: () => mcp_default,
    mcpModule: () => mcpModule
  });
  var mcpModule, mcp_default;
  var init_mcp2 = __esm({
    "src/modules/sprites/mcp.ts"() {
      init_reactivity();
      mcpModule = {
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
      mcp_default = mcpModule;
    }
  });

  // src/modules/sprites/periodicSync.ts
  var periodicSync_exports = {};
  __export(periodicSync_exports, {
    createPeriodicSyncApi: () => createPeriodicSyncApi,
    default: () => periodicSync_default,
    periodicSyncSpriteModule: () => periodicSyncSpriteModule
  });
  function createPeriodicSyncApi(runtime) {
    return {
      /**
       * Register a periodic background sync.
       * Returns reactive { status, error }.
       */
      register(tag, options) {
        return runPwaRegistrationOp(
          runtime,
          "periodicSync",
          async (reg) => {
            await reg.periodicSync.register(tag, options || {});
          },
          { featureLabel: "Periodic Background Sync API" }
        );
      },
      /**
       * Unregister a periodic sync tag.
       */
      unregister(tag) {
        return runPwaRegistrationOp(
          runtime,
          "periodicSync",
          async (reg) => {
            await reg.periodicSync.unregister(tag);
          },
          { featureLabel: "Periodic Background Sync API" }
        );
      },
      /**
       * Get all registered periodic sync tags.
       */
      get tags() {
        return runPwaRegistrationOp(
          runtime,
          "periodicSync",
          async (reg) => {
            return await reg.periodicSync.getTags();
          },
          { initialStatus: "loading", initialData: [], featureLabel: "Periodic Background Sync API" }
        );
      }
    };
  }
  var periodicSyncSpriteModule, periodicSync_default;
  var init_periodicSync = __esm({
    "src/modules/sprites/periodicSync.ts"() {
      init_pwa2();
      periodicSyncSpriteModule = {
        name: "periodicSync",
        key: "$periodicSync",
        sprites: (runtime) => createPeriodicSyncApi(runtime)
      };
      periodicSync_default = periodicSyncSpriteModule;
    }
  });

  // src/engine/predictive.ts
  var predictive_exports = {};
  __export(predictive_exports, {
    CorePredictiveEngine: () => CorePredictiveEngine,
    corePredictiveEngine: () => corePredictiveEngine
  });
  var Quadtree, CorePredictiveEngine, corePredictiveEngine;
  var init_predictive = __esm({
    "src/engine/predictive.ts"() {
      init_cache();
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
          if (allIdentical || this.depth >= 8) {
            this.points.push({ el, x, y });
            return true;
          }
          if (!this.divided) {
            this.subdivide();
          }
          return this.northeast.insert(el, x, y) || this.northwest.insert(el, x, y) || this.southeast.insert(el, x, y) || this.southwest.insert(el, x, y);
        }
        subdivide() {
          const { x, y, width, height } = this.bounds;
          const w = width / 2;
          const h = height / 2;
          this.northeast = new _Quadtree({ x: x + w, y, width: w, height: h }, this.capacity);
          this.northwest = new _Quadtree({ x, y, width: w, height: h }, this.capacity);
          this.southeast = new _Quadtree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
          this.southwest = new _Quadtree({ x, y: y + h, width: w, height: h }, this.capacity);
          this.northeast.depth = this.depth + 1;
          this.northwest.depth = this.depth + 1;
          this.southeast.depth = this.depth + 1;
          this.southwest.depth = this.depth + 1;
          this.divided = true;
        }
        contains(x, y) {
          return x >= this.bounds.x && x <= this.bounds.x + this.bounds.width && y >= this.bounds.y && y <= this.bounds.y + this.bounds.height;
        }
        query(range, found = /* @__PURE__ */ new Set()) {
          if (range.x > this.bounds.x + this.bounds.width || range.x + range.width < this.bounds.x || range.y > this.bounds.y + this.bounds.height || range.y + range.height < this.bounds.y) {
            return found;
          }
          for (const p of this.points) {
            if (p.x >= range.x && p.x <= range.x + range.width && p.y >= range.y && p.y <= range.y + range.height) {
              found.add(p.el);
            }
          }
          if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
          }
          return found;
        }
        clear() {
          this.points = [];
          if (this.divided) {
            this.northwest?.clear();
            this.northeast?.clear();
            this.southwest?.clear();
            this.southeast?.clear();
            this.divided = false;
          }
        }
      };
      CorePredictiveEngine = class {
        history = [];
        quadtree;
        viewportWidth = 1920;
        viewportHeight = 1080;
        cleanupFns = [];
        prewarmHook = null;
        activePredictiveNodes = /* @__PURE__ */ new Set();
        eyeTrackingActive = false;
        voiceIntentActive = false;
        debugTracker;
        fadeTimer = null;
        velocity = { x: 0, y: 0, z: 0, t: 1 };
        constructor() {
          if (typeof window !== "undefined") {
            this.viewportWidth = window.innerWidth;
            this.viewportHeight = window.innerHeight;
            this.init();
          }
        }
        init() {
          this.rebuildQuadtree();
          if (typeof window === "undefined")
            return;
          const setupDebugTracker = () => {
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
              halo.setAttribute("fill", "rgba(99, 102, 241, 0.15)");
              halo.setAttribute("stroke", "rgba(99, 102, 241, 0.6)");
              halo.setAttribute("stroke-width", "1.5");
              svg.appendChild(halo);
              const line = document.createElementNS(svgNS, "line");
              line.setAttribute("x1", "100");
              line.setAttribute("y1", "100");
              line.setAttribute("x2", "100");
              line.setAttribute("y2", "100");
              line.setAttribute("stroke", "rgba(99, 102, 241, 0.6)");
              line.setAttribute("stroke-width", "2");
              line.setAttribute("stroke-dasharray", "3 3");
              line.style.opacity = "0";
              svg.appendChild(line);
              const targetLine = document.createElementNS(svgNS, "line");
              targetLine.setAttribute("x1", "100");
              targetLine.setAttribute("y1", "100");
              targetLine.setAttribute("x2", "100");
              targetLine.setAttribute("y2", "100");
              targetLine.setAttribute("stroke", "rgba(34, 197, 94, 0.8)");
              targetLine.setAttribute("stroke-width", "2");
              targetLine.style.opacity = "0";
              svg.appendChild(targetLine);
              document.body.appendChild(svg);
              this.debugTracker = { svg, halo, line, targetLine };
            }
          };
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setupDebugTracker);
          } else {
            setupDebugTracker();
          }
          document.addEventListener("nexus:dom-mutated", () => this.rebuildQuadtree(), { passive: true });
          const onMouseMove = (e) => {
            setupDebugTracker();
            this.recordPoint(e.clientX, e.clientY, 0, performance.now());
            this.processPrediction();
          };
          const onTouchStart = (e) => {
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              this.prewarmElementAtPoint(touch.clientX, touch.clientY);
              this.recordPoint(touch.clientX, touch.clientY, 0, performance.now());
            }
          };
          const onTouchMove = (e) => {
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              this.recordPoint(touch.clientX, touch.clientY, 0, performance.now());
              this.processPrediction();
            }
          };
          const onPointerMove = (e) => {
            if (e.pointerType === "pen") {
              const z = e.pressure ? e.pressure * 10 : 1;
              this.recordPoint(e.clientX, e.clientY, z, performance.now());
              this.processPrediction();
            }
          };
          const onFocusIn = (e) => {
            if (e.target instanceof HTMLElement && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
              this.prewarmElement(e.target);
            }
          };
          let gamepadTimer = null;
          const pollGamepad = () => {
            if (typeof navigator !== "undefined" && navigator.getGamepads) {
              const gamepads = navigator.getGamepads();
              for (const gp of gamepads) {
                if (gp && (gp.buttons.some((b) => b.pressed) || gp.axes.some((a) => Math.abs(a) > 0.2))) {
                  const active = document.activeElement;
                  if (active instanceof HTMLElement) {
                    this.prewarmElement(active);
                  }
                }
              }
            }
            gamepadTimer = requestAnimationFrame(pollGamepad);
          };
          window.addEventListener("mousemove", onMouseMove, { passive: true });
          window.addEventListener("touchstart", onTouchStart, { passive: true });
          window.addEventListener("touchmove", onTouchMove, { passive: true });
          window.addEventListener("pointermove", onPointerMove, { passive: true });
          window.addEventListener("focusin", onFocusIn, { passive: true });
          gamepadTimer = requestAnimationFrame(pollGamepad);
          this.cleanupFns.push(() => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("focusin", onFocusIn);
            if (gamepadTimer)
              cancelAnimationFrame(gamepadTimer);
          });
        }
        recordPoint(x, y, z, t) {
          this.history.push({ x, y, z, t });
          if (this.history.length > 5)
            this.history.shift();
        }
        prewarmManifest = /* @__PURE__ */ new Set();
        parseSrcset(value) {
          const urls = [];
          if (!value)
            return urls;
          const candidates = value.split(",");
          for (const cand of candidates) {
            const trimmed = cand.trim();
            if (!trimmed)
              continue;
            const urlToken = trimmed.split(/\s+/)[0];
            if (urlToken)
              urls.push(urlToken);
          }
          return urls;
        }
        extractTargetUrls(el) {
          const urls = [];
          const href = el.getAttribute("href");
          if (href)
            urls.push(href);
          const src = el.getAttribute("src");
          if (src)
            urls.push(src);
          const action = el.getAttribute("action");
          if (action)
            urls.push(action);
          const dataAttr = el.getAttribute("data");
          if (dataAttr && el.tagName === "OBJECT")
            urls.push(dataAttr);
          const srcset = el.getAttribute("srcset");
          if (srcset)
            urls.push(...this.parseSrcset(srcset));
          const comp = el.getAttribute("data-component") || el.getAttribute("data-component-path");
          if (comp && !el.hasAttribute("data-route")) {
            const trimmed = comp.trim();
            if (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith('"') && trimmed.endsWith('"')) {
              urls.push(trimmed.slice(1, -1).trim());
            } else if (!trimmed.includes(" ") && !trimmed.includes("||") && !trimmed.includes("&&") && (trimmed.startsWith("/") || trimmed.endsWith(".html") || trimmed.endsWith(".md"))) {
              urls.push(trimmed);
            }
          }
          const routeLink = el.getAttribute("data-route-link");
          if (routeLink)
            urls.push(routeLink);
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            const name = attr.name;
            if (name.startsWith("data-on-") || name === "data-signal" || name === "data-effect" || name.startsWith("data-bind")) {
              const matches = attr.value.match(/(?:https?:\/\/|\/|\.\/|\.\.\/|[a-zA-Z0-9_\-]+\/)[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+/gi);
              if (matches) {
                urls.push(...matches);
              }
            }
          }
          return Array.from(new Set(urls));
        }
        rebuildQuadtree() {
          this.quadtree = new Quadtree({
            x: 0,
            y: 0,
            width: this.viewportWidth,
            height: this.viewportHeight
          });
          if (typeof document === "undefined")
            return;
          const isInteractive = (el) => el.tagName === "A" || el.tagName === "BUTTON" || el.tagName === "INPUT" || el.hasAttribute("href") || el.hasAttribute("data-route-link") || el.hasAttribute("data-component") || Array.from(el.attributes).some((a) => a.name.startsWith("data-on-"));
          document.querySelectorAll("*").forEach((el) => {
            if (el instanceof HTMLElement && isInteractive(el)) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                this.quadtree.insert(el, centerX, centerY);
              }
            }
          });
        }
        processPrediction() {
          if (this.history.length < 3)
            return;
          const p0 = this.history[this.history.length - 3];
          const p2 = this.history[this.history.length - 1];
          const dt = (p2.t - p0.t) / 1e3;
          if (dt <= 0)
            return;
          const vx = (p2.x - p0.x) / dt;
          const vy = (p2.y - p0.y) / dt;
          const speed = Math.sqrt(vx * vx + vy * vy);
          this.velocity = { x: vx, y: vy, z: 0, t: dt };
          if (this.debugTracker) {
            this.debugTracker.svg.style.left = `${p2.x}px`;
            this.debugTracker.svg.style.top = `${p2.y}px`;
            const targetR = Math.min(80, Math.max(20, 20 + speed * 0.05));
            this.debugTracker.halo.setAttribute("r", targetR.toString());
            const trajX = 100 + vx * 0.1;
            const trajY = 100 + vy * 0.1;
            this.debugTracker.line.setAttribute("x2", trajX.toString());
            this.debugTracker.line.setAttribute("y2", trajY.toString());
            this.debugTracker.line.style.opacity = speed > 30 ? "1" : "0";
          }
          if (this.fadeTimer)
            clearTimeout(this.fadeTimer);
          this.fadeTimer = setTimeout(() => {
            this.velocity = { x: 0, y: 0, z: 0, t: 1 };
            if (this.debugTracker) {
              this.debugTracker.line.style.opacity = "0";
              this.debugTracker.targetLine.style.opacity = "0";
            }
          }, 150);
          if (speed < 50)
            return;
          const timeHorizon = 0.15;
          const projX = p2.x + vx * timeHorizon;
          const projY = p2.y + vy * timeHorizon;
          const minX = Math.min(p2.x, projX) - 20;
          const minY = Math.min(p2.y, projY) - 20;
          const maxX = Math.max(p2.x, projX) + 20;
          const maxY = Math.max(p2.y, projY) + 20;
          const range = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };
          const newPredictiveNodes = this.quadtree.query(range);
          let snappedTarget = void 0;
          let minD = Infinity;
          newPredictiveNodes.forEach((target) => {
            const rect = target.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const d = Math.hypot(cx - projX, cy - projY);
            if (d < minD) {
              minD = d;
              snappedTarget = { cx, cy };
            }
          });
          if (this.debugTracker) {
            if (snappedTarget) {
              const target = snappedTarget;
              const targetX = 100 + (target.cx - p2.x);
              const targetY = 100 + (target.cy - p2.y);
              this.debugTracker.targetLine.setAttribute("x2", targetX.toString());
              this.debugTracker.targetLine.setAttribute("y2", targetY.toString());
              this.debugTracker.targetLine.style.opacity = "1";
            } else {
              this.debugTracker.targetLine.style.opacity = "0";
            }
          }
          newPredictiveNodes.forEach((node) => {
            if (!this.activePredictiveNodes.has(node)) {
              this.prewarmElement(node);
            }
          });
          this.activePredictiveNodes.forEach((node) => {
            if (!newPredictiveNodes.has(node)) {
              node.classList.remove("nexus-predictive-warm");
              node.dispatchEvent(new CustomEvent("nexus:predictive-cool"));
            }
          });
          this.activePredictiveNodes = newPredictiveNodes;
        }
        prewarmElementAtPoint(x, y) {
          if (typeof document === "undefined")
            return;
          const el = document.elementFromPoint(x, y);
          if (el instanceof HTMLElement) {
            this.prewarmElement(el);
          }
        }
        prewarmElement(el) {
          el.classList.add("nexus-predictive-warm");
          el.dispatchEvent(
            new CustomEvent("nexus:predictive-warm", {
              detail: { velocity: this.velocity }
            })
          );
          const targets = this.extractTargetUrls(el);
          targets.forEach((url) => {
            if (!this.prewarmManifest.has(url)) {
              this.prewarmManifest.add(url);
              cacheEngine.fetchWithCache(url, { storage: "session", responseType: "text" }).catch(() => {
              });
            }
          });
        }
        /**
         * Reactive Real-Time DOM Integration:
         * Called by the central MutationObserver when new DOM nodes are mounted or morphed.
         * Defers execution to queueMicrotask to ensure synchronous layout thrashing (getBoundingClientRect)
         * never interrupts DOM element rendering or component adoption.
         */
        onNodesAdded(nodes) {
          if (typeof document === "undefined")
            return;
          const nodeList = Array.from(nodes);
          if (nodeList.length === 0)
            return;
          queueMicrotask(() => {
            const processElement = (el) => {
              const urls = this.extractTargetUrls(el);
              urls.forEach((url) => {
                if (!this.prewarmManifest.has(url)) {
                  this.prewarmManifest.add(url);
                  cacheEngine.fetchWithCache(url, { storage: "session", responseType: "text" }).catch(() => {
                  });
                }
              });
            };
            nodeList.forEach((node) => {
              if (node instanceof HTMLElement) {
                processElement(node);
                node.querySelectorAll("*").forEach((child) => {
                  if (child instanceof HTMLElement)
                    processElement(child);
                });
              }
            });
            this.rebuildQuadtree();
          });
        }
        setPrewarmHook(fn) {
          this.prewarmHook = fn;
        }
        // Opt-In Hardware Permission API Methods
        enableEyeTracking(options = {}) {
          this.eyeTrackingActive = true;
          if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
            console.log("[Predictive Core] Opt-In Eye-Tracking activated with options:", options);
          }
        }
        enableVoiceIntent(options = {}) {
          this.voiceIntentActive = true;
          if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-debug")) {
            console.log("[Predictive Core] Opt-In Voice Intent activated with options:", options);
          }
        }
        dispose() {
          this.cleanupFns.forEach((fn) => fn());
          this.quadtree.clear();
          if (this.debugTracker && this.debugTracker.svg.parentNode) {
            this.debugTracker.svg.parentNode.removeChild(this.debugTracker.svg);
          }
        }
      };
      corePredictiveEngine = new CorePredictiveEngine();
    }
  });

  // src/modules/sprites/predictive.ts
  var predictive_exports2 = {};
  __export(predictive_exports2, {
    default: () => predictive_default,
    predictive: () => predictive,
    predictiveModule: () => predictiveModule
  });
  var predictive, predictiveModule, predictive_default;
  var init_predictive2 = __esm({
    "src/modules/sprites/predictive.ts"() {
      init_predictive();
      predictive = corePredictiveEngine;
      predictiveModule = {
        name: "predictive",
        key: "$predictive",
        sprites: (context) => {
          context.predictive = corePredictiveEngine;
          return corePredictiveEngine;
        }
      };
      predictive_default = predictiveModule;
    }
  });

  // src/modules/sprites/push.ts
  var push_exports = {};
  __export(push_exports, {
    createPushApi: () => createPushApi,
    default: () => push_default,
    pushSpriteModule: () => pushSpriteModule
  });
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  function createPushApi(runtime) {
    const state = runtime.reactive({
      subscription: null,
      status: "idle",
      error: null
    });
    if (hasServiceWorker()) {
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
        const op = createPwaAsyncOp(runtime, { data: null });
        if (!hasServiceWorker()) {
          op.error = "Service Worker not available";
          op.status = "error";
          return op;
        }
        state.status = "subscribing";
        (async () => {
          try {
            const reg = await navigator.serviceWorker.ready;
            const keyBytes = typeof applicationServerKey === "string" ? urlBase64ToUint8Array(applicationServerKey) : applicationServerKey;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: keyBytes
            });
            state.subscription = sub;
            state.status = "active";
            op.data = sub;
            op.status = "success";
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            state.error = message;
            state.status = "error";
            op.error = message;
            op.status = "error";
          }
        })();
        return op;
      },
      /**
       * Unsubscribe from push notifications.
       */
      unsubscribe() {
        if (!state.subscription) {
          return createPwaAsyncOp(runtime, { status: "error", error: "No active subscription" });
        }
        return runPwaOp(runtime, async () => {
          await state.subscription.unsubscribe();
          state.subscription = null;
          state.status = "idle";
        });
      }
    };
  }
  var pushSpriteModule, push_default;
  var init_push = __esm({
    "src/modules/sprites/push.ts"() {
      init_pwa2();
      pushSpriteModule = {
        name: "push",
        key: "$push",
        sprites: (runtime) => createPushApi(runtime)
      };
      push_default = pushSpriteModule;
    }
  });

  // src/engine/topology.ts
  async function runInWorker(fn, args, transferable) {
    const callArgs = args ? Array.from(args) : [];
    const workers = topology.getWorkers();
    if (workers.length === 0) {
      return await fn(...callArgs);
    }
    const id = ++taskIdCounter;
    const worker = workers[workerRoundRobin % workers.length];
    workerRoundRobin = (workerRoundRobin + 1) % workers.length;
    return new Promise((resolve, reject) => {
      pendingWorkerTasks.set(id, { resolve, reject });
      try {
        worker.postMessage({
          type: "EXECUTE_FN",
          id,
          fn: fn.toString(),
          args: callArgs
        }, transferable || []);
      } catch (err) {
        pendingWorkerTasks.delete(id);
        reject(err);
      }
    });
  }
  var TIER_CONFIGS, EngineTopology, topology, taskIdCounter, pendingWorkerTasks, workerRoundRobin;
  var init_topology = __esm({
    "src/engine/topology.ts"() {
      init_reactivity();
      TIER_CONFIGS = {
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
      EngineTopology = class {
        currentTier = 0;
        workers = [];
        sharedBuffer = null;
        lagHistory = [];
        LAG_SAMPLE_SIZE = 60;
        LAG_THRESHOLD = 0.4;
        // 40% of frame budget
        FRAME_BUDGET = 16.67;
        // 60fps = 16.67ms per frame
        SCALE_COOLDOWN_MS = 5e3;
        // ignore lag spikes within 5s of a tier change
        MIN_SAMPLES_FOR_SCALE_UP = 5;
        // require history before scaling up
        autoScaleEnabled = true;
        monitoringInterval = null;
        lastScaleTime = 0;
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
          } else {
            this.stopMonitoring();
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
                const data = e.data;
                if (data && typeof data === "object" && "id" in data) {
                  const pending = pendingWorkerTasks.get(data.id);
                  if (pending) {
                    pendingWorkerTasks.delete(data.id);
                    if (data.type === "RESULT" || data.type === "FN_RESULT") {
                      pending.resolve(data.payload);
                    } else if (data.type === "ERROR" || data.type === "FN_ERROR") {
                      pending.reject(new Error(data.error || "Worker task execution failed"));
                    }
                  }
                }
              };
              if (this.sharedBuffer) {
                worker.postMessage({ type: "INIT_HEAP", payload: this.sharedBuffer });
              }
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
          pendingWorkerTasks.forEach((p) => p.reject(new Error("Worker terminated")));
          pendingWorkerTasks.clear();
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
        stopMonitoring() {
          if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
          }
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
            const now = performance.now();
            if (now - this.lastScaleTime < this.SCALE_COOLDOWN_MS) {
              return;
            }
            if (avgLag > this.LAG_THRESHOLD && this.currentTier < 3 && this.lagHistory.length >= this.MIN_SAMPLES_FOR_SCALE_UP) {
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
          this.lagHistory = [];
          this.lastScaleTime = performance.now();
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
          this.lagHistory = [];
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
         * Get all active workers
         */
        getWorkers() {
          return this.workers;
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
      topology = new EngineTopology();
      taskIdCounter = 0;
      pendingWorkerTasks = /* @__PURE__ */ new Map();
      workerRoundRobin = 0;
    }
  });

  // src/engine/agent.ts
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
  var DEFAULT_CONFIG, SelfHealAgent, agentInstance;
  var init_agent = __esm({
    "src/engine/agent.ts"() {
      init_topology();
      init_reactivity();
      init_consts();
      DEFAULT_CONFIG = {
        enabled: true,
        captureHeap: true,
        captureStack: true,
        maxStackDepth: 20,
        emitToConsole: true,
        emitToPlatform: false
        // Disabled by default - requires platform endpoint
      };
      SelfHealAgent = class {
        config;
        beaconHistory = [];
        maxHistorySize = 10;
        heapSnapshot = null;
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
              if (el[IS_TEMPLATE_KEY])
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
      agentInstance = null;
    }
  });

  // src/modules/sprites/selector.ts
  var selector_exports = {};
  __export(selector_exports, {
    default: () => selector_default,
    resolveSelector: () => resolveSelector,
    resolveTargetElements: () => resolveTargetElements
  });
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
      get(target, key, receiver) {
        if (typeof key === "symbol")
          return Reflect.get(target, key, receiver);
        const val = target[key];
        if (val !== void 0) {
          return typeof val === "function" ? val.bind(target) : val;
        }
        if (target.length > 0) {
          const head = target[0];
          const headVal = head[key];
          return typeof headVal === "function" ? headVal.bind(head) : headVal;
        }
        return void 0;
      },
      set(target, key, value, receiver) {
        if (typeof key === "symbol")
          return Reflect.set(target, key, value, receiver);
        if (!isNaN(Number(key))) {
          target[Number(key)] = value;
          return true;
        }
        if (target.length > 0) {
          target[0][key] = value;
          return true;
        }
        return false;
      }
    });
  }
  function createReactiveElementProxy(el) {
    return new Proxy(el, {
      get(target, key) {
        if (typeof key === "symbol")
          return target[key];
        const val = target[key];
        if (val !== void 0) {
          return typeof val === "function" ? val.bind(target) : val;
        }
        const stack = getDataStack(target);
        for (const data of stack) {
          if (key in data)
            return data[key];
        }
        return void 0;
      },
      set(target, key, value) {
        if (typeof key === "symbol") {
          target[key] = value;
          return true;
        }
        const stack = getDataStack(target);
        for (const data of stack) {
          if (key in data) {
            data[key] = value;
            return true;
          }
        }
        target[key] = value;
        return true;
      }
    });
  }
  function resolveTargetElements(contextEl, selector) {
    if (!selector || !selector.trim())
      return [contextEl];
    const clean = selector.trim();
    const res = resolveSelector(contextEl, clean);
    if (!res)
      return [];
    if (Array.isArray(res)) {
      return res.map((item) => item && typeof item === "object" && item.nodeType ? item : item?.$el || item).filter(Boolean);
    }
    const raw = res?.$el || res;
    return raw && raw.nodeType ? [raw] : [];
  }
  var selectorSpriteModule, selector_default;
  var init_selector = __esm({
    "src/modules/sprites/selector.ts"() {
      init_scope();
      init_agent();
      selectorSpriteModule = {
        name: "selector",
        key: "$",
        onRegister(runtime) {
          runtime._selectorResolver = (selector) => {
            if (typeof document === "undefined")
              return null;
            return resolveSelector(document.body, selector);
          };
        },
        sprites(runtime) {
          const fn = (selector) => {
            if (typeof document === "undefined")
              return null;
            return resolveSelector(document.body, selector);
          };
          return fn;
        }
      };
      selector_default = selectorSpriteModule;
    }
  });

  // src/modules/sprites/sql.ts
  var sql_exports = {};
  __export(sql_exports, {
    configureSqlClient: () => configureSqlClient,
    default: () => sql_default,
    sqlSprite: () => sqlSprite,
    sqlSpriteModule: () => sqlSpriteModule
  });
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
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
        result.status = "error";
      }
      return result;
    };
  }
  var connectionPool, pendingRequests, liveQueries, requestId, defaultNs, defaultDb, authToken, sqlSpriteModule, sql_default;
  var init_sql = __esm({
    "src/modules/sprites/sql.ts"() {
      init_reactivity();
      connectionPool = /* @__PURE__ */ new Map();
      pendingRequests = /* @__PURE__ */ new Map();
      liveQueries = /* @__PURE__ */ new Map();
      requestId = 0;
      defaultNs = "test";
      defaultDb = "test";
      authToken = null;
      sqlSpriteModule = {
        name: "sql",
        key: "$sql",
        sprites: (runtime) => sqlSprite(runtime)
      };
      sql_default = sqlSpriteModule;
    }
  });

  // src/modules/sprites/svg.ts
  var svg_exports = {};
  __export(svg_exports, {
    default: () => svg_default,
    svgModule: () => svgModule
  });
  var svgModule, svg_default;
  var init_svg = __esm({
    "src/modules/sprites/svg.ts"() {
      init_reactivity();
      svgModule = {
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
      svg_default = svgModule;
    }
  });

  // src/modules/sprites/sw.ts
  var sw_exports = {};
  __export(sw_exports, {
    createSwApi: () => createSwApi,
    default: () => sw_default,
    swSpriteModule: () => swSpriteModule
  });
  function createSwApi(runtime) {
    const state = runtime.reactive({
      status: "idle",
      controller: null,
      registration: null,
      error: null,
      updateAvailable: false
    });
    if (hasServiceWorker()) {
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
        const op = createPwaAsyncOp(runtime);
        if (!hasServiceWorker()) {
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
        if (!state.registration) {
          return createPwaAsyncOp(runtime, { status: "error", error: "No service worker registered" });
        }
        return runPwaOp(runtime, () => state.registration.update());
      },
      /**
       * Unregister the active service worker.
       */
      unregister() {
        if (!state.registration) {
          return createPwaAsyncOp(runtime, { status: "error", error: "No service worker registered" });
        }
        return runPwaOp(runtime, async () => {
          const success = await state.registration.unregister();
          if (success) {
            state.status = "idle";
            state.controller = null;
            state.registration = null;
            state.updateAvailable = false;
          }
        });
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
    };
  }
  var swSpriteModule, sw_default;
  var init_sw = __esm({
    "src/modules/sprites/sw.ts"() {
      init_pwa2();
      swSpriteModule = {
        name: "sw",
        key: "$sw",
        sprites: (runtime) => createSwApi(runtime)
      };
      sw_default = swSpriteModule;
    }
  });

  // src/modules/scopes/auth.ts
  var auth_exports = {};
  __export(auth_exports, {
    authScope: () => authScope,
    authScopeModule: () => authScopeModule,
    default: () => auth_default,
    scopeRule: () => scopeRule
  });
  var authScope, scopeRule, authScopeModule, auth_default;
  var init_auth = __esm({
    "src/modules/scopes/auth.ts"() {
      init_reactivity();
      authScope = reactive({
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
      scopeRule = (q, body) => {
        if (q === "isAuthenticated")
          return authScope.isAuthenticated ? body() : void 0;
        if (authScope.roles.includes(q))
          return body() ? body() : void 0;
        return void 0;
      };
      authScopeModule = {
        name: "auth",
        rule: "auth",
        scopeRule
      };
      auth_default = authScopeModule;
    }
  });

  // src/modules/scopes/container.ts
  var container_exports = {};
  __export(container_exports, {
    containerScopeModule: () => containerScopeModule,
    default: () => container_default,
    getContainerSignal: () => getContainerSignal,
    scopeRule: () => scopeRule2
  });
  function getContainerSignal(query, _element) {
    if (containerSignals.has(query)) {
      return containerSignals.get(query);
    }
    const mql = globalThis.matchMedia(query);
    const s = ref(mql.matches);
    const listener = (e) => {
      s.value = e.matches;
    };
    mql.addEventListener("change", listener);
    containerSignals.set(query, s);
    return s;
  }
  var containerSignals, scopeRule2, containerScopeModule, container_default;
  var init_container = __esm({
    "src/modules/scopes/container.ts"() {
      init_reactivity();
      containerSignals = /* @__PURE__ */ new Map();
      scopeRule2 = (q, body) => getContainerSignal(q).value ? body() : void 0;
      containerScopeModule = {
        name: "container",
        rule: "container",
        scopeRule: scopeRule2
      };
      container_default = containerScopeModule;
    }
  });

  // src/modules/scopes/media.ts
  var media_exports = {};
  __export(media_exports, {
    default: () => media_default,
    dispose: () => dispose,
    getMediaSignal: () => getMediaSignal,
    mediaScopeModule: () => mediaScopeModule,
    scopeRule: () => scopeRule3
  });
  function getMediaSignal(query) {
    if (mediaSignals.has(query)) {
      return mediaSignals.get(query);
    }
    if (typeof window === "undefined") {
      mediaSignals.set(query, computed(() => false));
      return mediaSignals.get(query);
    }
    const mql = globalThis.matchMedia(query);
    const s = ref(mql.matches);
    const listener = (e) => {
      s.value = e.matches;
    };
    mql.addEventListener("change", listener);
    cleanupFns.push(() => mql.removeEventListener("change", listener));
    mediaSignals.set(query, s);
    return s;
  }
  function dispose() {
    disposeScope(cleanupFns);
  }
  var mediaSignals, cleanupFns, scopeRule3, mediaScopeModule, media_default;
  var init_media = __esm({
    "src/modules/scopes/media.ts"() {
      init_reactivity();
      init_scope();
      mediaSignals = /* @__PURE__ */ new Map();
      cleanupFns = [];
      scopeRule3 = (q, body) => getMediaSignal(q).value ? body() : void 0;
      mediaScopeModule = {
        name: "media",
        rule: "media",
        scopeRule: scopeRule3
      };
      media_default = mediaScopeModule;
    }
  });

  // src/modules/scopes/native.ts
  var native_exports = {};
  __export(native_exports, {
    default: () => native_default,
    nativeScope: () => nativeScope,
    nativeScopeModule: () => nativeScopeModule,
    scopeRule: () => scopeRule4
  });
  var nativeScope, scopeRule4, nativeScopeModule, native_default;
  var init_native = __esm({
    "src/modules/scopes/native.ts"() {
      init_reactivity();
      nativeScope = reactive({
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
      scopeRule4 = (q, body) => {
        if (q === "isPresent")
          return nativeScope.isPresent ? body() : void 0;
        return nativeScope.platform === q ? body() : void 0;
      };
      nativeScopeModule = {
        name: "native",
        rule: "native",
        scopeRule: scopeRule4
      };
      native_default = nativeScopeModule;
    }
  });

  // src/modules/scopes/os.ts
  var os_exports = {};
  __export(os_exports, {
    default: () => os_default,
    dispose: () => dispose2,
    getOSScope: () => getOSScope,
    onGlobalInit: () => onGlobalInit,
    osScope: () => osScope,
    osScopeModule: () => osScopeModule,
    scopeRule: () => scopeRule5
  });
  function onGlobalInit() {
    if (typeof window !== "undefined") {
      const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
      const onThemeChange = (e) => {
        osScope.theme = e.matches ? "dark" : "light";
      };
      mq.addEventListener("change", onThemeChange);
      cleanupFns2.push(() => mq.removeEventListener("change", onThemeChange));
    }
  }
  function getOSScope() {
    return osScope;
  }
  function dispose2() {
    disposeScope(cleanupFns2);
  }
  var getOS, getTheme, osScope, cleanupFns2, scopeRule5, osScopeModule, os_default;
  var init_os = __esm({
    "src/modules/scopes/os.ts"() {
      init_reactivity();
      init_scope();
      getOS = () => {
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
      getTheme = () => {
        if (typeof window === "undefined")
          return "light";
        return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      };
      osScope = reactive({
        platform: getOS(),
        theme: getTheme(),
        isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        isDesktop: !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      });
      cleanupFns2 = [];
      scopeRule5 = (q, body) => {
        if (q in osScope)
          return osScope[q] ? body() : void 0;
        return osScope.platform === q ? body() : void 0;
      };
      osScopeModule = {
        name: "os",
        rule: "os",
        onGlobalInit,
        scopeRule: scopeRule5
      };
      os_default = osScopeModule;
    }
  });

  // src/modules/scopes/view.ts
  var view_exports = {};
  __export(view_exports, {
    default: () => view_default,
    dispose: () => dispose3,
    onGlobalInit: () => onGlobalInit2,
    scopeRule: () => scopeRule6,
    viewScope: () => viewScope,
    viewScopeModule: () => viewScopeModule
  });
  function scheduleViewUpdate(apply) {
    if (viewRafScheduled)
      return;
    viewRafScheduled = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        viewRafScheduled = false;
        apply();
      });
    } else {
      queueMicrotask(() => {
        viewRafScheduled = false;
        apply();
      });
    }
  }
  function onGlobalInit2() {
    if (typeof window !== "undefined") {
      const updateView = () => {
        viewScope.width = globalThis.innerWidth;
        viewScope.height = globalThis.innerHeight;
        viewScope.scrollX = globalThis.scrollX;
        viewScope.scrollY = globalThis.scrollY;
        viewScope.isPortrait = globalThis.innerHeight > globalThis.innerWidth;
        viewScope.isLandscape = globalThis.innerWidth >= globalThis.innerHeight;
        viewScope.devicePixelRatio = globalThis.devicePixelRatio;
      };
      const updateViewCoalesced = () => scheduleViewUpdate(updateView);
      globalThis.addEventListener("resize", updateViewCoalesced);
      globalThis.addEventListener("scroll", updateViewCoalesced);
      cleanupFns3.push(
        () => globalThis.removeEventListener("resize", updateViewCoalesced),
        () => globalThis.removeEventListener("scroll", updateViewCoalesced)
      );
    }
    if (typeof window !== "undefined" && globalThis.screen.orientation) {
      const onOrientationChange = () => {
        viewScope.orientation = globalThis.screen.orientation.type;
      };
      globalThis.screen.orientation.addEventListener("change", onOrientationChange);
      cleanupFns3.push(() => globalThis.screen.orientation.removeEventListener("change", onOrientationChange));
    }
  }
  function dispose3() {
    disposeScope(cleanupFns3);
  }
  var viewScope, cleanupFns3, viewRafScheduled, scopeRule6, viewScopeModule, view_default;
  var init_view = __esm({
    "src/modules/scopes/view.ts"() {
      init_reactivity();
      init_scope();
      viewScope = reactive({
        width: typeof window !== "undefined" ? globalThis.innerWidth : 1024,
        height: typeof window !== "undefined" ? globalThis.innerHeight : 768,
        scrollX: typeof window !== "undefined" ? globalThis.scrollX : 0,
        scrollY: typeof window !== "undefined" ? globalThis.scrollY : 0,
        orientation: typeof window !== "undefined" && globalThis.screen.orientation ? globalThis.screen.orientation.type : "landscape-primary",
        devicePixelRatio: typeof window !== "undefined" ? globalThis.devicePixelRatio : 1,
        isPortrait: typeof window !== "undefined" ? globalThis.innerHeight > globalThis.innerWidth : false,
        isLandscape: typeof window !== "undefined" ? globalThis.innerWidth >= globalThis.innerHeight : true
      });
      cleanupFns3 = [];
      viewRafScheduled = false;
      scopeRule6 = (q, body) => {
        if (q in viewScope)
          return viewScope[q] ? body() : void 0;
        return void 0;
      };
      viewScopeModule = {
        name: "view",
        rule: "view",
        onGlobalInit: onGlobalInit2,
        scopeRule: scopeRule6
      };
      view_default = viewScopeModule;
    }
  });

  // src/engine/utils/timer.ts
  function getTimerMap(el) {
    let map = el[TIMER_MAP_KEY];
    if (!map) {
      map = /* @__PURE__ */ new Map();
      el[TIMER_MAP_KEY] = map;
    }
    return map;
  }
  function parseCommandArg(arg) {
    if (!arg)
      return {};
    const trimmed = arg.trim();
    const match = trimmed.match(/^([a-zA-Z]+)(?:\((.*)\))?$/i);
    if (match) {
      return {
        command: match[1].toLowerCase(),
        targetSelector: match[2]?.trim()
      };
    }
    return {};
  }
  function resolveTimerDuration(runtime, el, arg, defaultDuration) {
    if (!arg)
      return defaultDuration;
    if (arg.startsWith("#")) {
      const val = runtime.evaluate(el, arg);
      const num = typeof val === "number" ? val : parseInt(String(val), 10);
      return Number.isNaN(num) ? defaultDuration : num;
    }
    return parseInt(arg, 10) || defaultDuration;
  }
  function clearTimer(rec) {
    if (rec && typeof rec.timer === "number") {
      clearTimeout(rec.timer);
      rec.timer = null;
    }
  }
  var init_timer = __esm({
    "src/engine/utils/timer.ts"() {
      init_consts();
    }
  });

  // src/modules/modifiers/debounce.ts
  var debounce_exports = {};
  __export(debounce_exports, {
    debounceModifier: () => debounceModifier,
    default: () => debounce_default
  });
  var debounceModifier, debounce_default;
  var init_debounce = __esm({
    "src/modules/modifiers/debounce.ts"() {
      init_consts();
      init_timer();
      init_selector();
      debounceModifier = {
        name: "debounce",
        handle: (payload, el, arg, runtime) => {
          const cmd = parseCommandArg(arg);
          if (cmd.command === "cancel") {
            if (typeof payload === "function") {
              return (e) => {
                const targets = resolveTargetElements(el, cmd.targetSelector);
                targets.forEach((target) => {
                  const map = getTimerMap(target);
                  const rec = map.get("debounce");
                  if (rec) {
                    clearTimer(rec);
                    map.delete("debounce");
                  }
                });
                return payload(e);
              };
            }
            return (...args) => {
              const targets = resolveTargetElements(el, cmd.targetSelector);
              targets.forEach((target) => {
                const map = getTimerMap(target);
                const rec = map.get("debounce");
                if (rec) {
                  clearTimer(rec);
                  map.delete("debounce");
                }
              });
              return typeof payload === "function" ? payload(...args) : payload;
            };
          }
          if (cmd.command === "flush") {
            if (typeof payload === "function") {
              return (e) => {
                const targets = resolveTargetElements(el, cmd.targetSelector);
                targets.forEach((target) => {
                  const map = getTimerMap(target);
                  const rec = map.get("debounce");
                  if (rec) {
                    clearTimer(rec);
                    map.delete("debounce");
                    if (rec.fn)
                      rec.fn();
                  }
                });
                return payload(e);
              };
            }
            return (...args) => {
              const targets = resolveTargetElements(el, cmd.targetSelector);
              targets.forEach((target) => {
                const map = getTimerMap(target);
                const rec = map.get("debounce");
                if (rec) {
                  clearTimer(rec);
                  map.delete("debounce");
                  if (rec.fn)
                    rec.fn();
                }
              });
              return typeof payload === "function" ? payload(...args) : payload;
            };
          }
          if (typeof payload === "function") {
            return (e) => {
              const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
              const map = getTimerMap(el);
              const existing = map.get("debounce");
              if (existing)
                clearTimer(existing);
              const runner = () => {
                map.delete("debounce");
                payload(e);
              };
              const timer = setTimeout(runner, wait);
              map.set("debounce", { timer, fn: runner });
            };
          }
          return (...args) => {
            return new Promise((resolve) => {
              const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
              const map = getTimerMap(el);
              const existing = map.get("debounce");
              if (existing)
                clearTimer(existing);
              const runner = () => {
                map.delete("debounce");
                resolve(typeof payload === "function" ? payload(...args) : payload);
              };
              const timer = setTimeout(runner, wait);
              map.set("debounce", { timer, fn: runner });
            });
          };
        }
      };
      debounce_default = debounceModifier;
    }
  });

  // src/modules/modifiers/delay.ts
  var delay_exports = {};
  __export(delay_exports, {
    default: () => delay_default,
    delayModifier: () => delayModifier
  });
  var delayModifier, delay_default;
  var init_delay = __esm({
    "src/modules/modifiers/delay.ts"() {
      init_consts();
      init_timer();
      init_selector();
      delayModifier = {
        name: "delay",
        handle: (payload, el, arg, runtime) => {
          const cmd = parseCommandArg(arg);
          if (cmd.command === "cancel") {
            if (typeof payload === "function") {
              return (e) => {
                const targets = resolveTargetElements(el, cmd.targetSelector);
                targets.forEach((target) => {
                  const map = getTimerMap(target);
                  const rec = map.get("delay");
                  if (rec) {
                    clearTimer(rec);
                    map.delete("delay");
                  }
                });
                return payload(e);
              };
            }
            return (...args) => {
              const targets = resolveTargetElements(el, cmd.targetSelector);
              targets.forEach((target) => {
                const map = getTimerMap(target);
                const rec = map.get("delay");
                if (rec) {
                  clearTimer(rec);
                  map.delete("delay");
                }
              });
              return typeof payload === "function" ? payload(...args) : payload;
            };
          }
          if (typeof payload === "function") {
            return (e) => {
              const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
              const map = getTimerMap(el);
              const existing = map.get("delay");
              if (existing)
                clearTimer(existing);
              const runner = () => {
                map.delete("delay");
                payload(e);
              };
              const timer = setTimeout(runner, wait);
              map.set("delay", { timer, fn: runner });
            };
          }
          return (...args) => {
            return new Promise((resolve) => {
              const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_DEBOUNCE_TIME);
              const map = getTimerMap(el);
              const existing = map.get("delay");
              if (existing)
                clearTimer(existing);
              const runner = () => {
                map.delete("delay");
                resolve(typeof payload === "function" ? payload(...args) : payload);
              };
              const timer = setTimeout(runner, wait);
              map.set("delay", { timer, fn: runner });
            });
          };
        }
      };
      delay_default = delayModifier;
    }
  });

  // src/engine/utils/modifier.ts
  function createModifier(name, handle) {
    return { name, handle };
  }
  function createGuardModifier(name, wrap) {
    return {
      name,
      handle: (payload, el, arg, runtime) => {
        if (typeof payload === "function") {
          return wrap(payload, el, arg, runtime);
        }
        return payload;
      }
    };
  }
  var init_modifier = __esm({
    "src/engine/utils/modifier.ts"() {
    }
  });

  // src/modules/modifiers/document.ts
  var document_exports = {};
  __export(document_exports, {
    default: () => document_default,
    documentModifier: () => documentModifier
  });
  var documentModifier, document_default;
  var init_document = __esm({
    "src/modules/modifiers/document.ts"() {
      init_modifier();
      documentModifier = createModifier("document", (payload) => payload);
      document_default = documentModifier;
    }
  });

  // src/modules/modifiers/drag.ts
  var drag_exports3 = {};
  __export(drag_exports3, {
    default: () => drag_default3,
    dragModifier: () => dragModifier
  });
  var dragModifier, drag_default3;
  var init_drag3 = __esm({
    "src/modules/modifiers/drag.ts"() {
      dragModifier = {
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
      drag_default3 = dragModifier;
    }
  });

  // src/modules/modifiers/hold.ts
  var hold_exports = {};
  __export(hold_exports, {
    default: () => hold_default,
    holdModifier: () => holdModifier
  });
  var holdModifier, hold_default;
  var init_hold = __esm({
    "src/modules/modifiers/hold.ts"() {
      init_timer();
      init_selector();
      holdModifier = {
        name: "hold",
        handle: (payload, el, arg, _runtime) => {
          const cmd = parseCommandArg(arg);
          if (cmd.command === "cancel") {
            if (typeof payload === "function") {
              return (e) => {
                const targets = resolveTargetElements(el, cmd.targetSelector);
                targets.forEach((target) => {
                  const map = getTimerMap(target);
                  const rec = map.get("hold");
                  if (rec && rec.cleanup) {
                    rec.cleanup();
                    map.delete("hold");
                  }
                });
                return payload(e);
              };
            }
            return (...args) => {
              const targets = resolveTargetElements(el, cmd.targetSelector);
              targets.forEach((target) => {
                const map = getTimerMap(target);
                const rec = map.get("hold");
                if (rec && rec.cleanup) {
                  rec.cleanup();
                  map.delete("hold");
                }
              });
              return typeof payload === "function" ? payload(...args) : payload;
            };
          }
          const wait = parseInt(arg, 10) || 500;
          if (typeof payload === "function") {
            return (e) => {
              const map = getTimerMap(el);
              const existing = map.get("hold");
              if (existing && existing.cleanup)
                existing.cleanup();
              let timer = null;
              const cleanup = () => {
                if (timer) {
                  clearTimeout(timer);
                  timer = null;
                }
                map.delete("hold");
                window.removeEventListener("pointerup", cleanup);
                window.removeEventListener("pointercancel", cleanup);
                window.removeEventListener("pointerleave", cleanup);
                window.removeEventListener("touchend", cleanup);
                window.removeEventListener("touchcancel", cleanup);
              };
              timer = setTimeout(() => {
                cleanup();
                payload(e);
              }, wait);
              map.set("hold", { timer, cleanup });
              window.addEventListener("pointerup", cleanup, { once: true });
              window.addEventListener("pointercancel", cleanup, { once: true });
              window.addEventListener("pointerleave", cleanup, { once: true });
              window.addEventListener("touchend", cleanup, { once: true });
              window.addEventListener("touchcancel", cleanup, { once: true });
            };
          }
          return payload;
        }
      };
      hold_default = holdModifier;
    }
  });

  // src/modules/modifiers/keys.ts
  var keys_exports = {};
  __export(keys_exports, {
    KEY_MODIFIERS: () => KEY_MODIFIERS,
    altModifier: () => altModifier,
    ctrlModifier: () => ctrlModifier,
    default: () => keys_default,
    deleteModifier: () => deleteModifier,
    downModifier: () => downModifier,
    enterModifier: () => enterModifier,
    escModifier: () => escModifier,
    escapeModifier: () => escapeModifier,
    keysModifier: () => keysModifier,
    leftModifier: () => leftModifier,
    metaModifier: () => metaModifier,
    rightModifier: () => rightModifier,
    shiftModifier: () => shiftModifier,
    spaceModifier: () => spaceModifier,
    tabModifier: () => tabModifier,
    upModifier: () => upModifier
  });
  var isKeyboardEvent, createKeyModifier, enterModifier, escapeModifier, escModifier, spaceModifier, upModifier, downModifier, leftModifier, rightModifier, tabModifier, deleteModifier, ctrlModifier, altModifier, shiftModifier, metaModifier, KEY_MODIFIERS, keysModifier, keys_default;
  var init_keys = __esm({
    "src/modules/modifiers/keys.ts"() {
      init_modifier();
      isKeyboardEvent = (e) => "key" in e;
      createKeyModifier = (name, check) => createGuardModifier(name, (fn) => (e) => {
        if (isKeyboardEvent(e) && check(e)) {
          return fn(e);
        }
      });
      enterModifier = createKeyModifier("enter", (e) => e.key === "Enter");
      escapeModifier = createKeyModifier("escape", (e) => e.key === "Escape");
      escModifier = createKeyModifier("esc", (e) => e.key === "Escape");
      spaceModifier = createKeyModifier("space", (e) => e.key === " " || e.key === "Spacebar");
      upModifier = createKeyModifier("up", (e) => e.key === "ArrowUp" || e.key === "Up");
      downModifier = createKeyModifier("down", (e) => e.key === "ArrowDown" || e.key === "Down");
      leftModifier = createKeyModifier("left", (e) => e.key === "ArrowLeft" || e.key === "Left");
      rightModifier = createKeyModifier("right", (e) => e.key === "ArrowRight" || e.key === "Right");
      tabModifier = createKeyModifier("tab", (e) => e.key === "Tab");
      deleteModifier = createKeyModifier("delete", (e) => e.key === "Delete" || e.key === "Backspace");
      ctrlModifier = createKeyModifier("ctrl", (e) => e.ctrlKey);
      altModifier = createKeyModifier("alt", (e) => e.altKey);
      shiftModifier = createKeyModifier("shift", (e) => e.shiftKey);
      metaModifier = createKeyModifier("meta", (e) => e.metaKey);
      KEY_MODIFIERS = {
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
      keysModifier = {
        name: "keys",
        onRegister(context) {
          if (context.registerModifier) {
            Object.entries(KEY_MODIFIERS).forEach(([name, mod]) => {
              context.registerModifier(name, mod);
            });
          }
        },
        handle(payload) {
          return payload;
        }
      };
      keys_default = keysModifier;
    }
  });

  // src/modules/modifiers/morph.ts
  var morph_exports = {};
  __export(morph_exports, {
    default: () => morph_default,
    morphModifier: () => morphModifier
  });
  var morphModifier, morph_default;
  var init_morph = __esm({
    "src/modules/modifiers/morph.ts"() {
      init_reconciler();
      init_selector();
      morphModifier = {
        name: "morph",
        handle: (payload, _el, _arg, _runtime) => {
          return payload;
        },
        interceptPipeline: (evaluate2, element, arg, runtime) => {
          return (evalEl, expression, extras) => {
            const result = evaluate2(evalEl, expression, extras);
            const applyMorph = (htmlString) => {
              const target = arg ? resolveSelector(element, arg) : element;
              const realTarget = Array.isArray(target) ? target[0] : target;
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
      morph_default = morphModifier;
    }
  });

  // src/modules/modifiers/once.ts
  var once_exports = {};
  __export(once_exports, {
    default: () => once_default,
    onceModifier: () => onceModifier
  });
  var onceModifier, once_default;
  var init_once = __esm({
    "src/modules/modifiers/once.ts"() {
      init_modifier();
      onceModifier = createModifier("once", (payload) => {
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
      });
      once_default = onceModifier;
    }
  });

  // src/modules/modifiers/outside.ts
  var outside_exports = {};
  __export(outside_exports, {
    default: () => outside_default,
    outsideModifier: () => outsideModifier
  });
  var outsideModifier, outside_default;
  var init_outside = __esm({
    "src/modules/modifiers/outside.ts"() {
      init_modifier();
      outsideModifier = createGuardModifier("outside", (fn, el) => (e) => {
        if (e.target && !el.contains(e.target)) {
          return fn(e);
        }
      });
      outside_default = outsideModifier;
    }
  });

  // src/modules/modifiers/prevent.ts
  var prevent_exports = {};
  __export(prevent_exports, {
    default: () => prevent_default,
    preventModifier: () => preventModifier
  });
  var preventModifier, prevent_default;
  var init_prevent = __esm({
    "src/modules/modifiers/prevent.ts"() {
      init_modifier();
      preventModifier = createGuardModifier("prevent", (fn) => (e) => {
        e.preventDefault();
        return fn(e);
      });
      prevent_default = preventModifier;
    }
  });

  // src/modules/modifiers/self.ts
  var self_exports = {};
  __export(self_exports, {
    default: () => self_default,
    selfModifier: () => selfModifier
  });
  var selfModifier, self_default;
  var init_self = __esm({
    "src/modules/modifiers/self.ts"() {
      init_modifier();
      selfModifier = createGuardModifier("self", (fn, el) => (e) => {
        if (e.target === el)
          return fn(e);
      });
      self_default = selfModifier;
    }
  });

  // src/modules/modifiers/stop.ts
  var stop_exports = {};
  __export(stop_exports, {
    default: () => stop_default,
    stopModifier: () => stopModifier
  });
  var stopModifier, stop_default;
  var init_stop = __esm({
    "src/modules/modifiers/stop.ts"() {
      init_modifier();
      stopModifier = createGuardModifier("stop", (fn) => (e) => {
        e.stopPropagation();
        return fn(e);
      });
      stop_default = stopModifier;
    }
  });

  // src/modules/modifiers/throttle.ts
  var throttle_exports = {};
  __export(throttle_exports, {
    default: () => throttle_default,
    throttleModifier: () => throttleModifier
  });
  var throttleModifier, throttle_default;
  var init_throttle = __esm({
    "src/modules/modifiers/throttle.ts"() {
      init_consts();
      init_timer();
      init_selector();
      throttleModifier = {
        name: "throttle",
        handle: (payload, el, arg, runtime) => {
          const cmd = parseCommandArg(arg);
          if (cmd.command === "cancel" || cmd.command === "reset") {
            if (typeof payload === "function") {
              return (e) => {
                const targets = resolveTargetElements(el, cmd.targetSelector);
                targets.forEach((target) => {
                  const map = getTimerMap(target);
                  map.delete("throttle");
                });
                return payload(e);
              };
            }
            return (...args) => {
              const targets = resolveTargetElements(el, cmd.targetSelector);
              targets.forEach((target) => {
                const map = getTimerMap(target);
                map.delete("throttle");
              });
              return typeof payload === "function" ? payload(...args) : payload;
            };
          }
          if (typeof payload === "function") {
            return (e) => {
              const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_THROTTLE_TIME);
              const map = getTimerMap(el);
              const rec = map.get("throttle") || { timer: null, last: 0 };
              const now = performance.now();
              const last = rec.last ?? 0;
              if (now - last > wait) {
                rec.last = now;
                map.set("throttle", rec);
                return payload(e);
              }
            };
          }
          return (...args) => {
            const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_THROTTLE_TIME);
            const map = getTimerMap(el);
            const rec = map.get("throttle") || { timer: null, last: 0 };
            const now = performance.now();
            const last = rec.last ?? 0;
            if (now - last > wait) {
              rec.last = now;
              map.set("throttle", rec);
              return typeof payload === "function" ? payload(...args) : payload;
            }
          };
        }
      };
      throttle_default = throttleModifier;
    }
  });

  // src/modules/modifiers/window.ts
  var window_exports = {};
  __export(window_exports, {
    default: () => window_default,
    windowModifier: () => windowModifier
  });
  var windowModifier, window_default;
  var init_window = __esm({
    "src/modules/modifiers/window.ts"() {
      init_modifier();
      windowModifier = createModifier("window", (payload) => payload);
      window_default = windowModifier;
    }
  });

  // src/modules/modifiers/zoom.ts
  var zoom_exports = {};
  __export(zoom_exports, {
    default: () => zoom_default,
    zoomModifier: () => zoomModifier
  });
  var zoomModifier, zoom_default;
  var init_zoom = __esm({
    "src/modules/modifiers/zoom.ts"() {
      zoomModifier = {
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
      zoom_default = zoomModifier;
    }
  });

  // src/modules/listeners/bfcache.ts
  var bfcache_exports = {};
  __export(bfcache_exports, {
    default: () => bfcache_default
  });
  var bfcacheListener, bfcache_default;
  var init_bfcache = __esm({
    "src/modules/listeners/bfcache.ts"() {
      bfcacheListener = {
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
      bfcache_default = bfcacheListener;
    }
  });

  // src/modules/listeners/executeScript.ts
  var executeScript_exports = {};
  __export(executeScript_exports, {
    default: () => executeScript_default
  });
  var executeScriptModule, executeScript_default;
  var init_executeScript = __esm({
    "src/modules/listeners/executeScript.ts"() {
      init_debug();
      executeScriptModule = {
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
      executeScript_default = executeScriptModule;
    }
  });

  // src/modules/listeners/history.ts
  var history_exports = {};
  __export(history_exports, {
    default: () => history_default
  });
  var historyModule, history_default;
  var init_history = __esm({
    "src/modules/listeners/history.ts"() {
      init_debug();
      init_consts();
      historyModule = {
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
      history_default = historyModule;
    }
  });

  // src/modules/listeners/linkRewriter.ts
  var linkRewriter_exports = {};
  __export(linkRewriter_exports, {
    default: () => linkRewriter_default
  });
  var linkRewriterModule, linkRewriter_default;
  var init_linkRewriter = __esm({
    "src/modules/listeners/linkRewriter.ts"() {
      init_debug();
      init_consts();
      linkRewriterModule = {
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
      linkRewriter_default = linkRewriterModule;
    }
  });

  // src/engine/mutation.ts
  var mutation_exports = {};
  __export(mutation_exports, {
    default: () => mutation_default
  });
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
  function shouldIgnoreNode(node) {
    return Boolean(node.closest && (node.closest("[data-ignore]") || node.closest("pre") || node.closest("code")));
  }
  var movedNodes, movedNodeTimers, mutationObserverModule, mutation_default;
  var init_mutation = __esm({
    "src/engine/mutation.ts"() {
      init_reactivity();
      init_debug();
      init_consts();
      init_stylesheet();
      movedNodes = /* @__PURE__ */ new WeakSet();
      movedNodeTimers = /* @__PURE__ */ new Map();
      mutationObserverModule = {
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
                      if (shouldIgnoreNode(node))
                        return;
                      addedThisBatch.add(node);
                      stylesheet2.adoptElementSubtree(node);
                    }
                  });
                }
              }
              if (addedThisBatch.size > 0) {
                Promise.resolve().then(() => (init_predictive(), predictive_exports)).then((mod) => {
                  mod.corePredictiveEngine.onNodesAdded(addedThisBatch);
                }).catch(() => {
                });
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
                          if (shouldIgnoreNode(node))
                            return;
                          const enhancedTarget = node;
                          if (enhancedTarget[MARKER_KEY] && enhancedTarget[CLEANUP_FUNCTIONS_KEY])
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
                    const target = mutation.target;
                    if (!target)
                      return;
                    if (shouldIgnoreNode(target))
                      return;
                    const attrName = mutation.attributeName;
                    if (attrName === "class" || attrName === "data-theme") {
                      context.adoptStyle(target);
                      if (target === document.documentElement) {
                        Promise.resolve().then(() => (init_stylesheet(), stylesheet_exports)).then((mod) => {
                          mod.markExternalStylesSettled();
                        }).catch(() => {
                        });
                      }
                    }
                    if (attrName === "style" || attrName === "draggable" || attrName?.startsWith("data-") && attrName !== "data-theme" || attrName?.startsWith("nexus-"))
                      return;
                    const borrows = ownership.getBorrowers(target);
                    borrows.forEach((borrow) => {
                      const borrower = borrow.borrower;
                      try {
                        borrower[RUN_EFFECT_RUNNERS_KEY]?.();
                      } catch (err) {
                        console.error(
                          `[Nexus Isolation] Borrower <${borrower.tagName}> failed during ownership pulse from <${target.tagName}>:`,
                          err
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
      mutation_default = mutationObserverModule;
    }
  });

  // src/manifest.ts
  var autoAttributes, autoSprites, autoScopes, autoModifiers, autoListeners, autoObservers, PACKED_COMPONENTS, PACKED_KEYFRAMES;
  var init_manifest = __esm({
    "src/manifest.ts"() {
      init_assert();
      init_bind();
      init_build();
      init_class();
      init_component();
      init_computed();
      init_debug2();
      init_drag2();
      init_effect();
      init_flow();
      init_for();
      init_html();
      init_if();
      init_import();
      init_markdown();
      init_mask2();
      init_on();
      init_preserve();
      init_pwa();
      init_raf();
      init_route();
      init_router();
      init_scrollbar();
      init_show();
      init_signal();
      init_style();
      init_stylesheet();
      init_switcher();
      init_teleport();
      init_theme();
      init_animate();
      init_bgFetch();
      init_bgSync();
      init_drag();
      init_flow2();
      init_gql();
      init_mask();
      init_mcp2();
      init_periodicSync();
      init_predictive2();
      init_push();
      init_selector();
      init_sql();
      init_svg();
      init_sw();
      init_auth();
      init_container();
      init_media();
      init_native();
      init_os();
      init_view();
      init_debounce();
      init_delay();
      init_document();
      init_drag3();
      init_hold();
      init_keys();
      init_morph();
      init_once();
      init_outside();
      init_prevent();
      init_self();
      init_stop();
      init_throttle();
      init_window();
      init_zoom();
      init_bfcache();
      init_executeScript();
      init_history();
      init_linkRewriter();
      init_mutation();
      autoAttributes = [
        { name: "assert", module: assert_exports },
        { name: "bind", module: bind_exports },
        { name: "build", module: build_exports },
        { name: "class", module: class_exports },
        { name: "component", module: component_exports },
        { name: "computed", module: computed_exports },
        { name: "debug", module: debug_exports },
        { name: "drag", module: drag_exports2 },
        { name: "effect", module: effect_exports },
        { name: "flow", module: flow_exports },
        { name: "for", module: for_exports },
        { name: "html", module: html_exports },
        { name: "if", module: if_exports },
        { name: "import", module: import_exports },
        { name: "markdown", module: markdown_exports },
        { name: "mask", module: mask_exports2 },
        { name: "on", module: on_exports },
        { name: "preserve", module: preserve_exports },
        { name: "pwa", module: pwa_exports },
        { name: "raf", module: raf_exports },
        { name: "route", module: route_exports },
        { name: "router", module: router_exports },
        { name: "scrollbar", module: scrollbar_exports },
        { name: "show", module: show_exports },
        { name: "signal", module: signal_exports },
        { name: "style", module: style_exports },
        { name: "stylesheet", module: stylesheet_exports },
        { name: "switcher", module: switcher_exports },
        { name: "teleport", module: teleport_exports },
        { name: "theme", module: theme_exports }
      ];
      autoSprites = [
        { name: "animate", module: animate_exports },
        { name: "bgFetch", module: bgFetch_exports },
        { name: "bgSync", module: bgSync_exports },
        { name: "drag", module: drag_exports },
        { name: "flow", module: flow_exports2 },
        { name: "gql", module: gql_exports },
        { name: "mask", module: mask_exports },
        { name: "mcp", module: mcp_exports2 },
        { name: "periodicSync", module: periodicSync_exports },
        { name: "predictive", module: predictive_exports2 },
        { name: "push", module: push_exports },
        { name: "selector", module: selector_exports },
        { name: "sql", module: sql_exports },
        { name: "svg", module: svg_exports },
        { name: "sw", module: sw_exports }
      ];
      autoScopes = [
        { name: "auth", module: auth_exports },
        { name: "container", module: container_exports },
        { name: "media", module: media_exports },
        { name: "native", module: native_exports },
        { name: "os", module: os_exports },
        { name: "view", module: view_exports }
      ];
      autoModifiers = [
        { name: "debounce", module: debounce_exports },
        { name: "delay", module: delay_exports },
        { name: "document", module: document_exports },
        { name: "drag", module: drag_exports3 },
        { name: "hold", module: hold_exports },
        { name: "keys", module: keys_exports },
        { name: "morph", module: morph_exports },
        { name: "once", module: once_exports },
        { name: "outside", module: outside_exports },
        { name: "prevent", module: prevent_exports },
        { name: "self", module: self_exports },
        { name: "stop", module: stop_exports },
        { name: "throttle", module: throttle_exports },
        { name: "window", module: window_exports },
        { name: "zoom", module: zoom_exports }
      ];
      autoListeners = [
        { name: "bfcache", module: bfcache_exports },
        { name: "executeScript", module: executeScript_exports },
        { name: "history", module: history_exports },
        { name: "linkRewriter", module: linkRewriter_exports }
      ];
      autoObservers = [{ name: "mutation", module: mutation_exports }];
      PACKED_COMPONENTS = ".draggable-chosen{background-color:var(--color-base-300,#d4d4d8);box-shadow:inset 0 0 0 2px var(--color-primary,#3b82f6)}.draggable-drag{opacity:1;background-color:var(--color-base-300,#d4d4d8);box-shadow:0 25px 50px -12px rgba(0,0,0,.25);transform:scale(1.05);cursor:grabbing;z-index:9999}.draggable-ghost{opacity:1;background-color:var(--color-base-300,#d4d4d8);border:2px solid var(--color-primary,#3b82f6);box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}.draggable-selected{box-shadow:inset 0 0 0 2px var(--color-accent,var(--color-secondary,#ec4899))}.draggable-swap-highlight{background-color:color-mix(in srgb,var(--color-warning,#eab308) 20%,transparent);box-shadow:inset 0 0 0 2px var(--color-warning,#eab308)}.drop-target-before{background:linear-gradient(to bottom,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 2px 0 0 var(--color-primary,#3b82f6)}.drop-target-after{background:linear-gradient(to top,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 -2px 0 0 var(--color-primary,#3b82f6)}";
      PACKED_KEYFRAMES = "@keyframes spin{to{transform:rotate(360deg)}}@keyframes ping{75%,100%{transform:scale(2);opacity:0}}@keyframes pulse{50%{opacity:.5}}@keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:none;animation-timing-function:cubic-bezier(0,0,.2,1)}}";
    }
  });

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
    stylesheet: () => stylesheet2
  });
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
      } catch (err) {
        console.warn(`[NexusStyleSheet] Failed to resolve import "${imp.href}" relative to "${currentBase}":`, err);
      }
    }
    return resolved;
  }
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
      if (!compileFn)
        throw new Error("Failed to load Tailwind compile function");
      tailwindCompiler = await compileFn(`@import "tailwindcss";`, {
        base: "/",
        loadStylesheet: coreLoadStylesheet
      });
      await refreshThemeBridge();
      while (pendingClasses.length > 0) {
        const { className, el, runtime } = pendingClasses.shift();
        stylesheet2.adoptClass(className, el, runtime);
      }
    })().catch((err) => {
      compilerReadyPromise = null;
      console.error("[Nexus] Tailwind JIT init failed:", err);
      throw err;
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
    } catch (err) {
      console.error("[Nexus] Theme bridge refresh failed:", err);
    } finally {
      _rebuildingBridge = false;
    }
  }
  async function fetchWithCache(url, timeoutMs = 3e3, onUpdate) {
    const result = await cacheEngine.fetchWithCache(url, {
      storage: "local",
      responseType: "text",
      timeoutMs,
      onUpdate: (fresh) => {
        if (typeof fresh === "string" && onUpdate) {
          onUpdate(fresh);
        }
        refreshThemeBridge().catch(() => {
        });
      }
    });
    return typeof result === "string" ? result : String(result);
  }
  function initializeJitEngine() {
    if (_isJitEngineBooted)
      return;
    _isJitEngineBooted = true;
    ensureCompiler().catch((err) => console.error("[Nexus] JIT init failed:", err));
  }
  function markExternalStylesSettled() {
    externalStylesSettled = true;
    if (compilerReadyPromise) {
      refreshThemeBridge().catch((err) => console.error("[Nexus] bridge refresh failed:", err));
    }
  }
  var PREFLIGHT_CSS, NexusStyleSheet, jitSheet, compileFn, coreCss, tailwindCompiler, compilerReadyPromise, externalStylesSettled, _rebuildingBridge, compiledClassesSet, pendingClasses, StyleSheetManager, stylesheet2, _isJitEngineBooted, stylesheetModule, stylesheet_default;
  var init_stylesheet = __esm({
    "src/modules/attributes/stylesheet.ts"() {
      init_cache();
      init_manifest();
      PREFLIGHT_CSS = PACKED_COMPONENTS;
      NexusStyleSheet = class extends (typeof CSSStyleSheet !== "undefined" ? CSSStyleSheet : class {
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
            } catch (err) {
              if (!hasImports)
                throw err;
            }
          }
          if (hasImports) {
            resolveImports(cssText, void 0, async () => {
              const freshResolved = await resolveImports(this._rawCSSText);
              if (typeof super.replace === "function") {
                super.replace(freshResolved).catch((err) => console.error(err));
              }
            }).then((resolved) => {
              if (typeof super.replace === "function") {
                super.replace(resolved).catch((err) => {
                  console.error("[NexusStyleSheet] Dynamic replace of resolved imports failed:", err);
                });
              }
            }).catch((err) => {
              console.error("[NexusStyleSheet] Failed to resolve imports in background:", err);
            });
          }
        }
      };
      jitSheet = typeof CSSStyleSheet !== "undefined" ? new CSSStyleSheet() : {};
      compileFn = null;
      coreCss = null;
      tailwindCompiler = null;
      compilerReadyPromise = null;
      externalStylesSettled = false;
      _rebuildingBridge = false;
      compiledClassesSet = /* @__PURE__ */ new Set();
      pendingClasses = [];
      StyleSheetManager = class {
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
            this.adoptElementSubtree(rootEl);
          }
        }
        adoptElementSubtree(rootEl) {
          if (!rootEl || typeof document === "undefined")
            return;
          const processElement = (el) => {
            if (el.classList) {
              el.classList.forEach((cls) => this.adoptClass(cls, el));
            }
            const dataClass = el.getAttribute("data-class");
            if (dataClass) {
              const matches = dataClass.match(/['"]([^'"]+)['"]/g);
              if (matches) {
                matches.forEach((m) => {
                  const raw = m.slice(1, -1);
                  raw.split(/\s+/).filter(Boolean).forEach((cls) => {
                    this.adoptClass(cls, el);
                  });
                });
              }
            }
            if (el.attributes) {
              Array.from(el.attributes).forEach((attr) => {
                if (attr.name.startsWith("data-class-")) {
                  const cls = attr.name.slice(11);
                  if (cls)
                    this.adoptClass(cls, el);
                }
              });
            }
            if (el instanceof HTMLTemplateElement && el.content) {
              this.adoptElementSubtree(el.content);
            }
          };
          if ("getAttribute" in rootEl && rootEl.getAttribute) {
            processElement(rootEl);
          }
          const all = rootEl.querySelectorAll ? rootEl.querySelectorAll("*") : [];
          all.forEach((el) => {
            if (el instanceof Element) {
              processElement(el);
            }
          });
        }
        adoptClass(className, el, runtime) {
          if (!className || className.trim() === "")
            return;
          if (el && el.closest && el.closest("[data-ignore-style]"))
            return;
          if (this._knownClasses.has(className))
            return;
          const hasSignalMatch = className.match(/^[a-z]+-\$([a-zA-Z_$][\w$]*)$/);
          if (hasSignalMatch && el && runtime) {
            this.adoptSignalBinding(el, hasSignalMatch[1], runtime);
            this._knownClasses.add(className);
            return;
          }
          if (el && !el.closest("[data-stylesheet]") && !el.ownerDocument?.documentElement?.hasAttribute("data-stylesheet")) {
            return;
          }
          if (!tailwindCompiler) {
            pendingClasses.push({ className, el, runtime });
            ensureCompiler().catch((err) => console.error("[Nexus] JIT init failed:", err));
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
          } catch (err) {
            console.debug(`Nexus-UX JIT compile check: "${className}":`, err);
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
      stylesheet2 = new StyleSheetManager();
      _isJitEngineBooted = false;
      stylesheetModule = {
        name: "stylesheet",
        attribute: "stylesheet",
        onRegister(runtime) {
          runtime._styleAdopter = (el) => {
            if (el.classList && el.classList.length > 0) {
              el.classList.forEach((cls) => stylesheet2.adoptClass(cls, el, runtime));
            }
          };
          if (typeof document !== "undefined" && !document.querySelector("style[data-nexus-tailwind-bridge]") && document.querySelector('script[src*="tailwindcss/browser"]')) {
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
        },
        handle(el, expression, _runtime) {
          const cleanupFns4 = [];
          if (expression && expression.trim()) {
            const css = expression.trim();
            cleanupFns4.push(stylesheet2.adoptCSSSync(css, void 0, document));
          }
          const root = el.getRootNode();
          if (root && "adoptedStyleSheets" in root) {
            const sheetsList = Array.from(root.adoptedStyleSheets);
            if (!sheetsList.includes(jitSheet)) {
              root.adoptedStyleSheets = [...sheetsList, jitSheet];
            }
          }
          stylesheet2.emitPreflightAndTheme(el);
          cleanupFns4.push(() => {
            stylesheet2.emitPreflightAndTheme(el);
          });
          return () => cleanupFns4.forEach((fn) => fn());
        }
      };
      stylesheet_default = stylesheetModule;
    }
  });

  // src/engine/utils/hash.ts
  function elUniqId(el) {
    if (el.id)
      return el.id;
    const key = el.getAttribute("data-ux-id") || el.getAttribute("data-id");
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
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
  var Hash;
  var init_hash = __esm({
    "src/engine/utils/hash.ts"() {
      init_consts();
      Hash = class {
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
    }
  });

  // src/engine/reconciler.ts
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
  function getHeadElementKey(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.tagName === "LINK") {
        return `link:${el.getAttribute("href") || ""}:${el.getAttribute("rel") || ""}`;
      }
      if (el.tagName === "STYLE") {
        return `style:${hashString(el.textContent || "")}`;
      }
      if (el.tagName === "SCRIPT") {
        return `script:${el.getAttribute("src") || ""}:${hashString(el.textContent || "")}`;
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
      return el.id || null;
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
              if (script.closest("[data-ignore], [data-markdown], pre, code"))
                return;
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
        stylesheet2.adoptClass(cls, el);
        el.classList.add(cls);
      }
      currentAdded.add(cls);
    });
    if (currentAdded.size > 0)
      nexusClassMap.set(el, currentAdded);
  }
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
  var noOp, defaults, nexusClassMap, nexusStyleMap;
  var init_reconciler = __esm({
    "src/engine/reconciler.ts"() {
      init_consts();
      init_stylesheet();
      init_hash();
      noOp = () => true;
      defaults = {
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
      nexusClassMap = /* @__PURE__ */ new WeakMap();
      nexusStyleMap = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    $id: () => $id,
    $nextTick: () => $nextTick,
    Nexus: () => Nexus,
    UX: () => UX,
    runInWorker: () => runInWorker
  });

  // src/engine/modules.ts
  init_consts();
  init_reactivity();
  init_reconciler();
  init_reactivity();
  init_reconciler();

  // src/engine/fetch.ts
  init_debug();
  init_consts();
  init_cache();
  var fetchCache = /* @__PURE__ */ new Map();
  var fetchCacheTimers = /* @__PURE__ */ new Map();
  var fetchUtilities = {
    request: (url, options, el) => {
      const isGetOrHead = !options.method || options.method.toUpperCase() === "GET" || options.method.toUpperCase() === "HEAD";
      if (isGetOrHead) {
        return cacheEngine.fetchWithCache(url, {
          storage: "session",
          responseType: options.responseType || "text",
          onUpdate: (freshData) => {
            el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-success`, {
              bubbles: true,
              cancelable: false,
              detail: { url, options, data: freshData }
            }));
          }
        });
      }
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
      promise.then(
        () => {
        },
        () => {
          if (fetchCacheTimers.has(cacheKey))
            clearTimeout(fetchCacheTimers.get(cacheKey));
          fetchCacheTimers.set(cacheKey, setTimeout(() => {
            fetchCache.delete(cacheKey);
            fetchCacheTimers.delete(cacheKey);
          }, 2e3));
        }
      );
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
        (err) => {
          isRejected = true;
          error = err;
        }
      );
      return new Proxy(promise, {
        get(target, prop) {
          if (prop === "then")
            return target.then.bind(target);
          if (prop === "catch")
            return target.catch.bind(target);
          if (prop === "finally")
            return target.finally.bind(target);
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

  // src/engine/modules.ts
  init_scope();

  // src/engine/evaluator.ts
  init_agent();
  init_debug();
  init_scope();
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
        let safeArg = arg.trim();
        if (safeArg.startsWith("'") && safeArg.endsWith("'") || safeArg.startsWith('"') && safeArg.endsWith('"')) {
          safeArg = safeArg.slice(1, -1);
        }
        safeArg = safeArg.replace(/`/g, "\\`");
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
    const nativeScope2 = buildNativeApiScope(runtime);
    const baseScope = {
      ...runtime,
      ...initialExtras
    };
    const scope = new Proxy(baseScope, {
      has(target, key) {
        if (key === Symbol.unscopables)
          return false;
        if (typeof key === "string") {
          return true;
        }
        return false;
      },
      get(target, key) {
        if (key === Symbol.unscopables)
          return void 0;
        if (typeof key === "string") {
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
          if (key in nativeScope2) {
            return nativeScope2[key];
          }
        }
        return void 0;
      },
      set(target, key, value) {
        if (typeof key === "string") {
          const dataStack = getDataStack(el);
          for (const data of dataStack) {
            if (key in data) {
              data[key] = value;
              return true;
            }
          }
          const globalSignals = runtime.globalSignals();
          if (key in globalSignals) {
            globalSignals[key] = value;
            return true;
          }
          if (dataStack.length > 0) {
            dataStack[0][key] = value;
            return true;
          }
          if (key in target) {
            target[key] = value;
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
          has(target, key) {
            if (key === Symbol.unscopables)
              return false;
            if (typeof key === "string")
              return key in target || key in scope;
            return key in target;
          },
          get(target, key) {
            if (key === Symbol.unscopables)
              return void 0;
            if (typeof key === "string") {
              if (key in target)
                return target[key];
              return scope[key];
            }
            return void 0;
          },
          set(target, key, value) {
            if (typeof key === "string") {
              if (key in target) {
                target[key] = value;
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
    let target = void 0;
    let state = 0;
    const rest = rawName;
    let currentTokenStart = 0;
    const len = rest.length;
    for (let i = 0; i <= len; i++) {
      const isEnd = i === len;
      const char = isEnd ? "" : rest[i];
      const isModifierDelim = char === MODIFIER_DELIMITER || char === "_";
      const isArgDelim = char === "-" && state < 2;
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
              target = token.slice(2, -1);
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
      target
    };
  }

  // src/engine/modules.ts
  init_scheduler();
  init_debug();
  init_debug();
  init_hash();
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
  init_topology();
  init_mcp();
  init_debug();
  var globalReactiveState = reactive({});
  var ModuleCoordinator = class {
    attributeModules = /* @__PURE__ */ new Map();
    actionModules = /* @__PURE__ */ new Map();
    modifierModules = /* @__PURE__ */ new Map();
    listenerModules = /* @__PURE__ */ new Map();
    observerModules = /* @__PURE__ */ new Map();
    utilityModules = /* @__PURE__ */ new Map();
    spriteModules = /* @__PURE__ */ new Map();
    scopeModules = /* @__PURE__ */ new Map();
    _scopesRegistry = {};
    directiveOrder = [];
    runtimeContext;
    initContext;
    markerDispenser = 1;
    constructor() {
      registerScopeProvider("_scopes", () => this._scopesRegistry);
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
        adoptStyle: (el) => {
          if (typeof this.runtimeContext._styleAdopter === "function") {
            this.runtimeContext._styleAdopter(el);
          }
        },
        parseAttribute,
        scheduler,
        reportError: (err, el, expr) => logger.error(this.runtimeContext, err.message, el, expr),
        $: (selector) => {
          if (typeof document === "undefined")
            return null;
          if (typeof this.runtimeContext._selectorResolver === "function") {
            return this.runtimeContext._selectorResolver(selector);
          }
          return document.querySelector(selector);
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
        registerModifier: this.registerModifierModule.bind(this),
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
      module.onRegister?.(this.runtimeContext);
    }
    registerAttributeModule(name, module) {
      const key = module.attribute || name;
      this.attributeModules.set(key, module);
      module.onRegister?.(this.runtimeContext);
      const index = this.directiveOrder.indexOf(key);
      if (index === -1) {
        if (module.metadata?.after?.[0]) {
          const afterIndex = this.directiveOrder.indexOf(module.metadata.after[0]);
          if (afterIndex !== -1)
            this.directiveOrder.splice(afterIndex + 1, 0, key);
          else
            this.directiveOrder.push(key);
        } else if (module.metadata?.before?.[0]) {
          let placed = false;
          for (const target of module.metadata.before) {
            const beforeIndex = this.directiveOrder.indexOf(target);
            if (beforeIndex !== -1) {
              this.directiveOrder.splice(beforeIndex, 0, key);
              placed = true;
              break;
            }
          }
          if (!placed)
            this.directiveOrder.unshift(key);
        } else if (key === "signal") {
          this.directiveOrder.unshift(key);
        } else {
          this.directiveOrder.push(key);
        }
      }
      this.triggerScan();
    }
    registerActionModule(name, module) {
      this.actionModules.set(name, module);
      module.onRegister?.(this.runtimeContext);
    }
    registerListenerModule(name, module) {
      this.listenerModules.set(name, module);
      module.onRegister?.(this.runtimeContext);
    }
    registerObserverModule(name, module) {
      this.observerModules.set(name, module);
      registerObserver(name, module);
      module.onRegister?.(this.runtimeContext);
    }
    registerUtilityModule(name, module) {
      this.utilityModules.set(name, module);
      module.onRegister?.(this.runtimeContext);
    }
    registerSpriteModule(name, module) {
      this.spriteModules.set(name, module);
      module.onRegister?.(this.runtimeContext);
      const sprites = module.sprites(this.runtimeContext);
      const spriteKey = module.key || `$${name}`;
      this.runtimeContext.sprites[spriteKey] = sprites;
      registerScopeProvider(spriteKey, () => sprites);
      if (sprites && typeof sprites === "object") {
        Object.entries(sprites).forEach(([spriteName, handler]) => {
          this.registerActionModule(spriteName, {
            name: spriteName,
            handle: (_el, ...args) => typeof handler === "function" ? handler(...args) : handler
          });
        });
      }
    }
    registerScopeModule(name, module) {
      this.scopeModules.set(name, module);
      module.onRegister?.(this.runtimeContext);
      const ruleKey = module.rule || name;
      const handler = module.scopeRule || (module.evaluate ? (q, body) => module.evaluate(q, this.runtimeContext) ? body() : void 0 : void 0);
      if (handler) {
        this._scopesRegistry[ruleKey] = handler;
      }
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
      if (element.hasAttribute("data-ignore-off")) {
        currentIsolation = "none";
      } else if (element.hasAttribute("data-ignore")) {
        currentIsolation = "total";
      } else if (element.hasAttribute("data-ignore-ux")) {
        currentIsolation = "ux";
      } else if (element.hasAttribute("data-ignore-style")) {
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
        this.runtimeContext.adoptStyle?.(element);
      }
      if (currentIsolation !== "ux") {
        const handlersToExecute = [];
        Array.from(element.attributes).forEach((attr, index) => {
          try {
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
                        const dotIdx = modFull.indexOf(".");
                        const dashIdx = modFull.indexOf("-");
                        let modName = modFull;
                        let modArg = "";
                        if (dotIdx !== -1) {
                          modName = modFull.slice(0, dotIdx);
                          modArg = modFull.slice(dotIdx + 1);
                        } else if (dashIdx !== -1) {
                          modName = modFull.slice(0, dashIdx);
                          modArg = modFull.slice(dashIdx + 1);
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
          } catch (err) {
            logger.warn(this.runtimeContext, `[Directive Isolation] Fault in attribute parse for '${attr.name}' on <${element.tagName}>:`, err);
          }
        });
        handlersToExecute.sort((a, b) => {
          if (a.directiveName === "signal" && b.directiveName !== "signal")
            return -1;
          if (b.directiveName === "signal" && a.directiveName !== "signal")
            return 1;
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
          } catch (err) {
            logger.warn(this.runtimeContext, `[Directive Isolation] Fault in execution of directive '${fullAttrName}' on <${element.tagName}>:`, err);
          }
        });
      }
      if (element[IS_TEMPLATE_KEY]) {
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
        get(target, key) {
          if (key in target)
            return target[key];
          const val = module.handle[key];
          return typeof val === "function" ? val.bind(module.handle) : val;
        }
      });
      actions[name] = proxyAction;
    });
    return actions;
  }

  // src/index.ts
  init_scope();
  init_consts();
  init_topology();
  init_agent();
  init_predictive();
  init_cache();

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

  // src/index.ts
  init_manifest();
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
      this.registerFromManifest();
      this.coordinator.runtimeContext.setGlobalSignal("$predictive", corePredictiveEngine);
      this.predictive = corePredictiveEngine;
      this.cache = cacheEngine;
      this.coordinator.registerUtilityModule("fetch", fetchModule);
      initSelfHeal(this.coordinator.runtimeContext, {
        enabled: true,
        emitToConsole: this.coordinator.runtimeContext.isDevMode ?? false,
        emitToPlatform: false
      });
      this.init();
      if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("nexus-ready", { bubbles: true }));
      }
    }
    registerFromManifest() {
      autoAttributes.forEach(({ name, module }) => {
        this.coordinator.registerAttributeModule(name, module.default || module);
      });
      autoSprites.forEach(({ name, module }) => {
        const spriteMod = module.default || Object.values(module).find((m) => m && typeof m.sprites === "function");
        if (spriteMod && typeof spriteMod.sprites === "function") {
          this.coordinator.registerSpriteModule(spriteMod.name || name, spriteMod);
        }
      });
      autoScopes.forEach(({ name, module }) => {
        const scopeMod = module.default || Object.values(module)[0];
        if (scopeMod) {
          this.coordinator.registerScopeModule(scopeMod.name || name, scopeMod);
        }
      });
      autoModifiers.forEach(({ name, module }) => {
        this.coordinator.registerModifierModule(name, module.default || module);
      });
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
    self.onmessage = handleWorkerMessage;
  } else if (typeof document !== "undefined") {
    topology.start();
  }
  if (typeof window !== "undefined" && Nexus) {
    globalThis.Nexus = Nexus;
    globalThis.Nexus.selfHeal = { getHistory: getBeaconHistory };
    globalThis.Nexus.runInWorker = runInWorker;
    globalThis._NEXUS_RUNTIME = Nexus.coordinator.runtimeContext;
  }
  return __toCommonJS(src_exports);
})();
