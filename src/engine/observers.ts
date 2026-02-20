import { RuntimeContext } from './composition.ts';

/**
 * Base class for Singleton Observer Services.
 * Implements a registry pattern where multiple elements can be observed by a single observer instance.
 */
abstract class ObserverService<TObserver, TEntry> {
  protected observer: TObserver | null = null;
  protected registry = new Map<Element, Set<(entry: TEntry) => void>>();

  constructor() {
    if (typeof window === 'undefined') return;
    this.observer = this.createObserver();
  }

  protected abstract createObserver(): TObserver;

  /**
   * Registers a callback for an element.
   * If the element is not yet observed, starts observation.
   */
  public observe(el: Element, callback: (entry: TEntry) => void) {
    if (!this.observer) return () => {};

    let callbacks = this.registry.get(el);
    if (!callbacks) {
      callbacks = new Set();
      this.registry.set(el, callbacks);
      this.startObserving(el);
    }
    callbacks.add(callback);

    return () => {
      callbacks?.delete(callback);
      if (callbacks?.size === 0) {
        this.registry.delete(el);
        this.stopObserving(el);
      }
    };
  }

  protected abstract startObserving(el: Element): void;
  protected abstract stopObserving(el: Element): void;

  /**
   * Disconnects the observer and clears the registry.
   */
  public dispose() {
    (this.observer as any)?.disconnect?.();
    this.registry.clear();
  }
}

/**
 * Singleton MutationObserver Service.
 */
class MutationObserverService extends ObserverService<MutationObserver, MutationRecord> {
  protected createObserver() {
    return new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const callbacks = this.registry.get(mutation.target as Element);
        callbacks?.forEach((cb) => cb(mutation));
      });
    });
  }

  protected startObserving(el: Element) {
    this.observer?.observe(el, { attributes: true, childList: true, subtree: true });
  }

  protected stopObserving(el: Element) {
    // MutationObserver doesn't support unobserve(el), so we have to stay disconnected 
    // or just filter callbacks. However, keeping the observation on if other callbacks exist is fine.
    // In many cases, we just rely on disconnect() for bulk cleanup.
  }
}

/**
 * Singleton ResizeObserver Service.
 */
class ResizeObserverService extends ObserverService<ResizeObserver, ResizeObserverEntry> {
  protected createObserver() {
    return new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const callbacks = this.registry.get(entry.target);
        callbacks?.forEach((cb) => cb(entry));
      });
    });
  }

  protected startObserving(el: Element) {
    this.observer?.observe(el);
  }

  protected stopObserving(el: Element) {
    this.observer?.unobserve(el);
  }
}

/**
 * Singleton IntersectionObserver Service.
 */
class IntersectionObserverService extends ObserverService<IntersectionObserver, IntersectionObserverEntry> {
  protected createObserver() {
    return new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callbacks = this.registry.get(entry.target);
        callbacks?.forEach((cb) => cb(entry));
      });
    });
  }

  protected startObserving(el: Element) {
    this.observer?.observe(el);
  }

  protected stopObserving(el: Element) {
    this.observer?.unobserve(el);
  }
}

export const mutationObserver = new MutationObserverService();
export const resizeObserver = new ResizeObserverService();
export const intersectionObserver = new IntersectionObserverService();

/**
 * Utility to dispose of all observer services.
 */
export function disposeObservers() {
  mutationObserver.dispose();
  resizeObserver.dispose();
  intersectionObserver.dispose();
}
