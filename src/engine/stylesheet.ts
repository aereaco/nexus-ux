// Consolidated Tailwind v4 JIT Engine
import { effect as _effect } from './reactivity.ts';
import { RuntimeContext } from './composition.ts';
import {
  PACKED_PREFLIGHT,
  PACKED_THEME,
  PACKED_COMPONENTS,
  PACKED_KEYFRAMES,
} from '../manifest.ts';

// Legacy compatibility exports
export const THEME_CSS = PACKED_THEME;
export const PREFLIGHT_CSS = PACKED_COMPONENTS;

// Two-Tier Isolated Constructable StyleSheets
export const preflightSheet = typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : { replaceSync() {} } as any;
export const jitSheet = typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : { insertRule() {}, deleteRule() {}, cssRules: [] } as any;

if (typeof document !== 'undefined' && typeof CSSStyleSheet !== 'undefined') {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, preflightSheet, jitSheet];
}

const _ruleCache = new Set<string>();
let _isJitEngineBooted = false;
const _staticLookupMap = new Map<string, string>();

const COMPOSITING_VARS = [
  { name: '--tw-blur', initial: ' ', syntax: '*' },
  { name: '--tw-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-invert', initial: ' ', syntax: '*' },
  { name: '--tw-opacity', initial: ' ', syntax: '*' },
  { name: '--tw-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-blur', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-invert', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-opacity', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-shadow-color', initial: ' ', syntax: '*' },
  { name: '--tw-inset-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-inset-shadow-color', initial: ' ', syntax: '*' },
  { name: '--tw-ring-color', initial: ' ', syntax: '*' },
  { name: '--tw-ring-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-inset-ring-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-ring-offset-width', initial: '0px', syntax: '<length>' },
  { name: '--tw-ring-offset-color', initial: '#fff', syntax: '<color>' },
  { name: '--tw-ring-offset-shadow', initial: '0 0 #0000', syntax: '*' }
];

function registerCompositingProperties(): string {
  let css = '';
  for (const v of COMPOSITING_VARS) {
    css += `@property ${v.name} { syntax: "${v.syntax}"; inherits: false; initial-value: ${v.initial}; }\n`;
  }
  return css;
}

/**
 * 2. Algorithmic Packed Utility Dictionary String
 * Non-calculable static keyword classes compressed into a single opaque string.
 * Uses '§' as the key/value delimiter to safely bypass interior CSS colon characters.
 * Uses '|' as the entry separator.
 */
const PACKED_STATIC_DICTIONARY =
  "flex§display:flex" +
  "|inline-flex§display:inline-flex" +
  "|grid§display:grid" +
  "|inline-grid§display:inline-grid" +
  "|block§display:block" +
  "|inline-block§display:inline-block" +
  "|inline§display:inline" +
  "|hidden§display:none" +
  "|contents§display:contents" +
  "|flow-root§display:flow-root" +
  "|list-item§display:list-item" +
  "|table§display:table" +
  "|table-caption§display:table-caption" +
  "|table-cell§display:table-cell" +
  "|table-column§display:table-column" +
  "|table-row§display:table-row" +
  "|static§position:static" +
  "|fixed§position:fixed" +
  "|absolute§position:absolute" +
  "|relative§position:relative" +
  "|sticky§position:sticky" +
  "|visible§visibility:visible" +
  "|invisible§visibility:hidden" +
  "|collapse§visibility:collapse" +
  "|isolate§isolation:isolate" +
  "|isolation-auto§isolation:auto" +
  "|pointer-events-none§pointer-events:none" +
  "|pointer-events-auto§pointer-events:auto" +
  "|select-none§user-select:none" +
  "|select-text§user-select:text" +
  "|select-all§user-select:all" +
  "|select-auto§user-select:auto" +
  "|resize-none§resize:none" +
  "|resize§resize:both" +
  "|resize-y§resize:vertical" +
  "|resize-x§resize:horizontal" +
  "|appearance-none§appearance:none" +
  "|appearance-auto§appearance:auto" +
  "|will-change-auto§will-change:auto" +
  "|whitespace-normal§white-space:normal" +
  "|whitespace-nowrap§white-space:nowrap" +
  "|whitespace-pre§white-space:pre" +
  "|whitespace-pre-line§white-space:pre-line" +
  "|whitespace-pre-wrap§white-space:pre-wrap" +
  "|whitespace-break-spaces§white-space:break-spaces" +
  "|cursor-auto§cursor:auto" +
  "|cursor-default§cursor:default" +
  "|cursor-pointer§cursor:pointer" +
  "|cursor-wait§cursor:wait" +
  "|cursor-text§cursor:text" +
  "|cursor-move§cursor:move" +
  "|cursor-help§cursor:help" +
  "|cursor-not-allowed§cursor:not-allowed" +
  "|cursor-none§cursor:none" +
  "|cursor-grab§cursor:grab" +
  "|cursor-grabbing§cursor:grabbing" +
  "|font-sans§font-family:var(--font-sans, ui-sans-serif, system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\")" +
  "|font-serif§font-family:var(--font-serif, ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif)" +
  "|font-mono§font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)" +
  "|h-dvh§height:100dvh|h-svh§height:100svh|h-lvh§height:100lvh|min-h-dvh§min-height:100dvh|max-h-dvh§max-height:100dvh" +
  "|w-auto§width:auto|h-auto§height:auto|min-w-auto§min-width:auto|min-h-auto§min-height:auto|max-w-none§max-width:none|max-h-none§max-height:none" +
  "|w-full§width:100%|h-full§height:100%|min-w-full§min-width:100%|min-h-full§min-height:100%|max-w-full§max-width:100%|max-h-full§max-height:100%" +
  "|snap-x§scroll-snap-type:x var(--tw-scroll-snap-strictness, proximity)" +
  "|snap-y§scroll-snap-type:y var(--tw-scroll-snap-strictness, proximity)" +
  "|snap-mandatory§--tw-scroll-snap-strictness:mandatory" +
  "|snap-proximity§--tw-scroll-snap-strictness:proximity" +
  "|grow§flex-grow:1" +
  "|shrink§flex-shrink:1";

// Helper: resolve spacing value from bare number or keyword
function resolveSpacing(val: string, negative = false): string {
  if (val === 'px') return negative ? '-1px' : '1px';
  if (val === 'auto') return 'auto';
  if (val === 'full') return negative ? '-100%' : '100%';
  if (val === 'screen') return '100vw';
  if (val.includes('var(')) return val;
  const num = Number(val);
  if (!Number.isNaN(num)) {
    const expr = `calc(var(--spacing) * ${val})`;
    return negative ? `calc(${expr} * -1)` : expr;
  }
  return val;
}

export function initializeJitEngine(): void {
  if (_isJitEngineBooted) return;
  _isJitEngineBooted = true;

  // A. Seal preflight base resets into preflightSheet
  preflightSheet.replaceSync(PACKED_PREFLIGHT);

  // B. Procedural spacing scale generation.
  let spacingBlock = ':root { --spacing: 0.25rem; ';
  for (let i = 1; i <= 64; i++) {
    spacingBlock += `--spacing-${i}: calc(var(--spacing) * ${i});`;
  }
  spacingBlock += ' }';
  
  if (typeof CSSStyleSheet !== 'undefined') {
    try {
      jitSheet.insertRule(spacingBlock, jitSheet.cssRules.length);
    } catch (_) {}
  }

  // C. Hydrate static keyword map from the packed dictionary string.
  const entries = PACKED_STATIC_DICTIONARY.split('|');
  for (let i = 0; i < entries.length; i++) {
    const delimIdx = entries[i].indexOf('§');
    if (delimIdx !== -1) {
      _staticLookupMap.set(entries[i].slice(0, delimIdx), entries[i].slice(delimIdx + 1));
    }
  }
}

/**
 * Core JIT Token Evaluator — Dual-Lane Processing
 */
export function parseAndInjectToken(element: HTMLElement | undefined, rawToken: string, runtime?: RuntimeContext): void {
  // Strip variant chain and isolate the utility token
  const colonParts = rawToken.split(':');
  const utilityToken = colonParts[colonParts.length - 1];
  const variants = colonParts.slice(0, -1);

  // Safe class name escaping backslashes for special characters
  const safeClassName = rawToken.replace(/[:/[\].]/g, '_');

  // Deduplicate
  if (_ruleCache.has(safeClassName)) {
    if (element && !element.classList.contains(safeClassName)) element.classList.add(safeClassName);
    return;
  }

  let cssValue = '';
  let cssProperty = '';

  // ── 1. space-x / space-y Container Spacing ────────────────────────────────
  const spaceMatch = utilityToken.match(/^space-(x|y)-(.+)$/);
  if (spaceMatch) {
    const [, axis, rawVal] = spaceMatch;
    const val = resolveSpacing(rawVal, false); // Handle negative? Usually container spacing is positive
    const prop = axis === 'x' ? 'margin-left' : 'margin-top';
    const rule = `.${safeClassName} > :not([hidden], template) ~ :not([hidden], template){${prop}:${val};}`;
    _injectVariantWrapped(safeClassName, rule, variants);
    _ruleCache.add(safeClassName);
    if (element) element.classList.add(safeClassName);
    return;
  }

  // ── 2. Arbitrary Value brackets & Signal Bindings ─────────────────────────
  const arbitraryMatch = utilityToken.match(/^(w|h|p|m|gap)-\[(.+)\]$/);
  if (arbitraryMatch) {
    const [, prefix, rawVal] = arbitraryMatch;
    // Check if it's a signal key name (e.g. w-[val])
    if (/^[#a-zA-Z_$][\w$#.]*$/.test(rawVal)) {
      if (element && runtime) {
        adoptSignalBinding(element, prefix, rawVal, runtime);
      }
      return;
    }
    // Otherwise it is a custom static arbitrary value (e.g. w-[150px])
    const propertyMap: Record<string, string> = {
      w: 'width', h: 'height', p: 'padding', m: 'margin', gap: 'gap'
    };
    const prop = propertyMap[prefix];
    if (prop) {
      const val = rawVal.replace(/_/g, ' ');
      const rule = `.${safeClassName}{${prop}:${val};}`;
      _injectVariantWrapped(safeClassName, rule, variants);
      _ruleCache.add(safeClassName);
      if (element) element.classList.add(safeClassName);
      return;
    }
  }

  // ── LANE 1: Procedural Variable Mapper ────────────────────────────────────
  // w-*, h-*, p-*, m-*, gap-*, top, right, bottom, left, etc.
  const proceduralMatch = utilityToken.match(
    /^(w|h|m|mt|mr|mb|ml|mx|my|p|pt|pr|pb|pl|px|py|gap|gap-x|gap-y|inset|top|right|bottom|left|min-w|max-w|min-h|max-h|basis|size)-(.+)$/
  );

  if (proceduralMatch) {
    const [, prefix, rawVal] = proceduralMatch;
    const propertyMap: Record<string, string> = {
      w: 'width', h: 'height',
      m: 'margin', mt: 'margin-top', mr: 'margin-right', mb: 'margin-bottom', ml: 'margin-left',
      mx: 'margin-inline', my: 'margin-block',
      p: 'padding', pt: 'padding-top', pr: 'padding-right', pb: 'padding-bottom', pl: 'padding-left',
      px: 'padding-inline', py: 'padding-block',
      gap: 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap',
      inset: 'inset', top: 'top', right: 'right', bottom: 'bottom', left: 'left',
      'min-w': 'min-width', 'max-w': 'max-width',
      'min-h': 'min-height', 'max-h': 'max-height',
      basis: 'flex-basis', size: 'width'
    };
    cssProperty = propertyMap[prefix] || '';

    if (cssProperty) {
      if (rawVal === 'auto') {
        cssValue = 'auto';
      } else if (rawVal === 'full') {
        cssValue = '100%';
      } else if (rawVal === 'screen') {
        cssValue = prefix === 'w' || prefix === 'min-w' || prefix === 'max-w' ? '100vw' : '100vh';
      } else if (rawVal === 'px') {
        cssValue = '1px';
      } else if (rawVal === 'fit') {
        cssValue = 'fit-content';
      } else if (rawVal.includes('/')) {
        const [num, den] = rawVal.split('/').map(Number);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          cssValue = `${(num / den) * 100}%`;
        }
      } else if (!isNaN(Number(rawVal))) {
        cssValue = `calc(var(--spacing) * ${rawVal})`;
      }

      if (prefix === 'size' && cssValue) {
        const doubleRule = `.${safeClassName}{width:${cssValue};height:${cssValue};}`;
        _injectVariantWrapped(safeClassName, doubleRule, variants);
        _ruleCache.add(safeClassName);
        if (element) element.classList.add(safeClassName);
        return;
      }
    }
  }

  // ── LANE 2: Dictionary Unpacker ────────────────────────────────────────────
  if (!cssValue && _staticLookupMap.has(utilityToken)) {
    const declaration = _staticLookupMap.get(utilityToken)!;
    const colonIdx = declaration.indexOf(':');
    
    // Safety fallback
    if (colonIdx !== -1) {
      cssProperty = declaration.slice(0, colonIdx);
      cssValue = declaration.slice(colonIdx + 1);
    }
  }

  if (cssProperty && cssValue) {
    const rule = `.${safeClassName}{${cssProperty}:${cssValue};}`;
    _injectVariantWrapped(safeClassName, rule, variants);
    _ruleCache.add(safeClassName);
    if (element) element.classList.add(safeClassName);
  }
}

function _injectVariantWrapped(safeClassName: string, baseRule: string, variants: string[]): void {
  if (typeof CSSStyleSheet === 'undefined') return;

  if (variants.length === 0) {
    try {
      jitSheet.insertRule(baseRule, jitSheet.cssRules.length);
    } catch (_) {}
    return;
  }

  const breakpointMap: Record<string, string> = {
    sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem'
  };

  let wrappedRule = baseRule;

  for (let i = variants.length - 1; i >= 0; i--) {
    const v = variants[i];
    if (breakpointMap[v]) {
      wrappedRule = `@media (min-width: ${breakpointMap[v]}) { ${wrappedRule} }`;
    } else if (v === 'dark') {
      wrappedRule = `@media (prefers-color-scheme: dark) { ${wrappedRule} }`;
    } else if (v === 'print') {
      wrappedRule = `@media print { ${wrappedRule} }`;
    } else if (v === 'hover') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:hover`);
    } else if (v === 'focus') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:focus`);
    } else if (v === 'active') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:active`);
    } else if (v === 'disabled') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:disabled`);
    } else if (v === 'focus-within') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:focus-within`);
    } else if (v === 'focus-visible') {
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.${safeClassName}:focus-visible`);
    } else if (v.startsWith('group-')) {
      const sub = v.slice(6);
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.group:${sub} .${safeClassName}`);
    } else if (v.startsWith('peer-')) {
      const sub = v.slice(5);
      wrappedRule = wrappedRule.replace(`.${safeClassName}`, `.peer:${sub} ~ .${safeClassName}`);
    }
  }

  try {
    jitSheet.insertRule(wrappedRule, jitSheet.cssRules.length);
  } catch (_) {}
}

export function adoptSignalBinding(
  element: HTMLElement,
  utilityPrefix: string,
  signalBindingKey: string,
  runtime: RuntimeContext
): void {
  const propertyTranslation: Record<string, string> = {
    w: 'width', h: 'height', p: 'padding', m: 'margin', gap: 'gap'
  };
  const cssTargetProperty = propertyTranslation[utilityPrefix];
  if (!cssTargetProperty) return;

  const atomicClassName = `nx-zczs-${utilityPrefix}-${signalBindingKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

  runtime.effect(() => {
    const derivedValue = runtime.evaluate(element, signalBindingKey);
    const dynamicRule = `.${atomicClassName}{${cssTargetProperty}:calc(var(--spacing) * ${derivedValue});}`;

    const ruleSelector = `.${atomicClassName}`;
    let matchedIndex = -1;

    if (typeof CSSStyleSheet !== 'undefined') {
      for (let i = 0; i < jitSheet.cssRules.length; i++) {
        const rule = jitSheet.cssRules[i] as CSSStyleRule;
        if (rule.selectorText === ruleSelector) {
          matchedIndex = i;
          break;
        }
      }

      try {
        if (matchedIndex === -1) {
          jitSheet.insertRule(dynamicRule, jitSheet.cssRules.length);
          element.classList.add(atomicClassName);
        } else {
          jitSheet.deleteRule(matchedIndex);
          jitSheet.insertRule(dynamicRule, matchedIndex);
        }
      } catch (_) {}
    }
  });
}

// ── StyleSheetManager wrapper class for backward compatibility with the framework ──
class StyleSheetManager {
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();
  private _nextId = 0;
  private _preflightEmitted = false;
  private _knownClasses = _ruleCache;

  emitPreflightAndTheme(): void {
    if (typeof document === 'undefined') return;
    if (this._preflightEmitted) return;
    this._preflightEmitted = true;

    initializeJitEngine();

    // Load pre-packed blocks
    if (PACKED_COMPONENTS.length > 0) {
      this.adoptCSSSync(PACKED_COMPONENTS, 'nexus-components');
    }
    if (PACKED_KEYFRAMES.length > 0) {
      this.adoptCSSSync(PACKED_KEYFRAMES, 'nexus-keyframes');
    }
    if (PACKED_THEME.length > 0) {
      const compositingCSS = registerCompositingProperties();
      this.adoptCSSSync(PACKED_THEME + compositingCSS, 'nexus-theme');
    }

    // Passive scan
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
    parseAndInjectToken(el, className, runtime);
  }

  adoptCSSSync(cssText: string, id?: string): () => void {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    
    if (existing) {
      existing.replaceSync(cssText);
      return () => this.removeSheet(sheetId);
    }

    if (typeof CSSStyleSheet === 'undefined') return () => {};

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    this._adoptedSheets.set(sheetId, sheet);
    
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  async adoptCSS(cssText: string, id?: string): Promise<() => void> {
    return this.adoptCSSSync(cssText, id);
  }

  removeSheet(id: string): void {
    const sheet = this._adoptedSheets.get(id);
    if (sheet) {
      this._adoptedSheets.delete(id);
      if (typeof document !== 'undefined') {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
      }
    }
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch (_) {}
      if (rules.length) sheets.push(rules.join('\n'));
    });

    if (typeof CSSStyleSheet !== 'undefined') {
      const rules: string[] = [];
      try {
        for (const rule of jitSheet.cssRules) rules.push(rule.cssText);
      } catch (_) {}
      if (rules.length) sheets.push(rules.join('\n'));
    }
    return sheets.join('\n');
  }
}

export const stylesheet = new StyleSheetManager();
