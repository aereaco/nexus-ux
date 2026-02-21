import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';
import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';

const isKeyboardEvent = (e: Event): e is KeyboardEvent => 'key' in e;

const eventModifiers: Record<string, (listener: EventListener, el: HTMLElement, arg: string, runtime: RuntimeContext) => EventListener> = {
  prevent: (fn) => (e) => { e.preventDefault(); fn(e); },
  stop: (fn) => (e) => { e.stopPropagation(); fn(e); },
  self: (fn, el) => (e) => { if (e.target === el) fn(e); },
  enter: (fn) => (e) => { if (isKeyboardEvent(e) && e.key === 'Enter') fn(e); },
  escape: (fn) => (e) => { if (isKeyboardEvent(e) && e.key === 'Escape') fn(e); },
  esc: (fn) => (e) => { if (isKeyboardEvent(e) && e.key === 'Escape') fn(e); },
  space: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === ' ' || e.key === 'Spacebar')) fn(e); },
  up: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === 'ArrowUp' || e.key === 'Up')) fn(e); },
  down: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === 'ArrowDown' || e.key === 'Down')) fn(e); },
  left: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === 'ArrowLeft' || e.key === 'Left')) fn(e); },
  right: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === 'ArrowRight' || e.key === 'Right')) fn(e); },
  tab: (fn) => (e) => { if (isKeyboardEvent(e) && e.key === 'Tab') fn(e); },
  delete: (fn) => (e) => { if (isKeyboardEvent(e) && (e.key === 'Delete' || e.key === 'Backspace')) fn(e); },
  ctrl: (fn) => (e) => { if (isKeyboardEvent(e) && e.ctrlKey) fn(e); },
  alt: (fn) => (e) => { if (isKeyboardEvent(e) && e.altKey) fn(e); },
  shift: (fn) => (e) => { if (isKeyboardEvent(e) && e.shiftKey) fn(e); },
  meta: (fn) => (e) => { if (isKeyboardEvent(e) && e.metaKey) fn(e); },
  once: (fn) => {
    let fired = false;
    return (e) => { if (!fired) { fired = true; fn(e); } };
  },
  debounce: (fn, _el, arg) => {
    const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
    let timeout: number | undefined;
    return (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(e), wait);
    };
  },
  throttle: (fn, _el, arg) => {
    const wait = arg ? parseInt(arg) : DEFAULT_DEBOUNCE_TIME;
    let last = 0;
    return (e) => {
      const now = performance.now();
      if (now - last > wait) {
        last = now;
        fn(e);
      }
    };
  },
  morph: (fn, el, arg, runtime) => {
    // :morph modifier: Executes handler, then morphs a target or self with the result.
    // If arg is provided, it's the target selector.
    return async (e) => {
      const result = await (fn as any)(e);
      if (typeof result === 'string') {
        const { morphDOM } = await import('../../engine/morph.ts');
        const target = arg ? (runtime as any).$(el, arg) : el;
        if (target) morphDOM(target, result);
      }
    };
  }
};

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
          runtime.evaluate(el, value, extras);
        };

        // Apply Modifiers
        let target: EventTarget = el;
        let options: AddEventListenerOptions | boolean = false;

        modifiers.forEach((mod: string) => {
          // Handle value-modifiers like debounce-250 without .split() array allocations
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
          else if (eventModifiers[modName]) {
            handler = eventModifiers[modName](handler, el, modArg, runtime);
          }
        });

        target.addEventListener(eventName, handler, options);
        cleanupFns.push(() => target.removeEventListener(eventName, handler, options));

      } catch (e) {
        initError('on', `Failed to attach listener ${eventName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default onModule;
