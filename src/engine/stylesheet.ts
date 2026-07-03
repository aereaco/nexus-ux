// Consolidated Tailwind v4 JIT Engine
import { effect as _effect } from './reactivity.ts';
import { RuntimeContext } from './composition.ts';

// ============================================================================
// 1. AOT-INJECTED STYLE LAYER CONSTANTS
// ============================================================================
import {
  PACKED_COMPONENTS,
  PACKED_KEYFRAMES,
  PACKED_THEME_CSS,
} from '../manifest.ts';

export const PREFLIGHT_CSS = PACKED_COMPONENTS;
export { PACKED_COMPONENTS };

// Two-Tier Isolated Constructable StyleSheets
export const preflightSheet = typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : { replaceSync() {} } as any;
export const jitSheet = typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : { insertRule() {}, deleteRule() {}, cssRules: [] } as any;

// ============================================================================
// 2. CORE COMPILER BRIDGE
// ============================================================================

// deno-lint-ignore-file no-explicit-any

let tailwindCompiler: any = null;
let compiledClassesSet = new Set<string>();
const pendingClasses: { className: string; el?: HTMLElement; runtime?: RuntimeContext }[] = [];

async function initPlayCompiler() {
  if (tailwindCompiler) return;

  try {
    console.log("🚀 Initializing Tailwind Play JIT compiler...");
    
    // Adopt the index.css sheet natively using CSSStyleSheet replace
    await preflightSheet.replace('@import url("https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css");');

    // Fetch theme.css content to feed to JIT compiler
    const themeCSS = await fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css').then(r => r.text());

    const { compile } = await import("tailwindcss");
    tailwindCompiler = await compile('@import "tailwindcss";', {
      base: '/',
      async loadStylesheet(id) {
        if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
          return { path: 'tailwindcss/index.css', base: '/', content: '@import "./theme.css";' };
        }
        if (id === './theme.css' || id === 'tailwindcss/theme.css') {
          return { path: 'tailwindcss/theme.css', base: '/', content: themeCSS };
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
// 3. STYLESHEET MANAGER (DOM Injection)
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

  public emitPreflightAndTheme(): void {
    if (typeof document === 'undefined') return;
    if (document.querySelector('[data-ignore\\:style]')) return;
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

    // Passive DOM scan to collect and compile classes synchronously
    const all = document.querySelectorAll('*');
    all.forEach(el => {
      if (el instanceof HTMLElement) {
        el.classList.forEach(cls => this.adoptClass(cls, el));
      }
    });
  }

  adoptClass(className: string, el?: HTMLElement, runtime?: RuntimeContext): void {
    if (!className || className.trim() === '') return;
    if (el && el.closest && el.closest('[data-ignore\\:style]')) return;
    if (this._knownClasses.has(className)) return;

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
      // Filter out binding expressions or template parameters
      if (className.includes("{") || className.includes("$") || className.includes(":") && !className.includes("\\:")) {
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
      for (const rule of jitSheet.cssRules) rules.push(rule.cssText);
    } catch (_e) {}
    if (rules.length) sheets.push(rules.join('\n'));
    return sheets.join('\n\n');
  }

  adoptCSSSync(cssText: string, id?: string): () => void {
    const processedCSS = this.processAtRules(cssText);
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    
    if (existing) {
      existing.replaceSync(processedCSS);
      return () => this.removeSheet(sheetId);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);
    
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  async adoptCSS(cssText: string, id?: string): Promise<() => void> {
    const processedCSS = this.processAtRules(cssText);
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(processedCSS);
      return () => this.removeSheet(sheetId);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    await sheet.replace(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);
    
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  async adoptRawCSS(cssText: string, id?: string): Promise<() => void> {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(cssText);
      return () => this.removeSheet(sheetId);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    await sheet.replace(cssText);
    this._adoptedSheets.set(sheetId, sheet);

    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  processAtRules(css: string): string {
    return css;
  }

  removeSheet(id: string): void {
    const sheet = this._adoptedSheets.get(id);
    if (!sheet) return;
    if ('document' in globalThis) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
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
// 4. DUAL MODE JIT COMPILER INITIALIZATION
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

if (typeof document !== 'undefined' && typeof CSSStyleSheet !== 'undefined') {
  // Adopt the constructed sheets immediately (they start empty — content follows async/JIT).
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, preflightSheet, jitSheet];
}
