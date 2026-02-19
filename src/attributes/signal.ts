import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { addScopeToNode } from '../engine/scope.ts';
import { initError } from '../engine/errors.ts';

const signalModule: AttributeModule = {
  name: 'signal',
  attribute: 'signal',
  metadata: { after: ['injest'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    runtime.log(`[Nexus Signal] Handling signal on <${el.tagName}> with value:`, value.substring(0, 50) + '...');
    // 1. Determine Expression & Context
    // If value is empty and it's a script tag, use textContent
    let expression = value;
    if (!expression && el.tagName === 'SCRIPT') {
      expression = el.textContent || '';
    }

    if (!expression.trim()) return;

    // 2. Parse Attribute to check for modifiers (via runtime.parseAttribute)
    const parsed = runtime.parseAttribute(el.getAttributeNames().find(n => n.includes('signal')) || 'data-signal', runtime, el);
    const isGlobal = parsed?.argument === 'global' || parsed?.modifiers.includes('global');

    try {
      // 3. Evaluate to get Initial State
      const initialState = runtime.evaluate(el, expression);

      if (typeof initialState === 'object' && initialState !== null) {
        // 4. Create Reactive State
        const reactiveState = runtime.isReactive(initialState) ? initialState : runtime.reactive(initialState as object);

        if (isGlobal) {
          // Merge into Global Signals
          const globals = runtime.globalSignals();
          Object.assign(globals, reactiveState);
        } else {
          // Local Scope
          // 3. Attach to Element
          runtime.log(`[Nexus Signal] Initial state evaluated successfully. Adding scope to <${el.tagName}>.`);
          const cleanup = addScopeToNode(el, reactiveState as unknown as Record<string, unknown>);

          return cleanup;
        }
      }
    } catch (e) {
      initError('signal', `Failed to initialize signal: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }
  }
};

export default signalModule;
