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
import type { ParsedAttribute } from '../../engine/attributeParser.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { unifiedRef, unifiedComputed } from '../../engine/reactivity.ts';

const attrComputedStateMap = new WeakMap<HTMLElement, Record<string, unknown>>();

const computedModule: AttributeModule = {
  name: 'computed',
  attribute: 'computed',
  metadata: { after: ['signal'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    const computedCleanup: (() => void)[] = [];
    const isGlobal = el.hasAttribute('data-computed_global') || !!parsedAttr?.modifiers?.includes('global');
    const propArg = parsedAttr?.argument;

    // Format 1: data-computed="{ prop: () => expr, ... }"
    if (!propArg && el.hasAttribute('data-computed')) {
      const { ghostKeys } = parseGhostKeys(value);
      const initialGhostState: Record<string, unknown> = {};
      ghostKeys.forEach(key => initialGhostState[key] = undefined);

      const stateRef = unifiedRef<Record<string, unknown>>(initialGhostState);
      const scopeProxy = createScopeProxy(stateRef as any);
      const addCleanup = addScopeToNode(el, scopeProxy);
      computedCleanup.push(addCleanup);

      let activeWatchers: (() => void)[] = [];
      computedCleanup.push(() => {
        activeWatchers.forEach(stop => stop());
        activeWatchers = [];
      });

      const effectCleanup = runtime.bind(el, value || '{}', (computedDefs) => {
        activeWatchers.forEach(stop => stop());
        activeWatchers = [];

        if (typeof computedDefs === 'object' && computedDefs !== null) {
          Object.entries(computedDefs).forEach(([propName, getter]) => {
            if (typeof getter !== 'function') return;

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
            activeWatchers.push(stop);
          });
        }
      });
      if (effectCleanup) computedCleanup.push(effectCleanup);
    }

    // Format 2: data-computed-propName="expression" (single attribute invocation)
    if (propArg) {
      let stateObj = attrComputedStateMap.get(el);
      if (!isGlobal && !stateObj) {
        const scopeId = el.id || `computed_${Math.random().toString(36).slice(2)}`;
        const attrStateRef = unifiedRef<Record<string, unknown>>({}, `computed_${scopeId}`);
        const scopeProxy = new Proxy({}, {
          has(_, key) { return Reflect.has(attrStateRef.value, key); },
          get(_, key) { return Reflect.get(attrStateRef.value, key); },
          set(_, key, val) { return Reflect.set(attrStateRef.value, key, val); },
          ownKeys() { return Reflect.ownKeys(attrStateRef.value); },
          getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(attrStateRef.value, key); }
        });
        stateObj = attrStateRef.value;
        attrComputedStateMap.set(el, stateObj);
        const addCleanup = addScopeToNode(el, scopeProxy);
        computedCleanup.push(addCleanup);
      }

      const expression = value;
      const computedVal = runtime.computed(() => {
        try {
          return runtime.evaluate(el, expression);
        } catch (e) {
          if (runtime.isDevMode) runtime.warn(`[Computed Error] Failed to evaluate expression for "${propArg}":`, e);
          return null;
        }
      });

      if (isGlobal || !stateObj) {
        const stop = runtime.watch(computedVal, (val: any) => {
          runtime.setGlobalSignal(propArg, val);
        }, { immediate: true });
        computedCleanup.push(stop);
      } else {
        const targetState = stateObj;
        const stop = runtime.watch(computedVal, (val: any) => {
          targetState[propArg] = val;
        }, { immediate: true });
        computedCleanup.push(stop);
      }
    }

    return () => {
      computedCleanup.forEach(c => c());
    };
  }
};

export default computedModule;
