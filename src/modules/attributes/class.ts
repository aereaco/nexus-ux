/**
 * Nexus-UX Class Directive Module
 *
 * Handles `data-class` for reactive CSS class binding. Supports both
 * standard class binding (object/string) and suffixed class binding
 * (data-class-active="isActive").
 *
 * Binding Modes:
 *   - Standard: `data-class="obj"` — reconciles all classes from object/string
 *   - Suffixed: `data-class-active="isActive"` — toggles single class
 *
 * ZCZS Guarantees:
 *   - Zero-copy: classList is mutated in-place; no DOM cloning.
 *   - Zero-serialization: Class strings are passed directly to DOM API.
 *
 * Coordination:
 *   - attributeParser.ts extracts directive/argument/modifiers
 *   - reconciler.ts provides reconcileClass for mass class updates
 *   - reactivity.ts provides elementBoundEffect for reactive binding
 *   - debug.ts provides initError for failure reporting
 *
 * Nexus-UX Innovation Preserved:
 *   - Dual-mode class binding (standard + suffixed)
 *   - Reactive class reconciliation with automatic cleanup
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';

const classModule: AttributeModule = {
  name: 'class',
  attribute: 'class',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    const parsed = parsedAttr || runtime.parseAttribute('data-class', runtime, el);
    if (!parsed) return;

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, value);
        
        if (parsed.argument) {
           // Handle suffixed class binding (e.g. data-class-active="isActive")
           if (result) {
             el.classList.add(parsed.argument);
           } else {
             el.classList.remove(parsed.argument);
           }
        } else {
           // Handle standard class binding
           runtime.reconcileClass(el, result);
        }
      });
      return cleanup;
    } catch (e) {
      initError('class', `Failed to reconcile class: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default classModule;
