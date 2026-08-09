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
    try {
      if (parsed?.argument) return;

      const globalSignals = runtime.globalSignals();
      // deno-lint-ignore no-explicit-any
      const router = globalSignals['router'] as any;

      if (!router || !router.addRoute) {
        // If router not initialized yet, retry on next microtask tick
        queueMicrotask(() => {
          try {
            routeAttributeModule.handle(el, routePath, runtime, parsed);
          } catch {}
        });
        return;
      }

      // Check if data-route contains a JSON signal object (e.g. data-route="{ routes: [...] }")
      let jsonConfig: { routes?: Array<Record<string, any>> } | null = null;
      if (routePath && routePath.trim().startsWith('{')) {
        try {
          const evaluated = runtime.evaluate(el, routePath);
          if (evaluated && typeof evaluated === 'object') {
            jsonConfig = evaluated as { routes?: Array<Record<string, any>> };
          }
        } catch {
          // ignore evaluation error
        }
      }

      if (jsonConfig && Array.isArray(jsonConfig.routes)) {
        const addedRecords: any[] = [];
        jsonConfig.routes.forEach((item) => {
          const path = item.route || item.path || '/';
          const component = item.path || item.component;
          const isProtected = item.protected === true || item.protected === 'yes' || item.shadow === true || item.internal === true;

          const record = {
            path,
            element: el,
            name: item.name,
            component,
            redirect: item.redirect,
            layout: item.layout,
            meta: item.meta || {},
            internal: isProtected,
            source: 'declared',
          };
          router.addRoute(record);
          addedRecords.push(record);
        });

        return () => {
          addedRecords.forEach((r) => router.removeRoute(r));
        };
      }

      // Single route element declaration fallback (legacy <div data-route="...">)
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
      const shadowAttr = el.getAttribute('data-route-shadow') || el.getAttribute('data-route-protected');
      const internal = el.hasAttribute('data-route-shadow') || el.hasAttribute('data-route-protected') || shadowAttr === '' || shadowAttr === 'true' || shadowAttr === 'shadow' || shadowAttr === 'yes';

      let meta: unknown = {};
      if (metaStr) {
        try {
          meta = runtime.evaluate(el, metaStr);
        } catch (e) {
          reportError(new Error(`Invalid data-route-meta: ${e}`), el);
        }
      }

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

      return () => {
        router.removeRoute(routeRecord);
      };
    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  },
};

export default routeAttributeModule;
