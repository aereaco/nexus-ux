import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, hasScope } from '../../engine/scope.ts';
import { initError } from '../../engine/debug.ts';

const varModule: AttributeModule = {
  name: 'var',
  attribute: 'var',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Guard: If this element already has a scope from data-var, do not duplicate.
    // This prevents double-scope pollution when processElement is called with forceReWalk.
    if (hasScope(el)) {
      return () => {}; // Return a no-op cleanup so the dedup hashKey is registered
    }

    try {
      const initialData = runtime.evaluate(el, value);

      if (typeof initialData === 'object' && initialData !== null) {
        const reactiveData = runtime.reactive(initialData as object);
        const removeScope = addScopeToNode(el, reactiveData as unknown as Record<string, unknown>);
        // Return cleanup to both enable dedup detection and proper teardown
        return removeScope;
      } else {
        // If implicit var name needed, we'd need parsing: data-var:name="val"
        // But spec usually implies object for scope.
        // If value is primitive, it can't be a scope object unless wrapped.
        // We assume object for now.
        throw new Error('data-var must evaluate to an object');
      }
    } catch (e) {
      initError('var', `Failed to init var: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default varModule;
