import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * Simple in-memory cache for ingested assets
 */
const assetCache = new Map<string, string>();

/**
 * data-injest="{ id: { link: '...' }, id2: { script: '...' } }"
 * Orchestrates asset loading and manages loading states.
 */
const injestModule: AttributeModule = {
  name: 'injest',
  attribute: 'injest',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let config: Record<string, { link?: string, script?: string }>;
    
    try {
      config = runtime.evaluate(el, expression) as Record<string, { link?: string, script?: string }>;
    } catch (e) {
      reportError(new Error(`Injest: Failed to evaluate configuration: ${e}`), el);
      return;
    }

    if (!config || typeof config !== 'object') return;

    const ids = Object.keys(config);
    const total = ids.length;
    
    // Add loading state
    el.classList.add('nexus-loading');
    el.setAttribute('data-nexus-loading', '');

    const cleanupFns: Array<() => void> = [];

    // Parallel ingestion using Promise.all
    const ingestTasks = ids.map(async id => {
      const item = config[id];
      const rawAttrs = item.link || item.script || '';
      
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-z-]+)=["']([^"']+)["']/gi;
      let match;
      while ((match = attrRegex.exec(rawAttrs)) !== null) {
        attrs[match[1]] = match[2];
      }

      try {
        if (item.link) {
          const href = attrs['href'];
          if (!href) throw new Error(`Missing href for asset ${id}`);

          let cssText = assetCache.get(href);
          if (!cssText) {
            try {
              const fetchOptions: RequestInit = {
                mode: 'cors',
                credentials: attrs['crossorigin'] === 'use-credentials' ? 'include' : 'omit'
              };
              const response = await fetch(href, fetchOptions);
              if (response.ok) {
                cssText = await response.text();
                assetCache.set(href, cssText);
              }
            } catch { /* Silent fetch failure, fallback below */ }
          }
          
          if (cssText && 'CSSStyleSheet' in globalThis && 'replace' in CSSStyleSheet.prototype) {
            const sheet = new CSSStyleSheet();
            await sheet.replace(cssText);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            cleanupFns.push(() => {
              document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
            });
          } else {
            // Standard Managed Ingest (Await Load)
            await new Promise<void>((resolve, reject) => {
              const link = document.createElement('link');
              Object.keys(attrs).forEach(k => link.setAttribute(k, attrs[k]));
              link.onload = () => resolve();
              link.onerror = () => reject(new Error(`Link load failed for ${href}`));
              document.head.appendChild(link);
              cleanupFns.push(() => link.remove());
            });
          }
        } else if (item.script) {
          const src = attrs['src'];
          if (src) {
            // Attempt Fetch for Cache (Best Effort)
            if (!assetCache.has(src)) {
              fetch(src, { mode: 'no-cors' }).catch(() => {}); // Warm browser cache
            }

            // High-Compatibility Managed Script Ingest
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              Object.keys(attrs).forEach(k => script.setAttribute(k, attrs[k]));
              script.onload = () => resolve();
              script.onerror = () => reject(new Error(`Script load failed for ${src}`));
              document.head.appendChild(script);
              cleanupFns.push(() => script.remove());
            });
          }
        }
        runtime.log(`Nexus Injest [${id}]: Loaded`);
      } catch (e) {
        reportError(new Error(`Nexus Injest [${id}]: Error ${e}`), el);
      }
    });

    const finalize = () => {
      // reveal only when all parallel tasks are complete
      el.classList.remove('nexus-loading');
      el.classList.add('nexus-ready');
      el.removeAttribute('data-nexus-loading');
      el.setAttribute('data-nexus-ready', '');
      el.style.opacity = ''; 
      runtime.log(`Nexus Injest: All ${total} asset ingestion tasks completed.`);
    };

    Promise.all(ingestTasks).then(finalize);

    if (total === 0) finalize();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }
};

export default injestModule;
