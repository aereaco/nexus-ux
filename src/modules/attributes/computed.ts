import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { getDataStack, addScopeToNode } from '../../engine/scope.ts';
import { initError } from '../../engine/errors.ts';
import { unifiedRef, unifiedComputed } from '../../engine/reactivity.ts';

const computedModule: AttributeModule = {
  name: 'computed',
  attribute: 'computed',
  metadata: { after: ['signal'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const computedCleanup: (() => void)[] = [];

    // 0. Parse Ghost Keys for pre-allocation
    const ghostKeys: string[] = [];
    if (value.trim().startsWith('{')) {
       // Match object literal keys: handle both standard and quoted keys
       const keyMatches = value.matchAll(/['"]?([a-zA-Z_$][\w$]*)['"]?\s*:/g);
       for (const match of keyMatches) {
         ghostKeys.push(match[1]);
       }
    }

    const initialGhostState: Record<string, unknown> = {};
    ghostKeys.forEach(key => initialGhostState[key] = undefined);

    // 1. Use UNIFIED REF - ZCZS woven into Vue reactivity (NOT context switch)
    // unifiedRef handles numeric values with typed arrays while keeping object/array reactivity
    const stateRef = unifiedRef<Record<string, unknown>>(initialGhostState);
    
    // Ownership is already acquired inside unifiedRef
    const scopeId = el.id || `computed_${Math.random().toString(36).slice(2)}`;

    const isGlobal = el.hasAttribute('data-ux-init');

    // Format 1: data-computed="{ prop: () => expr, ... }"
    if (el.hasAttribute('data-computed')) {
      const scopeProxy = new Proxy({}, {
        has(_, key) { return Reflect.has(stateRef.value, key); },
        get(_, key) { return Reflect.get(stateRef.value, key); },
        set(_, key, value) { return Reflect.set(stateRef.value, key, value); },
        ownKeys() { return Reflect.ownKeys(stateRef.value); },
        getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(stateRef.value, key); }
      });
      
      let addCleanup: (() => void) | undefined;
      // Scopes only needed if not global and we have an existing datastack context boundary
      if (!isGlobal) {
        addCleanup = addScopeToNode(el, scopeProxy);
        computedCleanup.push(addCleanup);
      }

      const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
        const computedDefs = runtime.evaluate(el, value || '{}');
        if (typeof computedDefs === 'object' && computedDefs !== null) {
          const newState = runtime.reactive<Record<string, unknown>>({ ...stateRef.value });
          Object.entries(computedDefs).forEach(([propName, getter]) => {
            if (typeof getter !== 'function') return;

            // Use unifiedComputed - ZCZS woven into Vue computed
            const computedVal = unifiedComputed(() => {
              try {
                return (getter as () => unknown)();
              } catch (e) {
                if (runtime.isDevMode) runtime.warn(`[Computed Error] Failed to evaluate getter for "${propName}":`, e);
                return null;
              }
            }, propName);

            if (isGlobal || !addCleanup) {
              runtime.setGlobalSignal(propName, computedVal.value);
              const stop = runtime.watch(computedVal, val => runtime.setGlobalSignal(propName, val));
              computedCleanup.push(stop);
            } else {
              // ZCZS is already woven into unifiedComputed/unifiedRef
              // No context switch needed - numeric values use typed arrays internally
              newState[propName] = computedVal.value;
              const stop = runtime.watch(computedVal, val => { 
                newState[propName] = val; 
              });
              computedCleanup.push(stop);
            }
          });
          // Use unifiedRef's set - handles ZCZS internally
          stateRef.value = newState;
        }
      });
      computedCleanup.push(effectCleanup);
    }

    // Format 2: data-computed-propName="expression"
    const attrs = Array.from(el.attributes).filter(a => a.name.startsWith('data-computed-'));
    if (attrs.length > 0) {
      // Use unifiedRef for ZCZS support instead of shallowRef
      const stateRef = unifiedRef<Record<string, unknown>>({}, `computed_${scopeId}`);
      const scopeProxy = new Proxy({}, {
        has(_, key) { return Reflect.has(stateRef.value, key); },
        get(_, key) { return Reflect.get(stateRef.value, key); },
        set(_, key, value) { return Reflect.set(stateRef.value, key, value); },
        ownKeys() { return Reflect.ownKeys(stateRef.value); },
        getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(stateRef.value, key); }
      });
      
      let addCleanup: (() => void) | undefined;
      if (!isGlobal) {
        addCleanup = addScopeToNode(el, scopeProxy);
        computedCleanup.push(addCleanup);
      }

      attrs.forEach(attr => {
        const propName = attr.name.substring('data-computed-'.length);
        if (!propName) return;

        const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
          const expression = attr.value;
          const computedVal = runtime.computed(() => {
            try {
              return runtime.evaluate(el, expression);
            } catch (e) {
              if (runtime.isDevMode) runtime.warn(`[Computed Error] Failed to evaluate expression for "${propName}":`, e);
              return null;
            }
          });

          if (isGlobal || !addCleanup) {
              runtime.setGlobalSignal(propName, computedVal.value);
              const stop = runtime.watch(computedVal, val => runtime.setGlobalSignal(propName, val));
              computedCleanup.push(stop);
          } else {
              const newState = runtime.reactive<Record<string, unknown>>({ ...stateRef.value });
              newState[propName] = computedVal.value;
              const stop = runtime.watch(computedVal, val => { newState[propName] = val; });
              computedCleanup.push(stop);
              stateRef.value = newState;
          }
        });
        computedCleanup.push(effectCleanup);
      });
    }

    return () => {
      computedCleanup.forEach(c => c());
      // Ownership release is handled by unifiedRef garbage collection
    };
  }
};

export default computedModule;
