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

async function resolveImports(cssText: string, baseUrl?: string): Promise<string> {
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;
  let resolved = cssText;
  let match;

  const defaultBase = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
  const currentBase = baseUrl || defaultBase;

  while ((match = importRegex.exec(cssText)) !== null) {
    const importStatement = match[0];
    const url = match[1];
    try {
      // Resolve relative import paths against the parent stylesheet's URL
      const absoluteUrl = new URL(url, currentBase).href;
      const content = await fetch(absoluteUrl).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      });

      // Recursively resolve imports within the fetched content
      const nestedResolved = await resolveImports(content, absoluteUrl);
      resolved = resolved.replace(importStatement, nestedResolved);
    } catch (err) {
      console.warn(`[NexusStyleSheet] Failed to resolve import "${url}" relative to "${currentBase}":`, err);
    }
  }
  return resolved;
}

export class NexusStyleSheet extends (typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet : class {}) {
  private _rawCSSText = '';

  constructor() {
    super();
  }

  async replace(cssText: string): Promise<CSSStyleSheet> {
    this._rawCSSText = cssText;
    const resolved = await resolveImports(cssText);
    if (typeof super.replace === 'function') {
      return await super.replace(resolved);
    }
    return this as any;
  }

  replaceSync(cssText: string): void {
    this._rawCSSText = cssText;
    const hasImports = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g.test(cssText);

    if (typeof super.replaceSync === 'function') {
      super.replaceSync(cssText);
    }

    if (hasImports) {
      // Asynchronously fetch and inline imports in the background
      resolveImports(cssText).then(resolved => {
        if (typeof super.replace === 'function') {
          super.replace(resolved).catch((err: any) => {
            console.error('[NexusStyleSheet] Dynamic replace of resolved imports failed:', err);
          });
        }
      }).catch((err: any) => {
        console.error('[NexusStyleSheet] Failed to resolve imports in background:', err);
      });
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
let compiledClassesSet = new Set<string>();
const pendingClasses: { className: string; el?: HTMLElement; runtime?: RuntimeContext }[] = [];

async function initPlayCompiler() {
  if (tailwindCompiler) return;

  try {
    console.log("🚀 Initializing Tailwind Play JIT compiler...");
    
    // Adopt the index.css sheet using our custom NexusStyleSheet `@import` resolver
    preflightSheet.replaceSync('@import url("https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css");');

    // Fetch the raw files for JIT compiler database initialization
    const [indexCss, themeCss, preflightCss, utilitiesCss] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css').then(r => r.text()),
      fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css').then(r => r.text()),
      fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/preflight.css').then(r => r.text()),
      fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/utilities.css').then(r => r.text()),
    ]);

    const { compile } = await import("tailwindcss");

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
      async loadStylesheet(id) {
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
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();
  private _knownClasses: Set<string> = new Set();
  private _nextId = 0;
  private _preflightEmitted = false;

  private _getJitSheet(): CSSStyleSheet {
    return jitSheet as any;
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

    // Boundary scope check: element must be inside a data-stylesheet container
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

      // Support dynamic data signals binding
      const hasSignalMatch = className.match(/^[a-z]+-\$([a-zA-Z_$][\w$]*)$/);
      if (hasSignalMatch && el && runtime) {
        this.adoptSignalBinding(el, hasSignalMatch[1], runtime);
      }
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
    } catch (_e) {}
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch (_e) {}
      if (rules.length) sheets.push(rules.join('\n'));
    });

    const rules: string[] = [];
    try {
      for (const rule of (jitSheet as any).cssRules) rules.push(rule.cssText);
    } catch (_e) {}
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

    if (typeof CSSStyleSheet === 'undefined') return () => {};

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

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    await sheet.replace(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);
    
    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
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

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    await sheet.replace(cssText);
    this._adoptedSheets.set(sheetId, sheet);

    if (root && 'adoptedStyleSheets' in root) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
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
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter(s => s !== sheet);
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
    
    // B. Adopt preflight and jit sheets onto the scope's root
    if (root && 'adoptedStyleSheets' in root) {
      const sheetsList = Array.from(root.adoptedStyleSheets);
      if (!sheetsList.includes(preflightSheet)) {
        root.adoptedStyleSheets = [...sheetsList, preflightSheet, jitSheet];
      }
    }

    // C. Scan and compile classes inside the subtree
    stylesheet.emitPreflightAndTheme(el);

    return () => {};
  }
};

export default stylesheetModule;
