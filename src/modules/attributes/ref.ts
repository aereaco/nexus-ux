import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const refModule: AttributeModule = {
  name: 'ref',
  attribute: 'ref',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    if (!value) return;

    // TODO: Integrate with $refs sprite or context.refs
    // For now, we attach it to the element itself or global map if we had one.
    // 2025 just logs it. We'll do the same but also set an ID if missing?

    // Better: Store in a WeakMap in runtime?
    // runtimeContext doesn't have refs storage yet.

    runtime.log(`[Nexus] Ref registered: ${value}`, el);

    // Temporary: augment element
    // deno-lint-ignore no-explicit-any
    (el as any).__nexus_ref = value;

    return () => {
      // deno-lint-ignore no-explicit-any
      delete (el as any).__nexus_ref;
    };
  }
};

export default refModule;
