import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';
import { addScopeToNode } from '../engine/scope.ts';

/**
 * data-switcher="signal"
 * data-switcher-options="[...] array of objects with { id, ... }"
 * Orchestrates state-cycling and provides logic helpers.
 */
const switcherModule: AttributeModule = {
  name: 'switcher',
  attribute: 'switcher',
  metadata: {
    after: ['for', 'signal']
  },
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    // Multi-initialization guard: 
    // The parser treats 'data-switcher-options' as directive='switcher', argument='options'.
    // We only want to run the core logic for the primary 'data-switcher' attribute.
    const attr = Array.from(el.attributes).find(a => a.value === expression && a.name.startsWith('data-switcher'));
    if (attr && attr.name !== 'data-switcher') {
      return; 
    }

    runtime.log(`Nexus Switcher [${expression}]: Initializing on`, el);
    const optionsAttr = el.getAttribute('data-switcher-options');
    if (!optionsAttr) {
      initError('switcher', 'Missing data-switcher-options attribute', el, expression);
      return;
    }

    // Scoped helpers
    const helpers = {
      $switch: () => {
        const items = runtime.evaluate(el, optionsAttr) as Record<string, unknown>[];
        const current = runtime.evaluate(el, expression);
        if (!Array.isArray(items)) {
          runtime.warn(`Nexus Switcher [${expression}]: Options "${optionsAttr}" is not an array`, items);
          return;
        }
        
        const idx = items.findIndex(item => (item.id || item) === current);
        const nextIdx = (idx + 1) % items.length;
        const nextItem = items[nextIdx];
        const nextValue = nextItem.id || nextItem;
        
        runtime.log(`Nexus Switcher [${expression}]: Cycling ${current} -> ${nextValue}`);

        // Update via evaluate to ensure it propagates through the stack correctly
        try {
          runtime.evaluate(el, `${expression} = ${JSON.stringify(nextValue)}`);
        } catch (e) {
          console.error('Nexus Switcher: Failed to update signal', expression, e);
        }
      },
      $isActive: (id: unknown) => {
        const current = runtime.evaluate(el, expression);
        const isActive = current === id;
        // console.debug(`Nexus Switcher [${expression}]: $isActive(${id}) -> ${isActive} (current: ${current})`);
        return isActive;
      },
      get $activeItem() {
        const items = runtime.evaluate(el, optionsAttr) as Record<string, unknown>[];
        const current = runtime.evaluate(el, expression);
        if (!Array.isArray(items)) return null;
        return items.find(item => (item.id || item) === current) || null;
      }
    };

    runtime.log(`Nexus Switcher [${expression}]: Injecting helpers on`, el);
    addScopeToNode(el, helpers);

    // Watch for changes to trigger animations if requested
    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const currentVal = runtime.evaluate(el, expression);
        const items = runtime.evaluate(el, optionsAttr);
        runtime.log(`Nexus Switcher [${expression}]: Active state changed to:`, currentVal, 'options:', items);
        
        // Simple animation hook: toggle a class on children
        Array.from(el.children).forEach(child => {
          if (child instanceof HTMLElement) {
            child.classList.add('switcher-transitioning');
            setTimeout(() => child.classList.remove('switcher-transitioning'), 300);
          }
        });
      });

      return cleanup;
    } catch (e) {
      initError('switcher', `Failed to initialize switcher: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }
  }
};

export default switcherModule;
