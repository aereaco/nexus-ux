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
  attribute: 'data-router',
  handle: (el: HTMLElement, _initConfig: string, runtime: RuntimeContext) => {
    try {
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

        navigate(url: string, opts?: { replace?: boolean }) {
          // Logic to navigate
          if (url.startsWith('http')) {
            globalThis.location.href = url;
            return;
          }

          // Push state
          if (opts?.replace) {
            globalThis.history.replaceState({}, '', url);
          } else {
            globalThis.history.pushState({}, '', url);
          }

          // Update state
          updateRoute(url);
        },

        addRoute(route: RouteRecord) {
          const { regex, keys } = pathToRegex(route.path);
          route.matcher = regex;
          route.keys = keys;
          state.routes.push(route);
          // Re-evaluate current route
          updateRoute(globalThis.location.pathname + globalThis.location.search + globalThis.location.hash);
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
        const path = url.pathname;

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
        (state.routes as RouteRecord[]).forEach((r: RouteRecord) => {
          if (r === matched) {
            if (r.element.style.display === 'none') r.element.style.display = '';
          } else {
            r.element.style.display = 'none';
          }
        });
      };

      // 4. Intercept Listeners

      // Popstate (via bridge or direct)
      globalThis.addEventListener('popstate', () => {
        updateRoute(globalThis.location.href);
      });
      globalThis.addEventListener('router:popstate', () => {
        updateRoute(globalThis.location.href);
      });

      // Link Interception (Delegated)
      el.addEventListener('click', (e) => {
        const link = (e.target as Element).closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('#') && !link.target) {
            e.preventDefault();
            state.navigate(href);
          }
        }
      });

      // Initial Update
      setTimeout(() => {
        updateRoute(globalThis.location.href);
      }, 0);

    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  }
};

export default routerAttributeModule;
