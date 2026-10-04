/**
 * Zero-allocation URL and path manipulation utilities for routing, fetch, and caching.
 */

export interface RouteMeta {
  regex: RegExp;
  keys: string[];
  hasWildcard: boolean;
}

/**
 * Extracts key-value query parameters from a URL string, search string, or URL object.
 */
export function parseQuery(queryOrUrl: string | URL): Record<string, string> {
  const query: Record<string, string> = {};
  if (!queryOrUrl) return query;
  const search = typeof queryOrUrl === 'string'
    ? (queryOrUrl.includes('?') ? queryOrUrl.slice(queryOrUrl.indexOf('?')) : (queryOrUrl.startsWith('?') ? queryOrUrl : ''))
    : queryOrUrl.search;
  if (!search) return query;
  const usp = new URLSearchParams(search);
  usp.forEach((val, key) => { query[key] = val; });
  return query;
}

/**
 * Builds a query string from a key-value object, skipping undefined and null values.
 */
export function buildQuery(obj: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

/**
 * Determines whether a URL is from the same origin as the current window or provided origin.
 */
export function isSameOriginUrl(url: string, origin?: string): boolean {
  if (typeof location === 'undefined') return true;
  const currentOrigin = origin || location.origin;
  return (!url.startsWith('http:') && !url.startsWith('https:')) || url.startsWith(currentOrigin);
}

/**
 * Converts a path pattern with :param, :param?, and trailing * wildcards into a regular expression.
 */
export function pathToRegex(path: string): RouteMeta {
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

  if (pattern.endsWith('*')) {
    hasWildcard = true;
    pattern = pattern.slice(0, -1) + '(.*)';
  } else {
    pattern = pattern.replace(/\*/g, '.*');
  }

  return { regex: new RegExp(`^${pattern}$`), keys, hasWildcard };
}

/**
 * Fills a route pattern with params to produce a concrete path.
 */
export function fillPath(pattern: string, params: Record<string, string | number>): string {
  let out = pattern
    .replace(/:([a-zA-Z0-9_]+)\??/g, (_, key) => {
      const v = params[key];
      return v !== undefined && v !== null ? String(v) : '';
    })
    .replace(/\*$/, () => (params.wildcard !== undefined ? String(params.wildcard) : ''));
  out = out.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out || '/';
}

/**
 * Matches a concrete path against a list of route records, returning the matched record and extracted params.
 * Performs canonical exact matching first, followed by parameterized regex fallback.
 */
export function matchRoute<T extends { internal?: boolean; path?: string }>(
  path: string,
  routeList: T[],
  matchMeta: WeakMap<T, RouteMeta>
): { matched: T | null; params: Record<string, string> } {
  const exact = routeList.find((r) => !r.internal && r.path && r.path === path) || null;
  if (exact) {
    return { matched: exact, params: {} };
  }

  const params: Record<string, string> = {};
  for (const route of routeList) {
    if (route.internal || !route.path) continue;
    const meta = matchMeta.get(route);
    if (!meta) continue;
    if (meta.keys.length > 0 || meta.hasWildcard) {
      const m = path.match(meta.regex);
      if (m) {
        meta.keys.forEach((key: string, i: number) => {
          params[key] = m[i + 1] || '';
        });
        if (meta.hasWildcard) {
          params.wildcard = m[meta.keys.length + 1] || '';
        }
        return { matched: route, params };
      }
    }
  }

  return { matched: null, params };
}
