import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';

/**
 * Lightweight IndexedDB write helper for build output.
 * Replaces the previous VFS dependency — build targets are always IDB.
 */
const BUILD_DB = 'nexus-store';
const BUILD_STORE = 'builds';

async function writeToIDB(key: string, data: string, meta?: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BUILD_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BUILD_STORE)) {
        db.createObjectStore(BUILD_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Ensure the store exists (may need version bump)
      if (!db.objectStoreNames.contains(BUILD_STORE)) {
        db.close();
        const upgradeReq = indexedDB.open(BUILD_DB, db.version + 1);
        upgradeReq.onupgradeneeded = () => {
          const udb = upgradeReq.result;
          if (!udb.objectStoreNames.contains(BUILD_STORE)) {
            udb.createObjectStore(BUILD_STORE);
          }
        };
        upgradeReq.onsuccess = () => {
          const udb = upgradeReq.result;
          const tx = udb.transaction(BUILD_STORE, 'readwrite');
          const store = tx.objectStore(BUILD_STORE);
          store.put({ data, meta, updatedAt: Date.now() }, key);
          tx.oncomplete = () => { udb.close(); resolve(); };
          tx.onerror = () => { udb.close(); reject(tx.error); };
        };
        upgradeReq.onerror = () => reject(upgradeReq.error);
        return;
      }
      const tx = db.transaction(BUILD_STORE, 'readwrite');
      const store = tx.objectStore(BUILD_STORE);
      store.put({ data, meta, updatedAt: Date.now() }, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * data-build="idb://my-app/bundle"
 * data-build="{ target: 'idb://my-app/bundle', scope: '#app', minify: true }"
 *
 * In-browser native bundler. Serializes the current DOM state and all
 * resolved assets into a deployable bundle, and writes to a VFS target.
 *
 * Dual strategy:
 *   1. AST Serialization — Captures the live DOM graph (resolved state + HTML)
 *   2. Asset Concatenation — Bundles inline CSS/JS for optimized output
 */

interface BuildConfig {
  target: string;              // VFS URI to write the bundle to (required)
  scope?: string;              // CSS selector for the root to serialize (default: 'html')
  minify?: boolean;            // Whether to minify CSS/JS in output (default: false)
  includeStyles?: boolean;     // Include adopted stylesheets (default: true)
  includeScripts?: boolean;    // Include injested scripts (default: true)
  standalone?: boolean;        // Produce a full standalone HTML document (default: true)
  nexusSrc?: string;           // Custom nexus-ux.js source URL for the bundle
}

/**
 * Minifies CSS by stripping comments and collapsing whitespace.
 */
function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')      // Remove comments
    .replace(/\s+/g, ' ')                   // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1')      // Remove space around punctuation
    .replace(/;}/g, '}')                     // Remove trailing semicolons
    .trim();
}

/**
 * Minifies JS by stripping single-line comments and collapsing whitespace.
 * NOTE: This is a lightweight minifier for bundled output — not a full-blown
 * parser. It handles the common cases for framework-generated code.
 */
function minifyJS(js: string): string {
  return js
    .replace(/\/\/.*$/gm, '')               // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')        // Remove multi-line comments
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .trim();
}

/**
 * Collects all adopted stylesheets and inline <style> elements.
 */
function collectStyles(root: Element, shouldMinify: boolean): string {
  const sheets: string[] = [];

  // Adopted stylesheets
  document.adoptedStyleSheets.forEach(sheet => {
    const rules: string[] = [];
    try {
      for (const rule of sheet.cssRules) {
        rules.push(rule.cssText);
      }
    } catch { /* cross-origin sheets are inaccessible */ }
    if (rules.length) sheets.push(rules.join('\n'));
  });

  // <style> elements in <head>
  document.querySelectorAll('head style').forEach(style => {
    if (style.textContent) sheets.push(style.textContent);
  });

  // <style> elements within scope
  root.querySelectorAll('style').forEach(style => {
    if (style.textContent) sheets.push(style.textContent);
  });

  const combined = sheets.join('\n\n');
  return shouldMinify ? minifyCSS(combined) : combined;
}

/**
 * Collects all inline <script> content within the scope.
 */
function collectScripts(root: Element, shouldMinify: boolean): string {
  const scripts: string[] = [];

  root.querySelectorAll('script:not([src])').forEach(script => {
    if (script.textContent) scripts.push(script.textContent);
  });

  const combined = scripts.join('\n\n');
  return shouldMinify ? minifyJS(combined) : combined;
}

/**
 * Serializes a DOM element tree into clean HTML, stripping Nexus-UX
 * runtime artifacts (loading classes, internal attributes, etc.)
 */
function serializeDOM(root: Element): string {
  const clone = root.cloneNode(true) as Element;

  // Clean runtime artifacts
  clone.querySelectorAll('[data-nexus-loading]').forEach(el => el.removeAttribute('data-nexus-loading'));
  clone.querySelectorAll('[data-nexus-ready]').forEach(el => el.removeAttribute('data-nexus-ready'));
  clone.querySelectorAll('.nexus-loading').forEach(el => el.classList.remove('nexus-loading'));
  clone.querySelectorAll('.nexus-ready').forEach(el => el.classList.remove('nexus-ready'));

  // Remove empty class attributes left behind
  clone.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));

  return clone.innerHTML;
}

/**
 * Builds a standalone HTML document from the serialized state.
 */
function buildStandaloneDocument(
  htmlContent: string,
  styles: string,
  scripts: string,
  config: BuildConfig,
  title: string
): string {
  const nexusSrc = config.nexusSrc || 'https://cdn.nexus-ux.dev/nexus-ux.js';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script type="module" src="${nexusSrc}"><\/script>
${styles ? `    <style>\n${styles}\n    </style>` : ''}
</head>
<body data-ux-init>
${htmlContent}
${scripts ? `<script>\n${scripts}\n<\/script>` : ''}
</body>
</html>`;
}

// ─── Module Definition ──────────────────────────────────────────

const buildModule: AttributeModule = {
  name: 'build',
  attribute: 'build',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    // The build is triggered explicitly by a user action (e.g., button click).
    // We register a `$build()` action on the element's scope.
    const doBuild = async () => {
      let config: BuildConfig;

      try {
        const evaluated = runtime.evaluate(el, expression);
        if (typeof evaluated === 'string') {
          config = { target: evaluated };
        } else if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as BuildConfig;
        } else {
          throw new Error('Invalid build configuration');
        }
      } catch (e) {
        reportError(new Error(`Build: Failed to evaluate configuration: ${e}`), el);
        return { success: false, error: String(e) };
      }

      if (!config.target) {
        reportError(new Error('Build: Missing target URI'), el);
        return { success: false, error: 'Missing target URI' };
      }

      const shouldMinify = config.minify ?? false;
      const includeStyles = config.includeStyles ?? true;
      const includeScripts = config.includeScripts ?? true;
      const standalone = config.standalone ?? true;

      try {
        // 1. Determine the scope root
        const scopeSelector = config.scope || 'html';
        const scopeRoot = scopeSelector === 'html' 
          ? document.documentElement 
          : (document.querySelector(scopeSelector) || document.documentElement);

        // 2. Serialize the DOM
        const htmlContent = serializeDOM(scopeRoot);

        // 3. Collect assets
        const styles = includeStyles ? collectStyles(scopeRoot, shouldMinify) : '';
        const scripts = includeScripts ? collectScripts(scopeRoot, shouldMinify) : '';

        // 4. Build the output
        let output: string;
        if (standalone) {
          const title = document.title || 'Nexus-UX Application';
          output = buildStandaloneDocument(htmlContent, styles, scripts, config, title);
        } else {
          // Fragment mode — just the HTML content
          output = htmlContent;
        }

        // 5. Write to IndexedDB
        const targetKey = config.target.replace(/^idb:\/\//, '');
        await writeToIDB(targetKey, output, {
          builtAt: Date.now(),
          scope: config.scope || 'html',
          minified: shouldMinify,
          standalone,
          size: output.length
        });

        runtime.log(`Nexus Build: Bundle written to ${config.target} (${output.length} bytes)`);
        return { 
          success: true, 
          target: config.target, 
          size: output.length,
          timestamp: Date.now() 
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        reportError(new Error(`Build failed: ${msg}`), el);
        return { success: false, error: msg };
      }
    };

    // Expose $build() as a callable action on the element
    runtime.setGlobalSignal('$build', doBuild);

    return () => {
      // No persistent cleanup needed
    };
  }
};

export default buildModule;
