import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';
import { reportError } from '../../engine/debug.ts';

/**
 * data-route: Declaratively registers a route.
 * Usage: <div data-route="/user/:id">...</div>
 *
 * The route is automatically added to #router.routes and removed when the element
 * is destroyed. Matching/rendering is handled by data-router.
 *
 * Config attributes (all optional):
 *   data-route-name
 *   data-route-redirect
 *   data-route-layout
 *   data-route-meta
 *   data-route-before-enter
 *   data-route-after-enter
 *   data-route-before-leave
 *   data-route-after-leave
 *   data-route-handler
 *   data-route-shadow   (boolean — mark route as shadow/internal; resolved & rendered
 *                        by the router but excluded from the public #router.manifest)
 *   data-component      (route's component URL, published to #router.route)
 *
 * Hook expressions receive `$to` (RouteInfo of the target route), `$from`
 * (RouteInfo of the previous route, or null), and `ctx` (a guard context with
 * `ctx.to`, `ctx.from`, and `ctx.signals.value('a.b.c')`) as top-level
 * identifiers. Returning `false` aborts navigation; returning a string performs
 * a redirect.
 */

export const routeAttributeModule: AttributeModule = {
  name: 'route-attribute',
  attribute: 'route', // maps to data-route
  handle: (el: HTMLElement, routePath: string, runtime: RuntimeContext, parsed?: ParsedAttribute) => {
    (globalThis as any).__routeInitCount = ((globalThis as any).__routeInitCount || 0) + 1;
    try {
      // The directive matcher also routes suffixed attributes (data-route-redirect,
      // data-route-before-enter, ...) to this handler with the SUFFIX as the
      // argument. Only the bare `data-route` attribute registers a route; the
      // config attributes are read via getAttribute below.
      if (parsed?.argument) return;

      const globalSignals = runtime.globalSignals();
      // deno-lint-ignore no-explicit-any
      const router = globalSignals['#router'] as any;

      if (!router || !router.addRoute) {
        reportError(
          new Error('data-route used but #router not found. Ensure data-router is present.'),
          el,
        );
        return;
      }

      // Read config attributes.
      const name = el.getAttribute('data-route-name') || undefined;
      const redirect = el.getAttribute('data-route-redirect') || undefined;
      const layout = el.getAttribute('data-route-layout') || undefined;
      const component = el.getAttribute('data-component') || undefined;
      const metaStr = el.getAttribute('data-route-meta');
      const beforeEnterExpr = el.getAttribute('data-route-before-enter');
      const afterEnterExpr = el.getAttribute('data-route-after-enter');
      const beforeLeaveExpr = el.getAttribute('data-route-before-leave');
      const afterLeaveExpr = el.getAttribute('data-route-after-leave');
      const handlerExpr = el.getAttribute('data-route-handler');
      const shadowAttr = el.getAttribute('data-route-shadow');
      const internal = shadowAttr === '' || shadowAttr === 'true' || shadowAttr === 'shadow';

      let meta: unknown = {};
      if (metaStr) {
        try {
          meta = runtime.evaluate(el, metaStr);
        } catch (e) {
          reportError(new Error(`Invalid data-route-meta: ${e}`), el);
        }
      }

      // Doc-compatible guard context: `ctx.signals.value('auth.user')` reads a
      // (possibly nested) global signal; `ctx.to` / `ctx.from` mirror $to/$from.
      const readSignal = (dotted: string): unknown => {
        const parts = String(dotted).split('.');
        let cur: unknown = runtime.globalSignals();
        for (const p of parts) {
          if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[p];
          } else {
            return undefined;
          }
        }
        return cur;
      };

      // Compile a hook expression into a (to, from) => unknown function.
      // `$to` / `$from` / `ctx` are exposed as top-level identifiers via evaluator
      // extras.
      const makeHook = (expr: string | null) =>
        expr
          ? (to: unknown, from: unknown) =>
              runtime.evaluate(el, expr, {
                $to: to,
                $from: from,
                ctx: { to, from, signals: { value: readSignal } },
              })
          : undefined;

      const routeRecord = {
        path: routePath,
        element: el,
        name,
        redirect,
        layout,
        component,
        meta,
        internal,
        source: 'declared',
        beforeEnter: makeHook(beforeEnterExpr),
        afterEnter: makeHook(afterEnterExpr),
        beforeLeave: makeHook(beforeLeaveExpr),
        afterLeave: makeHook(afterLeaveExpr),
        handler: makeHook(handlerExpr),
      };

      router.addRoute(routeRecord);

      // Cleanup: remove from router when the element is destroyed.
      return () => {
        router.removeRoute(routeRecord);
      };
    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  },
};

export default routeAttributeModule;
