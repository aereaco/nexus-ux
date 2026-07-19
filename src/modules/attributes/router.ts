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
 *  - `error` — override the single error-handling component path.
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
  // Declarative directory that clean routes resolve into (no hardcoded path).
  // e.g. '_pages' => '/profile' -> '_pages/profile.html'. Defaults to '_pages'.
  pagesDir?: string;
  // Single error-handling page for ALL errors (404 + 5xx…). The page
  // reads `#router.errorCode` ('404' for not-found, '500'/'502'/… for
  // HTTP errors) to present the right message. No separate 404 page.
  // Resolved relative to `pagesDir` when it is a bare name.
  error?: string;
}

export interface RouterState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  loading: boolean;
  error: unknown;
  // Active HTTP/server error code driving the generic error page (500/502/…).
  // Null for normal routing; the `error` config page reads this to render
  // the correct message instead of a per-code page per status.
  errorCode: string | null;
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
  // dynamic/shadow/error/basePath). Changes re-trigger a soft re-resolution.
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
   // Surface a server/HTTP error (e.g. 500/502/503/504) and render the
   // generic `error` page. Pass the code to present the right message; omit to
   // clear and return to normal routing. The `error` page reads `#router.errorCode`.
   setError(code?: string | number | null): void;
  addRoute(route: RouteRecord): void;
  removeRoute(route: RouteRecord): void;
  renderActiveTab(): void;
  setActiveTab(id: string): void;
  // Pre-warm a component's HTML into the (sticky) fetch cache so the panel
  // swap is instant when the user arrives. Driven by the predictive engine's
  // projected interaction frustum: a hovered route link's destination is
  // fetched ahead of the click. Pass an href, a name, or a component URL.
  prewarm(ref: string): void;
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
  // Honor an explicit <base href> when present — it is the authoritative
  // base for relative URLs and survives SPA deep links (the shell is served
  // at any clean path, so the location pathname is a ROUTE, not a file).
  const baseEl = document.querySelector('base[href]') as HTMLBaseElement | null;
  if (baseEl && baseEl.href) {
    try {
      const u = new URL(baseEl.href, globalThis.location.href);
      const p = u.pathname;
      return p.endsWith('/') ? p : p + '/';
    } catch { /* fall through */ }
  }
  const pathname = globalThis.location.pathname;
  const lastSlash = pathname.lastIndexOf('/');
  const lastSeg = pathname.substring(lastSlash + 1);
  if (lastSeg.includes('.')) {
    // Location points to a file (e.g. /app/index.html) -> base is the directory.
    return pathname.substring(0, lastSlash + 1);
  }
  // A clean route (e.g. /profile) is NOT a base directory — the SPA shell
  // is served at "/", so the base stays root. Otherwise deep links would
  // double the route segment into every outgoing navigation/asset URL.
  return '/';
}

export const routerAttributeModule: AttributeModule = {
  name: 'router-attribute',
  attribute: 'router',
  handle: (el: HTMLElement, initConfig: string, runtime: RuntimeContext) => {
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

      // The specific document file the app was served from (e.g. "router.html").
      // Only this exact file collapses to "/" so SPA paths like "/404.html"
      // are not clobbered by the html-normalization rule.
      const initialFile = globalThis.location.pathname.split('/').pop() || '';

      // Resolve base path: explicit override wins, else auto-detect.
      const manualBase = document.documentElement.getAttribute('data-router.base-path');
      const basePath = manualBase !== null && manualBase !== ''
        ? (manualBase.endsWith('/') ? manualBase : manualBase + '/')
        : autoDetectBasePath();

      // Declarative routing strategy — reactive snapshot exposed as #router.config.
      // The `_pages` folder path is NOT hardcoded: `pagesDir` (default '_pages')
      // drives every filesystem resolution below.
      const pagesDir = typeof cfg.pagesDir === 'string' && cfg.pagesDir
        ? cfg.pagesDir.replace(/\/+$/, '')
        : '_pages';

      // Resolve a bare page name against `pagesDir`; pass-through absolute URLs.
      // Relative refs are returned with a leading slash so they compare equal to
      // `path` (which is always slash-led after stripBase) and to the
      // base-applied URL used in the `alreadyOnError` / `onErrorPage` checks.
      const resolvePagesPath = (ref: string | undefined, fallback: string): string => {
        const raw = ref && ref.trim() ? ref.trim() : fallback;
        if (raw.startsWith('/') || raw.startsWith('http')) return raw;
        return `/${pagesDir}/${raw.replace(/^\/+/, '')}`;
      };

      // Single error-handling page for 404 + 5xx. No separate 404 page.
      const errorPage = resolvePagesPath(cfg.error, 'error.html');

      const routerConfig: RouterConfig = {
        mode,
        default: defaultPath,
        basePath,
        manifest: typeof cfg.manifest === 'string' && cfg.manifest ? cfg.manifest : undefined,
        dynamic: cfg.dynamic === true,
        shadow: cfg.shadow ?? undefined,
        pagesDir,
        error: errorPage,
      };

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
        errorCode: null,
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

        // Render the active tab's stored path through the outlet. Tab switching
        // uses a direct synchronous state commit — it skips ALL lifecycle hooks
        // (beforeLeave, beforeEnter, handler, afterEnter) to avoid cascading
        // re-renders and clobbering.
        renderActiveTab() {
          const id = getActiveTabId();
          if (!id) return;
          let path = state.tabPaths[id];
          if (!path) {
            // Seed from current location on first paint.
            path = stripBase(globalThis.location.pathname) || '/';
            state.tabPaths[id] = path;
          }

          if (path === 'custom-component') {
            // Component-based tab (e.g. new-tab launchpad): clear routing state.
            state.route = null;
            state.layout = null;
            publishOutlet(null);
            // The panel now derives its component from the active tab's own
            // `content` field (same source as the tab header), so no parallel
            // `outletContent` signal is needed here.
            const _ct = (globals.tabs as any[])?.find((t: any) => t.id === id);
            // Keep browser URL, just sync the tabId in history.
            const url = globalThis.location.pathname + globalThis.location.search + globalThis.location.hash;
            suppressNavIntercept = true;
            globalThis.history.replaceState({ tabId: id, scrollY: globalThis.scrollY }, '', url);
            suppressNavIntercept = false;
            return;
          }

          // --- Synchronous state commit for tab switch ---
          // Parse path/query/hash from the stored tab path.
          const fakeUrl = new URL(applyBase(path), globalThis.location.origin);
          const switchPath = path;
          const query: Record<string, string> = {};
          fakeUrl.searchParams.forEach((val, key) => (query[key] = val));

          // Match a route record synchronously.
          let matched: RouteRecord | null = null;
          const params: Record<string, string> = {};
          for (const route of routeList) {
            const meta = matchMeta.get(route);
            if (!meta) continue;
            const m = switchPath.match(meta.regex);
            if (m) {
              matched = route;
              meta.keys.forEach((key: string, i: number) => { params[key] = m[i + 1] || ''; });
              if (meta.hasWildcard) params.wildcard = m[meta.keys.length + 1] || '';
              break;
            }
          }

          // Resolve static component for hybrid/static modes if no signal match.
          let staticComponent: string | null = null;
          if (!matched && (mode === 'static' || mode === 'hybrid')) {
            staticComponent = resolveStaticComponent(switchPath);
          }

          // Commit display state directly — no hooks, no loading flag.
          state.path = switchPath;
          state.hash = fakeUrl.hash;
          state.query = query;
          state.params = params;
          state.currentRoute = matched;
          state.meta = matched?.meta ?? {};
          state.name = matched?.name ?? null;
          state.route = matched?.component ?? staticComponent ?? null;
          state.layout = matched?.layout ?? null;
          publishOutlet(state.layout ?? state.route);
          state.error = null;

          // The panel derives its component from the dedicated `outlet` global
          // (kept in lockstep via publishOutlet), so no other write is needed.

          commitVisibility(matched);

          // Update browser address bar to reflect the active tab's path.
          const target = applyBase(switchPath);
          const meta = state.tabMeta[id] || {};
          suppressNavIntercept = true;
          globalThis.history.replaceState(
            { tabId: id, scrollY: globalThis.scrollY, title: meta.title, icon: meta.icon },
            '',
            target,
          );
          suppressNavIntercept = false;
        },

        // Switch the active tab (also updates the layout's global signal so the
        // tab bar + panels react).
        setActiveTab(id: string) {
          setActiveTabId(id);
          state.renderActiveTab();
        },

        // Surface a server/HTTP error and render the generic `error` page.
        // A numeric/string code (500/502/503/504…) is published to
        // `#router.errorCode` so a single error page can present the right
        // message. Omit or pass null to clear the error and resume routing.
        setError(code?: string | number | null) {
          if (code === undefined || code === null || code === '') {
            state.error = null;
            state.errorCode = null;
            return;
          }
          const c = String(code);
          state.error = { type: c === '404' ? '404' : 'http', code: c, message: `Error ${c}` };
          state.errorCode = c;
          const errPath = state.config.error ?? resolvePagesPath(undefined, 'error.html');
          const onErr = globalThis.location.pathname === applyBase(errPath);
          if (!onErr) {
            state.navigate(errPath, { replace: true });
          }
        },

        // Map an href / name / component URL to its component file URL and
        // fire a (de-duplicated, sticky-cached) fetch so the panel swap is
        // instant on arrival. Driven by the predictive engine for hover-intent
        // pre-warming, and at boot for the known route surface.
        prewarm(ref: string) {
          if (!ref) return;
          // 1) Already a component URL?
          let url: string | null = null;
          if (ref.startsWith('_') || ref.startsWith('/_')) {
            url = applyBase(ref.replace(/^\/+/, ''));
          } else {
            // 2) Named route?
            const named = routeList.find((r) => r.name === ref);
            if (named?.component) {
              url = applyBase(named.component.replace(/^\/+/, ''));
            } else {
              // 3) Resolve as a clean path under pagesDir (same as navigation).
              try {
                const resolved = resolveStaticComponent(stripBase(ref));
                // Only warm if it actually maps to a declared route component.
                const maps = routeList.some((r) =>
                  r.component && r.component.endsWith(resolved.replace(/^\/+/, '')),
                );
                if (maps) url = resolved;
              } catch { /* noop */ }
            }
          }
          if (!url) return;
          // Fire into the sticky fetch cache; dedup is handled by fetchCache key.
          try {
            runtime.fetch.request(url, { responseType: 'text' }, el);
          } catch { /* noop */ }
        },
      });

      // 2. Register Global Signal
      // Stored under the bare key `router`; expressions reference it via `#router`
      // (the evaluator rewrites `#name` -> `__global.name`, stripping the `#`).
      runtime.setGlobalSignal('router', state);

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
      // Guard against re-entrant calls (e.g. commitTabSwitch writing activeTabId).
      let tabSwitching = false;
      runtime.watch(
        () => globals.activeTabId,
        () => {
          if (tabSwitching) return;
          try { state.renderActiveTab(); } catch (_e) { /* noop */ }
        },
      );

      // Suppress the Navigation API `navigate` intercept while WE drive history
      // via replaceState (tab switch / launchpad activation). Without this, our
      // internal replaceState would be re-intercepted and run updateRoute(),
      // which overwrites the new/active tab's tabPaths sentinel (e.g.
      // 'custom-component') with the previous page's path — clobbering the
      // freshly opened new-tab launchpad with the prior tab's content.
      let suppressNavIntercept = false;

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
      // The `_pages` folder is NOT hardcoded — it comes from `config.pagesDir`
      // (default '_pages'), so `/profile` -> `_pages/profile.html`, `/` -> index.
        const resolveStaticComponent = (path: string): string => {
          const dir = (state.config.pagesDir || '').replace(/^\/+|\/+$/g, '');
          const rel = (path === '/' || path === '') ? '/index.html' : path.replace(/\/$/, '');
          const withExt = rel.endsWith('.html') ? rel : rel + '.html';
          const full = dir ? `/${dir}${withExt}` : withExt;
          return applyBase(full);
        };

        // Mirror the resolved outlet into the bare `outlet` global signal, the
        // single source of truth the content panel binds to. Written
        // synchronously for every navigation (normal route + error page), so
        // the panel is always in lockstep with the tab header.
        const publishOutlet = (url: string | null) => {
          state.outlet = url;
          runtime.setGlobalSignal('outletContent', url);
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
          // Only collapse when the served document is an actual HTML file
          // (e.g. /router.html). A clean route like /profile must NOT be
          // collapsed to "/", or deep links lose their path.
          /\.html?$/i.test(initialFile) &&
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
        // else fall back to the declaratively configured error pages. Shadow
        // paths resolve the same way (the router's internal fetch can reach
        // them); they are simply excluded from the public manifest so the
        // client has no discoverable URL.
        let staticComponent: string | null = null;
        // Single error-handling page (404 + 5xx) declared via `error`.
        const errorPage = state.config.error ?? resolvePagesPath(undefined, 'error.html');
        const alreadyOnError = path === errorPage
          || url.pathname === applyBase(errorPage);

        if (!matched) {
          if (!alreadyOnError && (mode === 'static' || mode === 'hybrid')) {
            // Try to resolve a real page under `pagesDir` for this clean path.
            const candidate = resolveStaticComponent(path);
            // Only treat it as found if the path actually maps to a known page:
            // a clean route like /profile resolves to _pages/profile.html which is
            // a declared data-route target; unknown clean paths fall through to 404.
            const known = routeList.some((r) => {
              if (r.component && r.component.endsWith(candidate.replace(/^\/+/, ''))) return true;
              return false;
            });
            if (known) {
              staticComponent = candidate;
            } else if (path === '/' || path === '') {
              staticComponent = resolveStaticComponent('/');
            } else {
              // Unknown clean path -> render the 404 page.
              state.error = { type: '404', message: 'Page not found', path };
              state.errorCode = null;
              state.errorCode = '404';
              state.navigate(errorPage, { replace: true });
              return;
            }
          } else if (!alreadyOnError) {
            // signal-only mode (or already on an error page) with no match => 404.
            state.errorCode = '404';
            state.navigate(errorPage, { replace: true });
            return;
          }
        }

        const toInfo = buildInfo(matched, path, params, query, url.hash);
        const fromRoute = state.currentRoute;
        const fromInfo = previousInfo;

        // --- Synchronous outlet commit (paint-first) ---
        // Publish the resolved outlet signals IMMEDIATELY so the content panel
        // stays in lockstep with the tab header. The panel derives its
        // component from the active tab's own `content` field (the same
        // `tabs[]` object that supplies the header's title/icon), so no
        // parallel `outletContent` signal is written here — the header and
        // body read the SAME source and update on the same tick. Lifecycle
        // hooks below only govern navigation control (abort / redirect).
        const resolvedComponent = matched?.component ?? staticComponent ?? null;
        state.route = resolvedComponent;
        state.layout = matched?.layout ?? null;
        publishOutlet(state.layout ?? state.route);
        state.path = path;
        state.error = null;
        state.errorCode = null;

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

        // Commit remaining state.
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
        publishOutlet(state.layout ?? state.route);

        // Per-tab: remember the resolved path for the active tab so switching
        // back to it (or a back/forward that lands here) re-renders correctly.
        const _at = getActiveTabId();
        if (_at) {
          // Guard custom-component tabs (e.g. a freshly opened new-tab
          // launchpad). A concurrent/delayed updateRoute — including the boot
          // microtask — resolves the browser URL and would otherwise clobber
          // the launchpad's content with `_pages/home.html`. Leave such tabs
          // alone so their `custom-component` content persists.
          const tabs = (globals.tabs as any[]) || [];
          const atIdx = tabs.findIndex((t: any) => t.id === _at);
           // A tab whose stored path is the 'custom-component' sentinel (e.g. a
           // freshly opened new-tab launchpad) must NOT have its content swapped
           // by a concurrent/delayed updateRoute, AND its sentinel must be
           // preserved: overwriting it with the resolved URL path here would make
           // the very next updateRoute fail the guard and clobber the launchpad.
           // Leave the sentinel intact while the launchpad is showing.
           if (atIdx >= 0 && state.tabPaths[_at] === 'custom-component') {
             // Preserve the sentinel; do not overwrite with the resolved path.
           } else {
          state.tabPaths[_at] = path;
          const nextRoute = matched?.component ?? staticComponent ?? null;
          const idx = tabs.findIndex((t: any) => t.id === _at);
          if (idx >= 0 && nextRoute) {
            const cur = tabs[idx].content;
            const meta = state.tabMeta[_at] || {};
            const nextTitle = meta.title || (nextRoute === '_pages/home.html' ? 'Home' : (nextRoute === '_pages/settings.html' ? 'Settings' : (nextRoute === '_pages/profile.html' ? 'Profile' : (nextRoute === errorPage ? (state.errorCode ? 'Error ' + state.errorCode : 'Error') : 'Tab'))));
            const nextIcon = meta.icon || (nextRoute === '_pages/home.html' ? 'material-symbols-light:home-outline' : (nextRoute === '_pages/settings.html' ? 'material-symbols-light:settings-outline' : (nextRoute === '_pages/profile.html' ? 'material-symbols-light:person-outline' : 'material-symbols-light:article-outline')));
            if (cur !== nextRoute || tabs[idx].title !== nextTitle || tabs[idx].icon !== nextIcon) {
              const nt = tabs.slice();
              nt[idx] = { ...nt[idx], content: nextRoute, title: nextTitle, icon: nextIcon };
              runtime.setGlobalSignal('tabs', nt);
            }
          }
          }
        }

        if (matched || staticComponent) {
          commitVisibility(matched); // section model (no-op visually for outlet-only)
          state.error = null;
          state.errorCode = null;
          state.loading = false;

          restoreScroll(url.hash);

          // Update recent path list directly (excluding error page and internal tools).
          if (path && path !== '/index.html' && path !== errorPage && !path.startsWith('/_internal/')) {
            const recent = (globals.recent as any[]) || [];
            const labels: Record<string, string> = {
              '/': 'Home',
              '/settings': 'Settings',
              '/profile': 'Profile',
              '/_internal/admin-console': 'Internal Console'
            };
            const title = labels[path] || path.replace(/^\//, '').replace(/-/g, ' ');
            const entry = { path, title };
            const next = [entry, ...recent.filter((r: any) => r.path !== path && r.path !== '/index.html')].slice(0, 5);
            runtime.setGlobalSignal('recent', next);
          }


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
          // Nothing resolved for this path. If we are NOT already on a declared
          // error page, route to the appropriate one. A known server error code
          // takes the generic `error` page (which reads #router.errorCode to
          // present 500/502/503/504…); otherwise the 404 page.
          const onErrorPage = path === errorPage || url.pathname === applyBase(errorPage);

          state.loading = false;
          // `errorCode` is '404' for not-found, or the HTTP code (500/502/…)
          // for server errors — a single page handles both via #router.errorCode.
          state.error = { type: state.errorCode ?? '404', message: 'Page not found', path };

          // When already on the error page, render its component directly (rather
          // than recursing) so `state.route` reflects it and the outlet / tab
          // sync effect can display it. The page itself switches copy by code.
          if (onErrorPage) {
            staticComponent = errorPage;
            commitVisibility(null);
            state.route = staticComponent;
            publishOutlet(staticComponent);
          } else {
            state.navigate(errorPage, { replace: true });
          }

        }
      };

      // 4. Native Navigation Interception
      const onNavigate = (e: any) => {
        if (suppressNavIntercept) return;
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
        if (destTab && destState) {
          if (destState.title !== undefined || destState.icon !== undefined) {
            state.tabMeta[destTab] = {
              ...(state.tabMeta[destTab] || {}),
              ...(destState.title !== undefined ? { title: destState.title } : {}),
              ...(destState.icon !== undefined ? { icon: destState.icon } : {}),
            };
          }
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
        if (tab && st) {
          if (st.title !== undefined || st.icon !== undefined) {
            state.tabMeta[tab] = {
              ...(state.tabMeta[tab] || {}),
              ...(st.title !== undefined ? { title: st.title } : {}),
              ...(st.icon !== undefined ? { icon: st.icon } : {}),
            };
          }
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
        // Predictive pre-warm: ahead-of-click cache of every declared route's
        // component HTML. The first (cold) navigation is then as instant as a
        // revisit, because the sticky fetch cache already holds the file.
        for (const r of routeList) {
          if (r.component) state.prewarm(r.component);
        }
        // Also warm the error page so any failure renders immediately.
        state.prewarm(state.config.error ?? resolvePagesPath(undefined, 'error.html'));
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
      reportError(e instanceof Error ? e : new Error(String(e)), el);
    }
  },
};

export default routerAttributeModule;
