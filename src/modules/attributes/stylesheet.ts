// Consolidated Tailwind v4 Scoped JIT Engine with Custom @import Resolution
import { effect as _effect } from '../../engine/reactivity.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { AttributeModule } from '../../engine/modules.ts';

// ============================================================================
// 1. AOT-INJECTED STYLE LAYER CONSTANTS
// ============================================================================
import {
  PACKED_COMPONENTS,
  PACKED_KEYFRAMES,
  PACKED_THEME_CSS,
} from '../../manifest.ts';

export const PREFLIGHT_CSS = PACKED_COMPONENTS;
export { PACKED_COMPONENTS };

// ============================================================================
// 2. CUSTOM NESTED @IMPORT INTERPRETER FOR CONSTRUCTABLE STYLESHEETS
// ============================================================================

export class NexusStyleSheet extends (typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet : class { }) {
  private _rawCSSText = '';
  public importedSheets: NexusStyleSheet[] = [];

  constructor() {
    super();
  }

  async replace(cssText: string): Promise<CSSStyleSheet> {
    this._rawCSSText = cssText;
    await this.resolve(cssText);
    return this as any;
  }

  replaceSync(cssText: string): void {
    this._rawCSSText = cssText;
    const hasImports = /@import/i.test(cssText);
    if (!hasImports) {
      let compiled = cssText;
      const needsJit = /@import\s+['"]tailwindcss['"]|@import\s+url\(['"]tailwindcss/i.test(cssText) ||
                        /@theme\b/i.test(cssText) ||
                        /@utility\b/i.test(cssText) ||
                        /@plugin\b/i.test(cssText);
      if (needsJit && compileFn) {
        try {
          const compiler = compileFn(cssText, { base: '/' });
          compiled = compiler.build([]);
        } catch (_) {}
      }
      if (typeof super.replaceSync === 'function') {
        super.replaceSync(compiled);
      }
    } else {
      if (typeof super.replaceSync === 'function') {
        super.replaceSync('');
      }
      this.resolve(cssText).catch(err => console.error(err));
    }
  }

  private async resolve(cssText: string): Promise<void> {
    let compiled = cssText;
    const needsJit = /@import\s+['"]tailwindcss['"]|@import\s+url\(['"]tailwindcss/i.test(cssText) ||
                      /@theme\b/i.test(cssText) ||
                      /@utility\b/i.test(cssText) ||
                      /@plugin\b/i.test(cssText);
    if (needsJit && compileFn) {
      try {
        const compiler = await compileFn(cssText, {
          base: '/',
          async loadStylesheet(id: string) {
            if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
              return { path: 'tailwindcss/index.css', base: '/', content: cachedIndexCss };
            }
            if (id === './theme.css' || id === 'tailwindcss/theme.css') {
              return { path: 'tailwindcss/theme.css', base: '/', content: cachedThemeCss };
            }
            if (id === './preflight.css' || id === 'tailwindcss/preflight.css') {
              return { path: 'tailwindcss/preflight.css', base: '/', content: cachedPreflightCss };
            }
            if (id === './utilities.css' || id === 'tailwindcss/utilities.css') {
              return { path: 'tailwindcss/utilities.css', base: '/', content: cachedUtilitiesCss };
            }
            return { path: id, base: '/', content: '' };
          }
        });
        compiled = compiler.build([]);
      } catch (err) {
        console.error('[NexusStyleSheet] JIT compilation failed:', err);
      }
    }

    if (typeof document === 'undefined') {
      if (typeof super.replace === 'function') {
        await super.replace(compiled);
      }
      return;
    }

    const parserDoc = document.implementation.createHTMLDocument('');
    const styleEl = parserDoc.createElement('style');
    styleEl.textContent = compiled;
    parserDoc.head.appendChild(styleEl);

    const sheet = styleEl.sheet;
    if (!sheet) {
      if (typeof super.replace === 'function') {
        await super.replace(compiled);
      }
      return;
    }

    const rules = Array.from(sheet.cssRules);
    const subSheets: NexusStyleSheet[] = [];
    const cleanRules: string[] = [];

    for (const rule of rules) {
      if (typeof CSSImportRule !== 'undefined' && rule instanceof CSSImportRule) {
        const url = rule.href;
        if (url === 'tailwindcss' || url.includes('tailwindcss@4') || url.includes('tailwindcss/')) {
          cleanRules.push(rule.cssText);
          continue;
        }
        try {
          const absoluteUrl = new URL(url, window.location.href).href;
          const content = await fetchWithCache(absoluteUrl, 3000);
          const subSheet = new NexusStyleSheet();
          await subSheet.replace(content);
          subSheets.push(subSheet);
        } catch (err) {
          console.warn(`[NexusStyleSheet] Failed to resolve sub-sheet for "${url}":`, err);
          cleanRules.push(rule.cssText);
        }
      } else {
        cleanRules.push(rule.cssText);
      }
    }

    this.importedSheets = subSheets;

    if (typeof super.replace === 'function') {
      await super.replace(cleanRules.join('\n'));
    }

    if (typeof stylesheet !== 'undefined') {
      stylesheet.updateAllRoots();
    }
  }
}

// Two-Tier Scoped Constructable StyleSheets
export const preflightSheet: any = new NexusStyleSheet();
export const jitSheet: any = new NexusStyleSheet();

// ============================================================================
// 3. CORE COMPILER BRIDGE
// ============================================================================

// deno-lint-ignore-file no-explicit-any

/**
 * Discovers CSS custom color properties from the document's computed styles.
 * Works with ANY CSS library that uses --color-* custom properties (DaisyUI,
 * Bootstrap, Shoelace, custom design systems, etc.).
 *
 * Called after stylesheets have been applied to the document. Uses
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
    .map(name => `  --color-${name}: var(--color-${name});`)
    .join('\n');
  return `@theme {\n${decls}\n}`;
}

let tailwindCompiler: any = null;
let compileFn: any = null;
let cachedIndexCss = '';
let cachedThemeCss = '';
let cachedPreflightCss = '';
let cachedUtilitiesCss = '';
let compiledClassesSet = new Set<string>();
const pendingClasses: { className: string; el?: HTMLElement; runtime?: RuntimeContext }[] = [];

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

async function fetchWithCache(url: string, timeoutMs = 3000, onUpdate?: (fresh: string) => void): Promise<string> {
  const cacheKey = `nexus-cache:${url}`;
  let cached: string | null = null;

  if (typeof localStorage !== 'undefined') {
    try {
      cached = localStorage.getItem(cacheKey);
    } catch (_) { }
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
            } catch (_) { }
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
        } catch (_) { }
      }
      return text;
    } catch (_) {
      console.log(`[Nexus Cache] Local relative fallback failed for ${url}. Falling back to CDN.`);
    }
  }

  try {
    const text = await doFetch(url);
    console.log(`[Nexus Cache] SUCCESS: Loaded resource from CDN for ${url}`);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, text);
      } catch (_) { }
    }
    return text;
  } catch (err) {
    console.error(`[Nexus Cache] Failed CDN fetch for ${url}:`, err);
    throw err;
  }
}

async function initPlayCompiler() {
  if (tailwindCompiler) return;

  try {
    console.log("🚀 Initializing Tailwind Play JIT compiler...");

    // Adopt the index.css sheet using our custom NexusStyleSheet `@import` resolver
    preflightSheet.replaceSync('@import url("https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css");');

    // Fetch the raw files for JIT compiler database initialization
    const [indexCss, themeCss, preflightCss, utilitiesCss, compilerJs] = await Promise.all([
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/preflight.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/utilities.css'),
      fetchWithCache('https://cdn.jsdelivr.net/npm/tailwindcss@4/+esm'),
    ]);

    const blob = new Blob([compilerJs], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const { compile } = await import(blobUrl);
    compileFn = compile;
    cachedIndexCss = indexCss;
    cachedThemeCss = themeCss;
    cachedPreflightCss = preflightCss;
    cachedUtilitiesCss = utilitiesCss;
    URL.revokeObjectURL(blobUrl);

    // Discover CSS color tokens from currently-applied stylesheets.
    // Called AFTER await import("tailwindcss") — loading the Tailwind Wasm
    // module is the slowest async step, giving linked stylesheets maximum
    // time to load and apply. Library-agnostic: reads any --color-* property.
    const colorTokens = discoverColorTokens();
    const themeBridge = buildTailwindThemeBridge(colorTokens);
    if (colorTokens.size > 0) {
      console.log(`✅ Tailwind JIT: discovered ${colorTokens.size} color tokens from loaded stylesheets.`);
    }

    tailwindCompiler = await compile(`
@import "tailwindcss";
${themeBridge}
`, {
      base: '/',
      async loadStylesheet(id: string) {
        if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
          return { path: 'tailwindcss/index.css', base: '/', content: indexCss };
        }
        if (id === './theme.css' || id === 'tailwindcss/theme.css') {
          return { path: 'tailwindcss/theme.css', base: '/', content: themeCss };
        }
        if (id === './preflight.css' || id === 'tailwindcss/preflight.css') {
          return { path: 'tailwindcss/preflight.css', base: '/', content: preflightCss };
        }
        if (id === './utilities.css' || id === 'tailwindcss/utilities.css') {
          return { path: 'tailwindcss/utilities.css', base: '/', content: utilitiesCss };
        }
        return { path: id, base: '/', content: '' };
      }
    });

    console.log("✅ Tailwind Play JIT compiler ready.");

    // Load preflight CSS immediately into jitSheet
    try {
      const initialCSS = tailwindCompiler.build([]);
      jitSheet.replaceSync(initialCSS);
    } catch (err) {
      console.error("[Nexus JIT] Failed to compile initial preflight:", err);
    }

    // Process any classes collected during startup
    while (pendingClasses.length > 0) {
      const { className, el, runtime } = pendingClasses.shift()!;
      stylesheet.adoptClass(className, el, runtime);
    }
  } catch (err) {
    console.error("Failed to initialize Tailwind Play JIT compiler:", err);
  }
}

// ============================================================================
// 4. STYLESHEET MANAGER (DOM Injection)
// ============================================================================
class StyleSheetManager {
  private _adoptedSheets: Map<string, any> = new Map();
  private _knownClasses: Set<string> = new Set();
  private _nextId = 0;
  private _preflightEmitted = false;
  private _rootSheets: Map<Document | ShadowRoot, Set<string>> = new Map();

  private _getJitSheet(): CSSStyleSheet {
    return jitSheet as any;
  }

  private _getAdoptedList(sheet: any): any[] {
    const list: any[] = [];
    if (sheet && sheet.importedSheets) {
      for (const sub of sheet.importedSheets) {
        list.push(...this._getAdoptedList(sub));
      }
    }
    if (sheet) {
      list.push(sheet);
    }
    return list;
  }

  public registerStylesheetRoot(root: Document | ShadowRoot) {
    if (!root || !('adoptedStyleSheets' in root)) return;
    if (!this._rootSheets.has(root)) {
      this._rootSheets.set(root, new Set());
    }
    this.updateRootStyleSheets(root);
  }

  public updateRootStyleSheets(root: Document | ShadowRoot) {
    if (!root || !('adoptedStyleSheets' in root)) return;
    const activeIds = this._rootSheets.get(root) || new Set<string>();

    const list: any[] = [];
    for (const id of activeIds) {
      const sheet = this._adoptedSheets.get(id);
      if (sheet) {
        list.push(...this._getAdoptedList(sheet));
      }
    }

    // Append preflightSheet's flattened list and jitSheet
    const finalSheets = [...list, ...this._getAdoptedList(preflightSheet), jitSheet];
    root.adoptedStyleSheets = finalSheets;
  }

  public updateAllRoots() {
    for (const root of this._rootSheets.keys()) {
      this.updateRootStyleSheets(root);
    }
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
      rootEl.classList.forEach(cls => this.adoptClass(cls, rootEl));
      const all = rootEl.querySelectorAll('*');
      all.forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.forEach(cls => this.adoptClass(cls, el));
        }
      });
    }
  }

  adoptClass(className: string, el?: HTMLElement, runtime?: RuntimeContext): void {
    if (!className || className.trim() === '') return;
    if (el && el.closest && el.closest('[data-ignore\\:style]')) return;
    if (this._knownClasses.has(className)) return;

    // Support dynamic data signals binding (e.g., w-$width, bg-$myColor).
    // These are processed globally across the document regardless of data-stylesheet boundary,
    // as signals only set element CSS variables and do not need Tailwind JIT compilation.
    const hasSignalMatch = className.match(/^[a-z]+-\$([a-zA-Z_$][\w$]*)$/);
    if (hasSignalMatch && el && runtime) {
      this.adoptSignalBinding(el, hasSignalMatch[1], runtime);
      this._knownClasses.add(className);
      return;
    }

    // Boundary scope check: element must be inside a data-stylesheet container for JIT compilation
    if (el && !el.closest('[data-stylesheet]')) {
      return;
    }

    if (PACKED_THEME_CSS.length > 0) {
      // Production Mode: Pre-compiled
      this._knownClasses.add(className);
      return;
    }

    // Play Mode: JIT compiling
    if (!tailwindCompiler) {
      pendingClasses.push({ className, el, runtime });
      return;
    }

    try {
      // Filter out binding expressions, template parameters, or operator tokens
      if (
        className.includes("{") ||
        className.includes("}") ||
        className.includes("$") ||
        className.includes("?") ||
        className.includes("<") ||
        className.includes(">") ||
        className.includes("&") ||
        className.includes("=")
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
    } catch (_e) { }
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch (_e) { }
      if (rules.length) sheets.push(rules.join('\n'));
    });

    const rules: string[] = [];
    try {
      for (const rule of (jitSheet as any).cssRules) rules.push(rule.cssText);
    } catch (_e) { }
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

    const sheet = new NexusStyleSheet();
    sheet.replaceSync(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);

    let activeIds = this._rootSheets.get(root);
    if (!activeIds) {
      activeIds = new Set<string>();
      this._rootSheets.set(root, activeIds);
    }
    activeIds.add(sheetId);
    this.updateRootStyleSheets(root);

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
    this._adoptedSheets.set(sheetId, sheet as any);

    let activeIds = this._rootSheets.get(root);
    if (!activeIds) {
      activeIds = new Set<string>();
      this._rootSheets.set(root, activeIds);
    }
    activeIds.add(sheetId);
    this.updateRootStyleSheets(root);

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
    this._adoptedSheets.set(sheetId, sheet as any);

    let activeIds = this._rootSheets.get(root);
    if (!activeIds) {
      activeIds = new Set<string>();
      this._rootSheets.set(root, activeIds);
    }
    activeIds.add(sheetId);
    this.updateRootStyleSheets(root);

    return () => this.removeSheet(sheetId, root);
  }

  processAtRules(css: string): string {
    return css;
  }

  removeSheet(id: string, root: Document | ShadowRoot = document): void {
    const sheet = this._adoptedSheets.get(id);
    if (!sheet) return;

    const activeIds = this._rootSheets.get(root);
    if (activeIds) {
      activeIds.delete(id);
    }
    this.updateRootStyleSheets(root);
    this._adoptedSheets.delete(id);
  }

  dispose(): void {
    this._adoptedSheets.forEach((_sheet, id) => {
      for (const root of this._rootSheets.keys()) {
        this.removeSheet(id, root);
      }
    });
    this._adoptedSheets.clear();
    this._knownClasses.clear();
    this._nextId = 0;
  }
}

export const stylesheet = new StyleSheetManager();

// ============================================================================
// 5. DUAL MODE JIT COMPILER INITIALIZATION
// ============================================================================
let _isJitEngineBooted = false;

export function initializeJitEngine(): void {
  if (_isJitEngineBooted) return;
  _isJitEngineBooted = true;

  if (PACKED_THEME_CSS.length > 0) {
    // Production Mode: Adopt pre-compiled AOT stylesheet directly
    stylesheet.adoptCSSSync(PACKED_THEME_CSS, 'nexus-theme');
  } else {
    // Play Mode: Initialize official JIT compiler dynamically
    initPlayCompiler();
  }
}

// ============================================================================
// 6. ATTRIBUTE MODULE DIRECTIVE EXPORT (data-stylesheet)
// ============================================================================
const stylesheetModule: AttributeModule = {
  name: 'stylesheet',
  attribute: 'stylesheet',
  handle(el: HTMLElement, _expression: string, runtime: RuntimeContext): (() => void) | void {
    // A. Locate closest shadow root or document
    const root = el.getRootNode() as Document | ShadowRoot;

    // B. Register stylesheet root to adopt preflight and jit sheets dynamically
    stylesheet.registerStylesheetRoot(root);

    // C. Scan and compile classes inside the subtree
    stylesheet.emitPreflightAndTheme(el);

    return () => { };
  }
};

export default stylesheetModule;
