import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * data-route: Declaratively registers a route.
 * Usage: <div data-route="/user/:id">...</div>
 * 
 * Note: The actual routing logic (matching and rendering) is handled by the Router (data-router)
 * or by this module effectively hiding/showing itself based on the current route?
 * 
 * Spec 3.6.6: "data-route ... The route is automatically added to $router.routes and removed when the element is destroyed."
 * 
 * So this module MUST interact with the global router signal.
 * We need access to the router instance.
 */

export const routeAttributeModule: AttributeModule = {
  name: 'route-attribute',
  attribute: 'route', // maps to data-route
  handle: (el: HTMLElement, routePath: string, runtime: RuntimeContext) => {
    try {
      const globalSignals = runtime.globalSignals();
      // deno-lint-ignore no-explicit-any
      const router = globalSignals['$router'] as any; // We assume $router exists

      if (!router || !router.addRoute) {
        // Router might not be initialized yet?
        // Or route defined outside of router context?
        // We should warn or retry?
        // For now, we assume data-router is on <html> or <body > and initialized first.
        // But attribute order is valid.
        // If router not found, we can try to find it on window or wait?
        // Best approach: Router should be a global singleton in $router.

        // If not found, report error?
        if (!router) {
          reportError(new Error("data-route used but $router not found. Ensure data-router is present."), el);
          return;
        }
      }

      // Read config attributes
      const name = el.getAttribute('data-route-name');
      const redirect = el.getAttribute('data-route-redirect');
      const layout = el.getAttribute('data-route-layout');
      const metaStr = el.getAttribute('data-route-meta');
      const enter = el.getAttribute('data-route-before-enter');
      const leave = el.getAttribute('data-route-before-leave');

      let meta: unknown = {};
      if (metaStr) {
        try {
          meta = runtime.evaluate(el, metaStr);
        } catch (e) {
          reportError(new Error(`Invalid data-route-meta: ${e}`), el);
        }
      }

      // Register route
      // We need a unique ID for this route element to manage lifecycle?
      // Or just pass the element itself?
      // The Spec says "removed when the element is destroyed".
      // handle returns cleanup function.

      const routeRecord = {
        path: routePath,
        element: el,
        name,
        redirect,
        layout,
        meta,
        beforeEnter: enter ? (to: unknown, from: unknown) => runtime.evaluate(el, enter, { scope: { $to: to, $from: from } }) : undefined,
        beforeLeave: leave ? (to: unknown, from: unknown) => runtime.evaluate(el, leave, { scope: { $to: to, $from: from } }) : undefined,
      };

      router.addRoute(routeRecord);

      // Cleanup
      return () => {
        router.removeRoute(routeRecord);
      };

    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  }
};

export default routeAttributeModule;
