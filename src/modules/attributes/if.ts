/**
 * Nexus-UX If Directive Module
 *
 * Handles `data-if` for conditional element rendering. When the bound
 * expression is truthy, the element is created/morphed into the DOM;
 * when falsy, it is torn down and removed.
 *
 * Teardown:
 *   Recursively invokes all registered cleanup functions (effects,
 *   listeners, nested directives) before removing the element. This
 *   prevents memory leaks and ghost effects.
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Template nodes are cloned; original is never mutated.
 *   - Zero-serialization: Cleanup functions are invoked by reference.
 *
 * Coordination:
 *   - scope.ts provides createScopeProxy for conditional scopes
 *   - reconciler.ts provides morphDOM for element creation
 *   - consts.ts provides CLEANUP_FUNCTIONS_KEY and MARKER_KEY
 *   - reactivity.ts provides effect tracking for conditional bindings
 *
 * Nexus-UX Innovations Preserved:
 *   - Recursive teardown with cleanup function invalidation
 *   - Engine marker clearing for re-hydration
 *   - Support for both Map and Array cleanup storage (legacy compat)
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { CLEANUP_FUNCTIONS_KEY, MARKER_KEY } from '../../engine/consts.ts';

interface NexusIfElement extends HTMLElement {
  [CLEANUP_FUNCTIONS_KEY]?: Map<string, () => void> | Array<() => void>;
  [MARKER_KEY]?: unknown;
}

/**
 * Recursively tear down an element subtree: invoke every element's registered
 * cleanup functions (effects, listeners, nested directives) and clear the
 * engine's processed-marker so the node can be cleanly re-hydrated later.
 *
 * The engine stores cleanups in a Map (see modules.ts); older code paths may
 * use an array. Both are iterated via `forEach`, whose callback receives the
 * cleanup function as its first argument in either case.
 */
function teardownTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return;
  // Depth-first: dispose descendants before the node itself.
  const children = Array.from(node.childNodes);
  for (const child of children) teardownTree(child);

  const enhanced = node as NexusIfElement;
  const removals = enhanced[CLEANUP_FUNCTIONS_KEY];
  if (removals) {
    (removals as Map<string, () => void>).forEach((c: () => void) => {
      try { c(); } catch { /* best-effort teardown */ }
    });
    delete enhanced[CLEANUP_FUNCTIONS_KEY];
  }
  // Clear the processed marker so processElement() will re-walk this node if it
  // is ever mounted again.
  delete enhanced[MARKER_KEY];
}

const ifModule: AttributeModule = {
  name: 'if',
  attribute: 'if',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const parent = el.parentNode;
    if (!parent || parent instanceof DocumentFragment) return;

    // Anchor marks the insertion point; mounted clones are inserted before it.
    const anchor = document.createComment(` if: ${value} `);
    parent.insertBefore(anchor, el);

    const isTemplate = el instanceof HTMLTemplateElement;

    // Blueprint strategy (mirrors data-for): the original element stays in the
    // DOM as an inert, hidden blueprint and is NEVER removed. This is critical
    // because the controller effect below is bound to `el` via
    // elementBoundEffect — keeping `el` connected prevents the MutationObserver
    // from tearing that effect down. Each time the condition becomes true we
    // clone the blueprint and fully process the clone; each time it becomes
    // false we dispose the clone's subtree (effects, listeners, nested
    // directives) and remove it.
    //
    // Because the clone is (re)processed on every show and disposed on every
    // hide, nested directives (data-component, data-bind, data-for, even another
    // data-if) re-initialise correctly when an element is toggled back into
    // view — the behaviour a developer expects.
    const blueprint: DocumentFragment | HTMLElement = isTemplate
      ? (el as HTMLTemplateElement).content
      : el;

    if (!isTemplate) {
      el.style.display = 'none';
      // Prevent the coordinator/observer from descending into the blueprint and
      // processing it as live content (same guard data-for uses).
      el.setAttribute('data-template', 'true');
    }

    let currentNodes: Node[] = [];
    let isMounted = false;

    const disposeNodes = (nodes: Node[]) => {
      nodes.forEach(n => {
        teardownTree(n);
        n.parentNode?.removeChild(n);
      });
    };

    const mount = () => {
      const clone = blueprint.cloneNode(true);

      // For the non-template blueprint the clone is itself an element carrying
      // `data-if` (and our hiding attributes). Strip them so the clone renders
      // normally and does not recursively re-register this directive.
      if (clone instanceof HTMLElement) {
        clone.removeAttribute('data-if');
        clone.removeAttribute('data-template');
        clone.style.removeProperty('display');
        currentNodes = [clone];
      } else {
        currentNodes = Array.from((clone as DocumentFragment).childNodes);
      }

      currentNodes.forEach(n => {
        anchor.parentNode?.insertBefore(n, anchor);
        if (n instanceof HTMLElement) runtime.processElement(n);
      });
    };

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        // `el` is hidden (display:none) but connected; evaluating against it
        // resolves the correct data scope.
        const condition = Boolean(runtime.evaluate(el, value));

        if (condition) {
          if (!isMounted) {
            mount();
            isMounted = true;
          }
        } else {
          if (isMounted) {
            disposeNodes(currentNodes);
            currentNodes = [];
            isMounted = false;
          }
        }
      });

      return () => {
        cleanup();
        disposeNodes(currentNodes);
        currentNodes = [];
        if (anchor.parentNode) anchor.remove();
      };
    } catch (e) {
      initError('if', `Failed to initialize if: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default ifModule;
