import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';


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
          if (url.startsWith('http')) {
            globalThis.location.href = url;
            return;
          }

          if ('navigation' in globalThis) {
            (globalThis as any).navigation.navigate(url, {
              history: opts?.replace ? 'replace' : 'push'
            });
          } else {
            // Fallback just in case, though legacy support is dropped
            if (opts?.replace) globalThis.history.replaceState({}, '', url);
            else globalThis.history.pushState({}, '', url);
            updateRoute(url);
          }
        },

        addRoute(route: RouteRecord) {
          runtime.debug('addRoute called with path:', route.path);
          const { regex, keys } = pathToRegex(route.path);
          route.matcher = regex;
          route.keys = keys;
          state.routes.push(route);
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

        if (url.hash && url.hash.startsWith('#/')) {
          path = url.hash.substring(1);
        } else if (path.endsWith('.html') && !url.hash) {
          path = '/';
        }

        state.path = path;
        state.hash = url.hash;

        const query: Record<string, string> = {};
        url.searchParams.forEach((val, key) => query[key] = val);
        state.query = query;

        let matched: RouteRecord | null = null;
        const params: Record<string, string> = {};

        for (const route of state.routes) {
          const match = path.match(route.matcher!);
          if (match) {
            runtime.debug(`Matched route: ${route.path} via path ${path}`);
            matched = route;
            route.keys?.forEach((key: string, i: number) => {
              params[key] = match[i + 1] || '';
            });
            break;
          }
        }

        state.params = params;
        state.currentRoute = matched as any; 

        runtime.debug(`Hiding/showing active route. Matched:`, matched?.path);
        (state.routes as RouteRecord[]).forEach((r: RouteRecord) => {
          if (r === matched) {
            if (r.element.style.display === 'none') r.element.style.display = '';
          } else {
            r.element.style.display = 'none';
          }
        });
      };

      // 4. Native Navigation Interception
      const onNavigate = (e: any) => {
        if (!e.canIntercept || e.hashChange || e.downloadRequest !== null) {
          return;
        }

        const url = new URL(e.destination.url);
        if (url.origin !== globalThis.location.origin) return;

        e.intercept({
          async handler() {
            if ('startViewTransition' in document) {
              const transition = (document as any).startViewTransition(() => {
                updateRoute(url.href);
              });
              await transition.finished;
            } else {
              updateRoute(url.href);
            }
          }
        });
      };

      if ('navigation' in globalThis) {
        (globalThis as any).navigation.addEventListener('navigate', onNavigate);
      }

      queueMicrotask(() => {
        updateRoute(globalThis.location.href);
      });

      return () => {
        if ('navigation' in globalThis) {
          (globalThis as any).navigation.removeEventListener('navigate', onNavigate);
        }
      };

    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  }
};

export default routerAttributeModule;
