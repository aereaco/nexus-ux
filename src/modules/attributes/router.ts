import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';


/**
 * data-router: The Core Router
 * Initializes the $router signal and manages navigation.
 */

// We define the Router interface matching the Spec
export interface RouterState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  loading: boolean;
  error: unknown;
  // previous: string | null; // maybe?
  // layout: string | null;
  currentRoute: RouteRecord | null;
  routes: RouteRecord[];

  // Methods
  navigate(url: string, opts?: { replace?: boolean }): void;
  addRoute(route: RouteRecord): void;
  removeRoute(route: RouteRecord): void;
}

interface RouteRecord {
  path: string;
  element: HTMLElement;
  name?: string;
  redirect?: string;
  layout?: string;
  meta?: unknown;
  beforeEnter?: (to: unknown, from: unknown) => unknown;
  beforeLeave?: (to: unknown, from: unknown) => unknown;
  matcher?: RegExp;
  keys?: string[];
}

// Convert path pattern to regex (simplified)
function pathToRegex(path: string): { regex: RegExp, keys: string[] } {
  const keys: string[] = [];
  const pattern = path
    .replace(/:([a-zA-Z0-9_]+)\?/g, (_, key) => {
      keys.push(key);
      return '(?:/([^/]+))?';
    })
    .replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })
    .replace(/\*/g, '.*');

  return { regex: new RegExp(`^${pattern}$`), keys };
}

export const routerAttributeModule: AttributeModule = {
  name: 'router-attribute',
  attribute: 'router',
  handle: (el: HTMLElement, _initConfig: string, runtime: RuntimeContext) => {
    try {
      runtime.debug('Initializing data-router on', el);
      // 1. Create Reactive State
      // Use shallowReactive to prevent deep proxying of HTMLElements in routes
      const state = runtime.shallowReactive<RouterState>({
        path: globalThis.location.pathname,
        params: {},
        query: {},
        hash: globalThis.location.hash,
        loading: false,
        error: null,
        currentRoute: null,
        routes: [],

        navigate(url: string, opts?: { replace?: boolean; viewTransition?: boolean }) {
          // Logic to navigate
          if (url.startsWith('http')) {
            globalThis.location.href = url;
            return;
          }

          // ZCZS: View Transitions API support for smooth navigation
          const useViewTransition = opts?.viewTransition !== false && 
            'startViewTransition' in document &&
            typeof (document as any).startViewTransition === 'function';

          const doNavigate = () => {
            // Push state
            if (opts?.replace) {
              globalThis.history.replaceState({}, '', url);
            } else {
              globalThis.history.pushState({}, '', url);
            }

            // Update state
            updateRoute(url);
          };

          if (useViewTransition) {
            // Use View Transitions API for smooth page transitions
            (document as any).startViewTransition(() => {
              doNavigate();
            });
          } else {
            doNavigate();
          }
        },

        addRoute(route: RouteRecord) {
          runtime.debug('addRoute called with path:', route.path);
          const { regex, keys } = pathToRegex(route.path);
          route.matcher = regex;
          route.keys = keys;
          state.routes.push(route);
          // Re-evaluate current route via microtask to avoid TDZ during hydration
          queueMicrotask(() => {
            updateRoute(globalThis.location.pathname + globalThis.location.search + globalThis.location.hash);
          });
        },

        removeRoute(route: RouteRecord) {
          const idx = state.routes.indexOf(route);
          if (idx > -1) state.routes.splice(idx, 1);
        }
      });

      // 2. Register Global Signal
      runtime.setGlobalSignal('$router', state);

      // 3. Update Logic
      const updateRoute = (fullPath: string) => {
        const url = new URL(fullPath, globalThis.location.origin);
        let path = url.pathname;

        // Hash-based routing prioritization
        if (url.hash && url.hash.startsWith('#/')) {
          path = url.hash.substring(1);
        } else if (path.endsWith('.html') && !url.hash) {
          path = '/';
        }

        state.path = path;
        state.hash = url.hash;

        // Query Params
        const query: Record<string, string> = {};
        url.searchParams.forEach((val, key) => query[key] = val);
        state.query = query;

        // Match Route
        let matched: RouteRecord | null = null;
        const params: Record<string, string> = {};

        for (const route of state.routes) {
          const match = path.match(route.matcher!);
          if (match) {
            runtime.debug(`Matched route: ${route.path} via path ${path}`);
            matched = route;
            // Extract params
            route.keys?.forEach((key: string, i: number) => {
              params[key] = match[i + 1] || '';
            });
            break;
          }
        }

        state.params = params;
        // deno-lint-ignore no-explicit-any
        state.currentRoute = matched as any; 

        // Show/Hide Elements based on match
        runtime.debug(`Hiding/showing active route. Matched:`, matched?.path);
        (state.routes as RouteRecord[]).forEach((r: RouteRecord) => {
          if (r === matched) {
            if (r.element.style.display === 'none') r.element.style.display = '';
          } else {
            r.element.style.display = 'none';
          }
        });
      };

      // 4. Intercept Listeners — store references for cleanup

      // Popstate (via bridge or direct)
      const onPopstate = () => updateRoute(globalThis.location.href);
      const onRouterPopstate = () => updateRoute(globalThis.location.href);
      globalThis.addEventListener('popstate', onPopstate);
      globalThis.addEventListener('router:popstate', onRouterPopstate);

      // Link Interception (Delegated)
      const onLinkClick = (e: Event) => {
        const link = (e.target as Element).closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('#') && !link.target) {
            e.preventDefault();
            state.navigate(href);
          }
        }
      };
      el.addEventListener('click', onLinkClick);

      // Initial Update via microtask (deterministic, pre-paint)
      queueMicrotask(() => {
        updateRoute(globalThis.location.href);
      });

      // Return cleanup to prevent listener stacking on re-mount
      return () => {
        globalThis.removeEventListener('popstate', onPopstate);
        globalThis.removeEventListener('router:popstate', onRouterPopstate);
        el.removeEventListener('click', onLinkClick);
      };

    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  }
};

export default routerAttributeModule;
