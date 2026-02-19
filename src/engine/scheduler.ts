/**
 * Unified Nexus Scheduler implementing the 4-phase Atomic Frame Execution Order.
 * Spec 5.4: Capture -> Evaluate -> Resolve -> Paint
 */

export type Job = () => void;

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

  /**
   * Phase 1: Capture
   */
  enqueueCapture(job: Job): void {
    this.captureQueue.push(job);
    this.requestFlush();
  }

  /**
   * Phase 2: Evaluate (Legacy enqueueEffect/enqueueMorph mapping)
   */
  enqueueEvaluate(job: Job): void {
    this.evaluateQueue.push(job);
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
    this.requestFlush();
  }

  /**
   * Phase 4: Paint (Legacy enqueueMorph mapping)
   */
  enqueuePaint(job: Job): void {
    this.paintQueue.push(job);
    this.requestFlush();
  }

  // Alias for compatibility with existing code
  enqueueMorph(job: Job): void {
    this.enqueuePaint(job);
  }

  // Alias for Phase 4 or cleanup
  enqueueClean(job: Job): void {
    this.paintQueue.push(job); // Cleanup usually happens in the paint phase or right after
    this.requestFlush();
  }

  /**
   * Schedules a task to run after the current atomic frame completes.
   */
  nextTick(job: Job): void {
    this.nextTickQueue.push(job);
    this.requestFlush();
  }

  private requestFlush(): void {
    if (!this.pending) {
      this.pending = true;
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          this.pending = false;
          this.flush();
        });
      } else {
        setTimeout(() => {
          this.pending = false;
          this.flush();
        }, 0);
      }
    }
  }

  /**
   * Flushes all queues in the strict 4-phase order.
   */
  private flush(): void {
    // 1. Capture Phase
    this.runQueue(this.captureQueue);

    // 2. Evaluate Phase
    this.runQueue(this.evaluateQueue);

    // 3. Resolve Phase
    this.runQueue(this.resolveQueue);

    // 4. Paint Phase
    this.runQueue(this.paintQueue);

    // Finalize: Execute nextTick callbacks
    this.runQueue(this.nextTickQueue);
  }

  private runQueue(queue: Job[]): void {
    const len = queue.length;
    if (len === 0) return;
    
    for (let i = 0; i < len; i++) {
      try {
        queue[i]();
      } catch (e) {
        console.error('Nexus Scheduler Error:', e);
      }
    }
    queue.splice(0, len);
  }
}

export const scheduler = new Scheduler();
