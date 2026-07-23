import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/debug.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

const onModule: AttributeModule = {
  name: 'on',
  attribute: 'on',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const attrs = matchAttributes(el, 'on', value);
    const cleanupFns: (() => void)[] = [];

    attrs.forEach(attr => {
      const parsed = runtime.parseAttribute(attr.name, runtime, el);
      if (!parsed || !parsed.argument) return;

      const eventName = parsed.argument;
      const modifiers = parsed.modifiers;

      try {
        let handler: EventListener = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          const extras = {
            $evt: e,
            $detail: detail,
            $newValue: (e.target as HTMLInputElement)?.value ?? (e.target as HTMLInputElement)?.checked ?? detail
          };
          return runtime.evaluate(el, value, extras);
        };

        let target: EventTarget = el;
        let options: AddEventListenerOptions | boolean = false;

        modifiers.forEach((mod: string) => {
          const [modName, modArg] = mod.includes('-') ? mod.split('-', 1) : [mod, ''];
          const fullArg = mod.includes('-') ? mod.slice(mod.indexOf('-') + 1) : '';

          switch (modName) {
            case 'window':
              target = window;
              break;
            case 'document':
              target = document;
              break;
            case 'passive':
              options = { passive: true };
              break;
            case 'capture':
              options = true;
              break;
            default: {
              const modifierModule = runtime.getModifier(modName);
              if (modifierModule) {
                handler = modifierModule.handle(handler, el, fullArg, runtime) as EventListener;
              }
              break;
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
