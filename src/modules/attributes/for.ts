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

    const mountedMap = new Map<any, Node[]>();
    const order: any[] = [];

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const items = runtime.evaluate(el, itemsExpr) as unknown as unknown[];
        if (!Array.isArray(items)) return;

        const currentKeys = new Set();
        const nextNodes: Node[] = [];

        items.forEach((item, index) => {
          const key = (item as any).id ?? index;
          currentKeys.add(key);

          let nodes = mountedMap.get(key);
          if (!nodes) {
            // Create New
            const clone = isTemplate 
              ? (blueprint as DocumentFragment).cloneNode(true) 
              : (blueprint as HTMLElement).cloneNode(true);
            
            nodes = isTemplate 
              ? Array.from((clone as DocumentFragment).childNodes)
              : [clone as HTMLElement];

            nodes.forEach(n => {
              if (n instanceof HTMLElement) {
                const scope: Record<string, any> = { [itemKey]: item };
                if (indexKey) scope[indexKey] = index;
                addScopeToNode(n, runtime.reactive(scope), el);
                
                if (!isTemplate) {
                  n.style.display = '';
                  n.removeAttribute('data-for');
                  n.removeAttribute('data-ux-template');
                }
                runtime.processElement(n);
              }
            });
            mountedMap.set(key, nodes);
          } else {
            // Update Existing Scope
            nodes.forEach(n => {
              if (n instanceof HTMLElement) {
                const scope: Record<string, any> = { [itemKey]: item };
                if (indexKey) scope[indexKey] = index;
                addScopeToNode(n, runtime.reactive(scope), el);
              }
            });
          }
          nextNodes.push(...nodes);
        });

        // Remove old nodes
        for (const [key, nodes] of mountedMap.entries()) {
          if (!currentKeys.has(key)) {
            disposeNodes(nodes);
            mountedMap.delete(key);
          }
        }

        // Re-order in DOM
        nextNodes.forEach(node => {
          anchor.parentNode?.insertBefore(node, anchor);
        });
      });

      return () => {
        cleanup();
        for (const nodes of mountedMap.values()) disposeNodes(nodes);
        mountedMap.clear();
        anchor.remove();
      }

    } catch (e) {
      initError('for', `Failed to initialize for: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default forModule;
