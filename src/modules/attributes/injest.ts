import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * Lightweight IndexedDB read helper for idb:// URIs.
 * Replaces the previous VFS dependency.
 */
const INJEST_DB = 'nexus-store';

function readFromIDB(key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INJEST_DB, 1);
    request.onupgradeneeded = () => {
      // Don't create stores here — if it doesn't exist, there's nothing to read
    };
    request.onsuccess = () => {
      const db = request.result;
      // Extract store name from key (first path segment)
      const storeName = key.split('/')[0] || 'files';
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        db.close();
        const result = getReq.result;
        if (!result) { resolve(null); return; }
        if (typeof result === 'string') { resolve(result); return; }
        if (result.data && typeof result.data === 'string') { resolve(result.data); return; }
        if (result.data instanceof ArrayBuffer) { resolve(new TextDecoder().decode(result.data)); return; }
        resolve(null);
      };
      getReq.onerror = () => { db.close(); reject(getReq.error); };
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * In-memory cache for ingested assets (preserves backward compatibility).
 */
const assetCache = new Map<string, string>();

/**
 * Payload type definitions for data-injest 2.0
 * 
 * Supported payload types:
 *   - link:      CSS stylesheet (backward compatible)
 *   - script:    JavaScript file (backward compatible)
 *   - pattern:   HTML structural snippet (NEW)
 *   - component: Reusable component template (NEW)
 *   - theme:     CSS theme definition (NEW)
 * 
 * All payloads support VFS URIs (idb://, fs://, http://, ws://)
 * or standard URLs for backward compatibility.
 * 
 * Examples:
 *   data-injest="{ css: { link: 'href=\'...\'' } }"
 *   data-injest="{ nav: { pattern: 'idb://patterns/navbar' } }"
 *   data-injest="{ card: { component: 'idb://components/card' } }"
 *   data-injest="{ dark: { theme: 'idb://themes/dark' } }"
 */

interface InjestPayload {
  link?: string | Record<string, string>;
  script?: string | Record<string, string>;
  pattern?: string;
  component?: string;
  theme?: string;
  type?: string;     // Script/link type attribute (e.g. 'module' for ES modules)
  target?: string;   // CSS selector for where to inject patterns/components (default: self)
  position?: 'replace' | 'prepend' | 'append' | 'before' | 'after'; // Injection position (default: 'append')
}

/**
 * Checks if a string is a VFS URI (starts with a known protocol).
 */
function isVFSUri(str: string): boolean {
  return /^(idb|fs|https?|wss?):\/\//.test(str);
}

/**
 * Resolves content from either a VFS URI or a legacy inline attribute string.
 * For VFS URIs, fetches via VFS. For legacy strings, falls back to the original
 * attribute-parsing + fetch() pipeline.
 */
async function resolveContent(uri: string): Promise<string | null> {
  if (isVFSUri(uri) && uri.startsWith('idb://')) {
    const key = uri.replace(/^idb:\/\//, '');
    return readFromIDB(key);
  }
  // Legacy: treat as a URL
  const cached = assetCache.get(uri);
  if (cached) return cached;
  try {
    const response = await fetch(uri, { mode: 'cors' });
    if (!response.ok) return null;
    const text = await response.text();
    assetCache.set(uri, text);
    return text;
  } catch {
    return null;
  }
}

/**
 * Parses an inline attribute string like "href='...' rel='stylesheet'" into
 * a key-value record. Preserves backward compatibility with v1 injest.
 */
function parseInlineAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-z-]+)=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// ─── Ingest Handlers ───────────────────────────────────────────

async function ingestLink(
  _id: string,
  rawOrObj: string | Record<string, string>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  let attrs: Record<string, string>;
  if (typeof rawOrObj === 'string') {
    attrs = parseInlineAttrs(rawOrObj);
    if (!attrs['href']) {
      attrs = { href: rawOrObj, rel: 'stylesheet' };
    }
  } else {
    attrs = rawOrObj;
  }
  const href = attrs['href'];
  if (!href) throw new Error(`Missing href attribute`);

  // Optimize: Skip VFS resolution for standard HTTP/HTTPS links to avoid CORS noise
  // Use standard <link> tag injection which is robust against CORS
  // 1. Attempt Constructable Stylesheet adoption (High Performance / ZCZS)
  if ('CSSStyleSheet' in globalThis && 'replace' in CSSStyleSheet.prototype) {
    let cssText = assetCache.get(href);
    if (!cssText) {
      const resolved = await resolveContent(href);
      if (resolved) {
        cssText = resolved;
        assetCache.set(href, cssText);
      }
    }
    if (cssText) {
      const sheet = new CSSStyleSheet();
      await sheet.replace(cssText);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      cleanupFns.push(() => {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
      });
      runtime.log(`Nexus Injest: CSS adopted (Constructable): ${href}`);
      return;
    }
  }

  // 2. Fallback: standard <link> element injection (Backward Compatibility)
  await new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    Object.keys(attrs).forEach(k => link.setAttribute(k, attrs[k]));
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Link load failed for ${href}`));
    document.head.appendChild(link);
    cleanupFns.push(() => link.remove());
  });
  runtime.log(`Nexus Injest: CSS loaded via <link>: ${href}`);
}

async function ingestScript(
  _id: string,
  rawOrObj: string | Record<string, string>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  let attrs: Record<string, string>;
  if (typeof rawOrObj === 'string') {
    attrs = parseInlineAttrs(rawOrObj);
    if (!attrs['src']) {
      attrs = { src: rawOrObj };
    }
  } else {
    attrs = rawOrObj;
  }
  const src = attrs['src'];
  if (!src) throw new Error(`Missing src attribute`);

  // Optimize: Standard HTTP/HTTPS scripts should always use tag injection to avoid CORS fetch issues
  const isExternal = src.startsWith('http');

  // VFS Resolution (idb://)
  if (!isExternal && src.startsWith('idb://')) {
    const content = await resolveContent(src);
    if (content) {
      // Inject as inline script blob
      const blob = new Blob([content], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = () => { URL.revokeObjectURL(blobUrl); resolve(); };
        script.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error(`Script load failed for VFS: ${src}`)); };
        document.head.appendChild(script);
        cleanupFns.push(() => script.remove());
      });
      runtime.log(`Nexus Injest: Script loaded from VFS: ${src}`);
      return;
    }
  }

  // Legacy: standard <script> element injection
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    
    // Set non-src attributes first to ensure type="module" is set before src triggers loading
    Object.keys(attrs).forEach(k => {
      if (k !== 'src') {
        if (k === 'type') {
          (script as HTMLScriptElement).type = attrs[k];
          script.setAttribute('type', attrs[k]);
        } else {
          script.setAttribute(k, attrs[k]);
        }
      }
    });

    if (attrs['src']) {
      script.setAttribute('src', attrs['src']);
    }

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script load failed for ${src}`));
    document.head.appendChild(script);
    cleanupFns.push(() => script.remove());
  });
  runtime.log(`Nexus Injest: Script loaded: ${src}`);
}

async function ingestPattern(
  id: string,
  uri: string,
  el: HTMLElement,
  item: InjestPayload,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  const content = await resolveContent(uri);
  if (!content) throw new Error(`Pattern not found: ${uri}`);

  const target = item.target ? (el.querySelector(item.target) as HTMLElement || el) : el;
  const position = item.position || 'append';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-injest-pattern', id);
  wrapper.innerHTML = content;

  switch (position) {
    case 'replace':
      target.innerHTML = '';
      target.appendChild(wrapper);
      break;
    case 'prepend':
      target.insertBefore(wrapper, target.firstChild);
      break;
    case 'append':
      target.appendChild(wrapper);
      break;
    case 'before':
      target.parentElement?.insertBefore(wrapper, target);
      break;
    case 'after':
      target.parentElement?.insertBefore(wrapper, target.nextSibling);
      break;
  }

  cleanupFns.push(() => wrapper.remove());
  runtime.log(`Nexus Injest [${id}]: Pattern loaded from ${uri}`);
}

async function ingestComponent(
  id: string,
  uri: string,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  const content = await resolveContent(uri);
  if (!content) throw new Error(`Component template not found: ${uri}`);

  // Parse the component HTML for <template> tags and registration metadata
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // Register each <template data-component-name="..."> as a globally available component
  const templates = doc.querySelectorAll('template[data-component-name]');
  
  if (templates.length > 0) {
    templates.forEach(template => {
      const name = template.getAttribute('data-component-name')!;
      const templateEl = document.createElement('template');
      templateEl.id = `component-${name}`;
      templateEl.innerHTML = (template as HTMLTemplateElement).innerHTML;
      document.body.appendChild(templateEl);
      cleanupFns.push(() => templateEl.remove());
      runtime.log(`Nexus Injest [${id}]: Component "${name}" registered from ${uri}`);
    });
  } else {
    // Single component — register using the id as the component name
    const templateEl = document.createElement('template');
    templateEl.id = `component-${id}`;
    templateEl.innerHTML = content;
    document.body.appendChild(templateEl);
    cleanupFns.push(() => templateEl.remove());
    runtime.log(`Nexus Injest [${id}]: Component registered from ${uri}`);
  }
}

async function ingestTheme(
  id: string,
  uri: string,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  const content = await resolveContent(uri);
  if (!content) throw new Error(`Theme not found: ${uri}`);

  // Theme content is pure CSS (custom properties, color schemes, etc.)
  if ('CSSStyleSheet' in globalThis && 'replace' in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    await sheet.replace(content);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    cleanupFns.push(() => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
    });
  } else {
    const style = document.createElement('style');
    style.setAttribute('data-injest-theme', id);
    style.textContent = content;
    document.head.appendChild(style);
    cleanupFns.push(() => style.remove());
  }
  runtime.log(`Nexus Injest [${id}]: Theme loaded from ${uri}`);
}

// ─── Module Definition ──────────────────────────────────────────

const injestModule: AttributeModule = {
  name: 'injest',
  attribute: 'injest',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let config: Record<string, InjestPayload>;

    try {
      config = runtime.evaluate(el, expression) as Record<string, InjestPayload>;
    } catch (e) {
      reportError(new Error(`Injest: Failed to evaluate configuration: ${e}`), el);
      return;
    }

    if (!config || typeof config !== 'object') return;

    const ids = Object.keys(config);
    const total = ids.length;

    // Loading state
    el.classList.add('nexus-loading');
    el.setAttribute('data-nexus-loading', '');

    const cleanupFns: Array<() => void> = [];

    // Parallel ingestion
    const ingestTasks = ids.map(async id => {
      const item = config[id];
      try {
        const itemTasks = [];
        if (item.link) itemTasks.push(ingestLink(id, item.link, cleanupFns, runtime));
        if (item.script) {
          // Promote string to object when sibling 'type' exists (e.g. type: 'module')
          const scriptPayload = (typeof item.script === 'string' && item.type)
            ? { src: item.script, type: item.type } as Record<string, string>
            : item.script;
          itemTasks.push(ingestScript(id, scriptPayload, cleanupFns, runtime));
        }
        if (item.pattern) itemTasks.push(ingestPattern(id, item.pattern, el, item, cleanupFns, runtime));
        if (item.component) itemTasks.push(ingestComponent(id, item.component, cleanupFns, runtime));
        if (item.theme) itemTasks.push(ingestTheme(id, item.theme, cleanupFns, runtime));
        await Promise.all(itemTasks);
      } catch (e) {
        reportError(new Error(`Nexus Injest [${id}]: Error ${e}`), el);
      }
    });

    const finalize = () => {
      el.classList.remove('nexus-loading');
      el.classList.add('nexus-ready');
      el.removeAttribute('data-nexus-loading');
      el.setAttribute('data-nexus-ready', '');
      el.style.opacity = '';
      runtime.log(`Nexus Injest: All ${total} asset ingestion tasks completed.`);
    };

    Promise.all(ingestTasks).then(finalize);
    
    // 5. Absolute Watchdog: Reveal page no matter what after 10s
    setTimeout(() => {
      if (el.hasAttribute('data-nexus-loading')) {
         console.warn(`[Nexus Injest] Absolute watchdog triggered after 10s. Forcefully revealing page.`);
         finalize();
      }
    }, 10000);

    if (total === 0) finalize();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }
};

export default injestModule;
