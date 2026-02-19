import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';

const bindModule: AttributeModule = {
  name: 'bind',
  attribute: 'bind',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // 1. Identify Target Attribute
    // format: data-bind:href="url" -> target="href"
    // The parser separates directive ("bind") and argument ("href")

    // We need to re-parse because the initial scan passed just value, but for bind 
    // we often rely on the argument. The AttributeModule interface passes 'value', 
    // but we might need the full attribute name to get the argument?
    // Actually, distinct attributes (data-bind:src, data-bind:href) invoke handle separately?
    // Yes, assuming the coordinator correctly maps them. 
    // BUT, our current Coordinator logic might need to pass the *parsed* info or the attribute name.
    // For now, let's assume we can re-find the attribute or traverse attributes to find matching ones.

    // Better strategy: The Coordinator should ideally pass the argument. 
    // But sticking to the interface:

    const attrs = Array.from(el.attributes).filter(a =>
      (a.name.startsWith('data-bind:') || a.name.startsWith('data-bind-')) && a.value === value
    );

    // If multiple binds have same value, we might process them multiple times, which is fine but inefficient.
    // Let's iterate found attributes.

    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const target = parsed.argument;

      try {
        // Reactive Effect for Binding
        const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
          const result = runtime.evaluate(el, value);
          const attrValue = result !== undefined && result !== null ? String(result) : '';

          // Handle specific constraints
          if (target === 'value' || target === 'checked') {
            if (el instanceof HTMLInputElement && el.type === 'checkbox') {
              el.checked = Boolean(result);
            } else if (el instanceof HTMLInputElement && el.type === 'radio') {
              el.checked = (el.value === attrValue);
            } else if ('value' in el) {
              (el as HTMLInputElement).value = attrValue;
            }
          } else {
            if (result === false || result === null || result === undefined) {
              el.removeAttribute(target);
            } else {
              el.setAttribute(target, attrValue);
            }
          }
        });

        cleanupFns.push(cleanup);

        // Two-Way Binding Setup (Input Listener)
        if (target === 'value' || target === 'checked') {
          const inputHandler = (e: Event) => {
            let newValue: unknown;
            if (el instanceof HTMLInputElement && el.type === 'checkbox') {
              newValue = el.checked;
            } else if (el instanceof HTMLInputElement && el.type === 'radio') {
              // Only update if checked? Radio logic is tricky. 
              // Usually we bind group to same value.
              newValue = el.checked ? el.value : undefined;
            } else {
              newValue = (e.target as HTMLInputElement).value;
            }

            // Reverse assignment: expression = newValue
            // This requires an assignable expression.
            // We use a temporary scope to inject $newValue and execute assignment.
            // "varName = $newValue"
            runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
          };

          el.addEventListener('input', inputHandler);
          cleanupFns.push(() => el.removeEventListener('input', inputHandler));
        }

      } catch (e) {
        initError('bind', `Failed to bind ${target}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default bindModule;
