import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const ifModule: AttributeModule = {
  name: 'if',
  attribute: 'if',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // 1. Create Placeholder
    const placeholder = document.createComment(` if: ${value} `);
    const parent = el.parentNode;

    if (!parent) {
      initError('if', 'Element has no parent node', el, value);
      return;
    }

    // 2. Initial State: We don't remove yet, wait for effect.
    // But we need a reference anchor. 
    // Actually, if we remove `el`, we lose the anchor for `insertBefore`.
    // So placeholder serves as anchor when `el` is missing.

    const anchor = document.createTextNode('');
    parent.insertBefore(anchor, el);

    // 3. Effect
    try {
      // runner is unused for now
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        // If el is detached (e.g. hidden), use placeholder to resolve scope from parent
        const target: any = el.isConnected ? el : (placeholder.isConnected ? placeholder : anchor);
        const condition = runtime.evaluate(target, value);

        if (condition) {
          if (!el.parentNode || el.parentNode instanceof DocumentFragment || (el as Node) === placeholder) {
            // Insert back or replace placeholder
            if (placeholder.parentNode) {
              placeholder.replaceWith(el);
            } else if (anchor.parentNode) {
              anchor.parentNode.insertBefore(el, anchor);
            }
          }
        } else {
          if (el.parentNode && !(el.parentNode instanceof DocumentFragment) || el.isConnected) {
             // If it's already a placeholder, no-op. 
             // But we need to be careful not to remove if it's already removed.
             if (el.parentNode) el.replaceWith(placeholder);
          } else if (el.parentNode instanceof DocumentFragment) {
             // In a fragment during initialization
             el.replaceWith(placeholder);
          }
        }
      });

      return () => {
        cleanup();
        if (placeholder.parentNode) placeholder.remove();
        if (anchor.parentNode) anchor.remove();
        // Should we restore `el`? usually yes, or let it die.
        // Nexus lifecycle: if component destroyed, we leave it? 
        // Best effort cleanup.
      }
    } catch (e) {
      initError('if', `Failed to initialize if: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default ifModule;
