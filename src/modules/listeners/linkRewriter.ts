import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

const linkRewriterModule: ListenerModule = {
  name: 'linkRewriter',
  event: 'click',
  listen: (el: HTMLElement, context: RuntimeContext) => {
    const handler = (event: Event) => {
      try {
        if (event.defaultPrevented) return;

        // Find anchor
        const anchor = (event.target as Element).closest('a');
        if (!anchor) return;

        // Check origin
        if (anchor.origin !== globalThis.location.origin) return;

        // Check target
        if (anchor.target && anchor.target !== '_self') return;

        // Check download/ignore
        if (anchor.hasAttribute('download') || anchor.hasAttribute('data-ignore')) return;

        event.preventDefault();

        const path = anchor.pathname + anchor.search + anchor.hash;

        // Update state
        const signals = context.globalSignals();
        if (signals.route !== path) {
          globalThis.history.pushState({}, '', path);
          context.setGlobalSignal('route', path);
        }

        // Dispatch navigate event
        anchor.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}navigate`, {
          bubbles: true,
          cancelable: false,
          detail: { path, anchor }
        }));

      } catch (e) {
        reportError(new Error(`LinkRewriter error: ${e instanceof Error ? e.message : String(e)}`), el);
      }
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }
};

export default linkRewriterModule;
