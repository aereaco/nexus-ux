import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { readIDB } from '../../engine/utils/idb.ts';
import { stylesheet } from '../../engine/stylesheet.ts';

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
 * In-memory cache for ingested assets (preserves backward compatibility).
 */
const assetCache = new Map<string, string>();

/**
 * Payload type definitions for data-ingest 2.0
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

interface IngestPayload {
  link?: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>;
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

// ─── Ingest Handlers ───────────────────────────────────────────

async function ingestLink(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  
  for (const item of items) {
    let attrs: Record<string, string | boolean | number> = typeof item === 'string' ? { href: item, rel: 'stylesheet' } : (item as Record<string, string | boolean | number>);
    if (typeof item === 'string' && !attrs.href) {
        attrs = parseInlineAttrs(item);
        if (!attrs.href) attrs = { href: item, rel: 'stylesheet' };
    }
    
    const href = attrs.href as string;
    if (!href) continue;

    // ZCZS Mandate: Constructable Stylesheets via StyleSheetManager
    if (attrs.rel === 'stylesheet' || !attrs.rel) {
      const cssText = await resolveContent(href);
      if (cssText) {
        const cleanup = await stylesheet.adoptCSS(cssText, `ingest-${id}-${href}`);
        cleanupFns.push(cleanup);
        runtime.log(`Nexus Ingest [${id}]: CSS adopted (ZCZS): ${href}`);
        continue;
      }
    }

    // Fallback: Legacy link tag with load waiting
    await new Promise<void>((resolve) => {
        const link = document.createElement('link');
        applyAttributes(link, attrs);
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => {
            reportError(new Error(`Nexus Ingest: Failed to load ${href}`), el);
            resolve();
        };
        document.head.appendChild(link);
        cleanupFns.push(() => link.remove());
    });
  }
}

async function ingestScript(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  
  for (const item of items) {
    let attrs: Record<string, string | boolean | number> = typeof item === 'string' ? { src: item } : (item as Record<string, string | boolean | number>);
    if (typeof item === 'string' && !attrs.src) {
        attrs = parseInlineAttrs(item);
        if (!attrs.src) attrs = { src: item };
    }
    
    const src = attrs.src as string;
    if (!src) continue;

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

    await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        applyAttributes(script, attrs);
        script.onload = () => resolve();
        script.onerror = () => {
            reportError(new Error(`Nexus Ingest: Failed to load script ${src}`), el);
            resolve();
        };
        script.src = finalSrc;
        document.head.appendChild(script);
        cleanupFns.push(() => script.remove());
        runtime.log(`Nexus Ingest [${id}]: Script injected: ${src}`);
    });
  }
}

async function ingestStyle(
  id: string,
  payload: string | Record<string, string | boolean | number> | Array<string | Record<string, string | boolean | number>>,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext,
  el: HTMLElement
): Promise<void> {
  const items = Array.isArray(payload) ? payload : [payload];
  
  for (const item of items) {
    const attrs: Record<string, string | boolean | number> = typeof item === 'string' ? { content: item } : item;
    const content = (attrs.content as string) || (typeof item === 'string' ? item : '');
    
    if (!content && !attrs.href) continue;

    // If it's a link-like theme, delegate to ingestLink
    if (attrs.href) {
        await ingestLink(id, attrs as Record<string, string | boolean | number>, cleanupFns, runtime, el);
        continue;
    }

    // Resolve content if it's a VFS URI
    const cssText = isVFSUri(content) ? await resolveContent(content) : content;
    if (!cssText) continue;

    // ZCZS Mandate: Constructable Stylesheets via StyleSheetManager
    const cleanup = await stylesheet.adoptCSS(cssText, `ingest-style-${id}`);
    cleanupFns.push(cleanup);
    runtime.log(`Nexus Ingest [${id}]: Style adopted (ZCZS)`);
  }
}

async function ingestPattern(
  id: string,
  uri: string,
  el: HTMLElement,
  item: IngestPayload,
  cleanupFns: Array<() => void>,
  runtime: RuntimeContext
): Promise<void> {
  const content = await resolveContent(uri);
  if (!content) throw new Error(`Pattern not found: ${uri}`);

  const target = item.target ? (el.querySelector(item.target) as HTMLElement || el) : el;
  const position = item.position || 'append';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-ingest-pattern', id);
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
  runtime.log(`Nexus Ingest [${id}]: Pattern loaded from ${uri}`);
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
      runtime.log(`Nexus Ingest [${id}]: Component "${name}" registered from ${uri}`);
    });
  } else {
    // Single component — register using the id as the component name
    const templateEl = document.createElement('template');
    templateEl.id = `component-${id}`;
    templateEl.innerHTML = content;
    document.body.appendChild(templateEl);
    cleanupFns.push(() => templateEl.remove());
    runtime.log(`Nexus Ingest [${id}]: Component registered from ${uri}`);
  }
}

// ─── Module Definition ──────────────────────────────────────────

const ingestModule: AttributeModule = {
  name: 'ingest',
  attribute: 'ingest',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    // Differential update state
    let activeCleanup: (() => void) | null = null;
    let lastConfigStr = '';

    const stopEffect = runtime.effect(() => {
      // data-ingest
      const attrExpr = el.getAttribute('data-ingest') || expression;
      const config = runtime.evaluate(el, attrExpr) as Record<string, IngestPayload>;
      const configStr = JSON.stringify(config);
      
      // Optimization: Skip if config hasn't changed
      if (configStr === lastConfigStr) return;
      lastConfigStr = configStr;

      // Clean up previous iteration
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }

      if (!config || typeof config !== 'object') return;

      const ids = Object.keys(config);
      if (ids.length === 0) return;

      // Loading state
      el.classList.add('nexus-loading');
      el.setAttribute('data-nexus-loading', '');

      const iterationCleanupFns: Array<() => void> = [];
      activeCleanup = () => iterationCleanupFns.forEach(fn => fn());

      const ingestTasks = ids.map(async id => {
        const item = config[id];
        try {
          const itemTasks = [];
          
          // Links
          if (item.link) {
              itemTasks.push(ingestLink(id, item.link, iterationCleanupFns, runtime, el));
          }
          
          // Scripts
          if (item.script) {
              itemTasks.push(ingestScript(id, item.script, iterationCleanupFns, runtime, el));
          }
          
          // Styles / Themes (Unified)
          const stylePayload = item.style || item.theme;
          if (stylePayload) {
              itemTasks.push(ingestStyle(id, stylePayload, iterationCleanupFns, runtime, el));
          }
          
          // Patterns & Components (Legacy/Existing)
          if (item.pattern) itemTasks.push(ingestPattern(id, item.pattern, el, item, iterationCleanupFns, runtime));
          if (item.component) itemTasks.push(ingestComponent(id, item.component, iterationCleanupFns, runtime));
          
          await Promise.all(itemTasks);
        } catch (e) {
          reportError(new Error(`Nexus Ingest [${id}]: Error ${e}`), el);
        }
      });

      const finalize = () => {
        el.classList.remove('nexus-loading');
        el.classList.add('nexus-ready');
        el.removeAttribute('data-nexus-loading');
        el.setAttribute('data-nexus-ready', '');
        runtime.log(`Nexus Ingest: Assets synchronized.`);
      };

      Promise.all(ingestTasks).then(finalize);
    });

    return () => {
      stopEffect();
      if (activeCleanup) activeCleanup();
    };
  }
};

export default ingestModule;
