import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { getDataStack } from '../../engine/scope.ts';
import { initError } from '../../engine/errors.ts';

const computedModule: AttributeModule = {
  name: 'computed',
  attribute: 'computed',
  metadata: { after: ['signal'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Format 1: data-computed="{ prop: () => expr, ... }"
    if (el.hasAttribute('data-computed')) {
      try {
        const computedDefs = runtime.evaluate(el, value || '{}');
        if (typeof computedDefs === 'object' && computedDefs !== null) {
          Object.entries(computedDefs).forEach(([propName, getter]) => {
            if (typeof getter !== 'function') return;

            try {
              const computedVal = runtime.computed(() => {
                try {
                  return (getter as () => unknown)();
                } catch (e) {
                  if (runtime.isDevMode) runtime.warn(`[Computed Error] Failed to evaluate getter for "${propName}":`, e);
                  return null;
                }
              });

              // Attach to Scope
              const stack = getDataStack(el);
              if (stack.length > 0 && !el.hasAttribute('data-ux-init')) {
                const scope = stack[0];
                scope[propName] = computedVal.value;
                const stop = runtime.watch(computedVal, (val) => {
                  scope[propName] = val;
                });

                const target = el as HTMLElement & { __computed_stop?: (() => void)[] };
                if (!target.__computed_stop) target.__computed_stop = [];
                target.__computed_stop.push(stop);
              } else {
                // Global (explicit or root auto-lift)
                runtime.setGlobalSignal(propName, computedVal.value);
                const stop = runtime.watch(computedVal, (val) => {
                  runtime.setGlobalSignal(propName, val);
                });
                const target = el as HTMLElement & { __computed_stop?: (() => void)[] };
                if (!target.__computed_stop) target.__computed_stop = [];
                target.__computed_stop.push(stop);
              }
            } catch (e) {
              initError('computed', `Failed to init computed ${propName}: ${e instanceof Error ? e.message : String(e)}`, el, String(getter));
            }
          });
        }
      } catch (e) {
        initError('computed', `Failed to parse data-computed JSON: ${e instanceof Error ? e.message : String(e)}`, el, value || '');
      }
    }

    // Format 2: data-computed:propName="expression"
    const attrs = Array.from(el.attributes).filter(a => a.name.startsWith('data-computed:'));

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const propName = parsed.argument;
      const expression = attr.value;

      try {
        const computedVal = runtime.computed(() => {
          try {
            return runtime.evaluate(el, expression);
          } catch (e) {
            if (runtime.isDevMode) runtime.warn(`[Computed Error] Failed to evaluate expression for "${propName}":`, e);
            return null;
          }
        });

        // Attach to Scope
        const stack = getDataStack(el);
        if (stack.length > 0 && !el.hasAttribute('data-ux-init')) {
          const scope = stack[0];
          scope[propName] = computedVal.value;
          const stop = runtime.watch(computedVal, (val) => {
            scope[propName] = val;
          });

          const target = el as HTMLElement & { __computed_stop?: (() => void)[] };
          if (!target.__computed_stop) target.__computed_stop = [];
          target.__computed_stop.push(stop);
        } else {
          // Global (explicit or root auto-lift)
          runtime.setGlobalSignal(propName, computedVal.value);
          const stop = runtime.watch(computedVal, (val) => {
            runtime.setGlobalSignal(propName, val);
          });
          const target = el as HTMLElement & { __computed_stop?: (() => void)[] };
          if (!target.__computed_stop) target.__computed_stop = [];
          target.__computed_stop.push(stop);
        }

      } catch (e) {
        initError('computed', `Failed to init computed ${propName}: ${e instanceof Error ? e.message : String(e)}`, el, expression);
      }
    });

    return () => {
      const target = el as HTMLElement & { __computed_stop?: (() => void)[] };
      if (target.__computed_stop) {
        target.__computed_stop.forEach((s) => s());
        target.__computed_stop = [];
      }
    };
  }
};

export default computedModule;
