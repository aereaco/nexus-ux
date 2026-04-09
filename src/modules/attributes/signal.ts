import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { unifiedRef } from '../../engine/reactivity.ts';
import { Ref } from '@vue/reactivity';

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
    const isGlobal = parsed?.argument === 'global' || 
                     parsed?.modifiers.includes('global') || 
                     el.hasAttribute('data-ux-init');

    // 2.5 Parse Ghost Keys for pre-allocation
    const { ghostKeys, typeHints } = parseGhostKeys(expression);

    const initialGhostState: Record<string, unknown> = {};
    ghostKeys.forEach(key => initialGhostState[key] = undefined);

    const scopeId = el.id || `el_${Math.random().toString(36).slice(2)}`;

    // 3. Use UNIFIED REF - ZCZS woven into Vue reactivity
    const stateRef = isGlobal 
      ? runtime.ref(runtime.globalSignals()) 
      : unifiedRef<Record<string, unknown>>(initialGhostState, scopeId, typeHints);

    const scopeProxy = createScopeProxy(
      stateRef as Ref<Record<string, unknown>>,
      (key, value) => {
        if (isGlobal) {
          const globals = runtime.globalSignals() as Record<string, unknown>;
          globals[key] = value;
        }
      },
      () => runtime.triggerRef(stateRef)
    );
    
    let addCleanup: (() => void) | undefined;
    let lastEvaluatedState: Record<string, unknown> | null = null;

    const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
      // 4. Evaluate to get Initial State
      let newState: unknown;
      try {
        newState = runtime.evaluate(el, expression);
      } catch (e) {
        runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, expression);
        return;
      }

      if (typeof newState === 'object' && newState !== null) {
        if (!lastEvaluatedState) {
          // First run: populate all
          lastEvaluatedState = { ...(newState as Record<string, unknown>) };
          if (isGlobal) {
            const globals = runtime.globalSignals() as Record<string, unknown>;
            Object.keys(newState as object).forEach(key => {
              globals[key] = (newState as Record<string, unknown>)[key];
            });
            stateRef.value = globals;
          } else {
            stateRef.value = newState as Record<string, unknown>;
          }
        } else {
          // Subsequent run: only sync keys that CHANGED from the last EVALUATED state
          const currentEval = newState as Record<string, unknown>;
          if (isGlobal) {
            const globals = runtime.globalSignals() as Record<string, unknown>;
            Object.keys(currentEval).forEach(key => {
              if (currentEval[key] !== lastEvaluatedState![key]) {
                globals[key] = currentEval[key];
                lastEvaluatedState![key] = currentEval[key];
              }
            });
          } else {
            const value = stateRef.value;
            Object.keys(currentEval).forEach(key => {
              if (currentEval[key] !== lastEvaluatedState![key]) {
                value[key] = currentEval[key];
                lastEvaluatedState![key] = currentEval[key];
              }
            });
          }
        }
      }
    });

    if (!isGlobal) {
      addCleanup = addScopeToNode(el, scopeProxy);
    }

    return () => {
      if (addCleanup) addCleanup();
      effectCleanup();
      // Ownership is released when the ref is garbage collected
      // (tracked via Symbol ownership in the unifiedRef closure)
    };
  }
};

export default signalModule;
