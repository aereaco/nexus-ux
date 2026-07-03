import { ObserverModule } from './modules.ts';
import { RuntimeContext } from './composition.ts';
import { NexusEnhancedElement, ownership } from './reactivity.ts';
import { reportError } from './debug.ts';
import { CLEANUP_FUNCTIONS_KEY, RUN_EFFECT_RUNNERS_KEY, MARKER_KEY } from './consts.ts';

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

        // Pre-pass: collect all added nodes in this batch of mutations first
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                addedThisBatch.add(node);
              }
            });
          }
        }

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
                    const enhancedTarget = node as NexusEnhancedElement;
                    if (enhancedTarget[MARKER_KEY]) return;
                    context.processElement(node as HTMLElement);
                  }
                });
              }

              mutation.removedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                  if (node.isConnected || addedThisBatch.has(node) || movedNodes.has(node)) return;

                  const enhancedTarget = node as NexusEnhancedElement;
                  if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                    enhancedTarget[CLEANUP_FUNCTIONS_KEY]!.forEach((cleanup: () => void) => cleanup());
                    delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                  }
                  delete (enhancedTarget as any)[MARKER_KEY];
                }
              });

              // NOTE: Removed RUN_EFFECT_RUNNERS_KEY pulse here.
              // Pulsing parent effects on childList mutations created microtask storms:
              //   textContent change → childList mutation → RUN_EFFECT_RUNNERS_KEY
              //   → effect re-runs → textContent change → childList mutation → ∞
              // The data-for module handles its own re-rendering via Vue effects.
              // New elements are processed by processElement() above (line 41).
              // Element cleanup is handled by the removedNodes loop above.
            } else if (mutation.type === 'attributes') {
              const target = mutation.target as HTMLElement;
              if (!target) return;
              const attrName = mutation.attributeName;

              if (attrName === 'class') {
                context.adoptStyle(target);
              }

              // Skip framework-managed attributes entirely.
              // Effects that write these attributes are already scheduled via
              // Vue's reactive system. Re-running them here via
              // RUN_EFFECT_RUNNERS_KEY creates a dual-path feedback loop:
              //   effect → setAttribute → observer → RUN_EFFECT_RUNNERS_KEY
              //   → effect → setAttribute → observer → ∞
              if (attrName === 'style' || attrName === 'draggable' ||
                  attrName?.startsWith('data-') || attrName?.startsWith('nexus-')) return;

              // For non-framework attributes (e.g. third-party library changes),
              // notify borrowers only — NOT the element's own effects.
              // This preserves cross-element ownership tracking while avoiding
              // the setAttribute→observer→effect→setAttribute infinite loop.
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

          // Dispatch event once per batch to notify modules (like Predictive Engine) that DOM has changed
          document.dispatchEvent(new CustomEvent('nexus:dom-mutated', { bubbles: true }));

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
