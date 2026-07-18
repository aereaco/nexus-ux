import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { unifiedRef, Ref } from '../../engine/reactivity.ts';
import { deepEqual } from '../../engine/reconciler.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';

const signalModule: AttributeModule = {
  name: 'signal',
  attribute: 'signal',
  metadata: { after: ['ingest'] },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    runtime.log(`[Nexus Signal] Handling signal on <${el.tagName}> with value:`, value.substring(0, 50) + '...');
    // 1. Determine Expression & Context
    // If value is empty and it's a script tag, use textContent
    let expression = value;
    if (!expression && el.tagName === 'SCRIPT') {
      expression = el.textContent || '';
    }

    if (!expression.trim()) return;

    // 2. Parse Attribute to check for modifiers (use passed parsedAttr or fallback)
    const parsed = parsedAttr || runtime.parseAttribute('data-signal', runtime, el);
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
    let isEvaluating = false;

    const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
      if (isEvaluating) return;
      isEvaluating = true;

      try {
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
          if ((window as any).__sigTrace) console.log('[SIG] FIRST-RUN global on', (el.className||'').slice(0,30), 'tabs=', JSON.stringify((newState as any).tabs)?.length);
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
              const curVal = currentEval[key];
              const lastVal = lastEvaluatedState![key];

              let changed = curVal !== lastVal;
              if (changed && typeof curVal === 'object' && curVal !== null) {
                 changed = !deepEqual(curVal, lastVal);
              }

              if (changed) {
                if ((window as any).__sigTrace && key === 'tabs') console.log('[SIG] CHANGED-WRITE tabs', (Array.isArray(lastVal)?lastVal.length:'?'), '->', (Array.isArray(curVal)?curVal.length:'?'), 'on', (el.className||'').slice(0,30));
                globals[key] = curVal;
                lastEvaluatedState![key] = curVal;
              }
            });
          } else {
            const value = stateRef.value;
            Object.keys(currentEval).forEach(key => {
              const curVal = currentEval[key];
              const lastVal = lastEvaluatedState![key];
              
              let changed = curVal !== lastVal;
              if (changed && typeof curVal === 'object' && curVal !== null) {
                 changed = !deepEqual(curVal, lastVal);
              }
              
              if (changed) {
                value[key] = curVal;
                lastEvaluatedState![key] = curVal;
              }
            });
          }
        }
      }
      } finally {
        isEvaluating = false;
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
