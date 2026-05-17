/**
 * Unified Nexus Scheduler — Global Async Process Loop
 * 
 * Implements the 4-phase Atomic Frame Execution Order (Spec §5.4):
 *   Capture → Evaluate → Resolve → Paint
 * 
 * Architecture:
 *   The scheduler integrates a Node.js/Deno-inspired async process loop that
 *   decouples reactive computation from the paint cycle. Phases 1-3 (Capture,
 *   Evaluate, Resolve) run via microtask/MessageChannel yielding, while Phase 4
 *   (Paint) remains frame-aligned via requestAnimationFrame.
 * 
 * Stall Detection:
 *   If any phase exceeds the configurable budget (default: 8ms), the scheduler
 *   yields control back to the browser via MessageChannel, then resumes on the
 *   next microtask. This prevents long-running effect chains from causing frame
 *   drops.
 * 
 * SharedArrayBuffer Integration:
 *   Phase state flags are stored in a shared Int32Array for zero-copy
 *   cross-context coordination (main thread ↔ workers) when Cross-Origin
 *   Isolated context is available. Falls back to standard JS state otherwise.
 */

export type Job = () => void;

// ─────────────────────────────────────────────────────────────────────────────
// SharedArrayBuffer Phase State (ZCZS cross-context coordination)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phase state indices in the shared Int32Array:
 *   [0] PHASE_CURRENT   — Currently executing phase (0=idle, 1-4=phases)
 *   [1] PHASE_PENDING   — 1 if a flush is pending, 0 otherwise
 *   [2] CAPTURE_LEN     — Number of jobs in the capture queue
 *   [3] EVALUATE_LEN    — Number of jobs in the evaluate queue
 *   [4] RESOLVE_LEN     — Number of jobs in the resolve queue
 *   [5] PAINT_LEN       — Number of jobs in the paint queue
 */
const PHASE_CURRENT = 0;
const PHASE_PENDING = 1;
const CAPTURE_LEN = 2;
const EVALUATE_LEN = 3;
const RESOLVE_LEN = 4;
const PAINT_LEN = 5;
const STATE_SLOTS = 6;

let sharedState: Int32Array;

// Attempt to allocate SharedArrayBuffer for zero-copy cross-context state.
// Falls back to a standard ArrayBuffer if SAB is unavailable (non-isolated context).
try {
  if (typeof SharedArrayBuffer !== 'undefined' && typeof globalThis.crossOriginIsolated !== 'undefined' && globalThis.crossOriginIsolated) {
    sharedState = new Int32Array(new SharedArrayBuffer(STATE_SLOTS * 4));
  } else {
    sharedState = new Int32Array(new ArrayBuffer(STATE_SLOTS * 4));
  }
} catch {
  sharedState = new Int32Array(new ArrayBuffer(STATE_SLOTS * 4));
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageChannel Yielding (async process loop primitive)
// ─────────────────────────────────────────────────────────────────────────────

let yieldChannel: MessageChannel | null = null;
let yieldResolve: (() => void) | null = null;

if (typeof MessageChannel !== 'undefined') {
  yieldChannel = new MessageChannel();
  yieldChannel.port1.onmessage = () => {
    if (yieldResolve) {
      yieldResolve();
      yieldResolve = null;
    }
  };
}

/**
 * Yields control back to the browser event loop via MessageChannel.
 * This is faster than setTimeout(0) and doesn't have the 4ms clamping issue.
 */
function yieldToBrowser(): Promise<void> {
  if (yieldChannel) {
    return new Promise<void>((resolve) => {
      yieldResolve = resolve;
      yieldChannel!.port2.postMessage(null);
    });
  }
  // Fallback: scheduler.yield() or setTimeout
  if (typeof (globalThis as Record<string, unknown>).scheduler === 'object' && 
      typeof ((globalThis as Record<string, unknown>).scheduler as Record<string, unknown>)?.yield === 'function') {
    return ((globalThis as Record<string, unknown>).scheduler as { yield: () => Promise<void> }).yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler Class
// ─────────────────────────────────────────────────────────────────────────────

/** Default stall detection budget in milliseconds */
const STALL_BUDGET_MS = 8;

class Scheduler {
  // Phase 1: Capture (Input/Signal Flagging)
  private captureQueue: Job[] = [];
  // Phase 2: Evaluate (Downstream effects & Ghost DOM)
  private evaluateQueue: Job[] = [];
  // Phase 3: Resolve (Instruction Queue translation)
  private resolveQueue: Job[] = [];
  // Phase 4: Paint (DOM mutation execution)
  private paintQueue: Job[] = [];
  
  private nextTickQueue: Job[] = [];
  private pending = false;
  private flushing = false;
  // Deduplication set: prevents the same runner from being enqueued multiple
  // times in the same flush cycle, which was the root cause of infinite loops.
  private evaluateSet = new Set<Job>();

  /** Configurable stall detection budget (ms). Phases yielding after this. */
  public stallBudget = STALL_BUDGET_MS;

  /**
   * Phase 1: Capture
   */
  enqueueCapture(job: Job): void {
    this.captureQueue.push(job);
    this.syncSharedState();
    this.requestFlush();
  }

  /**
   * Phase 2: Evaluate (Legacy enqueueEffect/enqueueMorph mapping)
   * Deduplicates: if a runner is already queued, skip re-enqueue.
   */
  enqueueEvaluate(job: Job): void {
    if (this.evaluateSet.has(job)) return;
    this.evaluateSet.add(job);
    this.evaluateQueue.push(job);
    this.syncSharedState();
    this.requestFlush();
  }

  // Alias for compatibility with existing modules
  enqueueEffect(job: Job): void {
    this.enqueueEvaluate(job);
  }

  /**
   * Phase 3: Resolve
   */
  enqueueResolve(job: Job): void {
    this.resolveQueue.push(job);
    this.syncSharedState();
    this.requestFlush();
  }

  /**
   * Phase 4: Paint (Legacy enqueueMorph mapping)
   */
  enqueuePaint(job: Job): void {
    this.paintQueue.push(job);
    this.syncSharedState();
    this.requestFlush();
  }

  // Alias for compatibility with existing code
  enqueueMorph(job: Job): void {
    this.enqueuePaint(job);
  }

  // Alias for Phase 4 or cleanup
  enqueueClean(job: Job): void {
    this.paintQueue.push(job); // Cleanup usually happens in the paint phase or right after
    this.syncSharedState();
    this.requestFlush();
  }

  /**
   * Schedules a task to run after the current atomic frame completes.
   */
  nextTick(job: Job): void {
    this.nextTickQueue.push(job);
    this.requestFlush();
  }

  /**
   * Exposes the shared phase state for cross-context coordination.
   * Workers can read this to check scheduler load without IPC.
   */
  getSharedState(): Int32Array {
    return sharedState;
  }

  // ─── Async Process Loop ───────────────────────────────────────────────

  /**
   * Request a flush using the async process loop.
   * Phases 1-3 are dispatched via queueMicrotask for immediate processing.
   * Phase 4 (Paint) is deferred to requestAnimationFrame for frame alignment.
   */
  private requestFlush(): void {
    if (this.pending) return;
    this.pending = true;
    Atomics.store(sharedState, PHASE_PENDING, 1);

    // Use queueMicrotask for Phases 1-3 (computation phases).
    // This runs before the next paint, giving us microtask-level scheduling
    // without being frame-locked like requestAnimationFrame.
    queueMicrotask(() => {
      this.flushComputationPhases();
    });
  }

  /**
   * Flush computation phases (Capture, Evaluate, Resolve) with stall detection.
   * If any phase exceeds the budget, yield to the browser and resume.
   */
  private async flushComputationPhases(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;

    try {
      // Phase 1: Capture (microtask-immediate)
      Atomics.store(sharedState, PHASE_CURRENT, 1);
      await this.runQueueWithYielding(this.captureQueue);

      // Phase 2: Evaluate (may yield if expensive)
      Atomics.store(sharedState, PHASE_CURRENT, 2);
      await this.runQueueWithYielding(this.evaluateQueue);
      // Clear the dedup set after the evaluate phase completes
      this.evaluateSet.clear();

      // Phase 3: Resolve (microtask-immediate)
      Atomics.store(sharedState, PHASE_CURRENT, 3);
      await this.runQueueWithYielding(this.resolveQueue);

      // Phase 4: Paint — deferred to requestAnimationFrame for frame alignment
      if (this.paintQueue.length > 0 || this.nextTickQueue.length > 0) {
        await this.flushPaintPhase();
      } else {
        this.finalize();
      }
    } catch (e) {
      console.error('[Nexus Scheduler] Async loop error:', e);
      this.finalize();
    }
  }

  /**
   * Flush the Paint phase on the next animation frame.
   */
  private flushPaintPhase(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          Atomics.store(sharedState, PHASE_CURRENT, 4);
          this.runQueueSync(this.paintQueue);
          this.runQueueSync(this.nextTickQueue);
          this.finalize();
          resolve();
        });
      } else {
        // Server-side / headless fallback
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
  private finalize(): void {
    this.flushing = false;
    this.pending = false;
    Atomics.store(sharedState, PHASE_CURRENT, 0);
    Atomics.store(sharedState, PHASE_PENDING, 0);
    this.syncSharedState();

    // If new jobs were enqueued during the flush, schedule another cycle
    if (this.captureQueue.length > 0 || this.evaluateQueue.length > 0 ||
        this.resolveQueue.length > 0 || this.paintQueue.length > 0 ||
        this.nextTickQueue.length > 0) {
      this.pending = false; // Reset so requestFlush can re-enter
      this.requestFlush();
    }
  }

  // ─── Queue Execution ──────────────────────────────────────────────────

  /** Maximum iterations per queue flush to prevent infinite loops */
  private static readonly MAX_QUEUE_ITERATIONS = 10000;

  /**
   * Run a queue with stall detection. If execution exceeds the budget,
   * yield to the browser and resume processing.
   */
  private async runQueueWithYielding(queue: Job[]): Promise<void> {
    if (queue.length === 0) return;

    const startTime = performance.now();
    let iterations = 0;
    
    while (queue.length > 0) {
      if (++iterations > Scheduler.MAX_QUEUE_ITERATIONS) {
        console.error(
          `[Nexus Scheduler] Loop guard: ${iterations} iterations exceeded. ` +
          `Remaining queue size: ${queue.length}. Draining queue to prevent infinite loop.`
        );
        queue.length = 0;
        break;
      }

      const job = queue.shift()!;
      try {
        job();
      } catch (e) {
        console.error('[Nexus Scheduler] Job error:', e);
      }

      // Stall detection: yield if we've exceeded the budget
      if (performance.now() - startTime > this.stallBudget) {
        this.syncSharedState();
        await yieldToBrowser();
        // Continue processing remaining jobs after yielding
      }
    }

    this.syncSharedState();
  }

  /**
   * Run a queue synchronously (used for Paint phase which must be atomic).
   */
  private runQueueSync(queue: Job[]): void {
    const len = queue.length;
    if (len === 0) return;
    
    for (let i = 0; i < len; i++) {
      try {
        queue[i]();
      } catch (e) {
        console.error('[Nexus Scheduler] Job error:', e);
      }
    }
    queue.splice(0, len);
  }

  /**
   * Sync queue lengths to the shared state buffer for cross-context visibility.
   */
  private syncSharedState(): void {
    Atomics.store(sharedState, CAPTURE_LEN, this.captureQueue.length);
    Atomics.store(sharedState, EVALUATE_LEN, this.evaluateQueue.length);
    Atomics.store(sharedState, RESOLVE_LEN, this.resolveQueue.length);
    Atomics.store(sharedState, PAINT_LEN, this.paintQueue.length);
  }
}

export const scheduler = new Scheduler();
