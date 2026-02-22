import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

// eventModifiers decoupled to Universal Pipeline Modifiers

const onModule: AttributeModule = {
  name: 'on',
  attribute: 'on',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    // Find attributes matching data-on:*
    const attrs = Array.from(el.attributes).filter(a => (a.name.startsWith('data-on:') || a.name.startsWith('data-on-')) && a.value === value);
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const eventName = parsed.argument;
      const modifiers = parsed.modifiers;

      try {
        // The Event Handler
        let handler: EventListener = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          const extras = {
            $evt: e,
            $detail: detail,
            $newValue: (e.target as any)?.value ?? (e.target as any)?.checked ?? detail
          };
          return runtime.evaluate(el, value, extras) as any;
        };

        // Apply Modifiers
        let target: EventTarget = el;
        let options: AddEventListenerOptions | boolean = false;

        modifiers.forEach((mod: string) => {
          // Handle value-modifiers like debounce-250
          let modName = mod;
          let modArg = '';
          const dashIdx = mod.indexOf('-');
          
          if (dashIdx !== -1) {
            modName = mod.substring(0, dashIdx);
            modArg = mod.substring(dashIdx + 1);
          }

          if (modName === 'window') target = window;
          else if (modName === 'document') target = document;
          else if (modName === 'passive') options = { passive: true };
          else if (modName === 'capture') options = true;
          else {
            const modifierModule = runtime.getModifier(modName);
            if (modifierModule) {
              handler = modifierModule.handle(handler, el, modArg, runtime) as EventListener;
            }
          }
        });

        target.addEventListener(eventName, handler as EventListener, options);
        cleanupFns.push(() => target.removeEventListener(eventName, handler as EventListener, options));

      } catch (e) {
        initError('on', `Failed to attach listener ${eventName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default onModule;
