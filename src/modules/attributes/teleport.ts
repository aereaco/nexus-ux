import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * data-teleport Directive
 * 
 * Moves the content of a <template> element to a target element specified by a selector.
 * Automatically cleans up teleported nodes when the directive is removed or the template is destroyed.
 * 
 * Usage:
 * <template data-teleport="#modal-root">
 *   <div class="modal">...</div>
 * </template>
 */
export const teleportModule: AttributeModule = {
  name: 'teleport',
  handle(el: HTMLElement, value: string, runtime: RuntimeContext) {
    if (!(el instanceof HTMLTemplateElement)) {
      runtime.warn('data-teleport must be used on a <template> element.', el);
      return;
    }

    let teleportedNodes: Node[] = [];

    const setupTeleport = (selector: string) => {
      // 1. Cleanup old nodes
      teleportedNodes.forEach(node => {
        if (node.parentElement) node.parentElement.removeChild(node);
      });
      teleportedNodes = [];

      // 2. Find target
      const target = document.querySelector(selector);
      if (!target) {
        runtime.warn(`Teleport target not found: ${selector}`, el);
        return;
      }

      // 3. Clone and append
      const content = el.content.cloneNode(true) as DocumentFragment;
      teleportedNodes = Array.from(content.childNodes);
      target.appendChild(content);

      // 4. Initialize moved nodes
      teleportedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          runtime.processElement(node);
        }
      });
    };

    const cleanup = runtime.effect(() => {
      const selector = runtime.evaluate(el, value) as string;
      if (selector) setupTeleport(selector);
    });

    return () => {
      cleanup();
      teleportedNodes.forEach(node => {
        if (node.parentElement) node.parentElement.removeChild(node);
      });
    };
  }
};

export default teleportModule;
