import { ListenerModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

/**
 * linkRewriter: intercepts same-origin anchor clicks for SPA navigation.
 *
 * When the Navigation API is available, the router intercepts the resulting
 * `navigate` event natively, so this listener must NOT preventDefault or push
 * history itself (doing so would suppress the Navigation event). It only emits a
 * `ux-navigate` custom event for observers.
 *
 * When the Navigation API is absent, it routes the click through
 * `$router.navigate()` (which applies basePath and drives updateRoute), falling
 * back to a raw pushState only if no router is present.
 */
const linkRewriterModule: ListenerModule = {
  name: 'linkRewriter',
  event: 'click',
  listen: (el: HTMLElement, context: RuntimeContext) => {
    const hasNavigationApi = 'navigation' in globalThis;

    const handler = (event: Event) => {
      try {
        if (event.defaultPrevented) return;
        if ((event as MouseEvent).button !== 0) return;
        if (
          (event as MouseEvent).metaKey ||
          (event as MouseEvent).ctrlKey ||
          (event as MouseEvent).shiftKey ||
          (event as MouseEvent).altKey
        ) return;

        const anchor = (event.target as Element).closest('a');
        if (!anchor) return;

        if (anchor.origin !== globalThis.location.origin) return;
        if (anchor.target && anchor.target !== '_self') return;
        if (anchor.hasAttribute('download') || anchor.hasAttribute('data-ignore')) return;

        const path = anchor.pathname + anchor.search + anchor.hash;

        // Notify observers of an SPA navigation intent.
        anchor.dispatchEvent(
          new CustomEvent(`${CUSTOM_EVENT_PREFIX}navigate`, {
            bubbles: true,
            cancelable: false,
            detail: { path, anchor },
          }),
        );

        // With the Navigation API present, let the router intercept natively.
        if (hasNavigationApi) return;

        // Otherwise, drive the router (basePath-aware) or fall back to pushState.
        event.preventDefault();

        const signals = context.globalSignals();
        // deno-lint-ignore no-explicit-any
        const router = signals['$router'] as any;
        if (router && typeof router.navigate === 'function') {
          router.navigate(path);
        } else {
          globalThis.history.pushState({ scrollY: globalThis.scrollY }, '', path);
          document.dispatchEvent(
            new CustomEvent(`${CUSTOM_EVENT_PREFIX}popstate`, {
              detail: { url: globalThis.location.href },
            }),
          );
        }
      } catch (e) {
        reportError(
          new Error(`LinkRewriter error: ${e instanceof Error ? e.message : String(e)}`),
          el,
        );
      }
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  },
};

export default linkRewriterModule;
