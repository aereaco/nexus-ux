// Consolidated Tailwind v4 Scoped JIT Engine + Native @import Resolution
// Two strictly separated pipelines (never blended):
//   Pipeline A — Tailwind utility compilation (jitSheet). JIT-only, lazy, scoped.
//   Pipeline B — External/standard CSS (NexusStyleSheet). CSSOM @import resolver, never JIT.
import { effect as _effect } from '../../engine/reactivity.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { AttributeModule } from '../../engine/modules.ts';

// ============================================================================
// 1. AOT-INJECTED STYLE LAYER CONSTANTS
// ============================================================================
import {
  PACKED_COMPONENTS,
  PACKED_KEYFRAMES,
} from '../../manifest.ts';

export const PREFLIGHT_CSS = PACKED_COMPONENTS;
export { PACKED_COMPONENTS };

// ============================================================================
// 2. PIPELINE B — NATIVE @import RESOLUTION FOR CONSTRUCTABLE STYLESHEETS
// ============================================================================

/**
 * Resolves `@import` rules so they can be loaded into constructable stylesheets
 * (which reject `@import` per spec).
 *
 * Discovery uses the browser's native CSSOM parser (to natively handle every
 * `@import` syntax variation, media queries, and layers), but inlining is done
 * on the ORIGINAL raw CSS string via targeted replacement. This means custom
 * at-rules (`@theme`, `@utility`, `@plugin`, …) are never parsed, stripped, or
 * rewritten — only standard `@import` statements are inlined.
 */
async function resolveImports(cssText: string, baseUrl?: string, onUpdate?: () => void): Promise<string> {
  const defaultBase = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
  const currentBase = baseUrl || defaultBase;

  const imports: { href: string; media: string; layer: string }[] = [];

  // --- Native CSSOM discovery ---
  if (typeof document !== 'undefined') {
    try {
      const parserDoc = document.implementation.createHTMLDocument('');
      const styleEl = parserDoc.createElement('style');
      styleEl.textContent = cssText;
      parserDoc.head.appendChild(styleEl);
      const sheet = styleEl.sheet;
      if (sheet) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSImportRule) {
            imports.push({
              href: rule.href,
              media: rule.media ? rule.media.mediaText : '',
              layer: (rule as unknown as { layerName?: string }).layerName || '',
            });
          }
        }
      }
    } catch {
      // Parsing failed — the regex fallback below will pick up imports.
    }
  }

  // --- Regex fallback / supplement (catches anything CSSOM dropped) ---
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*[^;]*;/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(cssText)) !== null) {
    const href = m[1];
    if (!imports.some((i) => href.endsWith(i.href) || i.href.endsWith(href))) {
      imports.push({ href, media: '', layer: '' });
    }
  }

  let resolved = cssText;
  for (const imp of imports) {
    try {
      const absoluteUrl = new URL(imp.href, currentBase).href;
      const content = await fetchWithCache(absoluteUrl, 3000, () => {
        if (onUpdate) onUpdate();
      });
      const nestedResolved = await resolveImports(content, absoluteUrl, onUpdate);

      let wrapper = nestedResolved;
      if (imp.media) wrapper = `@media ${imp.media} { ${nestedResolved} }`;
      else if (imp.layer) wrapper = `@layer ${imp.layer} { ${nestedResolved} }`;

      const escaped = imp.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const targetRegex = new RegExp(`@import\\s+(?:url\\()?['"]?${escaped}['"]?\\)?[^;]*;`, 'g');
      resolved = resolved.replace(targetRegex, wrapper);
    } catch (err) {
      console.warn(`[NexusStyleSheet] Failed to resolve import "${imp.href}" relative to "${currentBase}":`, err);
    }
  }
  return resolved;
}

export class NexusStyleSheet extends (typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet : class { }) {
  private _rawCSSText = '';

  constructor() {
    super();
  }

  async replace(cssText: string): Promise<CSSStyleSheet> {
    this._rawCSSText = cssText;
    if (typeof super.replace === 'function') {
      const resolved = await resolveImports(cssText, undefined, async () => {
        const freshResolved = await resolveImports(this._rawCSSText);
        if (typeof super.replace === 'function') {
          await super.replace(freshResolved);
        }
      });
      return await super.replace(resolved);
    }
    return this as unknown as CSSStyleSheet;
  }

  replaceSync(cssText: string): void {
    this._rawCSSText = cssText;
    const hasImports = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*[^;]*;/g.test(cssText);

    if (typeof super.replaceSync === 'function') {
      try {
        super.replaceSync(cssText);
      } catch {
        // @import rules are not allowed in replaceSync per spec (construct-stylesheets).
        // Swallow: the background resolver below inlines them instead.
        if (!hasImports) throw err;
      }
    }

    if (hasImports) {
      resolveImports(cssText, undefined, async () => {
        const freshResolved = await resolveImports(this._rawCSSText);
        if (typeof super.replace === 'function') {
          super.replace(freshResolved).catch((err: unknown) => console.error(err));
        }
      }).then((resolved) => {
        if (typeof super.replace === 'function') {
          super.replace(resolved).catch((err: unknown) => {
            console.error('[NexusStyleSheet] Dynamic replace of resolved imports failed:', err);
          });
        }
      }).catch((err: unknown) => {
        console.error('[NexusStyleSheet] Failed to resolve imports in background:', err);
      });
    }
  }
}

// Pipeline A output sheet — a plain constructable stylesheet (no @import, so the
// resolver overhead is unnecessary here).
export const jitSheet: CSSStyleSheet = (typeof CSSStyleSheet !== 'undefined')
  ? new CSSStyleSheet()
  : ({} as CSSStyleSheet);

// ============================================================================
// 3. COLOR TOKEN DISCOVERY + THEME BRIDGE
// ============================================================================

/**
 * Discovers CSS custom color properties from the document's computed styles.
 * Works with ANY CSS library that uses --color-* custom properties (DaisyUI,
 * Bootstrap, Shoelace, custom design systems, etc.).
 *
 * Called AFTER external stylesheets have been applied to the document. Uses
 * getComputedStyle enumeration which exposes all applied custom properties
 * in modern browsers without requiring same-origin stylesheet access.
 */
export function discoverColorTokens(): Set<string> {
  const tokens = new Set<string>();
  try {
    const style = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (prop.startsWith('--color-')) {
        tokens.add(prop.slice(8)); // strip '--color-' prefix
      }
    }
  } catch {
    // getComputedStyle unavailable (SSR / test env) — return empty
  }
  return tokens;
}

/**
 * Builds a Tailwind v4 @theme block from a set of discovered color token names.
 *
 * Maps each --color-X to var(--color-X) so Tailwind generates all utility
 * variants (hover:bg-X, text-X/50, border-X, ring-X, etc.) while keeping
 * actual color values fully dynamic — the CSS library's runtime variables
 * supply the values, enabling data-theme switching to work correctly.
 */
export function buildTailwindThemeBridge(tokens: Set<string>): string {
  if (tokens.size === 0) return '';
  const decls = Array.from(tokens)
    .map((name) => `  --color-${name}: var(--color-${name});`)
    .join('\n');
  return `@theme {\n${decls}\n}`;
}

// ============================================================================
// 4. PIPELINE A — TAILWIND JIT COMPILER (lazy, scoped, re-bridged on import)
// ============================================================================

let compileFn: ((css: string, opts: unknown) => Promise<{ build: (classes: string[]) => string }>) | null = null;
let coreCss: { indexCss: string; themeCss: string; preflightCss: string; utilitiesCss: string } | null = null;
let tailwindCompiler: { build: (classes: string[]) => string } | null = null;
let compilerReadyPromise: Promise<void> | null = null;
let externalStylesSettled = false;
let _rebuildingBridge = false;

const compiledClassesSet = new Set<string>();
const pendingClasses: { className: string; el?: HTMLElement; runtime?: RuntimeContext }[] = [];

function coreLoadStylesheet(id: string): { path: string; base: string; content: string } {
  if (!coreCss) return { path: id, base: '/', content: '' };
  if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
    return { path: 'tailwindcss/index.css', base: '/', content: coreCss.indexCss };
  }
  if (id === './theme.css' || id === 'tailwindcss/theme.css') {
    return { path: 'tailwindcss/theme.css', base: '/', content: coreCss.themeCss };
  }
  if (id === './preflight.css' || id === 'tailwindcss/preflight.css') {
    return { path: 'tailwindcss/preflight.css', base: '/', content: coreCss.preflightCss };
  }
  if (id === './utilities.css' || id === 'tailwindcss/utilities.css') {
    return { path: 'tailwindcss/utilities.css', base: '/', content: coreCss.utilitiesCss };
  }
  return { path: id, base: '/', content: '' };
}

/**
 * Lazily loads the Tailwind v4 compiler + core CSS the first time it is needed
 * (i.e. when a [data-stylesheet] element is first processed). Mirrors the
 * official Play CDN `loadStylesheet` — only the four bundled virtual core files
 * are resolved; external @import / plugins are NOT supported by the browser build.
 */
async function ensureCompiler(): Promise<void> {
  if (compilerReadyPromise) return compilerReadyPromise;

  compilerReadyPromise = (async () => {
    const [indexCss, themeCss, preflightCss, utilitiesCss, compilerJs] = await Promise.all([
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/preflight.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/utilities.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/+esm'),
    ]);

    coreCss = { indexCss, themeCss, preflightCss, utilitiesCss };

    const blob = new Blob([compilerJs], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const mod = await import(blobUrl);
    URL.revokeObjectURL(blobUrl);

    compileFn = mod.compile;

    tailwindCompiler = await compileFn(`@import "tailwindcss";`, {
      base: '/',
      loadStylesheet: coreLoadStylesheet,
    });

    // Build the theme bridge from currently-applied (external) stylesheets and
    // adopt the initial preflight + discovered theme variables.
    await refreshThemeBridge();

    // Process any classes collected before the compiler finished loading.
    while (pendingClasses.length > 0) {
      const { className, el, runtime } = pendingClasses.shift()!;
      stylesheet.adoptClass(className, el, runtime);
    }
  })().catch((err: unknown) => {
    compilerReadyPromise = null;
    console.error('[Nexus] Tailwind JIT init failed:', err);
    throw err;
  });

  return compilerReadyPromise;
}

/**
 * Rebuilds the Tailwind compiler with a freshly-discovered theme bridge so that
 * utilities for externally-defined color tokens (e.g. DaisyUI's --color-*) are
 * generated. Called once after external stylesheets settle, and again whenever
 * new external stylesheets are adopted.
 */
async function refreshThemeBridge(): Promise<void> {
  if (!tailwindCompiler || !compileFn || !coreCss) return;
  if (_rebuildingBridge) return;
  _rebuildingBridge = true;
  try {
    const tokens = discoverColorTokens();
    const bridge = buildTailwindThemeBridge(tokens);
    tailwindCompiler = await compileFn(`@import "tailwindcss";\n${bridge}`, {
      base: '/',
      loadStylesheet: coreLoadStylesheet,
    });
    const compiledCSS = tailwindCompiler.build(Array.from(compiledClassesSet));
    jitSheet.replaceSync(compiledCSS);
  } catch (err) {
    console.error('[Nexus] Theme bridge refresh failed:', err);
  } finally {
    _rebuildingBridge = false;
  }
}

// ============================================================================
// 5. CACHE-AND-FETCH HELPER
// ============================================================================

async function fetchWithCache(url: string, timeoutMs = 3000, onUpdate?: (fresh: string) => void): Promise<string> {
  const cacheKey = `nexus-cache:${url}`;
  let cached: string | null = null;

  if (typeof localStorage !== 'undefined') {
    try {
      cached = localStorage.getItem(cacheKey);
    } catch {
      // ignore
    }
  }

  if (cached) {
    const cachedVal = cached;
    console.log(`[Nexus Cache] INSTANT HIT: Loading ${url} from localStorage cache.`);
    setTimeout(async () => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) return;
        const freshText = await res.text();
        if (hashString(cachedVal) !== hashString(freshText)) {
          console.log(`[Nexus Cache] UPDATE DETECTED: CDN changed for ${url}. Caching for next load.`);
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, freshText);
            } catch {
              // ignore
            }
          }
          if (onUpdate) onUpdate(freshText);
        } else {
          console.log(`[Nexus Cache] VERIFIED: Cache matches CDN for ${url}.`);
        }
      } catch (err) {
        console.warn(`[Nexus Cache] Background CDN hash check failed for ${url}:`, err);
      }
    }, 5000);
    return cachedVal;
  }

  console.log(`[Nexus Cache] CACHE MISS: Fetching local/CDN resource for ${url}.`);
  let localUrl = '';
  if (url.includes('tailwindcss@4/')) {
    const file = url.split('tailwindcss@4/')[1];
    localUrl = `/node_modules/tailwindcss/${file}`;
  }

  const doFetch = async (targetUrl: string): Promise<string> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.text();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  if (localUrl) {
    try {
      console.log(`[Nexus Cache] Trying local relative fallback path: ${localUrl}`);
      const text = await doFetch(localUrl);
      console.log(`[Nexus Cache] SUCCESS: Loaded local resource for ${url} from ${localUrl}`);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, text);
        } catch {
          // ignore
        }
      }
      return text;
    } catch {
      console.log(`[Nexus Cache] Local relative fallback failed for ${url}. Falling back to CDN.`);
    }
  }

  try {
    const text = await doFetch(url);
    console.log(`[Nexus Cache] SUCCESS: Loaded resource from CDN for ${url}`);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, text);
      } catch {
        // ignore
      }
    }
    return text;
  } catch (err) {
    console.error(`[Nexus Cache] Failed CDN fetch for ${url}:`, err);
    throw err;
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

// ============================================================================
// 6. STYLESHEET MANAGER
// ============================================================================
class StyleSheetManager {
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();
  private _knownClasses: Set<string> = new Set();
  private _nextId = 0;
  private _preflightEmitted = false;

  private _getJitSheet(): CSSStyleSheet {
    return jitSheet;
  }

  clearCache(): void {
    this._knownClasses.clear();
  }

  public emitPreflightAndTheme(rootEl?: HTMLElement): void {
    if (typeof document === 'undefined') return;
    if (this._preflightEmitted) return;

    initializeJitEngine();

    // Synchronously load custom packages component blocks and keyframes
    if (PACKED_COMPONENTS.length > 0) {
      this.adoptCSSSync(PACKED_COMPONENTS, 'nexus-components');
    }
    if (PACKED_KEYFRAMES.length > 0) {
      this.adoptCSSSync(PACKED_KEYFRAMES, 'nexus-keyframes');
    }

    this._preflightEmitted = true;

    // Passive scan of classes within the target root element (if provided)
    if (rootEl) {
      rootEl.classList.forEach((cls) => this.adoptClass(cls, rootEl));
      const all = rootEl.querySelectorAll('*');
      all.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.classList.forEach((cls) => this.adoptClass(cls, el));
        }
      });
    }
  }

  adoptClass(className: string, el?: HTMLElement, runtime?: RuntimeContext): void {
    if (!className || className.trim() === '') return;
    if (el && el.closest && el.closest('[data-ignore\\:style]')) return;
    if (this._knownClasses.has(className)) return;

    // Support dynamic data signals binding (e.g., w-$width, bg-$myColor).
    // These are processed globally and only set element CSS variables — they do
    // not need Tailwind JIT compilation.
    const hasSignalMatch = className.match(/^[a-z]+-\$([a-zA-Z_$][\w$]*)$/);
    if (hasSignalMatch && el && runtime) {
      this.adoptSignalBinding(el, hasSignalMatch[1], runtime);
      this._knownClasses.add(className);
      return;
    }

    // Boundary scope check: element must be inside a data-stylesheet container
    // for JIT compilation.
    if (el && !el.closest('[data-stylesheet]')) {
      return;
    }

    // Play Mode: JIT compiling (lazy)
    if (!tailwindCompiler) {
      pendingClasses.push({ className, el, runtime });
      ensureCompiler().catch((err: unknown) => console.error('[Nexus] JIT init failed:', err));
      return;
    }

    try {
      // Filter out binding expressions, template parameters, or operator tokens
      if (
        className.includes('{') ||
        className.includes('}') ||
        className.includes('$') ||
        className.includes('?') ||
        className.includes('<') ||
        className.includes('>') ||
        className.includes('&') ||
        className.includes('=')
      ) {
        return;
      }

      compiledClassesSet.add(className);
      const compiledCSS = tailwindCompiler.build(Array.from(compiledClassesSet));
      jitSheet.replaceSync(compiledCSS);
      this._knownClasses.add(className);
    } catch (err) {
      console.debug(`Nexus-UX JIT compile check: "${className}":`, err);
    }
  }

  adoptSignalBinding(el: HTMLElement, signalName: string, runtime: RuntimeContext) {
    if (!el.hasAttribute('data-class')) {
      const currentBindings = (el as HTMLElement & { _signalBindings?: string[] })._signalBindings || [];
      if (!currentBindings.includes(signalName)) {
        currentBindings.push(signalName);
        (el as HTMLElement & { _signalBindings?: string[] })._signalBindings = currentBindings;

        const varName = signalName.replace(/[#.]/g, '-');
        runtime.effect(() => {
          const val = runtime.evaluate(el, signalName);
          el.style.setProperty(`--nx-${varName}`, String(val !== undefined ? val : ''));
        });
      }
    }
  }

  ensureRule(className: string, cssText: string): void {
    if (this._knownClasses.has(className)) return;
    const sheet = this._getJitSheet();
    try {
      sheet.insertRule(cssText, sheet.cssRules.length);
      this._knownClasses.add(className);
    } catch {
      // ignore
    }
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch {
        // ignore
      }
      if (rules.length) sheets.push(rules.join('\n'));
    });

    const rules: string[] = [];
    try {
      for (const rule of jitSheet.cssRules) rules.push(rule.cssText);
    } catch {
      // ignore
    }
    if (rules.length) sheets.push(rules.join('\n'));
    return sheets.join('\n\n');
  }

  adoptCSSSync(cssText: string, id?: string, root: Document | ShadowRoot = document): () => void {
    const processedCSS = this.processAtRules(cssText);
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);

    if (existing) {
      existing.replaceSync(processedCSS);
      return () => this.removeSheet(sheetId, root);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => { };

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);

    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId, root);
  }

  async adoptCSS(cssText: string, id?: string, root: Document | ShadowRoot = document): Promise<() => void> {
    const processedCSS = this.processAtRules(cssText);
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(processedCSS);
      return () => this.removeSheet(sheetId, root);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => { };

    const sheet = new NexusStyleSheet();
    await sheet.replace(processedCSS);
    this._adoptedSheets.set(sheetId, sheet as unknown as CSSStyleSheet);

    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet as unknown as CSSStyleSheet];
    }
    return () => this.removeSheet(sheetId, root);
  }

  async adoptRawCSS(cssText: string, id?: string, root: Document | ShadowRoot = document): Promise<() => void> {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(cssText);
      return () => this.removeSheet(sheetId, root);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => { };

    const sheet = new NexusStyleSheet();
    await sheet.replace(cssText);
    this._adoptedSheets.set(sheetId, sheet as unknown as CSSStyleSheet);

    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet as unknown as CSSStyleSheet];
    }
    return () => this.removeSheet(sheetId, root);
  }

  processAtRules(css: string): string {
    return css;
  }

  removeSheet(id: string, root: Document | ShadowRoot = document): void {
    const sheet = this._adoptedSheets.get(id);
    if (!sheet) return;
    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
    }
    this._adoptedSheets.delete(id);
  }

  dispose(): void {
    this._adoptedSheets.forEach((_sheet, id) => this.removeSheet(id));
    this._adoptedSheets.clear();
    this._knownClasses.clear();
    this._nextId = 0;
  }
}

export const stylesheet = new StyleSheetManager();

// ============================================================================
// 7. JIT ENGINE INITIALIZATION (lazy — only when [data-stylesheet] is invoked)
// ============================================================================
let _isJitEngineBooted = false;

export function initializeJitEngine(): void {
  if (_isJitEngineBooted) return;
  _isJitEngineBooted = true;

  // Play Mode: Initialize official JIT compiler lazily
  // Theme/preflight CSS is fetched from CDN at runtime; no AOT stylesheet is bundled.
  ensureCompiler().catch((err: unknown) => console.error('[Nexus] JIT init failed:', err));
}

/**
 * Notifies the stylesheet manager that all external (data-import) stylesheets
 * have been adopted and applied to the document. This triggers a theme-bridge
 * rebuild so Tailwind utilities for externally-defined color tokens (e.g.
 * DaisyUI's --color-*) are generated. Idempotent.
 */
export function markExternalStylesSettled(): void {
  externalStylesSettled = true;
  if (compilerReadyPromise) {
    refreshThemeBridge().catch((err: unknown) => console.error('[Nexus] bridge refresh failed:', err));
  }
}

// ============================================================================
// 8. ATTRIBUTE MODULE DIRECTIVE EXPORT (data-stylesheet)
// ============================================================================
const stylesheetModule: AttributeModule = {
  name: 'stylesheet',
  attribute: 'stylesheet',
  handle(el: HTMLElement, expression: string, _runtime: RuntimeContext): (() => void) | void {
    const cleanupFns: (() => void)[] = [];

    if (expression && expression.trim()) {
      const css = expression.trim();
      cleanupFns.push(stylesheet.adoptCSSSync(css, undefined, document));
    }

    const root = el.getRootNode() as Document | ShadowRoot;

    if (root && 'adoptedStyleSheets' in root) {
      const sheetsList = Array.from(root.adoptedStyleSheets);
      if (!sheetsList.includes(jitSheet)) {
        root.adoptedStyleSheets = [...sheetsList, jitSheet];
      }
    }

    // Adopt the AOT component block (draggable-chosen/drag/ghost, swap highlights,
    // drop-target guides) at boot. These are NOT Tailwind utilities and must be on
    // the document from the start — the previous cleanup-only path never ran for
    // persistent pages, so no drag feedback ever rendered. Idempotent.
    stylesheet.emitPreflightAndTheme(el);

    cleanupFns.push(() => {
      stylesheet.emitPreflightAndTheme(el);
    });

    return () => cleanupFns.forEach(fn => fn());
  },
};

export default stylesheetModule;
