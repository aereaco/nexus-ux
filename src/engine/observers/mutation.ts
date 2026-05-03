import { ObserverModule } from '../modules.ts';
import { RuntimeContext } from '../composition.ts';
import { NexusEnhancedElement, ownership } from '../reactivity.ts';
import { reportError } from '../debug.ts';
import { CLEANUP_FUNCTIONS_KEY, RUN_EFFECT_RUNNERS_KEY, MARKER_KEY } from '../consts.ts';

// Module-level state for cross-batch move detection
const movedNodes = new WeakSet<HTMLElement>();
const movedNodeTimers = new Map<HTMLElement, number>();

const mutationObserverModule: ObserverModule = {
  name: 'mutationObserver',
  observerType: 'MutationObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      let isProcessing = false;
      const observer = new MutationObserver((mutationsList) => {
        if (isProcessing) return;
        isProcessing = true;

        const addedThisBatch = new Set<HTMLElement>();
        const now = performance.now();

        // Purge stale moved node entries (>2 frames old ≈ 32ms)
        for (const [node, ts] of movedNodeTimers) {
          if (now - ts > 32) {
            movedNodeTimers.delete(node);
            movedNodes.delete(node);
          }
        }

        try {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                  if (node instanceof HTMLElement) {
                    addedThisBatch.add(node);
                    const enhancedTarget = node as NexusEnhancedElement;
                    if (enhancedTarget[MARKER_KEY]) return;
                    context.processElement(node as HTMLElement);
                  }
                });
              }

              mutation.removedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                  if (node.isConnected || movedNodes.has(node)) return;

                  const enhancedTarget = node as NexusEnhancedElement;
                  if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                    enhancedTarget[CLEANUP_FUNCTIONS_KEY]!.forEach((cleanup: () => void) => cleanup());
                    delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                  }
                  delete (enhancedTarget as any)[MARKER_KEY];
                }
              });

              // Pulse parent effect for this subtree mutation
              (mutation.target as NexusEnhancedElement)[RUN_EFFECT_RUNNERS_KEY]?.();
            } else if (mutation.type === 'attributes') {
              const target = mutation.target as HTMLElement;
              if (!target) return;
              const attrName = mutation.attributeName;

              if (attrName === 'class') {
                context.adoptStyle(target);
              }

              if (attrName === 'style' || attrName?.startsWith('data-nexus-') || attrName?.startsWith('nexus-')) return;

              (target as NexusEnhancedElement)[RUN_EFFECT_RUNNERS_KEY]?.();

              const borrows = ownership.getBorrowers(target);
              borrows.forEach(borrow => {
                const borrower = borrow.borrower as NexusEnhancedElement;
                try {
                  borrower[RUN_EFFECT_RUNNERS_KEY]?.();
                } catch (err) {
                  console.error(
                    `[Nexus Isolation] Borrower <${(borrower as HTMLElement).tagName}> ` +
                    `failed during ownership pulse from <${target.tagName}>:`, err
                  );
                }
              });
            }
          }

          // Track moved nodes for cross-batch stability
          addedThisBatch.forEach(node => {
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
  },
};

export default mutationObserverModule;
