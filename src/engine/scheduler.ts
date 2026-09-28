/**
 * Unified Nexus Scheduler — Vue 3 / Deno Standard Microtask Batcher
 * 
 * Provides deterministic, zero-overhead asynchronous microtask batching
 * for fine-grained reactive evaluation and DOM reconciliation.
 */

export type Job = () => void;

let currentEvalFrame = 0;
export function getEvalFrame(): number {
  return currentEvalFrame;
}
export function advanceEvalFrame(): number {
  return ++currentEvalFrame;
}

class Scheduler {
  private queue: Job[] = [];
  private flushIndex = 0;
  private isFlushing = false;
  private isFlushPending = false;
  private nextTickQueue: Job[] = [];

  /**
   * Vue 3 queueJob pattern: Enqueues a job deduplicated.
   * If a flush is not already scheduled, queues a microtask.
   */
  enqueueEvaluate(job: Job): void {
    if (!this.queue.includes(job, this.flushIndex)) {
      this.queue.push(job);
      this.requestFlush();
    }
  }

  // Compatibility aliases across the framework
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

  private requestFlush(): void {
    if (this.isFlushing || this.isFlushPending) return;
    this.isFlushPending = true;
    queueMicrotask(() => this.flushJobs());
  }

  /**
   * Vue 3 flushJobs pattern: Drains all pending jobs deterministically to completion.
   */
  private flushJobs(): void {
    this.isFlushPending = false;
    this.isFlushing = true;

    try {
      for (this.flushIndex = 0; this.flushIndex < this.queue.length; this.flushIndex++) {
        const job = this.queue[this.flushIndex];
        if (job) {
          try {
            job();
          } catch (err) {
            console.error('[Nexus Scheduler] Job error:', err);
          }
        }
      }
    } finally {
      this.flushIndex = 0;
      this.queue.length = 0;
      this.isFlushing = false;

      // Drain nextTick callbacks
      if (this.nextTickQueue.length > 0) {
        const ticks = this.nextTickQueue.splice(0, this.nextTickQueue.length);
        for (let i = 0; i < ticks.length; i++) {
          try {
            ticks[i]();
          } catch (err) {
            console.error('[Nexus Scheduler] nextTick error:', err);
          }
        }
      }

      // If any jobs were enqueued during nextTick, flush them
      if (this.queue.length > 0) {
        this.requestFlush();
      }
    }
  }
}

export const scheduler = new Scheduler();
