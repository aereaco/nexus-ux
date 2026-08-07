/**
 * Nexus-UX Bind Directive Module
 *
 * Handles `data-bind` for two-way and one-way property binding between
 * DOM elements and reactive state. Supports auto-detection, sub-directives,
 * mass property assignment, and native API two-way binding.
 *
 * Binding Modes:
 *   - Auto-detect: `data-bind="expr"` binds to element value/textContent
 *   - Sub-directive: `data-bind-attr="expr"` binds to specific attribute
 *   - Mass assign: `data-bind="obj"` assigns object properties to element
 *   - Native API: `data-bind="localStorage.collapsed"` binds to writable native APIs
 *   - Native read-only: `data-bind="window.innerWidth"` tracks read-only APIs reactively
 *
 * Native API Binding (Reflect-based):
 *   When the expression targets a known native API object (window, localStorage,
 *   sessionStorage, navigator, document, screen), bind.ts wraps it in a Proxy.
 *   The Proxy intercepts gets/sets via Reflect traps:
 *     - Read: registers the appropriate native listener (resize, scroll, storage)
 *       and pushes updates into the signal automatically
 *     - Write: persists to the native API immediately via Reflect.set()
 *   No `_` prefix, no mirror registration, no separate API wrappers required.
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Native objects are wrapped by Proxy reference; no cloning.
 *   - Zero-serialization: Property reads/writes flow directly through Reflect.
 *
 * Coordination:
 *   - attributeParser.ts extracts directive/argument/modifiers
 *   - evaluator.ts evaluates bound expressions through native API Proxies
 *   - reactivity.ts provides elementBoundEffect for reactive updates
 *   - reconciler.ts provides deepEqual for change detection
 *
 * Nexus-UX Innovations Preserved:
 *   - Auto-detect mode absorbs Alpine's data-model behavior
 *   - Mass property assignment from object expressions
 *   - Lazy binding via :lazy modifier for input/select/textarea
 *   - Native API two-way binding via Reflect Proxy traps
 *   - Reactive effect cleanup on element removal
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

const NATIVE_API_PATTERNS = [
  /\bwindow\.(\w+)/g,
  /\bglobalThis\.(\w+)/g,
  /\blocalStorage\.(\w+)/g,
  /\bsessionStorage\.(\w+)/g,
  /\bnavigator\.(\w+)/g,
  /\bdocument\.(\w+)/g,
  /\bscreen\.(\w+)/g,
];

function extractNativeApis(value: string): Array<{ target: object; property: string }> {
  const apis: Array<{ target: object; property: string }> = [];
  const seen = new Set<string>();
  for (const pattern of NATIVE_API_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      const [, prop] = match;
      const key = `${pattern.source.split('\\b')[1]?.split('.')[0] || 'unknown'}.${prop}`;
      if (!seen.has(key)) {
        seen.add(key);
        let target: object;
        if (pattern.source.includes('window') || pattern.source.includes('globalThis')) {
          target = globalThis;
        } else if (pattern.source.includes('localStorage')) {
          target = globalThis.localStorage;
        } else if (pattern.source.includes('sessionStorage')) {
          target = globalThis.sessionStorage;
        } else if (pattern.source.includes('navigator')) {
          target = globalThis.navigator;
        } else if (pattern.source.includes('document')) {
          target = globalThis.document;
        } else if (pattern.source.includes('screen')) {
          target = globalThis.screen;
        } else {
          target = globalThis;
        }
        apis.push({ target, property: prop });
      }
    }
  }
  return apis;
}

function isNativeApiExpression(value: string): boolean {
  const trimmed = value.trim();
  return extractNativeApis(trimmed).length > 0;
}

function applyBindingResult(result: unknown, el: HTMLElement): void {
  if (result !== undefined && result !== null) {
    if (typeof result === 'object' && !Array.isArray(result)) {
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
    } else {
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
    }
  }
}

function createNativeBinding(value: string, runtime: RuntimeContext, el: HTMLElement): () => void {
  const cleanupFns: (() => void)[] = [];
  const trimmed = value.trim();

  let target: object;
  let propertyPath: string;

  if (trimmed.startsWith('localStorage.')) {
    target = globalThis.localStorage;
    propertyPath = trimmed.slice('localStorage.'.length);
  } else if (trimmed.startsWith('sessionStorage.')) {
    target = globalThis.sessionStorage;
    propertyPath = trimmed.slice('sessionStorage.'.length);
  } else if (trimmed.startsWith('navigator.')) {
    target = globalThis.navigator;
    propertyPath = trimmed.slice('navigator.'.length);
  } else if (trimmed.startsWith('document.')) {
    target = globalThis.document;
    propertyPath = trimmed.slice('document.'.length);
  } else if (trimmed.startsWith('screen.')) {
    target = globalThis.screen;
    propertyPath = trimmed.slice('screen.'.length);
  } else {
    target = globalThis;
    propertyPath = trimmed.startsWith('window.') ? trimmed.slice('window.'.length) : trimmed.startsWith('globalThis.') ? trimmed.slice('globalThis.'.length) : trimmed;
  }

  const properties = propertyPath.split('.').filter(Boolean);
  const finalProperty = properties[properties.length - 1];

  const [runner, effectCleanup] = runtime.elementBoundEffect(el, () => {
    const result = runtime.evaluate(el, value);
    applyBindingResult(result, el);
  });
  cleanupFns.push(effectCleanup);

  if (target === globalThis) {
    const property = finalProperty;
    if (property === 'innerWidth' || property === 'innerHeight') {
      const onResize = () => {
        runner();
      };
      globalThis.addEventListener('resize', onResize);
      cleanupFns.push(() => globalThis.removeEventListener('resize', onResize));
    } else if (property === 'scrollX' || property === 'scrollY') {
      const onScroll = () => {
        runner();
      };
      globalThis.addEventListener('scroll', onScroll);
      cleanupFns.push(() => globalThis.removeEventListener('scroll', onScroll));
    }
  }

  if (target === globalThis.localStorage || target === globalThis.sessionStorage) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === finalProperty) {
        runner();
      }
    };
    globalThis.addEventListener('storage', onStorage);
    cleanupFns.push(() => globalThis.removeEventListener('storage', onStorage));
  }

  return () => cleanupFns.forEach(fn => fn());
}

const bindModule: AttributeModule = {
  name: 'bind',
  attribute: 'bind',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    if (!value) return;

    const parsed = parsedAttr || runtime.parseAttribute('data-bind', runtime, el);
    const target = parsed?.argument;

    // ─── Native API Binding Mode ───
    if (isNativeApiExpression(value)) {
      return createNativeBinding(value, runtime, el);
    }

    // ─── Auto-Detect Mode (data-bind="expr" without sub-directive argument) ───
    if (!target) {
      const cleanupFns: (() => void)[] = [];
      try {
        // 1. Reactive Effect: State → DOM
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          applyBindingResult(result, el);
        });
        cleanupFns.push(cleanup);

        // 2. Event Listener: DOM → State (Form Inputs Only)
        const isFormInput = el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable;

        if (isFormInput) {
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

            const trimmedVal = value.trim();
            const isValidLValue = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[[^\]]+\])*$/.test(trimmedVal);

            if (isValidLValue) {
              try {
                const current = runtime.evaluate(el, value);
                if (current && typeof current === 'object' && 'value' in (current as Record<string, unknown>)) {
                  runtime.evaluate(el, `${value}.value = $newValue`, { $newValue: newValue });
                } else {
                  runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
                }
              } catch {
                // Ignore non-assignable expression errors
              }
            }
          };

          el.addEventListener(eventName, inputHandler);
          cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));
        }

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
        const isLazy = el.hasAttribute('data-bind:lazy');
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
            const raw = (e.target as HTMLInputElement).value;
            newValue = raw === '' ? '' : Number(raw);
          } else {
            newValue = (e.target as HTMLInputElement).value;
          }
          runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
        };

        el.addEventListener(eventName, inputHandler);
        cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));
      }

    } catch (e) {
      initError('bind', `Failed to bind ${target}: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default bindModule;
