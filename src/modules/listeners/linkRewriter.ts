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
 * `#router.navigate()` (which applies basePath and drives updateRoute), falling
 * back to a raw pushState only if no router is present.
 */
const linkRewriterModule: ListenerModule = {
  name: 'linkRewriter',
  event: 'click',
  listen: (el: HTMLElement, context: RuntimeContext) => {
    // Capture the app base at listener init (initial document URL). Relative
    // links must resolve against this stable base, NOT the live virtual URL
    // (which the SPA mutates), otherwise repeated navigations double the path
    // (e.g. /_pages/_pages/...).
    const appBase = globalThis.location.href;

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

        // Pass the raw (app-relative) href to the router. The router's applyBase
        // prepends the basePath, so we must NOT pre-resolve against the live URL
        // (that would double segments as the SPA virtual URL changes). We still
        // validate same-origin using the appBase-resolved absolute form.
        const rawHref = anchor.getAttribute('href') || '';
        let sameOrigin = true;
        try {
          sameOrigin = new URL(rawHref, appBase).origin === globalThis.location.origin;
        } catch { /* relative hrefs are same-origin */ }
        if (!sameOrigin) return;
        const path = rawHref + anchor.search + anchor.hash;

        // Notify observers of an SPA navigation intent.
        anchor.dispatchEvent(
          new CustomEvent(`${CUSTOM_EVENT_PREFIX}navigate`, {
            bubbles: true,
            cancelable: false,
            detail: { path, anchor },
          }),
        );

        // Always intercept: prevent the browser from resolving the raw relative
        // href against the current *virtual* URL (which would double the path),
        // and drive the router ourselves with the appBase-resolved `path`.
        event.preventDefault();

        const title = anchor.getAttribute('data-tab-title') || undefined;
        const icon = anchor.getAttribute('data-tab-icon') || undefined;
        const signals = context.globalSignals();
        // deno-lint-ignore no-explicit-any
        const router = signals['router'] as any;
        if (router && typeof router.navigate === 'function') {
          router.navigate(path, { title, icon });
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
