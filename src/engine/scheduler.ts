/**
 * Unified Nexus Scheduler — Domain-Isolated Microtask Queue Engine
 * 
 * Implements fine-grained borrower/domain microtask isolation.
 * Each DOM and reactive domain (e.g. 'sidebar', 'tab-content', 'header')
 * maintains its own independent microtask queue. Heavy route parsing
 * or DOM hydration in 'tab-content' never blocks or serializes UI interaction
 * effects in 'sidebar'.
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
  private domainQueues = new Map<string, Job[]>();
  private pendingDomains = new Set<string>();
  private nextTickQueue: Job[] = [];

  /**
   * Resolve an element or context to its semantic ownership domain key.
   */
  private resolveDomain(target?: string | Element | object): string {
    if (typeof target === 'string') return target;
    if (target && typeof (target as Element).closest === 'function') {
      const el = target as Element;
      if (el.closest('aside, .dashboard-sidebar')) return 'sidebar';
      if (el.closest('tab-content, [role="tabpanel"], .tab-content')) return 'tab-content';
      if (el.closest('header, .navbar')) return 'header';
      return el.tagName.toLowerCase();
    }
    return 'default';
  }

  /**
   * Enqueue a job into its specific domain microtask queue.
   * Deduplicates within the domain. Drains independently.
   */
  enqueueEvaluate(job: Job, domainTarget?: string | Element | object): void {
    const domain = this.resolveDomain(domainTarget);
    let queue = this.domainQueues.get(domain);
    if (!queue) {
      queue = [];
      this.domainQueues.set(domain, queue);
    }

    if (!queue.includes(job)) {
      queue.push(job);
    }

    if (!this.pendingDomains.has(domain)) {
      this.pendingDomains.add(domain);
      queueMicrotask(() => this.flushDomain(domain));
    }
  }

  // Compatibility aliases across the framework
  enqueueEffect(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }
  enqueueCapture(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }
  enqueueResolve(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }
  enqueuePaint(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }
  enqueueMorph(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }
  enqueueClean(job: Job, domain?: string | Element | object): void { this.enqueueEvaluate(job, domain); }

  nextTick(job: Job): void {
    this.nextTickQueue.push(job);
    if (!this.pendingDomains.has('__nextTick__')) {
      this.pendingDomains.add('__nextTick__');
      queueMicrotask(() => this.flushNextTick());
    }
  }

  /**
   * Drain an isolated domain's microtask queue deterministically.
   */
  private flushDomain(domain: string): void {
    this.pendingDomains.delete(domain);
    const queue = this.domainQueues.get(domain);
    if (!queue || queue.length === 0) return;

    // Snapshot and clear this domain's queue
    const jobs = queue.splice(0, queue.length);
    for (let i = 0; i < jobs.length; i++) {
      try {
        jobs[i]();
      } catch (err) {
        console.error(`[Nexus Scheduler] Error in domain '${domain}':`, err);
      }
    }

    // If new jobs were scheduled for this domain during execution, schedule next turn
    if (queue.length > 0 && !this.pendingDomains.has(domain)) {
      this.pendingDomains.add(domain);
      queueMicrotask(() => this.flushDomain(domain));
    }
  }

  private flushNextTick(): void {
    this.pendingDomains.delete('__nextTick__');
    const ticks = this.nextTickQueue.splice(0, this.nextTickQueue.length);
    for (let i = 0; i < ticks.length; i++) {
      try {
        ticks[i]();
      } catch (err) {
        console.error('[Nexus Scheduler] nextTick error:', err);
      }
    }
  }
}

export const scheduler = new Scheduler();
