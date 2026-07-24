/**
 * Nexus-UX Bind Directive Module
 *
 * Handles `data-bind` for two-way and one-way property binding between
 * DOM elements and reactive state. Supports auto-detection, sub-directives,
 * and mass property assignment.
 *
 * Binding Modes:
 *   - Auto-detect: `data-bind="expr"` binds to element value/textContent
 *   - Sub-directive: `data-bind-attr="expr"` binds to specific attribute
 *   - Mass assign: `data-bind="obj"` assigns object properties to element
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Element properties are updated by reference.
 *   - Zero-serialization: Reactive values flow directly to DOM; no cloning.
 *
 * Coordination:
 *   - attributeParser.ts extracts directive/argument/modifiers
 *   - evaluator.ts evaluates bound expressions
 *   - reactivity.ts provides elementBoundEffect for reactive updates
 *   - reconciler.ts provides deepEqual for change detection
 *
 * Nexus-UX Innovations Preserved:
 *   - Auto-detect mode absorbs Alpine's data-model behavior
 *   - Mass property assignment from object expressions
 *   - Lazy binding via :lazy modifier for input/select/textarea
 *   - Reactive effect cleanup on element removal
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

const bindModule: AttributeModule = {
  name: 'bind',
  attribute: 'bind',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    if (!value) return;

    const parsed = parsedAttr || runtime.parseAttribute('data-bind', runtime, el);
    const target = parsed?.argument;

    // ─── Auto-Detect Mode (data-bind="expr" without sub-directive argument) ───
    if (!target) {
      const cleanupFns: (() => void)[] = [];
      try {
        // 1. Reactive Effect: State → DOM
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);

          // ─── Direct Heap/Object Mapping ───
          if (result && typeof result === 'object' && !Array.isArray(result)) {
            Object.entries(result).forEach(([param, val]) => {
              if (param in el) {
                if ((el as any)[param] !== val) (el as any)[param] = val;
              } else {
                if (val === false || val === null || val === undefined) {
                  if (el.hasAttribute(param)) el.removeAttribute(param);
                } else {
                  const strVal = String(val);
                  if (el.getAttribute(param) !== strVal) el.setAttribute(param, strVal);
                }
              }
            });
            return;
          }

          // ─── Standard Model Detection (Single Value) ───
          if (el instanceof HTMLInputElement) {
            if (el.type === 'checkbox') {
              el.checked = Boolean(result);
            } else if (el.type === 'radio') {
              el.checked = (el.value === String(result));
            } else {
              el.value = result !== undefined && result !== null ? String(result) : '';
            }
          } else if (el instanceof HTMLSelectElement) {
            const targetValue = result !== undefined && result !== null ? String(result) : '';
            const options = Array.from(el.options);
            const found = options.some(opt => opt.value === targetValue);
            if (found || targetValue === '') {
              if (el.value !== targetValue) {
                el.value = targetValue;
              }
            }
          } else if (el instanceof HTMLTextAreaElement) {
            el.value = result !== undefined && result !== null ? String(result) : '';
          } else {
            el.textContent = result !== undefined && result !== null ? String(result) : '';
          }
        });
        cleanupFns.push(cleanup);

        // 2. Event Listener: DOM → State
        const isLazy = el.hasAttribute('data-bind:lazy');
        const eventName = isLazy ? 'change' : (
          el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
          ? 'change' : 'input'
        );

        const inputHandler = (_e: Event) => {
          let newValue: unknown;
          if (el instanceof HTMLInputElement && el.type === 'checkbox') {
            newValue = el.checked;
          } else if (el instanceof HTMLInputElement && el.type === 'radio') {
            newValue = el.checked ? el.value : undefined;
            if (newValue === undefined) return;
          } else if (el instanceof HTMLSelectElement && el.multiple) {
            newValue = Array.from(el.selectedOptions).map(opt => opt.value);
          } else if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'number')) {
            newValue = el.value === '' ? '' : Number(el.value);
          } else if ('value' in el) {
            newValue = (el as any).value;
          }

          const current = runtime.evaluate(el, value);
          if (current && typeof current === 'object' && 'value' in (current as Record<string, unknown>)) {
            runtime.evaluate(el, `${value}.value = $newValue`, { $newValue: newValue });
          } else {
            runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
          }
        };

        el.addEventListener(eventName, inputHandler);
        cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));

      } catch (e) {
        runtime.reportError(e instanceof Error ? e : new Error(String(e)), el, `Auto-bind failed: ${value}`);
      }

      return () => cleanupFns.forEach(fn => fn());
    }

    // ─── Sub-Directive Mode (data-bind-value, data-bind-dir, data-bind-style, etc.) ───
    if (target === 'lazy') return;
    const cleanupFns: (() => void)[] = [];

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, value);
        const attrValue = result !== undefined && result !== null ? String(result) : '';

        if (target === 'value' || target === 'checked') {
          if (el instanceof HTMLInputElement && el.type === 'checkbox') {
            if (el.checked !== Boolean(result)) el.checked = Boolean(result);
          } else if (el instanceof HTMLInputElement && el.type === 'radio') {
            if (target === 'checked') {
              if (el.checked !== Boolean(result)) el.checked = Boolean(result);
            } else {
              if (el.value !== attrValue) el.value = attrValue;
            }
          } else if ('value' in el) {
            if ((el as HTMLInputElement).value !== attrValue) (el as HTMLInputElement).value = attrValue;
          }
        } else if (target === 'text') {
          if (el.textContent !== attrValue) el.textContent = attrValue;
        } else if (target === 'html') {
          if (el.innerHTML !== attrValue) el.innerHTML = attrValue;
        } else if (target === 'style') {
          runtime.reconcileStyle(el, result);
        } else if (target === 'draggable') {
          const newVal = result ? 'true' : 'false';
          if (el.getAttribute('draggable') !== newVal) {
            el.setAttribute('draggable', newVal);
          }
        } else if (target === 'dir') {
          if (el.getAttribute('dir') !== attrValue) {
            el.setAttribute('dir', attrValue);
          }
          if (document.documentElement.getAttribute('dir') !== attrValue) {
            document.documentElement.setAttribute('dir', attrValue);
          }
        } else {
          if (result === false || result === null || result === undefined) {
            if (el.hasAttribute(target)) el.removeAttribute(target);
          } else {
            if (el.getAttribute(target) !== attrValue) el.setAttribute(target, attrValue);
          }
        }
      });

      cleanupFns.push(cleanup);

        // Two-Way Binding Setup (Input Listener)
        if (target === 'value' || target === 'checked') {
          const isLazy = el.hasAttribute('data-bind:lazy') || el.hasAttribute('data-bind.lazy');
          const eventName = isLazy ? 'change' : (
            el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')
            || el instanceof HTMLSelectElement ? 'change' : 'input'
          );

          const inputHandler = (e: Event) => {
            let newValue: unknown;
            if (el instanceof HTMLInputElement && el.type === 'checkbox') {
              newValue = el.checked;
            } else if (el instanceof HTMLInputElement && el.type === 'radio') {
              newValue = el.checked ? el.value : undefined;
            } else if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'number')) {
              // Numeric inputs expose their value as a string; coerce so bound
              // state stays a number (keeps .toFixed(), arithmetic, etc. working).
              const raw = (e.target as HTMLInputElement).value;
              newValue = raw === '' ? '' : Number(raw);
            } else {
              newValue = (e.target as HTMLInputElement).value;
            }
            runtime.evaluate(el, `${attr.value} = $newValue`, { $newValue: newValue });
          };

          el.addEventListener(eventName, inputHandler);
          cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));
        }

      } catch (e) {
        initError('bind', `Failed to bind ${target}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default bindModule;
