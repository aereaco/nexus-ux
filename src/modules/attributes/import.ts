import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/debug.ts';
import { readIDB } from '../../engine/utils/idb.ts';
import { stylesheet, discoverColorTokens, buildTailwindThemeBridge, markExternalStylesSettled } from './stylesheet.ts';

/**
 * Lightweight IndexedDB read helper for idb:// URIs.
 * Replaces the previous VFS dependency.
 */
async function readFromIDB(key: string): Promise<string | null> {
  const storeName = key.split('/')[0] || 'files';
  const result = await readIDB(storeName, key);
  
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (result.data && typeof result.data === 'string') return result.data;
  if (result.data instanceof ArrayBuffer) return new TextDecoder().decode(result.data);
  return null;
}

/**
 * In-memory cache for imported assets (preserves backward compatibility).
 */
const assetCache = new Map<string, string>();

/**
 * Payload type definitions for data-import 2.0
 * 
 * Supported payload types:
 *   - link:      CSS stylesheet (url, array, or object with href)
 *   - script:    JavaScript file (url, array, or object with src)
 *   - pattern:   HTML structural snippet (url)
 *   - component: Reusable component template (url)
 *   - theme:     CSS theme definition (url, alias for external link)
 * 
 * Target/Position Schema (for patterns/components):
 *   - target:    Selector to inject into (default: current element)
 *   - position:  'replace' | 'prepend' | 'append' | 'before' | 'after'
 * 
 * Attributes Schema:
 *   - Any other key (async, defer, type) is applied to the script/link tag.
 */

interface ImportPayload {
  link?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>;
  adopt?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>;
  script?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>;
  style?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>;
  theme?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>; 
  pattern?: string;
  component?: string;
  type?: string;     
  target?: string;   
  position?: 'replace' | 'prepend' | 'append' | 'before' | 'after';
}

/**
 * Checks if a string is a VFS URI (starts with a known protocol).
 */
function isVFSUri(str: string): boolean {
  return /^(idb|fs|https?|wss?):\/\//.test(str);
}

/**
 * Custom fetch wrapper with a timeout.
 * Prevents network requests from blocking page loading in sandboxed or offline contexts.
 */
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 3000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Resolves content from either a VFS URI or a legacy inline attribute string.
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
    const response = await fetchWithTimeout(uri, { mode: 'cors', timeout: 3000 });
    if (!response.ok) return null;
    const text = await response.text();
    assetCache.set(uri, text);
    return text;
  } catch {
    return null;
  }
}

/**
 * Parses an inline attribute string like "href='...' rel='stylesheet'".
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

/**
 * Optimized attribute applier for injected elements.
 */
function applyAttributes(el: HTMLElement | HTMLLinkElement | HTMLScriptElement | HTMLStyleElement, attrs: Record<string, string | boolean | number>) {
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'content' || key === 'innerText' || key === 'textContent' || key === 'href' || key === 'src') return;
    if (value === true) el.setAttribute(key, '');
    else if (value === false) el.removeAttribute(key);
    else el.setAttribute(key, String(value));
  });
}

// ─── Import Handlers ───────────────────────────────────────────

/**
 * link: — Creates a real <link rel="stylesheet"> DOM tag.
 * The stylesheet is visible in document.styleSheets, making it compatible
 * with third-party tools such as @tailwindcss/browser, browser DevTools, etc.
 * Awaits the onload event so subsequent imports (e.g. Tailwind script) are
 * guaranteed to run only after the stylesheet is fully parsed.
 */
async function importLink(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  const tasks = items.map(async (item) => {
    let attrs: Record<string, string | boolean | number>;
    if (typeof item === 'string') {
      const parsed = parseInlineAttrs(item);
      attrs = parsed.href ? parsed : { href: item, rel: 'stylesheet' };
    } else {
      attrs = item as Record<string, string | boolean | number>;
    }

    const href = attrs.href as string;
    if (!href) return;

    if (attrs.rel === 'stylesheet' || !attrs.rel) {
      const cssText = await resolveContent(href);
      if (cssText) {
        const cleanup = await stylesheet.adoptRawCSS(cssText, `import-${id}-${href}`);
        cleanupFns.push(cleanup);
        runtime.log(`Nexus Import [${id}]: CSS adopted (raw): ${href}`);
        return;
      }
    }

    // Fallback: Legacy link tag with load waiting
    await new Promise<void>((resolve) => {
      const link = document.createElement('link');
      applyAttributes(link, attrs);
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => {
        reportError(new Error(`Nexus Import: Failed to load ${href}`), el);
        resolve();
      };
      document.head.appendChild(link);
      cleanupFns.push(() => link.remove());
      runtime.log(`Nexus Import [${id}]: Link tag injected: ${href}`);
    });
  });
  await Promise.all(tasks);
}

/**
 * adopt: — Fetches CSS content and adopts it as a constructable CSSStyleSheet.
 * The sheet lives in document.adoptedStyleSheets (ZCZS-native, Nexus-scoped).
 * It is NOT visible in document.styleSheets — use link: when third-party
 * stylesheet scanners (e.g. @tailwindcss/browser) need to read it.
 */
async function importAdopt(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  _el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  const tasks = items.map(async (item) => {
    let href: string;
    if (typeof item === 'string') {
      href = item;
    } else {
      href = (item as Record<string, string | boolean | number>).href as string;
    }
    if (!href) return;

    const cssText = await resolveContent(href);
    if (!cssText) return;

    const cleanup = await stylesheet.adoptRawCSS(cssText, `import-adopt-${id}-${href}`);
    cleanupFns.push(cleanup);
    runtime.log(`Nexus Import [${id}]: CSS adopted (constructable): ${href}`);
  });
  await Promise.all(tasks);
}

async function importScript(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  const tasks = items.map(async (item) => {
    let attrs: Record<string, string | boolean | number> = typeof item === 'string' ? { src: item } : (item as Record<string, string | boolean | number>);
    if (typeof item === 'string' && !attrs.src) {
        attrs = parseInlineAttrs(item);
        if (!attrs.src) attrs = { src: item };
    }
    
    const src = attrs.src as string;
    if (!src) return;

    // Handle VFS/IDB for scripts
    let finalSrc = src;
    if (src.startsWith('idb://')) {
        const content = await resolveContent(src);
        if (content) {
            const blob = new Blob([content], { type: (attrs.type as string) || 'text/javascript' });
            const url = URL.createObjectURL(blob);
            finalSrc = url;
            cleanupFns.push(() => URL.revokeObjectURL(url));
        }
    }

    // When loading @tailwindcss/browser, auto-inject a Tailwind @theme bridge
    // built from CSS custom color properties discovered in currently-applied stylesheets.
    if (src.includes('tailwindcss/browser') && !document.querySelector('style[data-nexus-tailwind-bridge]')) {
        const tokens = discoverColorTokens();
        const bridge = buildTailwindThemeBridge(tokens);
        if (bridge) {
            const bridgeStyle = document.createElement('style');
            bridgeStyle.setAttribute('type', 'text/tailwindcss');
            bridgeStyle.setAttribute('data-nexus-tailwind-bridge', '');
            bridgeStyle.textContent = bridge;
            document.head.appendChild(bridgeStyle);
            cleanupFns.push(() => bridgeStyle.remove());
            runtime.log(`Nexus Import [${id}]: Tailwind theme bridge injected (${tokens.size} color tokens discovered)`);
        }
    }

    await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        applyAttributes(script, attrs);
        script.onload = () => resolve();
        script.onerror = () => {
            reportError(new Error(`Nexus Import: Failed to load script ${src}`), el);
            resolve();
        };
        script.src = finalSrc;
        document.head.appendChild(script);
        cleanupFns.push(() => script.remove());
        runtime.log(`Nexus Import [${id}]: Script injected: ${src}`);
    });
  });
  await Promise.all(tasks);
}

async function importStyle(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  const tasks = items.map(async (item) => {
    const attrs: Record<string, string | boolean | number> = typeof item === 'string' ? { content: item } : item;
    const content = (attrs.content as string) || (typeof item === 'string' ? item : '');
    
    if (!content && !attrs.href) return;

    // If it's a link-like theme, delegate to importLink
    if (attrs.href) {
        await importLink(id, attrs as Record<string, string | boolean | number>, cleanupFns, runtime, el);
        return;
    }

    // Resolve content if it's a VFS URI
    const cssText = isVFSUri(content) ? await resolveContent(content) : content;
    if (!cssText) return;

    // ZCZS Mandate: Constructable Stylesheets via StyleSheetManager
    const cleanup = await stylesheet.adoptCSS(cssText, `import-style-${id}`);
    cleanupFns.push(cleanup);
    runtime.log(`Nexus Import [${id}]: Style adopted (ZCZS)`);
  });
  await Promise.all(tasks);
}

async function importPattern(
  id: string,
  uri: string,
  el: HTMLElement,
  item: ImportPayload,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  const content = await resolveContent(uri);
  if (!content) throw new Error(`Pattern not found: ${uri}`);

  const target = item.target ? (el.querySelector(item.target) as HTMLElement || el) : el;
  const position = item.position || 'append';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-import-pattern', id);
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
  runtime.log(`Nexus Import [${id}]: Pattern loaded from ${uri}`);
}

async function importComponent(
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
      runtime.log(`Nexus Import [${id}]: Component "${name}" registered from ${uri}`);
    });
  } else {
    // Single component — register using the id as the component name
    const templateEl = document.createElement('template');
    templateEl.id = `component-${id}`;
    templateEl.innerHTML = content;
    document.body.appendChild(templateEl);
    cleanupFns.push(() => templateEl.remove());
    runtime.log(`Nexus Import [${id}]: Component registered from ${uri}`);
  }
}

// ─── Module Definition ──────────────────────────────────────────

// Synchronously inject a global FOUC preflight stylesheet for any [data-import] elements
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-nexus-fouc', '');
  style.textContent = `
    /* FOUC guard: keep the document hidden until Nexus-UX has adopted the
       external stylesheets declared via [data-import]. The gate is released
       (nexus-ready / nexus-loading removed) only after imports resolve. */
    html.nexus-loading,
    [data-nexus-loading],
    [data-import]:not(.nexus-ready),
    body[data-nexus-fouc-pending] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

const importModule: AttributeModule = {
  name: 'import',
  attribute: 'import',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    // Differential update state
    let activeCleanup: (() => void) | null = null;
    let lastConfigStr = '';

    const stopEffect = runtime.effect(() => {
      // data-import
      const attrExpr = el.getAttribute('data-import') || expression;
      const config = runtime.evaluate(el, attrExpr) as Record<string, ImportPayload>;
      const configStr = JSON.stringify(config);
      
      // Optimization: Skip if config hasn't changed
      if (configStr === lastConfigStr) return;
      lastConfigStr = configStr;

      // Clean up previous iteration
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }

      // Unhide the FOUC gate. The `nexus-ready` class is added here (and ONLY
      // here), so the document stays hidden (via the [data-import]:not(.nexus-ready)
      // FOUC rule) until external stylesheets are adopted. Always invoked — even
      // for empty/invalid configs — so the gate never strands the page hidden.
      const finalize = () => {
        el.classList.remove('nexus-loading');
        el.classList.add('nexus-ready');
        el.removeAttribute('data-nexus-loading');
        el.setAttribute('data-nexus-ready', '');
        runtime.log(`Nexus Import: Assets synchronized.`);
        // External stylesheets are now adopted + applied — let the Tailwind JIT
        // rebuild its theme bridge so utilities for their color tokens exist.
        markExternalStylesSettled();
      };

      // Loading state — gate the FOUC-unhide until imports resolve.
      el.classList.add('nexus-loading');
      el.setAttribute('data-nexus-loading', '');

      if (!config || typeof config !== 'object') {
        finalize();
        return;
      }

      const ids = Object.keys(config);
      if (ids.length === 0) {
        finalize();
        return;
      }

      const iterationCleanupFns: Array<() => void> = [];
      activeCleanup = () => iterationCleanupFns.forEach(fn => fn());

      // Process packages sequentially in declaration order.
      // This is intentional: users declare dependencies first (e.g. DaisyUI before Tailwind)
      // and each package must be fully loaded before the next one starts.
      // Parallel loading would cause race conditions where scripts (e.g. @tailwindcss/browser)
      // initialize before stylesheet dependencies (e.g. DaisyUI) are available in document.styleSheets.
      const runImports = async () => {
        const tasks = ids.map(async (id) => {
          const item = config[id];
          try {
            const itemTasks = [];

            // link: — real <link> DOM tags, visible to document.styleSheets
            if (item.link) {
                itemTasks.push(importLink(id, item.link, iterationCleanupFns, runtime, el));
            }

            // adopt: — constructable CSSStyleSheet (ZCZS-native, Nexus-scoped)
            if (item.adopt) {
                itemTasks.push(importAdopt(id, item.adopt, iterationCleanupFns, runtime, el));
            }

            // Scripts
            if (item.script) {
                itemTasks.push(importScript(id, item.script, iterationCleanupFns, runtime, el));
            }

            // Styles / Themes (Unified)
            const stylePayload = item.style || item.theme;
            if (stylePayload) {
                itemTasks.push(importStyle(id, stylePayload, iterationCleanupFns, runtime, el));
            }

            // Patterns & Components (Legacy/Existing)
            if (item.pattern) itemTasks.push(importPattern(id, item.pattern, el, item, iterationCleanupFns, runtime));
            if (item.component) itemTasks.push(importComponent(id, item.component, iterationCleanupFns, runtime));

            await Promise.all(itemTasks);
          } catch (e) {
            reportError(new Error(`Nexus Import [${id}]: Error ${e}`), el);
          }
        });
        await Promise.all(tasks);
      };

      runImports().then(finalize);
    });

    return () => {
      stopEffect();
      if (activeCleanup) activeCleanup();
    };
  }
};

export default importModule;