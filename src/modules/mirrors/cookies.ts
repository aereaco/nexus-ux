import { customRef, Ref } from '../../engine/reactivity.ts';

/**
 * _cookies Mirror
 * 
 * Reactive Proxy wrapper around document.cookie.
 * Provides simple key-value access to cookies with reactive updates.
 * 
 * Usage in directives:
 *   _cookies.theme                    — reactive read
 *   _cookies.theme = 'dark'           — set cookie (session, path=/)
 *   _cookies.set('theme', 'dark', { maxAge: 86400, path: '/' })  — set with options
 *   _cookies.delete('theme')          — remove cookie
 *   _cookies.all()                    — returns object of all cookies
 */

// Cache of reactive refs for cookie keys
const keyRefs: Map<string, Ref<unknown>> = new Map();

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

/**
 * Parse document.cookie into a key-value map.
 */
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const result: Record<string, string> = {};
  const cookieStr = document.cookie;
  if (!cookieStr) return result;
  
  cookieStr.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.substring(0, idx).trim();
    const value = decodeURIComponent(pair.substring(idx + 1).trim());
    if (key) result[key] = value;
  });
  return result;
}

/**
 * Get a single cookie value.
 */
function getCookie(key: string): string | null {
  const cookies = parseCookies();
  const val = cookies[key];
  if (isDebug()) {
    console.debug(`[_cookies] GET: '${key}' -> ${val === undefined ? 'null' : '"' + val + '"'}`);
  }
  return val ?? null;
}

interface CookieOptions {
  maxAge?: number;        // seconds
  expires?: Date | string;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
}

/**
 * Set a cookie with optional configuration.
 */
function setCookie(key: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  
  let cookieStr = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  
  if (options.maxAge !== undefined) {
    cookieStr += `; max-age=${options.maxAge}`;
  }
  if (options.expires) {
    const expStr = options.expires instanceof Date 
      ? options.expires.toUTCString() 
      : options.expires;
    cookieStr += `; expires=${expStr}`;
  }
  cookieStr += `; path=${options.path || '/'}`;
  if (options.domain) cookieStr += `; domain=${options.domain}`;
  if (options.secure) cookieStr += '; secure';
  if (options.sameSite) cookieStr += `; samesite=${options.sameSite}`;
  
  if (isDebug()) console.debug(`[_cookies] SET: ${cookieStr}`);
  document.cookie = cookieStr;
  
  // Trigger reactive update
  const r = keyRefs.get(key);
  if (r) r.value = value;
}

/**
 * Delete a cookie by setting its max-age to 0.
 */
function deleteCookie(key: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;
  if (isDebug()) console.debug(`[_cookies] DELETE: '${key}'`);
  document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=${path}`;
  
  const r = keyRefs.get(key);
  if (r) r.value = null;
}

const cookiesMirrorTarget = {
  /**
   * Set a cookie with explicit options.
   */
  set(key: string, value: string, options?: CookieOptions): void {
    setCookie(key, value, options);
  },
  
  /**
   * Delete a cookie.
   */
  delete(key: string, path?: string): void {
    deleteCookie(key, path);
  },
  
  /**
   * Get all cookies as a plain object.
   */
  all(): Record<string, string> {
    return parseCookies();
  }
};

// Create a reactive proxy
export const cookiesMirror = new Proxy(cookiesMirrorTarget as any, {
  get(target, key: string) {
    if (typeof key === 'symbol') return Reflect.get(target, key);
    
    // Return methods if they exist on the target
    if (key in target) return (target as any)[key];

    // Reactive property access — reads from document.cookie
    if (!keyRefs.has(key)) {
      const r = customRef((track, trigger) => {
        return {
          get() {
            track();
            return getCookie(key);
          },
          set(newValue: unknown) {
            const strVal = typeof newValue === 'string' ? newValue : String(newValue);
            setCookie(key, strVal);
            trigger();
          }
        };
      });
      keyRefs.set(key, r);
    }

    const r = keyRefs.get(key);
    return r ? r.value : undefined;
  },
  set(_target, key: string, value: unknown) {
    if (typeof key === 'symbol') return false;
    
    const strVal = typeof value === 'string' ? value : String(value);
    setCookie(key, strVal);
    
    // Update local ref if it exists
    const r = keyRefs.get(key);
    if (r) {
      r.value = value;
    }
    return true;
  }
});

// Poll for cookie changes (document.cookie has no native change event)
// Check every 2 seconds for external changes (e.g., server-set cookies)
if (typeof globalThis.window !== 'undefined') {
  let lastSnapshot = document.cookie;
  setInterval(() => {
    const current = document.cookie;
    if (current !== lastSnapshot) {
      lastSnapshot = current;
      // Re-trigger all tracked cookie refs
      keyRefs.forEach((r, k) => {
        const newVal = getCookie(k);
        if (r.value !== newVal) {
          r.value = newVal;
        }
      });
    }
  }, 2000);
}
