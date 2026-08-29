/**
 * Nexus-UX Router Directive Module
 *
 * Handles `data-router` for client-side routing. Initializes the #router
 * signal, manages navigation, and supports section/outlet rendering models.
 *
 * Rendering Paradigms:
 *   - Section model: `<element data-route="/x">` with children; matched
 *     element shown via reconcileStyle(display)
 *   - Outlet model: `<element data-component="#router.route">` renders
 *     component reactively when signal changes
 *
 * Capabilities:
 *   - Native Navigation API interception with History fallback
 *   - Per-route lifecycle hooks: beforeLeave, beforeEnter, handler,
 *     afterEnter, afterLeave (async-awaited; false aborts, string redirects)
 *   - Declarative redirect via route.redirect
 *   - Routing modes: 'signal' (default) | 'static' | 'hybrid'
 *   - Default route: `data-router="{ default: '/home' }"`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Route config is a plain object; no cloning.
 *   - Zero-serialization: DOM updates via reconcileStyle/morphDOM by reference.
 *
 * Coordination:
 *   - evaluator.ts resolves #router.route in expression scope
 *   - component.ts renders outlet components reactively
 *   - stylesheet.ts adopts route-specific styles
 *   - ModuleCoordinator registers via registerAttributeModule
 *
 * Nexus-UX Innovations Preserved:
 *   - Signal-based routing with reactive outlet binding
 *   - Hybrid static/signal routing mode
 *   - Lifecycle hook system with abort/redirect support
 */

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

export interface DiscoveredPage {
  href: string;
  title: string;
  icon?: string;
  tabTitle: string;
  tabIcon?: string;
  path?: string;
  parent?: string | null;
  children?: DiscoveredPage[];
  meta?: Record<string, any>;
}

export interface PageTab {
  id: string;
  source: string;
  route?: string;
  meta?: Record<string, any>;
  linkedContent?: any;
}

export interface RouterConfig {
  mode: RouterMode;
  default: string | null;
  basePath: string;
  // URL of a static auto-route manifest (JSON array of route descriptors).
  manifest?: string;
  // When true, fold runtime-discovered routes into #router.manifest.
  dynamic?: boolean;
  // Declarative component/page to load for new page tabs.
  newPageTab?: string;
  // Default index page filename inside pagesDir (e.g. 'home.html').
  index?: string;
  // Declarative directory that clean routes resolve into (no hardcoded path).
  // e.g. '_pages' => '/profile' -> '_pages/profile.html'. Defaults to '_pages'.
  pagesDir?: string;
  // Single error-handling page for ALL errors (404 + 5xx…).
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
  errorCode: string | null;
  basePath: string;
  mode: RouterMode;
  // Outlet-driving signals (component URLs) + metadata.
  route: string | null;
  layout: string | null;
  outlet: string | null;
  meta: unknown;
  name: string | null;
  previous: { path: string; meta: unknown } | null;
  scrollPosition: { x: number; y: number };
  currentRoute: RouteRecord | null;
  routes: RouteRecord[];
  pages: DiscoveredPage[];
  discoverPages(): Promise<void>;
  lineage: Array<{ title: string; href: string; icon?: string }>;
  getLineage(targetHref?: string): Array<{ title: string; href: string; icon?: string }>;
  setPageMeta(meta: { title?: string; icon?: string; parent?: string }): void;
  config: RouterConfig;
  manifest: RouteRecord[];
  match(path?: string): RouteInfo | null;
  go(target: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }): void;

  // --- First-Class Page Tab Workspaces ---
  pageTabs: PageTab[];
  activePageTabId: string | null;
  pinnedPageTabs: string[];
  tabSeq: number;
  activePageTab: PageTab | null;
  createPageTab(source?: string, route?: string): void;
  switchPageTab(id: string): void;
  closePageTab(id: string): void;
  duplicatePageTab(id: string): void;
  pinPageTab(id: string): void;

  // --- Per-tab history (woven into the native browser history) ---
  activeTabId: string | null;
  tabPaths: Record<string, string>;
  tabMeta: Record<string, { title?: string; icon?: string }>;
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
      let cfg: {
        signal?: string;
        mode?: RouterMode;
        default?: string;
        pagesDir?: string;
        manifest?: string;
        dynamic?: boolean;
        shadow?: string | string[];
        error?: string;
        routes?: Array<{
          id?: string;
          name?: string;
          route?: string;
          path?: string;
          protected?: boolean;
          redirect?: string;
          layout?: string;
          meta?: unknown;
        }>;
      } = {};
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
              if (!entry || typeof entry !== 'object') continue;
              const routePath = entry.route !== undefined ? entry.route : (entry.path || '/');
              const compPath = entry.path || entry.component || '';
              const id = entry.id || entry.name || '';
              const isInternal = entry.internal === true || !routePath || shadowMatch(routePath) || shadowMatch(compPath);
              const meta = pathToRegex(routePath || '/');
              const rec: RouteRecord = {
                path: routePath,
                element: document.documentElement,
                name: id,
                redirect: entry.redirect,
                layout: entry.layout,
                component: compPath,
                meta: {
                  title: entry.title,
                  icon: entry.icon,
                  order: entry.order,
                  ...(entry.meta || {}),
                },
                internal: isInternal,
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
        for (const rec of entries) {
          if (!routeList.some((r) => r.path === rec.path && r.name === rec.name)) {
            routeList.push(rec);
            if ((rec as any).matcher) {
              matchMeta.set(rec, { regex: (rec as any).matcher, keys: (rec as any).keys || [], hasWildcard: (rec as any).hasWildcard || false });
            }
          }
        }
      };

      // Raw (non-reactive) route registry. RegExp matchers must never enter the
      // reactive graph, or `path.match(proxiedRegExp)` throws
      // "RegExp.prototype.hasIndices getter called on non-RegExp object".
      const routeList: RouteRecord[] = [];
      const matchMeta = new WeakMap<
        RouteRecord,
        { regex: RegExp; keys: string[]; hasWildcard: boolean }
      >();

      if (Array.isArray(cfg.routes)) {
        for (const r of cfg.routes) {
          if (r && (r.route || r.path)) {
            const path = r.route || r.path || '/';
            const meta = pathToRegex(path);
            const rec: RouteRecord = {
              path,
              element: el,
              name: r.id || r.name,
              redirect: r.redirect,
              layout: r.layout,
              component: r.path || r.component,
              meta: r.meta,
              source: 'declared',
              ...meta
            } as RouteRecord;
            (rec as any).matcher = meta.regex;
            matchMeta.set(rec, meta);
            routeList.push(rec);
          }
        }
      }

      const initialRoutes = routeList.map((r) => ({
        id: r.name || r.path,
        name: r.name,
        route: r.path,
        path: r.component || r.path,
        meta: r.meta || {},
        layout: r.layout,
      }));

      const resolveStaticComponent = (path: string): string => {
        const clean = path.replace(/^\/+/, '');
        if (clean.startsWith('_internal/') || clean.startsWith('_pages/')) {
          const withExt = clean.endsWith('.html') ? clean : clean + '.html';
          return applyBase('/' + withExt);
        }
        const dir = (routerConfig.pagesDir || pagesDir || '_pages').replace(/^\/+|\/+$/g, '');
        const defaultIndex = routerConfig.index || cfg.index || 'home.html';
        const rel = (path === '/' || path === '') ? `/${defaultIndex}` : (path.startsWith('/') ? path : '/' + path);
        const withExt = rel.endsWith('.html') ? rel : rel + '.html';
        const full = dir ? `/${dir}${withExt}` : withExt;
        return applyBase(full);
      };

      // Build a RouteInfo snapshot for hook consumers and matchers.
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

      const initialPath = stripBase(globalThis.location.pathname) || '/';
      const initialMatched = routeList.find((r) => r.path === initialPath);
      const initialSource = initialMatched?.component || resolveStaticComponent(initialPath);

      // 1. Create Reactive State
      // shallowReactive prevents deep proxying of HTMLElements held in routes.
      const state: RouterState = runtime.shallowReactive<RouterState>({
        path: initialPath,
        params: {},
        query: {},
        hash: globalThis.location.hash,
        loading: false,
        error: null,
        errorCode: null,
        basePath,
        mode,
        route: initialSource,
        layout: initialMatched?.layout ?? null,
        outlet: initialSource,
        meta: initialMatched?.meta || {},
        name: initialMatched?.name ?? null,
        previous: null,
        scrollPosition: { x: 0, y: 0 },
        currentRoute: initialMatched || null,
        routes: initialRoutes,
        pages: [] as DiscoveredPage[],

        async discoverPages() {
          const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
          if (!fetchFn) return;

          const pDir = (state.config.pagesDir || pagesDir || '_pages').replace(/^\/+|\/+$/g, '');
          const manifestUrl = state.config.manifest || `/${pDir}/manifest.json`;
          const dirUrl = `/${pDir}/`;
          let rawList: any[] = [];

          // 1. Try fetching manifest.json
          try {
            const manifestRes = await fetchFn(applyBase(manifestUrl));
            if (manifestRes && manifestRes.ok) {
              const json = await manifestRes.json();
              if (Array.isArray(json)) {
                rawList = json;
              } else if (Array.isArray(json.routes)) {
                rawList = json.routes;
              }
            }
          } catch {
            /* ignore manifest fetch error */
          }

          // 2. If no manifest, try directory index
          if (rawList.length === 0) {
            try {
              const dirRes = await fetchFn(applyBase(dirUrl));
              if (dirRes && dirRes.ok) {
                const dirHtml = await dirRes.text();
                const doc = new DOMParser().parseFromString(dirHtml, 'text/html');
                const links = Array.from(doc.querySelectorAll('a[href]'));
                const validExts = ['.html', '.htm', '.md', '.markdown'];
                for (const a of links) {
                  const hrefAttr = a.getAttribute('href') || '';
                  const fname = hrefAttr.split('/').pop()?.split('?')[0] || '';
                  if (fname && validExts.some((ext) => fname.endsWith(ext)) && !rawList.some((e) => (typeof e === 'string' ? e : e.path)?.endsWith(fname))) {
                    rawList.push(fname);
                  }
                }
              }
            } catch {
              /* ignore directory fetch error */
            }
          }

          const discovered: DiscoveredPage[] = [];

          if (rawList.length > 0) {
            for (const item of rawList) {
              const isObj = typeof item === 'object' && item !== null;
              if (isObj && (item.internal === true || item.route === '' || item.id === 'admin' || item.id === 'error')) {
                continue;
              }

              const fname = isObj ? (item.path?.split('/').pop() || item.id || '') : item;
              const cleanName = isObj ? (item.id || item.name || fname.replace(/\.(html|htm|md|markdown)$/i, '')) : fname.replace(/\.(html|htm|md|markdown)$/i, '');
              const href = isObj ? (item.route !== undefined ? item.route : (cleanName === 'home' ? '/' : `/${cleanName}`)) : ((cleanName === 'home' || cleanName === 'index') ? '/' : `/${cleanName}`);
              const compPath = isObj ? (item.path || `/${pDir}/${fname}`) : `/${pDir}/${fname}`;
              let title = isObj ? (item.title || item.meta?.title || '') : '';
              let icon = isObj ? (item.icon || item.meta?.icon || '') : '';
              const order = isObj ? (item.order !== undefined ? item.order : item.meta?.order) : undefined;
              const parent = isObj ? (item.parent !== undefined ? item.parent : (item.meta?.parent !== undefined ? item.meta.parent : (href === '/' ? null : '/'))) : (href === '/' ? null : '/');

              const defaultTitle = href === '/'
                ? 'Home'
                : href.replace(/^\/+/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const finalTitle = title || defaultTitle;
              const finalIcon = icon || (parent ? undefined : 'material-symbols-light:article-outline');

              // Parse children if declared in manifest
              const children: DiscoveredPage[] = [];
              if (isObj && Array.isArray(item.children)) {
                for (const ch of item.children) {
                  const chObj = typeof ch === 'object' && ch !== null;
                  const chName = chObj ? (ch.id || ch.name || ch.title || '') : ch;
                  const chHref = chObj ? (ch.route || `/${chName}`) : `/${chName}`;
                  const chPath = chObj ? (ch.path || `/${pDir}/${chName}.html`) : `/${pDir}/${chName}.html`;
                  const chTitle = chObj ? (ch.title || chName) : chName;
                  const chParent = chObj ? (ch.parent || href) : href;

                  children.push({
                    href: chHref,
                    title: chTitle,
                    tabTitle: chTitle,
                    path: chPath,
                    parent: chParent,
                    meta: { title: chTitle, parent: chParent }
                  } as DiscoveredPage);

                  // Register route in state.routes if not already present
                  if (!state.routes.find((r) => r.path === chHref)) {
                    state.routes.push({
                      path: chHref,
                      component: chPath,
                      name: chName,
                      meta: { title: chTitle, parent: chParent }
                    } as any);
                  }
                }
              }

              discovered.push({
                href,
                title: finalTitle,
                icon: finalIcon || '',
                tabTitle: finalTitle,
                tabIcon: finalIcon || '',
                path: compPath,
                parent,
                children: children.length > 0 ? children : undefined,
                meta: { title: finalTitle, icon: finalIcon, order, parent }
              });

              // Dynamically register route in state.routes if not already present
              const existing = state.routes.find((r) => r.path === href);
              if (!existing) {
                state.routes.push({
                  path: href,
                  component: compPath,
                  name: cleanName,
                  meta: { title: finalTitle, icon: finalIcon, order, parent }
                } as any);
              }
            }

            // Assemble parent-child tree hierarchy
            const rootPages: DiscoveredPage[] = [];
            for (const p of discovered) {
              if (p.parent && p.parent !== '/' && p.parent !== '') {
                const parentRoute = p.parent.startsWith('/') ? p.parent : '/' + p.parent;
                const parentPage = discovered.find((x) => x.href === parentRoute);
                if (parentPage) {
                  parentPage.children = parentPage.children || [];
                  if (!parentPage.children.some((c) => c.href === p.href)) {
                    parentPage.children.push(p);
                  }
                  continue;
                }
              }
              rootPages.push(p);
            }

            // Sort root pages by declared order priority (numeric ascending), then alphabetical fallback
            rootPages.sort((a: any, b: any) => {
              const aOrder = a.meta?.order;
              const bOrder = b.meta?.order;
              if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
              if (aOrder !== undefined) return -1;
              if (bOrder !== undefined) return 1;
              return (a.title || a.href).localeCompare(b.title || b.href);
            });
            discovered.length = 0;
            discovered.push(...rootPages);
          } else {
            // Fallback to routeList if neither manifest nor directory listing was available
            const publicRoutes = routeList.filter((r) => {
              const p = r.path || '';
              const comp = r.component || '';
              if (p.startsWith('/_internal') || comp.startsWith('/_internal') || comp.startsWith('_internal/')) return false;
              if (r.name === 'error' || r.name === 'admin' || (r as any).protected) return false;
              return true;
            });

            for (const r of publicRoutes) {
              const href = r.path || '/';
              const compPath = r.component || (href === '/' ? `/${pDir}/home.html` : `/${pDir}/${href.replace(/^\/+/, '')}.html`);
              let title = r.meta?.title;
              let icon = r.meta?.icon;

              try {
                const res = await fetchFn(compPath);
                if (res && res.ok) {
                  const html = await res.text();
                  const doc = new DOMParser().parseFromString(html, 'text/html');
                  const t = doc.querySelector('title')?.textContent?.trim();
                  const ic = doc.querySelector('meta[name="icon"]')?.getAttribute('content')?.trim();
                  if (t) title = t;
                  if (ic) icon = ic;
                }
              } catch {
                /* ignore */
              }

              const defaultTitle = href === '/' ? 'Home' : href.replace(/^\/+/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const finalTitle = title || defaultTitle;
              const finalIcon = icon || 'material-symbols-light:article-outline';

              discovered.push({
                href,
                title: finalTitle,
                icon: finalIcon,
                tabTitle: finalTitle,
                tabIcon: finalIcon,
                path: compPath,
                parent: href === '/' ? null : '/',
                meta: { title: finalTitle, icon: finalIcon, parent: href === '/' ? null : '/' }
              });
            }
          }

          state.pages = discovered;
          state.lineage = state.getLineage(state.route || state.path);
        },

        lineage: [] as Array<{ title: string; href: string; icon?: string }>,
        getLineage(targetHref?: string): Array<{ title: string; href: string; icon?: string }> {
          const raw = targetHref || state.path || state.route || '/';
          const currentHref = raw.startsWith('/_pages/') ? (raw.replace('/_pages/', '/').replace(/\.html$/, '') === '/home' ? '/' : raw.replace('/_pages/', '/').replace(/\.html$/, '')) : raw;
          const chain: Array<{ title: string; href: string; icon?: string }> = [];
          const visited = new Set<string>();

          let curr: string | null = currentHref;
          while (curr && !visited.has(curr)) {
            visited.add(curr);
            let found: any = state.pages.find((p) => p.href === curr || p.path === curr);
            if (!found) {
              for (const p of state.pages) {
                if (p.children) {
                  const ch = p.children.find((c) => c.href === curr || c.path === curr);
                  if (ch) { found = ch; break; }
                }
              }
            }
            if (!found) {
              found = state.routes.find((r) => r.path === curr);
            }
            if (!found && curr === state.route) {
              found = state.activePageTab;
            }

            const title = found?.tabTitle || found?.title || found?.meta?.title || (curr === '/' ? 'Home' : curr.replace(/^\/+/, '').replace(/\.html$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));
            const icon = found?.tabIcon || found?.icon || found?.meta?.icon || (curr === '/' ? 'material-symbols-light:home-outline' : undefined);
            const parent = found?.parent !== undefined ? found.parent : (found?.meta?.parent !== undefined ? found.meta.parent : (curr === '/' ? null : '/'));

            chain.unshift({ title, href: curr, icon });

            if (!parent || curr === '/' || parent === curr) {
              break;
            }
            curr = parent;
          }

          if (chain.length > 0 && chain[0].href !== '/') {
            const homePage = state.pages.find((p) => p.href === '/');
            chain.unshift({
              title: homePage?.title || 'Home',
              href: '/',
              icon: homePage?.icon || 'material-symbols-light:home-outline'
            });
          }

          return chain.length > 0 ? chain : [{ title: 'Home', href: '/', icon: 'material-symbols-light:home-outline' }];
        },

        setPageMeta(meta: { title?: string; icon?: string; parent?: string }) {
          if (state.activePageTab) {
            state.activePageTab.meta = { ...state.activePageTab.meta, ...meta };
            if (meta.title) (state.activePageTab as any).tabTitle = meta.title;
            if (meta.icon) (state.activePageTab as any).tabIcon = meta.icon;
          }
          state.lineage = state.getLineage(state.path);
        },

        // Declarative strategy snapshot + resolved manifest.
        config: routerConfig,
        manifest: [],

        // --- First-Class Page Tab Workspaces ---
        pageTabs: [
          {
            id: 'tab-0',
            source: initialSource,
            route: initialPath,
            meta: (initialMatched?.meta as Record<string, any>) || {},
            isLoading: true
          }
        ] as PageTab[],
        activePageTabId: 'tab-0',
        pinnedPageTabs: [] as string[],
        tabSeq: 0,
        get activePageTab(): PageTab | null {
          return (this as any).pageTabs?.find((t: PageTab) => t && t.id === (this as any).activePageTabId) || null;
        },
        createPageTab(source?: string, route?: string) {
          state.tabSeq++;
          const id = 'tab-' + state.tabSeq;
          const src = source || state.config.newPageTab || '_components/tab-new.html';
          const r = route !== undefined ? route : (src.startsWith('_components/') ? '' : src);
          state.pageTabs = [...state.pageTabs, { id, source: src, route: r, meta: {}, isLoading: true }];
          state.activePageTabId = id;
          state.tabPaths[id] = src.startsWith('_components/') ? 'custom-component' : (r || src);
          state.setActiveTab(id);
        },
        switchPageTab(id: string) {
          state.activePageTabId = id;
          state.setActiveTab(id);
          const tab = state.pageTabs.find((t: PageTab) => t.id === id);
          if (tab && tab.route && typeof globalThis.history !== 'undefined') {
            globalThis.history.replaceState({ pageTabId: id, tabId: id }, '', tab.route);
          }
        },
        closePageTab(id: string) {
          const wasActive = state.activePageTabId === id;
          state.pageTabs = state.pageTabs.filter((t: PageTab) => t.id !== id);
          state.pinnedPageTabs = state.pinnedPageTabs.filter((p: string) => p !== id);
          if (wasActive && state.pageTabs.length > 0) {
            state.switchPageTab(state.pageTabs[0].id);
          }
        },
        duplicatePageTab(id: string) {
          const srcTab = state.pageTabs.find((t: PageTab) => t.id === id);
          if (!srcTab) return;
          state.tabSeq++;
          const newId = 'tab-' + state.tabSeq;
          const source = srcTab.source;
          const route = srcTab.route || '';
          state.tabPaths[newId] = source.startsWith('_components/') ? 'custom-component' : (state.tabPaths[id] || route);
          state.pageTabs = [...state.pageTabs, { id: newId, source, route, meta: { ...(srcTab.meta || {}) }, isLoading: true }];
          state.activePageTabId = newId;
          state.setActiveTab(newId);
        },
        pinPageTab(id: string) {
          if (state.pinnedPageTabs.includes(id)) {
            state.pinnedPageTabs = state.pinnedPageTabs.filter((p: string) => p !== id);
          } else {
            state.pinnedPageTabs = [...state.pinnedPageTabs, id];
          }
        },

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
          const tabId = opts?.tabId ?? getActiveTabId() ?? state.activePageTabId ?? state.activeTabId ?? null;
          const cleanPath = stripBase(target);
          const matched = routeList.find((r) => r.path === cleanPath || r.path === url);
          const isShadow = matched?.internal || shadowMatch(cleanPath);

          // Track this tab's current path + metadata so switching the active
          // tab (or back/forward) re-renders the correct outlet.
          if (tabId) {
            state.tabPaths[tabId] = cleanPath;
            if (opts?.title !== undefined || opts?.icon !== undefined) {
              state.tabMeta[tabId] = {
                ...(state.tabMeta[tabId] || {}),
                ...(opts?.title !== undefined ? { title: opts.title } : {}),
                ...(opts?.icon !== undefined ? { icon: opts.icon } : {}),
              };
            }
          }

          // ZCZS: update active tab's source/route directly via the reactive proxy
          const _activeId = tabId || state.activePageTabId || getActiveTabId();
          if (_activeId && state.tabPaths[_activeId] !== 'custom-component') {
            const resolvedSource = matched?.component || resolveStaticComponent(cleanPath);
            // 1. Sync router.pageTabs
            const curPageTab = state.pageTabs.find((t: PageTab) => t.id === _activeId);
            if (curPageTab) {
              if (curPageTab.source !== resolvedSource) {
                curPageTab.source = resolvedSource;
                if (curPageTab.linkedContent) {
                  curPageTab.linkedContent.isLoading = true;
                }
              }
              if (curPageTab.route !== cleanPath) curPageTab.route = cleanPath;
              state.pageTabs = [...state.pageTabs];
            }

            // 2. Sync globals.tabs (backward compatibility)
            const _tabs = (runtime.globalSignals ? runtime.globalSignals() : {}).tabs as any[];
            if (Array.isArray(_tabs)) {
              const _tab = _tabs.find((t: any) => t.id === _activeId);
              if (_tab) {
                if (_tab.source !== resolvedSource) _tab.source = resolvedSource;
                if (_tab.route !== cleanPath) _tab.route = cleanPath;
              }
            }
          }

          if (isShadow) {
            // Shadow routes resolve and render in memory but NEVER pollute the address bar
            updateRoute(target);
            return;
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

        isActive(path: string, exact = false): boolean {
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

        // Intuitive navigate: resolve an ID/name via the manifest or route registry.
        go(target: string, opts?: { replace?: boolean; tabId?: string; title?: string; icon?: string }) {
          if (!target) return;
          const named = routeList.find((r) => r.name === target || r.path === target) ||
            (Array.isArray(state.routes) ? (state.routes as any[]).find((r: any) => r.name === target || r.id === target || r.path === target) : null);
          if (!named) {
            reportError(new Error(`router.go: no route with id "${target}"`), el);
            return;
          }
          if (named.internal || !named.path || named.path === '') {
            const _activeId = opts?.tabId ?? getActiveTabId() ?? state.activePageTabId ?? state.activeTabId ?? null;
            if (_activeId) {
              const comp = named.component || named.path;
              const curPageTab = state.pageTabs.find((t: PageTab) => t.id === _activeId);
              if (curPageTab) {
                curPageTab.source = comp;
                if (named.meta?.title || named.meta?.icon || named.name) {
                  curPageTab.meta = {
                    title: named.meta?.title || curPageTab.meta?.title || named.name,
                    icon: named.meta?.icon || curPageTab.meta?.icon,
                  };
                }
                state.pageTabs = [...state.pageTabs];
              }
            }
            return;
          }
          state.navigate(named.path || named.route, opts);
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

          // Update browser address bar to reflect the active tab's path (unless shadow route).
          if (!matched?.internal && !shadowMatch(switchPath)) {
            const target = applyBase(switchPath);
            const meta = state.tabMeta[id] || {};
            suppressNavIntercept = true;
            globalThis.history.replaceState(
              { tabId: id, scrollY: globalThis.scrollY, title: meta.title, icon: meta.icon },
              '',
              target,
            );
            suppressNavIntercept = false;
          }
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
          // Publish the code so the single dynamic /error page can present
          // 404/500/502/… copy via #router.errorCode. The address bar
          // just shows the clean /error route — a normal route like any
          // other, so no _pages/ path is ever leaked.
          state.errorCode = String(code);
          const onErr = globalThis.location.pathname === applyBase('/error');
          if (!onErr) {
            state.navigate('/error', { replace: true });
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
      const routerSignalName = cfg.signal || 'router';
      runtime.setGlobalSignal(routerSignalName, state);

      // Flush any declared routes queued before router initialized
      const pendingRoutes = (runtime as any)._pendingDeclaredRoutes as any[] | undefined;
      if (pendingRoutes && pendingRoutes.length > 0) {
        pendingRoutes.forEach((rec) => state.addRoute(rec));
        (runtime as any)._pendingDeclaredRoutes = [];
      }

      // Automatically discover public pages and extract metadata
      state.discoverPages();

      // --- Per-tab history: active tab is owned by the layout's global signal.
      // The router reads/writes `activePageTabId` there so the tab bar + panels
      // (which bind `activePageTabId`) and the router's outlet stay in sync.
      const globals = runtime.globalSignals() as Record<string, unknown>;
      const getActiveTabId = (): string | null =>
        (typeof globals.activePageTabId === 'string' && globals.activePageTabId) ||
        (typeof globals.activeTabId === 'string' && globals.activeTabId) || null;
      const setActiveTabId = (id: string) => {
        runtime.setGlobalSignal('activePageTabId', id);
        runtime.setGlobalSignal('activeTabId', id);
      };

      // When the layout switches the active tab, re-render the outlet for it.
      // (globalSignals() is a reactive object, so watch() fires on change.)
      // Guard against re-entrant calls (e.g. commitTabSwitch writing activePageTabId).
      let tabSwitching = false;
      runtime.watch(
        () => globals.activePageTabId || globals.activeTabId,
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

      // Show the matched element, hide the rest. Route sections are tracked per
      // element so the matched view is only re-shown once (avoids a hidden flag
      // per record). Use reconcileStyle so visibility survives reconcile passes
      // and does not clobber other inline styles.
      const shownDisplay = new WeakMap<HTMLElement, string>();
      const commitVisibility = (matched: RouteRecord | null) => {
        routeList.forEach((r: RouteRecord) => {
          // Never hide root document or body element
          if (!r.element || r.element === document.documentElement || r.element === document.body) {
            return;
          }
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

      // Publish the resolved component URL into state.outlet. The content
      // panel binds to tabs[].content (driven by the layout's data-effect
      // sync), so this is the router-internal state used by renderActiveTab
      // and any outlet-model consumer (`data-component="#router.outlet"`).
      const publishOutlet = (url: string | null) => {
        state.outlet = url;
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

        // Direct URL access protection for wallgarden shadow routes
        if (matched && matched.internal && path !== '/') {
          const isDirectAddressBarNav = !suppressNavIntercept && typeof globalThis.location !== 'undefined' &&
            stripBase(globalThis.location.pathname) === matched.path;
          if (isDirectAddressBarNav) {
            state.navigate('/error', { replace: true });
            return;
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
        // Single dynamic error page (404 + 5xx alike). It is a NORMAL
        // route (/error -> _pages/error.html) so any unresolved path
        // routes to it exactly like any other route — the address bar
        // shows the clean /error URL and the page reads #router.errorCode
        // to present 404/500/… copy. No leaked _pages/ path, no special
        // 404 branch in the bar.
        const errorPage = state.config.error ?? resolvePagesPath(undefined, 'error.html');
        const cleanErrorPath = '/error';
        const alreadyOnError = path === cleanErrorPath
          || url.pathname === applyBase(cleanErrorPath);

        if (!matched) {
          if (!alreadyOnError && (mode === 'static' || mode === 'hybrid')) {
            // Try to resolve a real page under `pagesDir` for this clean path.
            const candidate = resolveStaticComponent(path);
            if (isAllowedStaticCandidate(candidate, path)) {
              let exists = false;
              try {
                const res = await fetch(candidate, { method: 'HEAD' });
                if (res.ok) {
                  exists = true;
                } else if (res.status === 405) {
                  // Fallback for servers that reject HEAD
                  const getRes = await fetch(candidate, { method: 'GET' });
                  if (getRes.ok) exists = true;
                }
              } catch {
                exists = false;
              }

              if (exists) {
                staticComponent = candidate;
              } else {
                state.errorCode = 404;
                state.navigate(cleanErrorPath, { replace: true });
                return;
              }
            } else {
              // Forbidden/disallowed path traversal or non-pagesDir directory -> 404 error page.
              state.errorCode = 404;
              state.navigate(cleanErrorPath, { replace: true });
              return;
            }
          } else if (!alreadyOnError) {
            // signal-only mode (or already on an error page) with no match => /error.
            state.errorCode = 404;
            state.navigate(cleanErrorPath, { replace: true });
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
        // Clear transient error state on any NORMAL route, but preserve
        // it when the matched route IS the error page (it reads
        // #router.errorCode to present 404/500/… copy).
        if (path !== cleanErrorPath && url.pathname !== applyBase(cleanErrorPath)) {
          state.error = null;
          state.errorCode = null;
        }

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
        state.lineage = state.getLineage(path);
        // Single effective outlet: prefer the layout (which contains its own
        // inner `#router.route` outlet), else render the route component directly.
        publishOutlet(state.layout ?? state.route);

        // Per-tab: remember the resolved path for the active tab so switching
        // back to it (or a back/forward that lands here) re-renders correctly.
        const _at = state.activePageTabId || getActiveTabId();
        if (_at) {
          const isCustomComp = state.tabPaths[_at] === 'custom-component';
          if (!isCustomComp) {
            state.tabPaths[_at] = path;
            const resolvedSource = matched?.component ?? staticComponent ?? null;
            if (resolvedSource) {
              // 1. Sync first-class router.pageTabs
              const curPageTab = state.pageTabs.find((t) => t.id === _at);
              if (curPageTab) {
                if (curPageTab.source !== resolvedSource) curPageTab.source = resolvedSource;
                if (curPageTab.route !== path) curPageTab.route = path;
                const routeMeta = matched?.meta as Record<string, string> | undefined;
                if (routeMeta?.title || routeMeta?.icon) {
                  curPageTab.meta = { ...(curPageTab.meta || {}), ...routeMeta };
                }
                state.pageTabs = [...state.pageTabs];
              }

              // 2. Backward compatibility: sync globals.tabs
              const tabs = (globals.tabs as any[]) || [];
              const atIdx = tabs.findIndex((t: any) => t.id === _at);
              if (atIdx >= 0) {
                const cur = tabs[atIdx];
                if (cur.source !== resolvedSource) cur.source = resolvedSource;
                if (cur.route !== path) cur.route = path;
                const routeMeta = matched?.meta as Record<string, string> | undefined;
                if (routeMeta?.title || routeMeta?.icon) {
                  cur.meta = { ...(cur.meta || {}), ...routeMeta };
                }
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
            const curTab = state.pageTabs.find((t) => t.id === _at);
            const routeTitle = curTab?.meta?.title || (curTab?.linkedContent?.meta)?.title || matched?.meta?.title || path.replace(/^\//, '').replace(/-/g, ' ');
            const routeIcon = curTab?.meta?.icon || (curTab?.linkedContent?.meta)?.icon || (matched?.meta as any)?.icon || 'material-symbols-light:article-outline';
            const entry = { path, title: routeTitle, icon: routeIcon };
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
          // Nothing resolved. This is only reached when already sitting on the
          // /error route (it IS a declared route, so it matches via `matched`
          // on arrival). Render its component directly so state.route + the
          // outlet/tab-sync effect can display it; the page switches copy
          // by #router.errorCode. Never re-navigate (would recurse).
          state.loading = false;
          const onErrorPage = path === cleanErrorPath
            || url.pathname === applyBase(cleanErrorPath);
          if (onErrorPage) {
            staticComponent = errorPage;
            commitVisibility(null);
            state.route = staticComponent;
            publishOutlet(staticComponent);
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
        const destTab = destState && (typeof destState.pageTabId === 'string' ? destState.pageTabId : (typeof destState.tabId === 'string' ? destState.tabId : null));
        if (destTab && destTab !== state.activePageTabId) {
          state.switchPageTab(destTab);
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
        const tab = st && (typeof st.pageTabId === 'string' ? st.pageTabId : (typeof st.tabId === 'string' ? st.tabId : null));
        if (tab && tab !== state.activePageTabId) {
          state.switchPageTab(tab);
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

      queueMicrotask(async () => {
        await buildManifest();
        await state.discoverPages();
        updateRoute(globalThis.location.href);
      });

      // Reactive synchronization of extracted metadata into the global recent signal list
      runtime.effect(() => {
        const activeTab = state.activePageTab;
        if (!activeTab || !activeTab.route || activeTab.route.startsWith('/_internal')) return;
        const meta = activeTab.meta || activeTab.linkedContent?.meta;
        const title = meta?.title;
        const icon = meta?.icon;
        if (title || icon) {
          const globals = runtime.globalSignals ? runtime.globalSignals() : {};
          const recent = (globals.recent as any[]) || [];
          const idx = recent.findIndex((r: any) => r.path === activeTab.route);
          if (idx >= 0 && (recent[idx].title !== title || recent[idx].icon !== icon)) {
            const updated = [...recent];
            updated[idx] = {
              ...updated[idx],
              title: title || updated[idx].title,
              icon: icon || updated[idx].icon || 'material-symbols-light:article-outline',
            };
            runtime.setGlobalSignal('recent', updated);
          }
        }
      });

      // Reactive synchronization of active page tab title to the native browser window/tab title
      runtime.effect(() => {
        const activeTab = state.activePageTab;
        if (!activeTab || typeof document === 'undefined') return;
        const meta = activeTab.meta || activeTab.linkedContent?.meta;
        const title = meta?.title
          || (activeTab.source?.includes('tab-new.html') ? 'New Tab' : '')
          || (activeTab.route && activeTab.route !== '/' ? activeTab.route.replace(/^\//, '').replace(/-/g, ' ') : '')
          || 'Nexus-UX';
        if (title && document.title !== title) {
          document.title = title;
        }
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
