import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { getDataStack } from '../engine/scope.ts';

const debugModule: AttributeModule = {
  name: 'debug',
  attribute: 'debug',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Log scope information
    const stack = getDataStack(el);
    console.group(`[Nexus Debug] Element:`, el);
    console.log('Value:', value); // Optional message
    console.log('Data Stack:', stack);
    console.log('Global Signals:', runtime.globalSignals());
    console.groupEnd();

    // We could also watch expression if provided
    if (value) {
      try {
        const result = runtime.evaluate(el, value);
        console.log(`[Nexus Debug] Expression "${value}" result:`, result);
      } catch (e) {
        console.error(`[Nexus Debug] Evaluation failed:`, e);
      }
    }
  }
};

export default debugModule;
