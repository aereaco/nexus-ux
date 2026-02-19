import { ObserverModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { NexusEnhancedElement } from '../../engine/reactivity.ts';
import { reportError } from '../../engine/errors.ts';
import { CLEANUP_FUNCTIONS_KEY } from '../../engine/consts.ts';

const mutationObserverModule: ObserverModule = {
  name: 'mutationObserver',
  observerType: 'MutationObserver',
  observe: (el: HTMLElement, context: RuntimeContext) => {
    try {
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // Handle added nodes
            mutation.addedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                // Defer to scheduler to avoid layout thrashing?
                // 2025 uses context.scheduler.enqueueEffect
                context.scheduler.enqueueEffect(() => context.processElement(node as HTMLElement));
              }
            });
            // Handle removed nodes
            mutation.removedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                const target = node as HTMLElement;
                context.scheduler.enqueueClean(() => {
                  // Run cleanup
                  const enhancedTarget = target as NexusEnhancedElement;
                  if (enhancedTarget[CLEANUP_FUNCTIONS_KEY]) {
                    enhancedTarget[CLEANUP_FUNCTIONS_KEY]!.forEach((cleanup: () => void) => cleanup());
                    delete enhancedTarget[CLEANUP_FUNCTIONS_KEY];
                  }
                  // TODO: Clean up effects/scopes attached to this element?
                  // If scopes are attached via WeakMap, they might be GC'd.
                  // But explicit cleanup (e.g. event listeners) is needed.
                });
              }
            });
          } else if (mutation.type === 'attributes') {
            if (mutation.target instanceof HTMLElement) {
              // We re-process element?
              // Using processElement might re-bind everything.
              // We typically need to update specific directives.
              // But Nexus-UX is mostly "init once".
              // If we want reactive attributes, we use signals.
              // Re-processing might duplicate listeners.
              // 2025 re-processes it.
              // Use caution.
              context.scheduler.enqueueEffect(() => context.processElement(mutation.target as HTMLElement));
            }
          }
        }
      });

      observer.observe(el, { childList: true, subtree: true, attributes: false }); // Attributes false by default unless specifically needed? 2025 says true.
      // If we observe attributes, we must be careful not to infinite loop if processElement updates attributes.
      // 2025 observes attributes. I'll stick to it but maybe limit it?

      return () => observer.disconnect();

    } catch (e) {
      reportError(new Error(`Failed to init MutationObserver: ${e instanceof Error ? e.message : String(e)}`), el);
    }
  },
};

export default mutationObserverModule;
