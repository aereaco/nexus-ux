import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';
import { matchAttributes } from '../../engine/attributeParser.ts';

// Deterministic Registry for Zero-GC Event Delegation
// Structure: Map<EventName, Map<nxId, EventListener[]>>
const globalListeners = new Map<string, Map<number, EventListener[]>>();
let listenerIdCounter = 0;
const NEXUS_ID = Symbol('_nx_id');

// Events that do not bubble and must be attached directly
const NON_BUBBLING_EVENTS = new Set(['focus', 'blur', 'mouseenter', 'mouseleave', 'scroll', 'load', 'error']);

function getGlobalHandler(eventName: string) {
  return (e: Event) => {
    const flatMap = globalListeners.get(eventName);
    if (!flatMap) return;
    
    // Trace the composed path from the target up to the document
    const path = e.composedPath();
    for (const target of path) {
      if (e.cancelBubble) break; // Respect :stop modifier (stopPropagation)
      
      const nxId = (target as unknown as Record<symbol, number>)[NEXUS_ID];
      if (nxId && flatMap.has(nxId)) {
        flatMap.get(nxId)!.forEach(fn => fn(e));
      }
    }
  };
}

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
        // The Base Handler
        let handler: EventListener = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          const extras = {
            $evt: e,
            $detail: detail,
            $newValue: (e.target as HTMLInputElement)?.value ?? (e.target as HTMLInputElement)?.checked ?? detail
          };
          return runtime.evaluate(el, value, extras);
        };

        // Apply Modifiers
        let target: EventTarget = el;
        let options: AddEventListenerOptions | boolean = false;

        modifiers.forEach((mod: string) => {
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

        const forceDirect = target === window || target === document || NON_BUBBLING_EVENTS.has(eventName) || options !== false;

        if (forceDirect) {
          // Direct Attachment
          target.addEventListener(eventName, handler as EventListener, options);
          cleanupFns.push(() => target.removeEventListener(eventName, handler as EventListener, options));

          // Late Event Ignition: If event already happened, trigger it now for initialization safety.
          if (target === window && eventName === 'load' && document.readyState === 'complete') {
             queueMicrotask(() => (handler as EventListener)(new Event('load')));
          } else if (target === document && eventName === 'DOMContentLoaded' && (document.readyState === 'interactive' || document.readyState === 'complete')) {
             queueMicrotask(() => (handler as EventListener)(new Event('DOMContentLoaded')));
          }
        } else {
          // GC-Free Global Delegation
          if (!globalListeners.has(eventName)) {
            globalListeners.set(eventName, new Map());
            document.addEventListener(eventName, getGlobalHandler(eventName), { capture: false });
          }

          const flatMap = globalListeners.get(eventName)!;
          
          // Assign deterministic ID if missing
          if (!(target as unknown as Record<symbol, number>)[NEXUS_ID]) {
            (target as unknown as Record<symbol, number>)[NEXUS_ID] = ++listenerIdCounter;
          }
          const nxId = (target as unknown as Record<symbol, number>)[NEXUS_ID];

          let elementHandlers = flatMap.get(nxId);
          if (!elementHandlers) {
            elementHandlers = [];
            flatMap.set(nxId, elementHandlers);
          }
          elementHandlers.push(handler);

          // Deterministic Cleanup (Bypasses GC Tracing)
          cleanupFns.push(() => {
            const currentHandlers = flatMap.get(nxId);
            if (currentHandlers) {
              const idx = currentHandlers.indexOf(handler);
              if (idx > -1) currentHandlers.splice(idx, 1);
              if (currentHandlers.length === 0) {
                 flatMap.delete(nxId); // O(1) Instant memory release
              }
            }
          });
        }

      } catch (e) {
        initError('on', `Failed to attach listener ${eventName}: ${e instanceof Error ? e.message : String(e)}`, el, value);
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default onModule;
