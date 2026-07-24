/**
 * Nexus-UX Computed Directive Module
 *
 * Handles `data-computed` for reactive computed properties. Evaluates getter
 * functions and publishes results as reactive signals. Supports ghost key
 * pre-allocation for typed reactive properties.
 *
 * Usage Modes:
 *   - `data-computed="{ prop: () => expr, ... }"` — object literal mode
 *   - `data-computed-prop="expr"` — per-attribute computed properties
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Computed values are wrapped in refs by reference.
 *   - Zero-serialization: Ghost keys pre-allocate typed heap slots.
 *
 * Coordination:
 *   - scope.ts provides parseGhostKeys, createScopeProxy
 *   - reactivity.ts provides unifiedRef, unifiedComputed
 *   - debug.ts provides initError for failure reporting
 *   - ModuleCoordinator registers via registerAttributeModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Ghost key parsing for typed reactive properties
 *   - SignalHeap integration for zero-serialization computed values
 *   - Global signal publishing for cross-element reactivity
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { initError } from '../../engine/debug.ts';
import { unifiedRef, unifiedComputed } from '../../engine/reactivity.ts';

const computedModule: AttributeModule = {
  name: 'computed',
  attribute: 'computed',
  metadata: { after: ['signal'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const computedCleanup: (() => void)[] = [];

    // 0. Parse Ghost Keys for pre-allocation
    const { ghostKeys } = parseGhostKeys(value);

    const initialGhostState: Record<string, unknown> = {};
    ghostKeys.forEach(key => initialGhostState[key] = undefined);

    // 1. Use UNIFIED REF - ZCZS woven into Vue reactivity (NOT context switch)
    // unifiedRef handles numeric values with typed arrays while keeping object/array reactivity
    const stateRef = unifiedRef<Record<string, unknown>>(initialGhostState);
    
    // Ownership is already acquired inside unifiedRef
    const scopeId = el.id || `computed_${Math.random().toString(36).slice(2)}`;

    // Format 1: data-computed="{ prop: () => expr, ... }"
    if (el.hasAttribute('data-computed')) {
      const scopeProxy = createScopeProxy(stateRef as any);
      const addCleanup = addScopeToNode(el, scopeProxy);
      computedCleanup.push(addCleanup);

      const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
        const computedDefs = runtime.evaluate(el, value || '{}');
        if (typeof computedDefs === 'object' && computedDefs !== null) {
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

            const stop = runtime.watch(computedVal, (val: any) => { 
              stateRef.value[propName] = val; 
            }, { immediate: true });
            computedCleanup.push(stop);
          });
        }
      });
      computedCleanup.push(effectCleanup);
    }

    // Format 2: data-computed-propName="expression"
    const attrs = Array.from(el.attributes).filter(a => a.name.startsWith('data-computed-'));
    if (attrs.length > 0) {
      // Use unifiedRef for ZCZS support instead of shallowRef
      const attrStateRef = unifiedRef<Record<string, unknown>>({}, `computed_${scopeId}`);
      const scopeProxy = new Proxy({}, {
        has(_, key) { return Reflect.has(attrStateRef.value, key); },
        get(_, key) { return Reflect.get(attrStateRef.value, key); },
        set(_, key, value) { return Reflect.set(attrStateRef.value, key, value); },
        ownKeys() { return Reflect.ownKeys(attrStateRef.value); },
        getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(attrStateRef.value, key); }
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
              const stop = runtime.watch(computedVal, (val: any) => {
                runtime.setGlobalSignal(propName, val);
              }, { immediate: true });
              computedCleanup.push(stop);
          } else {
              const stop = runtime.watch(computedVal, (val: any) => { 
                attrStateRef.value[propName] = val; 
              }, { immediate: true });
              computedCleanup.push(stop);
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
