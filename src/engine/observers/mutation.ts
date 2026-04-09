import { ObserverModule } from '../modules.ts';
import { RuntimeContext } from '../composition.ts';
import { NexusEnhancedElement, ownership } from '../reactivity.ts';
import { reportError } from '../errors.ts';
import { CLEANUP_FUNCTIONS_KEY, RUN_EFFECT_RUNNERS_KEY } from '../consts.ts';

const mutationObserverModule: ObserverModule = {
  name: 'mutationObserver',
  observerType: 'MutationObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // Added nodes: initialize directives via microtask.
            // queueMicrotask runs before the browser paints, guaranteeing
            // users never see unprocessed content (no flash). This is the
            // same scheduling tier as MutationObserver itself — both live
            // on the microtask queue, keeping initialization eager without
            // risking layout thrashing from fully synchronous processing.
            mutation.addedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                queueMicrotask(() => context.processElement(node as HTMLElement));
              }
            });

            // Removed nodes: run cleanup via scheduler (paint phase).
            // Cleanup is less timing-critical — there's no visual artifact
            // from a brief delay, and batching prevents churn during rapid
            // DOM removals (e.g. data-for reconciliation).
            mutation.removedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                const target = node as HTMLElement;
                context.scheduler.enqueueClean(() => {
                  const enhancedTarget = target as NexusEnhancedElement;
                  if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                    enhancedTarget[CLEANUP_FUNCTIONS_KEY]!.forEach((cleanup: () => void) => cleanup());
                    delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                  }
                });
              }
            });
          } else if (mutation.type === 'attributes') {
            const target = mutation.target as any;
            
            // Pulse self (using Symbol for speed)
            target[RUN_EFFECT_RUNNERS_KEY]?.();
            
            // Pulse Ownership-Based Dependents (Selectors)
            const borrows = ownership.getBorrowers(target);
            borrows.forEach(borrow => {
              const borrower = borrow.borrower as any;
              // Borrower must be an element with reactive effects
              borrower[RUN_EFFECT_RUNNERS_KEY]?.();
            });
          }
        }
      });

      observer.observe(el, { childList: true, subtree: true, attributes: true });

      return () => observer.disconnect();

    } catch (e) {
      reportError(new Error(`Failed to init MutationObserver: ${e instanceof Error ? e.message : String(e)}`), el);
    }
  },
};

export default mutationObserverModule;
