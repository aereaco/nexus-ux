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
 *   - `data-signal_global`: Binds to global signal namespace (# prefix)
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Reactive proxy wraps existing object; no cloning for
 *     normal property access.
 *   - Zero-serialization: Scope objects are shared by reference.
 *   - Deep clone only on `_deep` modifier to prevent mutation leaks.
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
 *   - Global signal binding via data-signal_global
 *   - Deep clone option for mutable external state
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, parseGhostKeys, createScopeProxy } from '../../engine/scope.ts';
import { unifiedRef, Ref } from '../../engine/reactivity.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';
import { toError } from '../../engine/debug.ts';

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
    const isSrcModule = parsed?.argument === 'src' || parsed?.modifiers.includes('src');
    const isGlobal = parsed?.argument === 'global' || 
                     parsed?.modifiers.includes('global') || 
                     el.hasAttribute('data-init') ||
                     el.hasAttribute('data-ux-init');

    // 2.2 Support declarative external ES module state via `data-signal-src="/path/to/state.js"`
    if (isSrcModule) {
      const rawPath = expression.trim().replace(/^['"]|['"]$/g, '');
      if (!rawPath) return;
      const scopeId = el.id || `el_${Math.random().toString(36).slice(2)}`;
      const stateRef = isGlobal
        ? runtime.ref(runtime.globalSignals())
        : unifiedRef<Record<string, unknown>>({}, scopeId);
      const scopeProxy = createScopeProxy(
        stateRef as Ref<Record<string, unknown>>,
        (key, val) => {
          if (isGlobal) {
            (runtime.globalSignals() as Record<string, unknown>)[key] = val;
          }
        },
        () => runtime.triggerRef(stateRef)
      );
      let addCleanup: (() => void) | undefined;
      if (!isGlobal) {
        addCleanup = addScopeToNode(el, scopeProxy);
      }
      const resolvedUrl = typeof window !== 'undefined' ? new URL(rawPath, window.location.href).href : rawPath;
      import(resolvedUrl)
        .then((mod) => {
          const exported = mod?.default ?? mod;
          const nextState = typeof exported === 'function' ? exported(scopeProxy, runtime, el) : exported;
          if (nextState && typeof nextState === 'object') {
            if (isGlobal) {
              const globals = runtime.globalSignals() as Record<string, unknown>;
              Object.keys(nextState as object).forEach((key) => {
                const v = (nextState as Record<string, unknown>)[key];
                if (!(key in globals) || (globals[key] === undefined && v !== undefined)) {
                  globals[key] = v;
                }
              });
              stateRef.value = globals;
            } else {
              Object.assign(stateRef.value as Record<string, unknown>, nextState);
            }
            runtime.triggerRef(stateRef);
          }
        })
        .catch((err) => {
          runtime.reportError(toError(err), el, `data-signal-src="${rawPath}"`);
        });
      return () => {
        if (addCleanup) addCleanup();
      };
    }

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
            const nextVal = (newState as Record<string, unknown>)[key];
            if (!(key in globals) || (globals[key] === undefined && nextVal !== undefined)) {
              globals[key] = nextVal;
            }
          });
          stateRef.value = globals;
        } else {
          stateRef.value = newState as Record<string, unknown>;
        }
      }
    } catch (e) {
      const err = toError(e);
      const trimmed = expression.trim();
      if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
        const tag = el.id ? `<${el.tagName.toLowerCase()}#${el.id}>` : `<${el.tagName.toLowerCase()}>`;
        console.error(
          `[Nexus Signal] Possible unescaped double-quote (") truncated data-signal on ${tag}. ` +
          `Use single quotes ('...'), \\x22, or move complex state/actions into an external module with data-signal-src="/path/to/state.js".`
        );
      }
      runtime.reportError(err, el, expression);
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
