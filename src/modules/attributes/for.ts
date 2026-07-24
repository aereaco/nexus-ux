/**
 * Nexus-UX For Directive Module
 *
 * Handles `data-for` for list rendering. Clones a template element for each
 * item in an array, binds the item to the element's scope, and manages
 * lifecycle cleanup when the array changes.
 *
 * Supported Syntax:
 *   - `(item, index) in items` — tuple destructuring
 *   - `item in items` — item only
 *   - `item, i in items` — alternative tuple syntax
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Template nodes are cloned via cloneNode(true); original
 *     template is never mutated.
 *   - Zero-serialization: Scope objects are shared by reference across
 *     cloned elements; no serialization.
 *
 * Coordination:
 *   - scope.ts provides addScopeToNode for scoped element creation
 *   - reconciler.ts provides nexusClassMap/nexusStyleMap for metadata
 *   - reactivity.ts provides reactive wrappers for array tracking
 *   - consts.ts provides CLEANUP_FUNCTIONS_KEY for lifecycle management
 *
 * Nexus-UX Innovations Preserved:
 *   - Flow-aware cloning (SVG and HTML elements both supported)
 *   - Nexus metadata preservation across clone boundaries
 *   - Automatic cleanup on array mutation or element removal
 *   - Ghost key support for typed item properties
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { CLEANUP_FUNCTIONS_KEY, IS_TEMPLATE_KEY } from '../../engine/consts.ts';
import { nexusClassMap, nexusStyleMap } from '../../engine/reconciler.ts';

// SVGs (paths, etc.) are SVGElement, not HTMLElement — both must be treated
// as cloneable/scopable flow nodes.
type ForNode = HTMLElement | SVGElement;
const isFlowNode = (n: Node): n is ForNode => n instanceof HTMLElement || n instanceof SVGElement;

// Helper to copy dynamic class and style metadata recursively during cloning
function copyNexusMetadata(src: ForNode, dest: ForNode) {
  const srcClasses = nexusClassMap.get(src);
  if (srcClasses) {
    nexusClassMap.set(dest, new Set(srcClasses));
  }
  const srcStyles = nexusStyleMap.get(src);
  if (srcStyles) {
    nexusStyleMap.set(dest, new Set(srcStyles));
  }
  const srcChildren = Array.from(src.children) as HTMLElement[];
  const destChildren = Array.from(dest.children) as HTMLElement[];
  for (let i = 0; i < srcChildren.length; i++) {
    if (srcChildren[i] && destChildren[i]) {
      copyNexusMetadata(srcChildren[i], destChildren[i]);
    }
  }
}

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
      // Mark as hidden template in JS memory via Symbol key (Alpine/Datastar pattern)
      (el as any)[IS_TEMPLATE_KEY] = true;
    }

    const disposeNodes = (nodes: Node[]) => {
      nodes.forEach(n => {
        if (n instanceof HTMLElement || n instanceof SVGElement) {
          const enhanced = n as any;
          const elRemovals = enhanced[CLEANUP_FUNCTIONS_KEY];
          if (elRemovals) {
            elRemovals.forEach((cleanup: () => void) => cleanup());
            delete enhanced[CLEANUP_FUNCTIONS_KEY];
          }
          disposeNodes(Array.from(n.childNodes));
        }
        n.parentNode?.removeChild(n);
      });
    };

    const mountedMap = new Map<any, Node[]>();

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
            
            if (!isTemplate) {
              copyNexusMetadata(blueprint as HTMLElement, clone as HTMLElement);
            } else {
              const srcChildren = Array.from(blueprint.childNodes).filter(n => n instanceof HTMLElement) as HTMLElement[];
              const destChildren = Array.from(clone.childNodes).filter(n => n instanceof HTMLElement) as HTMLElement[];
              for (let i = 0; i < srcChildren.length; i++) {
                if (srcChildren[i] && destChildren[i]) {
                  copyNexusMetadata(srcChildren[i], destChildren[i]);
                }
              }
            }
            
            nodes = isTemplate 
              ? Array.from((clone as DocumentFragment).childNodes).filter(isFlowNode) as ForNode[]
              : [clone as ForNode];

            nodes.forEach(n => {
              if (isFlowNode(n)) {
                const scope: Record<string, any> = { [itemKey]: item };
                if (indexKey) scope[indexKey] = index;
                // ZCZS: Use shallowReactive to preserve the original reactive proxy
                // references from the parent collection. Deep reactive() would create
                // disconnected copies, breaking bidirectional state synchronization
                // between parent array items and child scope references.
                addScopeToNode(n, runtime.shallowReactive(scope), el);
                
                if (!isTemplate) {
                  n.style.display = '';
                  n.removeAttribute('data-for');
                  n.removeAttribute('data-template');
                }
                runtime.processElement(n);
              }
            });
            mountedMap.set(key, nodes);
          } else {
            // Update Existing Scope
            nodes.forEach(n => {
              if (isFlowNode(n)) {
                const enhanced = n as any;
                const stack = enhanced[Symbol.for('__data_stack__')] || enhanced['__data_stack__'];
                if (stack && stack.length > 0) {
                  // Mutate existing proxy to trigger bound effects
                  const scope = stack[0];
                  scope[itemKey] = item;
                  if (indexKey) scope[indexKey] = index;
                } else {
                  // Fallback if scope was somehow lost
                  const scope: Record<string, any> = { [itemKey]: item };
                  if (indexKey) scope[indexKey] = index;
                  addScopeToNode(n, runtime.shallowReactive(scope), el);
                }
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

        // Re-order in DOM — only move nodes that are out of position.
        // Avoids triggering unnecessary childList mutations which cascade
        // into effect re-runs via RUN_EFFECT_RUNNERS_KEY on the parent.
        let expectedBefore: Node | null = anchor;
        for (let i = nextNodes.length - 1; i >= 0; i--) {
          const node = nextNodes[i];
          if (node.nextSibling !== expectedBefore) {
            anchor.parentNode?.insertBefore(node, expectedBefore);
          }
          expectedBefore = node;
        }
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
