import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const ifModule: AttributeModule = {
  name: 'if',
  attribute: 'if',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const parent = el.parentNode;
    if (!parent || parent instanceof DocumentFragment) return;

    // 1. Placeholder & Anchor
    const placeholder = document.createComment(` if: ${value} `);
    const anchor = document.createTextNode('');
    parent.insertBefore(anchor, el);

    const isTemplate = el instanceof HTMLTemplateElement;
    const blueprint = isTemplate ? (el as HTMLTemplateElement).content : null;

    let currentNodes: Node[] = isTemplate ? [] : [el];
    let isMounted = !isTemplate;

    // CLEANUP SYMBOL for child disposal
    const CLEANUP_SYMBOL = Symbol.for('__cleanup_functions__');
    interface NexusElement extends HTMLElement { [CLEANUP_SYMBOL]?: (() => void)[] }

    const disposeNodes = (nodes: Node[]) => {
      nodes.forEach(n => {
        if (n instanceof HTMLElement) {
          const enhanced = n as NexusElement;
          const elRemovals = enhanced[CLEANUP_SYMBOL];
          if (elRemovals) {
            elRemovals.forEach(c => c());
            delete enhanced[CLEANUP_SYMBOL];
          }
        }
        n.parentNode?.removeChild(n);
      });
    };

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        // Resolve condition relative to el (or placeholder if detached)
        const target = el.isConnected ? el : (placeholder.isConnected ? placeholder : anchor);
        const condition = Boolean(runtime.evaluate(target, value));

        if (condition) {
          if (!isMounted) {
            if (isTemplate && blueprint) {
              const clone = blueprint.cloneNode(true);
              currentNodes = Array.from(clone.childNodes);
              currentNodes.forEach(n => {
                anchor.parentNode?.insertBefore(n, anchor);
                if (n instanceof HTMLElement) runtime.processElement(n);
              });
            } else {
              if (placeholder.parentNode) {
                placeholder.replaceWith(el);
              } else {
                anchor.parentNode?.insertBefore(el, anchor);
              }
              currentNodes = [el];
            }
            isMounted = true;
          }
        } else {
          if (isMounted) {
            if (isTemplate) {
              disposeNodes(currentNodes);
              currentNodes = [];
            } else {
              el.replaceWith(placeholder);
            }
            isMounted = false;
          }
        }
      });

      return () => {
        cleanup();
        if (isTemplate) {
          disposeNodes(currentNodes);
        }
        if (placeholder.parentNode) placeholder.remove();
        if (anchor.parentNode) anchor.remove();
      };
    } catch (e) {
      initError('if', `Failed to initialize if: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default ifModule;
