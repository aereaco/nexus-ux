import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { initError } from '../../engine/errors.ts';
import { unifiedRef, unifiedComputed, heap, ownership } from '../../engine/reactivity.ts';

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
    // Also extract value types for ZCZS heap pre-allocation
    const ghostKeys: string[] = [];
    const typeHints: Record<string, 'number' | 'boolean' | 'string' | 'object'> = {};
    if (expression.trim().startsWith('({') || expression.trim().startsWith('{')) {
       // Robust regex for identifying keys in object literals (standard, single-quoted, double-quoted)
       const keyMatches = expression.matchAll(/['"]?([a-zA-Z_$][\w$]*)['"]?\s*:/g);
       for (const match of keyMatches) {
         ghostKeys.push(match[1]);
       }
       
       // Improved Type Inference for ZCZS pre-allocation
       ghostKeys.forEach((key) => {
         // Create a regex to find the value after this specific key
         // Handles keys with or without quotes: (["']?key["']?\s*:)
         const valueRegex = new RegExp(`['"]?${key}['"]?\\s*:\\s*([^,}\\s]*)`, 'g');
         const valueMatch = valueRegex.exec(expression);
         
         if (valueMatch && valueMatch[1]) {
           const valToken = valueMatch[1].trim();
           if (valToken.startsWith('true') || valToken.startsWith('false')) typeHints[key] = 'boolean';
           else if (/^-?\d/.test(valToken)) typeHints[key] = 'number';
           else if (/^['"`]/.test(valToken)) typeHints[key] = 'string';
           else if (valToken.startsWith('[') || valToken.startsWith('{')) typeHints[key] = 'object';
         }
       });
    }

    const initialGhostState: Record<string, unknown> = {};
    ghostKeys.forEach(key => initialGhostState[key] = undefined);

    const scopeId = el.id || `el_${Math.random().toString(36).slice(2)}`;

    // 3. Use UNIFIED REF - ZCZS woven into Vue reactivity (NOT context switch)
    // This is the key difference: we use a single unifiedRef that internally
    // handles numeric values with typed arrays while keeping object/array reactivity
    // Pass typeHints for proper heap pre-allocation
    const stateRef = unifiedRef<Record<string, unknown>>(initialGhostState, scopeId, typeHints);

    const scopeProxy = new Proxy({}, {
      has(_, key) { return Reflect.has(stateRef.value, key); },
      get(_, key) { return Reflect.get(stateRef.value, key); },
      set(_, key, value) { 
        const res = Reflect.set(stateRef.value, key, value);
        runtime.triggerRef(stateRef);
        return res;
      },
      ownKeys() { return Reflect.ownKeys(stateRef.value); },
      getOwnPropertyDescriptor(_, key) { return Reflect.getOwnPropertyDescriptor(stateRef.value, key); }
    });
    
    let addCleanup: (() => void) | undefined;

    const [_runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
      // 4. Evaluate to get Initial State (might throw Suspense Promise)
      const initialState = runtime.evaluate(el, expression);
      
      if (typeof initialState === 'object' && initialState !== null) {
        const reactiveState = runtime.isReactive(initialState) ? initialState : runtime.reactive(initialState as object);
        
        if (isGlobal) {
          const globals = runtime.globalSignals();
          Object.keys(initialState as object).forEach(key => {
            (globals as any)[key] = (initialState as any)[key];
          });
        } else {
          // Use unifiedRef's set - this handles ZCZS internally
          // No context switch needed - ZCZS is woven into the reactivity
          if (runtime.isDevMode) console.log(`[Signal] Initial state for <${el.tagName}>:`, initialState);
          stateRef.value = initialState as Record<string, unknown>;
        }
      }
    });
    
    // Add scope to node AFTER the first run of the effect
    // This prevents the signal from tracking itself during bootstrap, 
    // which causes a synchronous infinite loop.
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
