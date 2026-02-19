import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';
import { addScopeToNode } from '../engine/scope.ts';

const forModule: AttributeModule = {
  name: 'for',
  attribute: 'for',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // 1. Validation
    if (!(el instanceof HTMLTemplateElement)) {
      initError('for', 'data-for must be on a <template> element', el, value);
      return;
    }

    // 2. Parse Syntactic Sugar: "item in items" or "(item, iterator) in items"
    const match = value.match(/^\s*(?:\(([^,]+)(?:\s*,\s*([^)]+))?\)|(\S+))\s+in\s+(.+)$/);
    if (!match) {
      initError('for', `Invalid syntax: ${value}. Expected "item in items"`, el, value);
      return;
    }

    const itemKey = match[1] || match[3];
    const indexKey = match[2];
    const itemsExpr = match[4];

    const anchor = document.createComment(` for: ${value} `);
    el.parentNode?.insertBefore(anchor, el);

    // We don't remove the template, we just don't render it. 
    // But usually we remove it to avoid confusion? 
    // Standard: Template stays as blueprint.

    const mountedNodes: Node[] = [];

    try {
      // runner is used for debugging/inspection in the future, but unused for now
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        // 3. Reactivity: Get Items
        const items = runtime.evaluate(el, itemsExpr) as unknown as unknown[];

        // 4. Reconciliation (Naive: Clear & Re-render)
        // TODO: Keyed diffing for Phase 7
        mountedNodes.forEach(n => n.parentNode?.removeChild(n));
        mountedNodes.length = 0;

        if (Array.isArray(items)) {
          const frag = document.createDocumentFragment();

          items.forEach((item, index) => {
            const clone = el.content.cloneNode(true) as DocumentFragment;

            // 5. Scope Creation
            // We need to attach scope to the *children* of the fragment
            // Fragment itself can't hold properties.
            Array.from(clone.children).forEach(child => {
              if (child instanceof HTMLElement) {
                const scope: Record<string, unknown> = {};
                scope[itemKey] = item;
                if (indexKey) scope[indexKey] = index;

                addScopeToNode(child, runtime.reactive(scope), el);

                // 6. Recursion
                runtime.processElement(child);
                mountedNodes.push(child);
              }
            });

            frag.appendChild(clone);
          });

          anchor.parentNode?.insertBefore(frag, anchor);
        }
      });

      return () => {
        cleanup();
        mountedNodes.forEach(n => n.parentNode?.removeChild(n));
        anchor.remove();
      }

    } catch (e) {
      initError('for', `Failed to initialize for: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default forModule;
