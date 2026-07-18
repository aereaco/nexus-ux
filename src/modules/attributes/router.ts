import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';
import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

/**
 * data-router: The Core Router
 * Initializes the #router signal and manages navigation.
 *
 * Rendering paradigms (both supported simultaneously):
 *  1. Section model  — <element data-route="/x"> with children. The matched
 *     element is shown and the rest hidden via reconcileStyle(display).
 *  2. Outlet model   — <element data-route="/x" data-component="/pages/x.html">.
 *     The matched route's component URL is published to `#router.route`, and its
 *     `data-route-layout` URL to `#router.layout`. A dynamic outlet such as
 *     `<main data-component="#router.route">` renders the component reactively
 *     (data-component re-runs its effect when the signal changes). Layouts are
 *     composed the same way: `<div data-component="#router.layout">` shell with a
 *     nested `<main data-component="#router.route">` outlet.
 *
 * Capabilities:
 *  - Native Navigation API interception (with History fallback).
 *  - Per-route lifecycle hooks: beforeLeave, beforeEnter, handler, afterEnter,
 *    afterLeave. Hooks are async-awaited. Returning `false` aborts navigation;
 *    returning a string performs a redirect (replace).
 *  - route.redirect: declarative redirect to another path.
 *  - Routing modes: 'signal' (default) | 'static' | 'hybrid'. In static/hybrid,
 *    an unmatched path resolves to a filesystem component (`/path` -> `/path.html`)
 *    published to `#router.route`, before falling back to 404.
 *  - `default` route: `data-router="{ default: '/home' }"` redirects the base path.
 *  - 404 fallback to /404.html when nothing matches/resolves.
 *  - basePath auto-detection with `data-router.base-path` override; stripped from
 *    incoming paths and prepended to outgoing navigations.
 *  - Scroll save/restore via history.state.scrollY, plus hash `scrollIntoView`.
 *  - Wildcard `*` captured into params.wildcard.
 *  - Helpers: navigateByName(name, params?, query?), isActive(path, exact?),
 *    buildQuery(obj).
 *
 * Declarative routing strategy (config object on data-router):
 *  - `mode`, `default`, `basePath` — as above.
 *  - `manifest` — URL of a static auto-route manifest (JSON array of route
 *    descriptors). Merged into `#router.manifest` at boot.
 *  - `dynamic` — when true, the router also folds runtime-discovered routes into
 *    `#router.manifest` (e.g. a sibling `manifest.json` produced by the server/build).
 *  - `shadow` — glob(s) marking internal routes (e.g. `'/_internal/**'`). Shadow
 *    routes resolve/ render through the router's internal fetch but are excluded
 *    from the public `#router.manifest` so the client has no discoverable URL.
 *  - `notFound` — override the 404 component path.
 *
 * Intuitive API surface:
 *  - `#router.config` — reactive snapshot of the strategy object.
 *  - `#router.manifest` — resolved route manifest (declared + manifest + dynamic).
 *  - `#router.match(path?)` — RouteInfo the router *would* match for a path.
 *  - `#router.go(target, opts?)` — navigate by name or path (the friendly entrypoint).
 */

export interface RouteInfo {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  name?: string;
  meta?: unknown;
  component?: string;
  layout?: string;
}

type RouteHook = (to: RouteInfo, from: RouteInfo | null) => unknown;

interface RouteRecord {
  path: string;
  element: HTMLElement;
  name?: string;
  redirect?: string;
  layout?: string;
  component?: string;
  meta?: unknown;
  beforeEnter?: RouteHook;
  afterEnter?: RouteHook;
  beforeLeave?: RouteHook;
  afterLeave?: RouteHook;
  handler?: RouteHook;
  matcher?: RegExp;
  keys?: string[];
  hasWildcard?: boolean;
  // Shadow/internal route: resolved & rendered by the router, excluded from the
  // public `#router.manifest` so the client has no discoverable URL.
  internal?: boolean;
  // Provenance tag for manifest entries ('declared' | 'manifest' | 'dynamic').
  source?: string;
}

type RouterMode = 'signal' | 'static' | 'hybrid';

export interface RouterConfig {
  mode: RouterMode;
  default: string | null;
  basePath: string;
  // URL of a static auto-route manifest (JSON array of route descriptors).
  manifest?: string;
  // When true, fold runtime-discovered routes into #router.manifest.
  dynamic?: boolean;
  // Glob(s) marking internal/shadow routes (e.g. '/_internal/**').
  shadow?: string | string[];
  // Override the 404 component path.
  notFound?: string;
}

export interface RouterState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  loading: boolean;
  error: unknown;
  basePath: string;
  mode: RouterMode;
  // Outlet-driving signals (component URLs) + metadata.
  route: string | null;
  layout: string | null;
  // The effective outlet URL: layout when present, else route. Bind a single
  // static outlet to this: `<main data-component="#router.outlet">`.
  outlet: string | null;
  meta: unknown;
  name: string | null;
  previous: { path: string; meta: unknown } | null;
  scrollPosition: { x: number; y: number };
  currentRoute: RouteRecord | null;
  routes: RouteRecord[];
  // Reactive snapshot of the declarative routing strategy (mode/default/manifest/
  // dynamic/shadow/notFound/basePath). Changes re-trigger a soft re-resolution.
  config: RouterConfig;
  // Resolved route manifest: declared data-route entries + manifest file + dynamic
  // scan, merged. Public entries (non-internal) are what the app advertises.
  manifest: RouteRecord[];
  // Match a path and return the RouteInfo the router would use (no navigation).
  match(path?: string): RouteInfo | null;
  // Intuitive navigate: by route name (→ navigateByName) or path (→ navigate).
  go(target: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }): void;

  // --- Per-tab history (woven into the native browser history) ---
  // Each tab owns its own back/forward timeline. The native browser history is
  // the single store; every entry is stamped with `tabId` (+title/icon/scroll)
  // so back/forward can resolve which tab an entry belongs to.
  activeTabId: string | null;
  // Last resolved path per tab (so switching the active tab re-renders it).
  tabPaths: Record<string, string>;
  // Last title/icon per tab (synced from link attrs or fetched page metadata).
  tabMeta: Record<string, { title?: string; icon?: string }>;
  // Move the active tab's history back/forward. Falls through to the native
  // history; the popstate/navigation handler resolves the owning tab.
  back(opts?: { tabId?: string }): void;
  forward(opts?: { tabId?: string }): void;
  canBack(tabId?: string): boolean;
  canForward(tabId?: string): boolean;

  // Methods
  navigate(url: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }): void;
  navigateByName(
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, unknown>,
    opts?: { replace?: boolean },
  ): void;
  isActive(path: string, exact?: boolean): boolean;
  buildQuery(obj: Record<string, unknown>): string;
  addRoute(route: RouteRecord): void;
  removeRoute(route: RouteRecord): void;
}

// Convert path pattern to regex (supports :param, :param?, and trailing wildcard *)
function pathToRegex(path: string): { regex: RegExp; keys: string[]; hasWildcard: boolean } {
  const keys: string[] = [];
  let hasWildcard = false;

  let pattern = path
    .replace(/:([a-zA-Z0-9_]+)\?/g, (_, key) => {
      keys.push(key);
      return '(?:/([^/]+))?';
    })
    .replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });

  // Trailing wildcard -> capture group named "wildcard"
  if (pattern.endsWith('*')) {
    hasWildcard = true;
    pattern = pattern.slice(0, -1) + '(.*)';
  } else {
    // Non-trailing wildcards degrade to "match anything" without capture
    pattern = pattern.replace(/\*/g, '.*');
  }

  return { regex: new RegExp(`^${pattern}$`), keys, hasWildcard };
}

// Fill a route pattern with params to produce a concrete path (for named nav).
function fillPath(pattern: string, params: Record<string, string | number>): string {
  let out = pattern
    .replace(/:([a-zA-Z0-9_]+)\??/g, (_, key) => {
      const v = params[key];
      return v !== undefined && v !== null ? String(v) : '';
    })
    // Collapse the trailing wildcard with a provided `wildcard` param if present.
    .replace(/\*$/, () => (params.wildcard !== undefined ? String(params.wildcard) : ''));
  // Clean up any doubled or trailing slashes introduced by empty optionals.
  out = out.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out || '/';
}

// Detect a base path from the current location when not explicitly configured.
function autoDetectBasePath(): string {
  const pathname = globalThis.location.pathname;
  const lastSlash = pathname.lastIndexOf('/');
  const lastSeg = pathname.substring(lastSlash + 1);
  if (lastSeg.includes('.')) {
    // Location points to a file (e.g. /app/index.html) -> base is the directory.
    return pathname.substring(0, lastSlash + 1);
  }
  return pathname.endsWith('/') ? pathname : pathname + '/';
}

export const routerAttributeModule: AttributeModule = {
  name: 'router-attribute',
  attribute: 'router',
  handle: (el: HTMLElement, initConfig: string, runtime: RuntimeContext) => {
    (globalThis as any).__routerInitCount = ((globalThis as any).__routerInitCount || 0) + 1;
    try {
      runtime.debug('Initializing data-router on', el);

      // Stable app base captured at init. SPA navigations mutate location.pathname,
      // so relative links would otherwise resolve against the virtual URL and
      // double the path (e.g. /_pages/_pages/...). Resolve against this instead.
      const appBase = globalThis.location.href;

      // Parse optional config object: data-router="{ mode: 'hybrid', default: '/home' }"
      let cfg: { mode?: RouterMode; default?: string } = {};
      if (initConfig && initConfig.trim()) {
        try {
          const evaluated = runtime.evaluate(el, initConfig);
          if (evaluated && typeof evaluated === 'object') {
            cfg = evaluated as typeof cfg;
          }
        } catch {
          // Non-object config (e.g. bare attribute) is fine; ignore.
        }
      }
      // Default mode is 'signal' (declared-route apps: unmatched paths -> 404),
      // preserving backward-compatible behavior. Opt into filesystem resolution
      // with mode: 'static' | 'hybrid'.
      const mode: RouterMode = cfg.mode === 'static' || cfg.mode === 'hybrid' ? cfg.mode : 'signal';
      const defaultPath = typeof cfg.default === 'string' && cfg.default ? cfg.default : null;

      // Declarative routing strategy — reactive snapshot exposed as #router.config.
      const routerConfig: RouterConfig = {
        mode,
        default: defaultPath,
        basePath,
        manifest: typeof cfg.manifest === 'string' && cfg.manifest ? cfg.manifest : undefined,
        dynamic: cfg.dynamic === true,
        shadow: cfg.shadow ?? undefined,
        notFound: typeof cfg.notFound === 'string' && cfg.notFound ? cfg.notFound : undefined,
      };

      // The specific document file the app was served from (e.g. "router.html").
      // Only this exact file collapses to "/" so SPA paths like "/404.html"
      // are not clobbered by the html-normalization rule.
      const initialFile = globalThis.location.pathname.split('/').pop() || '';

      // Resolve base path: explicit override wins, else auto-detect.
      const manualBase = document.documentElement.getAttribute('data-router.base-path');
      const basePath = manualBase !== null && manualBase !== ''
        ? (manualBase.endsWith('/') ? manualBase : manualBase + '/')
        : autoDetectBasePath();

      // Strip basePath from an incoming absolute pathname, keeping a leading slash.
      const stripBase = (pathname: string): string => {
        let p = pathname;
        if (basePath !== '/' && p.startsWith(basePath)) {
          p = p.substring(basePath.length - 1); // keep leading slash
        }
        if (!p.startsWith('/')) p = '/' + p;
        return p;
      };

      // Prepend basePath to an app-relative path for history / links.
      const applyBase = (path: string): string => {
        if (basePath === '/' || basePath === '') return path;
        if (path.startsWith('/')) return basePath + path.substring(1);
        return basePath + path;
      };

      // Normalize a (possibly browser-resolved, doubled) URL against the stable
      // app base so repeated SPA navigations don't accumulate path segments.
      const normalizeHref = (href: string): string => {
        let resolved: URL;
        try {
          resolved = new URL(href, appBase);
        } catch {
          return href;
        }
        return resolved.pathname + resolved.search + resolved.hash;
      };

      // Glob → RegExp (supports `*` and `**`; `**` matches across slashes).
      const globToRegex = (glob: string): RegExp => {
        let pattern = glob
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*\/?/g, '::globstar::')
          .replace(/\*/g, '[^/]*')
          .replace(/::globstar::/g, '.*');
        return new RegExp(`^${pattern}$`);
      };

      // Test whether a path is shadow/internal per the config's `shadow` glob(s).
      const shadowMatch = (path: string): boolean => {
        const shadows = state.config.shadow;
        if (!shadows) return false;
        const globs = Array.isArray(shadows) ? shadows : [shadows];
        return globs.some((g) => globToRegex(g).test(path));
      };

      // Build the resolved manifest: declared data-route entries + optional static
      // manifest file + dynamic scan. Internal (shadow) routes are tagged and kept
      // out of the *public* array.
      const buildManifest = async () => {
        const entries: RouteRecord[] = routeList.slice();

        const manifestUrl = state.config.manifest;
        if (manifestUrl) {
          try {
            let raw: string;
            if (runtime.fetch) {
              raw = (await runtime.fetch.request(applyBase(manifestUrl), { responseType: 'text' }, el)) as string;
            } else {
              raw = await (await fetch(applyBase(manifestUrl))).text();
            }
            const parsed = JSON.parse(raw);
            const list = Array.isArray(parsed) ? parsed : (parsed.routes ?? []);
            for (const entry of list) {
              if (!entry || typeof entry.path !== 'string') continue;
              const meta = pathToRegex(entry.path);
              const rec: RouteRecord = {
                path: entry.path,
                element: document.documentElement,
                name: entry.name,
                redirect: entry.redirect,
                layout: entry.layout,
                component: entry.component,
                meta: entry.meta,
                internal: entry.internal === true || shadowMatch(entry.path),
                source: 'manifest',
                ...meta,
              } as RouteRecord;
              (rec as any).matcher = meta.regex;
              entries.push(rec);
            }
          } catch (e) {
            reportError(new Error(`router: failed to load manifest "${manifestUrl}": ${e}`), el);
          }
        }

        // Public manifest = non-internal entries (what the app advertises).
        state.manifest = entries.filter((r) => !r.internal).slice();
        state.routes = entries.slice();
      };

      // Raw (non-reactive) route registry. RegExp matchers must never enter the
      // reactive graph, or `path.match(proxiedRegExp)` throws
      // "RegExp.prototype.hasIndices getter called on non-RegExp object".
      const routeList: RouteRecord[] = [];
      const matchMeta = new WeakMap<
        RouteRecord,
        { regex: RegExp; keys: string[]; hasWildcard: boolean }
      >();

      // 1. Create Reactive State
      // shallowReactive prevents deep proxying of HTMLElements held in routes.
      const state = runtime.shallowReactive<RouterState>({
        path: stripBase(globalThis.location.pathname),
        params: {},
        query: {},
        hash: globalThis.location.hash,
        loading: false,
        error: null,
        basePath,
        mode,
        route: null,
        layout: null,
        outlet: null,
        meta: {},
        name: null,
        previous: null,
        scrollPosition: { x: 0, y: 0 },
        currentRoute: null,
        routes: [],

        // Declarative strategy snapshot + resolved manifest.
        config: routerConfig,
        manifest: [],

        // Per-tab history bookkeeping (native history is the single store).
        activeTabId: null,
        tabPaths: {} as Record<string, string>,
        tabMeta: {} as Record<string, { title?: string; icon?: string }>,

        navigate(url: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }) {
          if (url.startsWith('http') || url.startsWith('//')) {
            globalThis.location.href = url;
            return;
          }

          const target = applyBase(url);
          const tabId = opts?.tabId ?? getActiveTabId() ?? state.activeTabId ?? null;

          // Track this tab's current path + metadata so switching the active
          // tab (or back/forward) re-renders the correct outlet.
          if (tabId) {
            state.tabPaths[tabId] = stripBase(target);
            if (opts?.title !== undefined || opts?.icon !== undefined) {
              state.tabMeta[tabId] = {
                ...(state.tabMeta[tabId] || {}),
                ...(opts?.title !== undefined ? { title: opts.title } : {}),
                ...(opts?.icon !== undefined ? { icon: opts.icon } : {}),
              };
            }
          }

          if ('navigation' in globalThis) {
            (globalThis as any).navigation.navigate(target, {
              history: opts?.replace ? 'replace' : 'push',
              state: { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon },
            });
          } else {
            const histState = { tabId, scrollY: globalThis.scrollY, title: opts?.title, icon: opts?.icon };
            if (opts?.replace) globalThis.history.replaceState(histState, '', target);
            else globalThis.history.pushState(histState, '', target);
            updateRoute(target);
          }
        },

        // Back/forward for a tab. Drives the native history; the popstate /
        // navigation handler resolves which tab the destination belongs to and
        // switches the active tab if it lands on another tab's entry.
        back(_opts?: { tabId?: string }) {
          if ('navigation' in globalThis) (globalThis as any).navigation.back();
          else globalThis.history.back();
        },
        forward(_opts?: { tabId?: string }) {
          if ('navigation' in globalThis) (globalThis as any).navigation.forward();
          else globalThis.history.forward();
        },
        canBack(_tabId?: string) {
          if ('navigation' in globalThis) {
            const nav = (globalThis as any).navigation;
            return nav && typeof nav.canGoBack === 'function' ? nav.canGoBack : true;
          }
          return globalThis.history.length > 1;
        },
        canForward(_tabId?: string) {
          if ('navigation' in globalThis) {
            const nav = (globalThis as any).navigation;
            return nav && typeof nav.canGoForward === 'function' ? nav.canGoForward : true;
          }
          return globalThis.history.length > 1;
        },

        navigateByName(name, params = {}, query, opts) {
          const route = routeList.find((r) => r.name === name);
          if (!route) {
            reportError(new Error(`navigateByName: no route named "${name}"`), el);
            return;
          }
          let target = fillPath(route.path, params);
          if (query && Object.keys(query).length) {
            target += '?' + state.buildQuery(query);
          }
          state.navigate(target, opts);
        },

        isActive(path: string, exact = false) {
          const current = state.path;
          if (exact) return current === path;
          if (path === '/') return current === '/';
          return current === path || current.startsWith(path + '/');
        },

        buildQuery(obj: Record<string, unknown>) {
          const usp = new URLSearchParams();
          for (const [k, v] of Object.entries(obj)) {
            if (v === undefined || v === null) continue;
            usp.append(k, String(v));
          }
          return usp.toString();
        },

        addRoute(route: RouteRecord) {
          runtime.debug('addRoute called with path:', route.path);
          const meta = pathToRegex(route.path);
          matchMeta.set(route, meta);
          routeList.push(route);
          state.routes = routeList.slice();
          queueMicrotask(() => {
            buildManifest();
            updateRoute(globalThis.location.href);
          });
        },

        removeRoute(route: RouteRecord) {
          const idx = routeList.indexOf(route);
          if (idx > -1) routeList.splice(idx, 1);
          matchMeta.delete(route);
          state.routes = routeList.slice();
          queueMicrotask(() => buildManifest());
        },

        // Intuitive navigate: resolve a name via the manifest, else treat the
        // target as a path. This is the friendly entrypoint for app code.
        go(target: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }) {
          if (!target) return;
          const named = routeList.find((r) => r.name === target);
          if (named) {
            state.navigateByName(target, {}, undefined, { replace: opts?.replace });
            return;
          }
          state.navigate(target, opts);
        },

        // Match a path (default: current) and return the RouteInfo the router
        // would use — without navigating. Useful for guards/preview UI.
        match(path?: string): RouteInfo | null {
          const p = path ? stripBase(path) : state.path;
          for (const route of routeList) {
            const meta = matchMeta.get(route);
            if (!meta) continue;
            const m = p.match(meta.regex);
            if (m) {
              const params: Record<string, string> = {};
              meta.keys.forEach((key: string, i: number) => { params[key] = m[i + 1] || ''; });
              if (meta.hasWildcard) params.wildcard = m[meta.keys.length + 1] || '';
              return buildInfo(route, p, params, state.query, state.hash);
            }
          }
          if (mode === 'static' || mode === 'hybrid') {
            return buildInfo(null, p, {}, state.query, state.hash);
          }
          return null;
        },

        // Render the active tab's stored path through the outlet. Used when the
        // active tab switches (layout click) or a tab is first opened.
        renderActiveTab() {
          const id = getActiveTabId();
          if (!id) return;
          let path = state.tabPaths[id];
          if (!path) {
            // Seed from current location on first paint.
            path = stripBase(globalThis.location.pathname) || '/';
            state.tabPaths[id] = path;
          }
          updateRoute(globalThis.location.origin + applyBase(path));
        },

        // Switch the active tab (also updates the layout's global signal so the
        // tab bar + panels react).
        setActiveTab(id: string) {
          setActiveTabId(id);
          state.renderActiveTab();
        },
      });

      // 2. Register Global Signal
      runtime.setGlobalSignal('#router', state);
      (globalThis as any).__routerAfterSet = (globalThis as any)._NEXUS_RUNTIME?.globalSignals?.()['#router'] ? 'present' : 'absent';
      (globalThis as any).__routerStateKeys = Object.keys(state);

      // --- Per-tab history: active tab is owned by the layout's global signal.
      // The router reads/writes `activeTabId` there so the tab bar + panels
      // (which bind `activeTabId`) and the router's outlet stay in sync.
      const globals = runtime.globalSignals() as Record<string, unknown>;
      const getActiveTabId = (): string | null =>
        (typeof globals.activeTabId === 'string' && globals.activeTabId) || null;
      const setActiveTabId = (id: string) => {
        runtime.setGlobalSignal('activeTabId', id);
      };

      // When the layout switches the active tab, re-render the outlet for it.
      // (globalSignals() is a reactive object, so watch() fires on change.)
      runtime.watch(
        () => globals.activeTabId,
        () => {
          try { state.renderActiveTab(); } catch (_e) { /* noop */ }
        },
      );

      // Track previous route for leave hooks.
      let previousInfo: RouteInfo | null = null;
      let navToken = 0;

      // Run a single hook; returns:
      //   { abort: true } when the hook returned false
      //   { redirect: string } when the hook returned a string
      //   {} otherwise
      const runHook = async (
        hook: RouteHook | undefined,
        to: RouteInfo,
        from: RouteInfo | null,
      ): Promise<{ abort?: boolean; redirect?: string }> => {
        if (!hook) return {};
        try {
          const result = await Promise.resolve(hook(to, from));
          if (result === false) return { abort: true };
          if (typeof result === 'string') return { redirect: result };
          return {};
        } catch (e) {
          state.error = { type: 'hook_error', error: e };
          reportError(e instanceof Error ? e : new Error(String(e)), el);
          return { abort: true };
        }
      };

      // Build a RouteInfo snapshot for hook consumers.
      const buildInfo = (
        route: RouteRecord | null,
        path: string,
        params: Record<string, string>,
        query: Record<string, string>,
        hash: string,
      ): RouteInfo => ({
        path,
        params,
        query,
        hash,
        name: route?.name,
        meta: route?.meta,
        component: route?.component,
        layout: route?.layout,
      });

      // Show the matched element, hide the rest. Route sections are tracked per
      // element so the matched view is only re-shown once (avoids a hidden flag
      // per record). Use reconcileStyle so visibility survives reconcile passes
      // and does not clobber other inline styles.
      const shownDisplay = new WeakMap<HTMLElement, string>();
      const commitVisibility = (matched: RouteRecord | null) => {
        routeList.forEach((r: RouteRecord) => {
          // Only section-model routes (no data-component) render inline. Routes
          // that declare a component are outlet-driven and their declaration
          // element stays hidden.
          const showable = r === matched && !r.component;
          if (showable) {
            // Capture the element's intended display once (before we ever hide it).
            if (!shownDisplay.has(r.element)) {
              const inline = r.element.style.display;
              shownDisplay.set(r.element, inline === 'none' ? '' : inline);
            }
            runtime.reconcileStyle(r.element, { display: shownDisplay.get(r.element) || '' });
          } else {
            if (!shownDisplay.has(r.element)) {
              const inline = r.element.style.display;
              shownDisplay.set(r.element, inline === 'none' ? '' : inline);
            }
            runtime.reconcileStyle(r.element, { display: 'none' });
          }
        });
      };

      // Restore scroll: saved position > hash target > top.
      const restoreScroll = (hash: string) => {
        const savedScrollY = (globalThis.history.state as any)?.scrollY;
        if (savedScrollY !== undefined && savedScrollY !== null) {
          globalThis.scrollTo(0, savedScrollY);
        } else if (hash) {
          const targetEl = document.getElementById(hash.substring(1));
          if (targetEl) targetEl.scrollIntoView();
          else globalThis.scrollTo(0, 0);
        } else {
          globalThis.scrollTo(0, 0);
        }
        state.scrollPosition = { x: globalThis.scrollX, y: globalThis.scrollY };
      };

      // Resolve a filesystem component URL for static/hybrid modes.
      // `/about` -> `<base>/about.html`; `/` -> `<base>/index.html`.
      const resolveStaticComponent = (path: string): string => {
        const rel = (path === '/' || path === '') ? '/index.html' : path.replace(/\/$/, '');
        const withExt = rel.endsWith('.html') ? rel : rel + '.html';
        return applyBase(withExt);
      };

      // 3. Update Logic (async to support awaited hooks)
      const updateRoute = async (fullPath: string) => {
        const token = ++navToken;
        const url = new URL(fullPath, globalThis.location.origin);
        let path = stripBase(url.pathname);

        if (url.hash && url.hash.startsWith('#/')) {
          path = url.hash.substring(1);
        } else if (
          !url.hash &&
          initialFile &&
          initialFile !== '404.html' &&
          path === '/' + initialFile
        ) {
          // Collapse only the served document file (e.g. /router.html) to "/".
          path = '/';
        }

        // Default route: redirect the base path to the configured default.
        if (defaultPath && path === '/' && defaultPath !== '/') {
          state.navigate(defaultPath, { replace: true });
          return;
        }

        const query: Record<string, string> = {};
        url.searchParams.forEach((val, key) => (query[key] = val));

        // Match a signal route.
        let matched: RouteRecord | null = null;
        const params: Record<string, string> = {};

        for (const route of routeList) {
          const meta = matchMeta.get(route);
          if (!meta) continue;
          const match = path.match(meta.regex);
          if (match) {
            runtime.debug(`Matched route: ${route.path} via path ${path}`);
            matched = route;
            meta.keys.forEach((key: string, i: number) => {
              params[key] = match[i + 1] || '';
            });
            if (meta.hasWildcard) {
              params.wildcard = match[meta.keys.length + 1] || '';
            }
            break;
          }
        }

        // Declarative redirect: follow route.redirect before committing.
        if (matched && matched.redirect) {
          state.navigate(matched.redirect, { replace: true });
          return;
        }

        // No signal match: try filesystem resolution in static/hybrid modes,
        // else fall back to 404. Shadow paths resolve the same way (the router's
        // internal fetch can reach them); they are simply excluded from the
        // public manifest so the client has no discoverable URL.
        let staticComponent: string | null = null;
        if (!matched) {
          const notFoundPath = state.config.notFound ?? '/404.html';
          const alreadyOn404 = path === notFoundPath || url.pathname === applyBase(notFoundPath);
          if (!alreadyOn404 && (mode === 'static' || mode === 'hybrid')) {
            staticComponent = resolveStaticComponent(path);
          } else if (!alreadyOn404) {
            // signal-only mode (or already on 404) with no match => 404.
            state.error = { type: '404', message: 'Page not found', path };
            state.navigate(notFoundPath, { replace: true });
            return;
          }
        }

        const toInfo = buildInfo(matched, path, params, query, url.hash);
        const fromRoute = state.currentRoute;
        const fromInfo = previousInfo;

        state.loading = true;

        // beforeLeave (current route).
        if (fromRoute) {
          const r = await runHook(fromRoute.beforeLeave, toInfo, fromInfo);
          if (token !== navToken) { state.loading = false; return; }
          if (r.abort) { state.loading = false; return; }
          if (r.redirect) { state.loading = false; state.navigate(r.redirect, { replace: true }); return; }
        }

        // beforeEnter (matched route).
        if (matched) {
          const r = await runHook(matched.beforeEnter, toInfo, fromInfo);
          if (token !== navToken) { state.loading = false; return; }
          if (r.abort) { state.loading = false; return; }
          if (r.redirect) { state.loading = false; state.navigate(r.redirect, { replace: true }); return; }

          // handler (matched route).
          const h = await runHook(matched.handler, toInfo, fromInfo);
          if (token !== navToken) { state.loading = false; return; }
          if (h.abort) { state.loading = false; return; }
          if (h.redirect) { state.loading = false; state.navigate(h.redirect, { replace: true }); return; }
        }

        // Final guard before committing any state.
        if (token !== navToken) { state.loading = false; return; }

        // Remember the outgoing route for `#router.previous`.
        const outgoingPrevious = fromRoute
          ? { path: state.path, meta: fromRoute.meta }
          : (previousInfo ? { path: previousInfo.path, meta: previousInfo.meta } : null);

        // Commit state.
        state.path = path;
        state.hash = url.hash;
        state.query = query;
        state.params = params;
        state.currentRoute = matched;
        state.meta = matched?.meta ?? {};
        state.name = matched?.name ?? null;
        state.previous = outgoingPrevious;

        // Publish outlet-driving signals.
        // Section-model routes (no data-component) leave `route` null and rely on
        // commitVisibility; outlet-model routes publish their component/layout URL.
        state.route = matched?.component ?? staticComponent ?? null;
        state.layout = matched?.layout ?? null;
        // Single effective outlet: prefer the layout (which contains its own
        // inner `#router.route` outlet), else render the route component directly.
        state.outlet = state.layout ?? state.route;

        // Per-tab: remember the resolved path for the active tab so switching
        // back to it (or a back/forward that lands here) re-renders correctly.
        const _at = getActiveTabId();
        if (_at) state.tabPaths[_at] = path;

        if (matched || staticComponent) {
          commitVisibility(matched); // section model (no-op visually for outlet-only)
          state.error = null;
          state.loading = false;

          restoreScroll(url.hash);

          // afterEnter / afterLeave.
          if (matched) {
            queueMicrotask(async () => {
              await runHook(matched.afterEnter, toInfo, fromInfo);
              if (fromRoute && fromRoute !== matched) {
                await runHook(fromRoute.afterLeave, toInfo, fromInfo);
              }
            });
          }

          previousInfo = toInfo;
        } else {
          // Already on /404.html but no /404.html route registered: surface error.
          state.loading = false;
          state.error = { type: '404', message: 'Page not found', path };
          commitVisibility(null);
        }
      };

      // 4. Native Navigation Interception
      const onNavigate = (e: any) => {
        if (!e.canIntercept || e.hashChange || e.downloadRequest !== null) {
          return;
        }

        const url = new URL(globalThis.location.origin + normalizeHref(e.destination.url));
        if (url.origin !== globalThis.location.origin) return;

        // Per-tab history: the destination entry carries its owning tabId. If it
        // belongs to a different (non-active) tab, switch the active tab to it
        // (real-browser interleaving of tab timelines in one history).
        const destState = e.destination?.state;
        const destTab = destState && typeof destState.tabId === 'string' ? destState.tabId : null;
        if (destTab && destTab !== getActiveTabId()) {
          setActiveTabId(destTab);
        }

        e.intercept({
          async handler() {
            await updateRoute(url.href);
          },
        });
      };

      if ('navigation' in globalThis) {
        (globalThis as any).navigation.addEventListener('navigate', onNavigate);
      }

      // Fallback: react to browser back/forward when Navigation API is absent.
      const onPopState = (event?: any) => {
        // Per-tab: resolve the owning tab from the history entry state.
        const st = event && event.state;
        const tab = st && typeof st.tabId === 'string' ? st.tabId : null;
        if (tab && tab !== getActiveTabId()) {
          setActiveTabId(tab);
        }
        updateRoute(globalThis.location.href);
      };
      const popStateEvent = `${CUSTOM_EVENT_PREFIX}popstate`;
      if (!('navigation' in globalThis)) {
        globalThis.addEventListener('popstate', onPopState);
      }
      // Custom event bridge (dispatched by the history listener module).
      document.addEventListener(popStateEvent, onPopState);

      queueMicrotask(() => {
        buildManifest();
        updateRoute(globalThis.location.href);
      });

      return () => {
        if ('navigation' in globalThis) {
          (globalThis as any).navigation.removeEventListener('navigate', onNavigate);
        }
        if (!('navigation' in globalThis)) {
          globalThis.removeEventListener('popstate', onPopState);
        }
        document.removeEventListener(popStateEvent, onPopState);
      };
    } catch (e) {
      (globalThis as any).__routerError = (e instanceof Error ? e.message : String(e)) + ' | ' + (e && (e as any).stack ? (e as any).stack.split('\n').slice(0,4).join(' <- ') : '');
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  },
};

export default routerAttributeModule;
