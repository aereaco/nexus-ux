import { ObserverModule } from '../modules.ts';
import { RuntimeContext } from '../composition.ts';
import { NexusEnhancedElement, ownership } from '../reactivity.ts';
import { reportError } from '../errors.ts';
import { CLEANUP_FUNCTIONS_KEY, RUN_EFFECT_RUNNERS_KEY, MARKER_KEY } from '../consts.ts';

const mutationObserverModule: ObserverModule = {
  name: 'mutationObserver',
  observerType: 'MutationObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      let isProcessing = false;
      const observer = new MutationObserver((mutationsList) => {
        if (isProcessing) return;
        isProcessing = true;

        try {
          let hasAddedNodes = false;
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              if (mutation.addedNodes.length > 0) hasAddedNodes = true;
              mutation.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                  // ZCZS: Detect if this is a moved node vs a new node.
                  // If it's a move, it already has the engine marker. Skip re-processing
                  // to prevent duplicated effect runners and event listeners.
                  const enhancedTarget = node as NexusEnhancedElement;
                  if (enhancedTarget[MARKER_KEY]) return;

                  // MutationObserver callbacks are microtasks. 
                  // Running processElement synchronously here ensures it finishes before the next paint.
                  context.processElement(node as HTMLElement);
                }
              });

              // Removed nodes: Cleanup must be synchronous to support same-frame re-insertion (moves)
              mutation.removedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                  // ZCZS: Detect "Move" vs "Remove"
                  // If the node is still connected to the DOM by the time the microtask runs,
                  // it was merely moved (e.g. during a sort/drag operation). Do not tear it down.
                  if (node.isConnected) return;

                  const enhancedTarget = node as NexusEnhancedElement;
                  
                  if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                    enhancedTarget[CLEANUP_FUNCTIONS_KEY]!.forEach((cleanup: () => void) => cleanup());
                    delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                  }
                  
                  // Strip marker synchronously to allow re-init in addedNodes handler
                  delete (enhancedTarget as any)[MARKER_KEY];
                }
              });
            } else if (mutation.type === 'attributes') {
              const target = mutation.target as HTMLElement;
              if (!target) return; // JSDom headless mock guard
              const attrName = mutation.attributeName;
              
              // 1. JIT Style Adoption on class changes
              if (attrName === 'class') {
                context.adoptStyle(target);
              }

              // 2. Loop Guard: Never pulse for 'style' changes or internal markers.
              // These are managed by the engine's effects; pulsing here causes recursion.
              if (attrName === 'style' || attrName?.startsWith('data-nexus-') || attrName?.startsWith('nexus-')) return;

              // 3. Pulse self (using Symbol for speed)
              (target as NexusEnhancedElement)[RUN_EFFECT_RUNNERS_KEY]?.();
              
              // 4. Pulse Ownership-Based Dependents (Selectors)
              const borrows = ownership.getBorrowers(target);
              borrows.forEach(borrow => {
                const borrower = borrow.borrower as NexusEnhancedElement;
                // Borrower must be an element with reactive effects
                try {
                  borrower[RUN_EFFECT_RUNNERS_KEY]?.();
                } catch (err) {
                  // Isolate: a failed borrower must not break sibling borrowers
                  console.error(
                    `[Nexus Isolation] Borrower <${(borrower as HTMLElement).tagName}> ` +
                    `failed during ownership pulse from <${target.tagName}>:`, err
                  );
                }
              });
            }
          }
          
          if (hasAddedNodes) {
            // globalThis.dispatchEvent(new CustomEvent('nexus:dom-mutated'));
          }
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
