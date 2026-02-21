import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';
import { addScopeToNode } from '../../engine/scope.ts';

const forModule: AttributeModule = {
  name: 'for',
  attribute: 'for',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // 1. Validation
    // 1. Blueprint Creation
    const isTemplate = el instanceof HTMLTemplateElement;
    const blueprint = isTemplate ? (el as HTMLTemplateElement).content : el;
    
    let itemKey = '';
    let indexKey: string | undefined = undefined;
    let itemsExpr = '';

    const inIdx = value.indexOf(' in ');
    if (inIdx === -1) {
      initError('for', `Invalid syntax: ${value}. Expected "item in items"`, el, value);
      return;
    }

    const lhs = value.substring(0, inIdx).trim();
    itemsExpr = value.substring(inIdx + 4).trim();

    if (lhs.startsWith('(') && lhs.endsWith(')')) {
        const inner = lhs.substring(1, lhs.length - 1);
        const commaIdx = inner.indexOf(',');
        if (commaIdx !== -1) {
            itemKey = inner.substring(0, commaIdx).trim();
            indexKey = inner.substring(commaIdx + 1).trim();
        } else {
            itemKey = inner.trim();
        }
    } else {
        itemKey = lhs;
    }
 
    const anchor = document.createComment(` for: ${value} `);
    el.parentNode?.insertBefore(anchor, el);
 
    if (!isTemplate) {
      el.style.display = 'none';
      // Mark as hidden template to avoid multiple processing if needed
      el.setAttribute('data-ux-template', 'true');
    }

    const disposeNodes = (nodes: Node[]) => {
      nodes.forEach(n => {
        if (n instanceof HTMLElement) {
          const enhanced = n as any;
          const elRemovals = enhanced[Symbol.for('__cleanup_functions__')];
          if (elRemovals) {
            elRemovals.forEach((cleanup: () => void) => cleanup());
            delete enhanced[Symbol.for('__cleanup_functions__')];
          }
          disposeNodes(Array.from(n.childNodes));
        }
        n.parentNode?.removeChild(n);
      });
    };

    const mountedNodes: Node[] = [];

    try {
      // runner is used for debugging/inspection in the future, but unused for now
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        // 3. Reactivity: Get Items
        const items = runtime.evaluate(el, itemsExpr) as unknown as unknown[];
        if (runtime.isDevMode) runtime.debug(`[data-for] Items for "${itemsExpr}":`, items);

        // 4. Reconciliation (Naive: Clear & Re-render)
        disposeNodes(mountedNodes);
        mountedNodes.length = 0;

        if (Array.isArray(items)) {
          const frag = document.createDocumentFragment();

          items.forEach((item, index) => {
            const clone = isTemplate 
              ? (blueprint as DocumentFragment).cloneNode(true) 
              : (blueprint as HTMLElement).cloneNode(true);

            // 5. Scope Creation & Attachment
            // If it's a template, we work with children of the fragmented clone.
            // If it's a regular element, the clone itself is the target.
            const nodesToProcess: HTMLElement[] = isTemplate 
              ? Array.from((clone as DocumentFragment).children).filter(n => n instanceof HTMLElement) as HTMLElement[]
              : [clone as HTMLElement];

            nodesToProcess.forEach(child => {
              const scope: Record<string, unknown> = {};
              scope[itemKey] = item;
              if (indexKey) scope[indexKey] = index;

              addScopeToNode(child, runtime.reactive(scope), el);

              // 6. Recursion

              // 6. Recursion
              runtime.processElement(child);
              mountedNodes.push(child);
            });

            if (isTemplate) {
              frag.appendChild(clone as DocumentFragment);
            } else {
              // For non-templates, the clone is an HTMLElement. 
              // We must ensure it's visible (blueprint was display:none)
              (clone as HTMLElement).style.display = '';
              (clone as HTMLElement).removeAttribute('data-for');
              (clone as HTMLElement).removeAttribute('data-ux-template');
              frag.appendChild(clone as HTMLElement);
            }
          });

          anchor.parentNode?.insertBefore(frag, anchor);
        }
      });

      return () => {
        cleanup();
        disposeNodes(mountedNodes);
        anchor.remove();
      }

    } catch (e) {
      initError('for', `Failed to initialize for: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default forModule;
