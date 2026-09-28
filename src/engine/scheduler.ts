/**
 * Unified Nexus Scheduler — Deno/Node.js-style Async Microtask Loop
 * 
 * Provides zero-overhead, cooperative, input-priority-aware async scheduling
 * for reactive evaluation and DOM reconciliation.
 * 
 * Architecture:
 *   - Decoupled microtask loop draining deduplicated reactive jobs.
 *   - Input-priority cooperative yielding: yields immediately via scheduler.yield()
 *     or MessageChannel when user input is pending (isInputPending) or stall budget
 *     is exceeded (default 8ms), guaranteeing responsive UI interactions.
 *   - SharedArrayBuffer state slots preserved for ZCZS cross-worker coordination.
 */

export type Job = () => void;

let currentEvalFrame = 0;
export function getEvalFrame(): number {
  return currentEvalFrame;
}
export function advanceEvalFrame(): number {
  return ++currentEvalFrame;
}

// ─────────────────────────────────────────────────────────────────────────────
// SharedArrayBuffer Phase State (ZCZS cross-context coordination)
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_CURRENT = 0;
const PHASE_PENDING = 1;
const EVALUATE_LEN = 2;
const STATE_SLOTS = 6;

let sharedState: Int32Array;
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
// Cooperative Browser Yielding (scheduler.yield / MessageChannel)
// ─────────────────────────────────────────────────────────────────────────────
let yieldChannel: MessageChannel | null = null;
let yieldResolve: (() => void) | null = null;

if (typeof MessageChannel !== 'undefined') {
  yieldChannel = new MessageChannel();
  yieldChannel.port1.onmessage = () => {
    if (yieldResolve) {
      const res = yieldResolve;
      yieldResolve = null;
      res();
    }
  };
}

async function yieldToBrowser(): Promise<void> {
  if (typeof (globalThis as any).scheduler?.yield === 'function') {
    return (globalThis as any).scheduler.yield();
  }
  if (yieldChannel) {
    return new Promise<void>((resolve) => {
      yieldResolve = resolve;
      yieldChannel!.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler Class
// ─────────────────────────────────────────────────────────────────────────────
const STALL_BUDGET_MS = 8;
const MAX_ITERATIONS = 5000;

class Scheduler {
  private queue = new Set<Job>();
  private nextTickQueue: Job[] = [];
  private isFlushPending = false;
  private isFlushing = false;
  public stallBudget = STALL_BUDGET_MS;

  /**
   * Enqueue an evaluation job (deduplicated via Set for O(1) membership).
   */
  enqueueEvaluate(job: Job): void {
    if (this.queue.has(job)) return;
    this.queue.add(job);
    this.syncSharedState();
    this.requestFlush();
  }

  // Backward-compatibility aliases across the framework
  enqueueEffect(job: Job): void { this.enqueueEvaluate(job); }
  enqueueCapture(job: Job): void { this.enqueueEvaluate(job); }
  enqueueResolve(job: Job): void { this.enqueueEvaluate(job); }
  enqueuePaint(job: Job): void { this.enqueueEvaluate(job); }
  enqueueMorph(job: Job): void { this.enqueueEvaluate(job); }
  enqueueClean(job: Job): void { this.enqueueEvaluate(job); }

  nextTick(job: Job): void {
    this.nextTickQueue.push(job);
    this.requestFlush();
  }

  getSharedState(): Int32Array {
    return sharedState;
  }

  private requestFlush(): void {
    if (this.isFlushPending) return;
    this.isFlushPending = true;
    Atomics.store(sharedState, PHASE_PENDING, 1);

    queueMicrotask(() => {
      this.flush();
    });
  }

  private async flush(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    this.isFlushPending = false;
    Atomics.store(sharedState, PHASE_CURRENT, 2);

    let startTime = performance.now();
    let iterations = 0;

    try {
      while (this.queue.size > 0) {
        if (++iterations > MAX_ITERATIONS) {
          console.error(`[Nexus Scheduler] Loop guard: exceeded ${MAX_ITERATIONS} iterations. Clearing queue.`);
          this.queue.clear();
          break;
        }

        // Take snapshot of current jobs to allow new jobs to enqueue cleanly
        const jobs = Array.from(this.queue);
        this.queue.clear();
        this.syncSharedState();

        for (let i = 0; i < jobs.length; i++) {
          try {
            jobs[i]();
          } catch (err) {
            console.error('[Nexus Scheduler] Job error:', err);
          }

          // Check if browser input is pending or stall budget exceeded every 8 jobs
          const shouldCheck = (i & 7) === 0 || i === jobs.length - 1;
          const isInputPending = typeof navigator !== 'undefined' && (navigator as any).scheduling?.isInputPending?.() === true;
          const isStalled = performance.now() - startTime > this.stallBudget;

          if (shouldCheck && (isInputPending || isStalled)) {
            // Re-queue remaining un-executed jobs in this batch
            for (let j = i + 1; j < jobs.length; j++) {
              this.queue.add(jobs[j]);
            }
            this.syncSharedState();
            await yieldToBrowser();
            startTime = performance.now();
            break; // Break inner loop to re-snapshot with any newly enqueued jobs
          }
        }
      }

      // Flush nextTick jobs
      if (this.nextTickQueue.length > 0) {
        const ticks = this.nextTickQueue.splice(0, this.nextTickQueue.length);
        for (const tick of ticks) {
          try { tick(); } catch (err) { console.error('[Nexus Scheduler] nextTick error:', err); }
        }
      }
    } finally {
      this.isFlushing = false;
      Atomics.store(sharedState, PHASE_CURRENT, 0);
      Atomics.store(sharedState, PHASE_PENDING, this.queue.size > 0 ? 1 : 0);
      this.syncSharedState();

      if (this.queue.size > 0 || this.nextTickQueue.length > 0) {
        this.requestFlush();
      }
    }
  }

  private syncSharedState(): void {
    Atomics.store(sharedState, EVALUATE_LEN, this.queue.size);
  }
}

export const scheduler = new Scheduler();
