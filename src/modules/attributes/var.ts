import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { initError } from '../../engine/errors.ts';

const varModule: AttributeModule = {
  name: 'var',
  attribute: 'var',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      const initialData = runtime.evaluate(el, value);

      if (typeof initialData === 'object' && initialData !== null) {
        const reactiveData = runtime.reactive(initialData as object);
        addScopeToNode(el, reactiveData as unknown as Record<string, unknown>);
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
