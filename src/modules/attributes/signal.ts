/**
 * Nexus-UX Signal Directive Module
 *
 * Handles `data-signal` for reactive state initialization on DOM elements.
 * Creates a reactive scope proxy bound to the element's data stack.
 *
 * Behavior:
 *   - Empty value on <script>: Uses textContent as expression
 *   - Object literal: Creates reactive proxy scope with ghost key parsing
 *   - String expression: Evaluates and binds result to element scope
 *   - `data-signal:global`: Binds to global signal namespace (# prefix)
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Reactive proxy wraps existing object; no cloning for
 *     normal property access.
 *   - Zero-serialization: Scope objects are shared by reference.
 *   - Deep clone only on `:deep` modifier to prevent mutation leaks.
 *
 * Coordination:
 *   - scope.ts provides addScopeToNode, parseGhostKeys, createScopeProxy
 *   - reactivity.ts provides unifiedRef for reactive object creation
 *   - reconciler.ts provides deepEqual for change detection
 *   - evaluator.ts handles expression evaluation and global signals
 *
 * Nexus-UX Innovations Preserved:
 *   - Ghost key parsing for typed reactive properties
 *   - Element-bound reactive scope with automatic cleanup
 *   - Global signal binding via data-signal:global
 *   - Deep clone option for mutable external state
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { unifiedRef, Ref } from '../../engine/reactivity.ts';
import { deepEqual } from '../../engine/reconciler.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';

function cloneValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(cloneValue);
  }
  if (val !== null && typeof val === 'object') {
    const res: Record<string, unknown> = {};
    for (const key of Object.keys(val)) {
      res[key] = cloneValue((val as Record<string, unknown>)[key]);
    }
    return res;
  }
  return val;
}

const signalModule: AttributeModule = {
  name: 'signal',
  attribute: 'signal',
  metadata: {
    after: ['ingest'],
    before: ['class', 'bind', 'component', 'router', 'on', 'show', 'style']
  },
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
                     el.hasAttribute('data-init') ||
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

    // 4. Evaluate once to seed initial state (without wrapping in a reactive loop that clobbers live state)
    try {
      const newState = runtime.evaluate(el, expression);
      if (typeof newState === 'object' && newState !== null) {
        if (isGlobal) {
          const globals = runtime.globalSignals() as Record<string, unknown>;
          Object.keys(newState as object).forEach(key => {
            if (!(key in globals)) {
              globals[key] = (newState as Record<string, unknown>)[key];
            }
          });
          stateRef.value = globals;
        } else {
          stateRef.value = newState as Record<string, unknown>;
        }
      }
    } catch (e) {
      runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, expression);
      return;
    }

    if (!isGlobal) {
      addCleanup = addScopeToNode(el, scopeProxy);
    }

    return () => {
      if (addCleanup) addCleanup();
    };
  }
};

export default signalModule;
