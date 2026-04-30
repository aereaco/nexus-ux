// Consolidated Tailwind v4 JIT Engine
import { effect as _effect } from './reactivity.ts';
import { RuntimeContext } from './composition.ts';

// ============================================================================
// 1. THEME CONSTANTS 
// ============================================================================
export const THEME_CSS = `:root {
  --font-sans: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  --color-transparent: transparent;
  --color-current: currentColor;
  --color-white: #fff;
  --color-black: #000;

  --color-slate-50: oklch(98.4% 0.003 247.858);
  --color-slate-100: oklch(96.8% 0.007 247.858);
  --color-slate-200: oklch(92.9% 0.013 255.508);
  --color-slate-300: oklch(88.1% 0.021 259.75);
  --color-slate-400: oklch(82.3% 0.031 259.75);
  --color-slate-500: oklch(70.7% 0.022 261.325);
  --color-slate-600: oklch(52.6% 0.03 264.767);
  --color-slate-700: oklch(43.9% 0.027 268.808);
  --color-slate-800: oklch(37% 0.025 268.808);
  --color-slate-900: oklch(31.3% 0.02 268.808);
  --color-slate-950: oklch(21.3% 0.014 268.808);

  --color-gray-500: oklch(70.7% 0.022 261.325);
  --color-zinc-500: oklch(70.7% 0.022 261.325);
  --color-neutral-500: oklch(70.7% 0.022 261.325);
  --color-stone-500: oklch(70.7% 0.022 261.325);

  --color-red-500: oklch(63.7% 0.237 25.331);
  --color-orange-500: oklch(70.5% 0.213 47.604);
  --color-amber-500: oklch(76.9% 0.188 70.08);
  --color-yellow-500: oklch(85.2% 0.199 91.936);
  --color-lime-500: oklch(86.8% 0.189 124.166);
  --color-green-500: oklch(72.7% 0.192 149.33);
  --color-emerald-500: oklch(69.6% 0.17 162.48);
  --color-teal-500: oklch(66.1% 0.125 182.018);
  --color-cyan-500: oklch(71.5% 0.143 215.221);
  --color-sky-500: oklch(71.4% 0.142 232.661);
  --color-blue-500: oklch(62.3% 0.214 259.815);
  --color-indigo-500: oklch(58.5% 0.233 277.117);
  --color-violet-500: oklch(60.6% 0.25 293.628);
  --color-purple-500: oklch(62.7% 0.265 303.9);
  --color-fuchsia-500: oklch(66.7% 0.295 322.15);
  --color-pink-500: oklch(69.7% 0.274 342.55);
  --color-rose-500: oklch(65.6% 0.241 354.308);

  --spacing: 0.25rem;
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-full: 9999px;

  --text-xs: 0.75rem;
  --text-xs--line-height: 1rem;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.25rem;
  --text-base: 1rem;
  --text-base--line-height: 1.5rem;
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.75rem;
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.75rem;
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem;
  --text-3xl: 1.875rem;
  --text-3xl--line-height: 2.25rem;
  --text-4xl: 2.25rem;
  --text-4xl--line-height: 2.5rem;
  --text-5xl: 3rem;
  --text-5xl--line-height: 1;
  --text-6xl: 3.75rem;
  --text-6xl--line-height: 1;
  --text-7xl: 4.5rem;
  --text-7xl--line-height: 1;
  --text-8xl: 6rem;
  --text-8xl--line-height: 1;
  --text-9xl: 8rem;
  --text-9xl--line-height: 1;

  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  --blur-sm: 4px;
  --blur-md: 8px;
  --blur-lg: 12px;
  --blur-xl: 16px;
  --blur-2xl: 24px;
  --blur-3xl: 40px;

  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

  --default-font-family: var(--font-sans);
  --default-mono-font-family: var(--font-mono);
}
`;


export const PREFLIGHT_CSS = `
@layer properties, theme, base, components, utilities;

@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0 solid;
  }
  html, :host {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
    font-family: var(--default-font-family, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji');
    -webkit-tap-highlight-color: transparent;
  }
  ol, ul, menu { list-style: none; }
  img, svg, video, canvas, audio, iframe, embed, object { display: block; vertical-align: middle; }
  img, video { max-width: 100%; height: auto; }
}
`;

const KEYFRAMES_CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
@keyframes pulse { 50% { opacity: 0.5; } }
@keyframes bounce {
  0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: none; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}
`;



// ============================================================================
// 2. CORE ENGINE (Types, Parser, CSS Generation)
// ============================================================================

// deno-lint-ignore-file no-explicit-any

export interface ASTNode {
  kind: 'declaration' | 'rule' | 'at-rule' | 'at-root';
  property?: string;
  value?: string;
  important?: boolean;
  selector?: string;
  nodes?: ASTNode[];
  name?: string;
  params?: string;
}

export interface ValueNode {
  kind: 'named' | 'arbitrary' | 'color';
  value: string;
}

export interface Candidate {
  kind: 'static' | 'functional' | 'arbitrary';
  root: string;
  value?: ValueNode;
  modifier?: ValueNode | null;
  property?: string; // For arbitrary properties [prop:val]
  variants: string[];
  important: boolean;
  negative: boolean;
  raw: string;
  hasSignal?: string;
}

export type CompileFn = (candidate: Candidate, ds: DesignSystem) => ASTNode[] | undefined;

interface Registry {
  static: Map<string, CompileFn[]>;
  functional: Map<string, { compileFn: CompileFn; options?: Record<string, unknown> }[]>;
}

interface VariantRegistry {
  static: Map<string, ASTNode[]>;
  functional: Map<string, { compileFn: CompileFn; options?: Record<string, unknown> }>;
  compound: Map<string, { root: string; variant: string; options?: Record<string, unknown> }>;
}

/**
 * DesignSystem — Native Singleton Engine mapping classes to AST nodes.
 * Explicitly avoids unifiedRef to prevent ZCZS serialization of functional handlers.
 */
export class DesignSystem {
  private _utilities: Registry = {
    static: new Map(),
    functional: new Map()
  };

  private _variants: VariantRegistry = {
    static: new Map(),
    functional: new Map(),
    compound: new Map()
  };

  static(this: DesignSystem, root: string, compileFn: CompileFn, _options?: Record<string, unknown>): void {
    this._utilities.static.set(root, (this._utilities.static.get(root) || []).concat([compileFn]));
  }

  functional(this: DesignSystem, root: string, compileFn: CompileFn, _options?: Record<string, unknown>): void {
    this._utilities.functional.set(root, (this._utilities.functional.get(root) || []).concat([{ compileFn, options: _options }]));
  }

  variant(name: string, definition: ASTNode[] | CompileFn) {
    if (typeof definition === 'function') {
      this._variants.functional.set(name, { compileFn: definition });
    } else {
      this._variants.static.set(name, definition);
    }
  }

  /**
   * Registers a custom component or utility rule dynamically.
   * Matches Tailwind v4 @utility and @layer components behavior.
   */
  registerCustomRule(root: string, cssText: string) {
    this.static(root, (candidate) => {
      // Return a rule node that directly contains the custom CSS
      // We wrap it in a pseudo-node that serializeAST can handle
      return [{
        kind: 'at-root',
        selector: `.${candidate.raw.replace(/([\[\]/!:#.])/g, '\\$1')}`,
        nodes: [{ kind: 'declaration', property: 'raw', value: cssText }]
      }];
    });
  }

  has(name: string, kind: 'static' | 'functional'): boolean {
    return kind === 'static' ? this._utilities.static.has(name) : this._utilities.functional.has(name);
  }

  getStatic(name: string) {
    return this._utilities.static.get(name) || [];
  }

  getFunctional(name: string) {
    return this._utilities.functional.get(name) || [];
  }

  parseVariant(name: string): ASTNode[] | null {
    if (this._variants.static.has(name)) return this._variants.static.get(name)!;
    if (this._variants.functional.has(name)) {
      return this._variants.functional.get(name)!.compileFn({ kind: 'static', root: name, variants: [], important: false, negative: false, raw: name }, this) || null;
    }
    return null;
  }

  *parseCandidate(raw: string): Generator<Candidate> {
    const variants: string[] = [];
    let important = false;
    let negative = false;
    let baseTerm = raw;

    if (baseTerm.endsWith('!')) {
       baseTerm = baseTerm.slice(0, -1);
       important = true;
    }
    
    const parts = baseTerm.split(':');
    baseTerm = parts.pop() || '';
    variants.push(...parts);

    if (baseTerm.startsWith('-')) {
       baseTerm = baseTerm.slice(1);
       negative = true;
    }

    // Arbitrary property [prop:value]
    if (baseTerm.startsWith('[') && baseTerm.endsWith(']')) {
      const content = baseTerm.slice(1, -1);
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0) {
        yield {
          kind: 'arbitrary',
          root: '',
          property: content.slice(0, colonIndex),
          value: { kind: 'arbitrary', value: content.slice(colonIndex + 1).replace(/_/g, ' ') },
          variants,
          important,
          negative,
          raw
        };
        return;
      }
    }

    const slashParts = contextAwareSplit(baseTerm, '/');
    let term = slashParts[0];
    const modifierValue = slashParts[1] || null;

    // Fraction detection: w-1/2
    if (modifierValue && /^\d+$/.test(modifierValue)) {
      const lastDash = term.lastIndexOf('-');
      if (lastDash > 0) {
        const possibleNum = term.slice(lastDash + 1);
        if (/^\d+$/.test(possibleNum)) {
          term = term.slice(0, lastDash) + '-' + `${possibleNum}/${modifierValue}`;
        }
      }
    }

    // Bracket value functional match?
    let valNode: ValueNode | undefined = undefined;
    let hasSignal: string | undefined = undefined;
    if (term.includes('[') && term.endsWith(']')) {
       const bStart = term.indexOf('[');
       const inside = term.slice(bStart + 1, -1);
       if (/^[#a-zA-Z_$][\w$#.]*$/.test(inside)) {
          hasSignal = inside;
          const varName = inside.replace(/[#.]/g, '-');
          valNode = { kind: 'named', value: `var(--nx-${varName})` };
       } else {
          valNode = { kind: 'named', value: inside.replace(/_/g, ' ') };
       }
    }

    if (this.has(term, 'static')) {
      yield { kind: 'static', root: term, variants, important, negative, raw, hasSignal };
      return; 
    }

    // Functional parsing iterative lookup
    if (!valNode) {
      const parts = term.split('-');
      for (let i = parts.length; i >= 1; i--) {
        const root = parts.slice(0, i).join('-');
        const value = parts.slice(i).join('-');
        
        if (this.has(root, 'functional')) {
          yield {
            kind: 'functional',
            root,
            value: value ? { kind: 'named', value } : undefined,
            modifier: modifierValue ? { kind: 'named', value: modifierValue } : null,
            variants,
            important,
            negative,
            raw,
            hasSignal
          };
          if (value || i === parts.length) return; // Matched, and it's the longest root
        }
      }
    } else {
      const bIdx = term.indexOf('[');
      const root = bIdx > 0 ? (term[bIdx-1] === '-' ? term.slice(0, bIdx - 1) : term.slice(0, bIdx)) : term.slice(0, bIdx);
      if (this.has(root, 'functional')) {
        yield {
          kind: 'functional',
          root,
          value: valNode,
          modifier: modifierValue ? { kind: 'named', value: modifierValue } : null,
          variants,
          important,
          negative,
          raw,
          hasSignal
        };
      }
    }
  }

  generateCSS(candidate: Candidate): string {
    const nodes: ASTNode[] = [];
    
    if (candidate.kind === 'static') {
      const fns = this.getStatic(candidate.root);
      for (const fn of fns) {
        const result = fn(candidate, this);
        if (result) nodes.push(...result);
      }
    } else if (candidate.kind === 'functional') {
      const registry = this.getFunctional(candidate.root);
      for (const item of registry) {
        if (typeof item.compileFn !== 'function') {
          console.error(`[FATAL] JIT Crash on "${candidate.root}": item.compileFn is NOT a function! Item structure:`, item);
          console.error(`[FATAL] Full functional registry for ${candidate.root}:`, registry);
        }
        
        const result = item.compileFn(candidate, this);
        if (result) nodes.push(...result);
      }
    } else if (candidate.kind === 'arbitrary') {
      const v = typeof candidate.value === 'object' ? candidate.value.value : (candidate.value || '');
      nodes.push({
        kind: 'declaration',
        property: candidate.property,
        value: candidate.negative ? `calc(${v} * -1)` : v,
        important: candidate.important
      });
    }

    if (nodes.length === 0) return '';
    return serializeAST(nodes, candidate);
  }
}

function contextAwareSplit(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '[') depth++;
    else if (char === ']') depth--;
    if (char === delimiter && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) result.push(current);
  return result;
}



function serializeAST(nodes: ASTNode[], candidate: Candidate): string {
  let declarations = "";
  const escapedName = candidate.raw.replace(/([\[\]/!:#.])/g, '\\$1');
  let selectorTarget = `.${escapedName}`;

  let wrapperStart = "";
  let wrapperEnd = "";
  
  // Apply our variant transformations
  for (const variant of candidate.variants) {
    // Media queries
    if (variant === 'sm') { wrapperStart += '@media (min-width: 40rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'md') { wrapperStart += '@media (min-width: 48rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'lg') { wrapperStart += '@media (min-width: 64rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'xl') { wrapperStart += '@media (min-width: 80rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === '2xl') { wrapperStart += '@media (min-width: 96rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'dark') { wrapperStart += '@media (prefers-color-scheme: dark) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'print') { wrapperStart += '@media print { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    
    // Group & Peer compound variants (simplified for native parity mapping)
    if (variant.startsWith('group-')) {
       const sub = variant.slice(6);
       selectorTarget = `.group:${sub === 'hover' ? 'hover' : sub === 'focus' ? 'focus' : sub} ${selectorTarget}`;
       continue;
    }
    if (variant.startsWith('peer-')) {
       const sub = variant.slice(5);
       selectorTarget = `.peer:${sub === 'hover' ? 'hover' : sub === 'focus' ? 'focus' : sub} ~ ${selectorTarget}`;
       continue;
    }
    
    // Arbitrary variants [&_p]:hover etc
    if (variant.startsWith('[') && variant.endsWith(']')) {
        const customSel = variant.slice(1, -1).replace(/_/g, ' ');
        if (customSel.includes('&')) {
            selectorTarget = customSel.replace(/&/g, selectorTarget);
        } else {
            wrapperStart += `@media ${customSel} { `; wrapperEnd = ' }' + wrapperEnd; 
        }
        continue;
    }
    
    // Map pseudos natively
    const pseudoMap: Record<string, string> = {
      first: ':first-child', last: ':last-child', even: ':nth-child(even)', odd: ':nth-child(odd)',
      hover: ':hover', focus: ':focus', 'focus-within': ':focus-within', 'focus-visible': ':focus-visible',
      active: ':active', disabled: ':disabled', checked: ':checked',
      'in-range': ':in-range', 'out-of-range': ':out-of-range',
      'placeholder-shown': ':placeholder-shown', autofill: ':autofill',
      'read-only': ':read-only', open: '[open]', empty: ':empty',
      target: ':target', 'first-of-type': ':first-of-type', 'last-of-type': ':last-of-type',
      'only-of-type': ':only-of-type', 'popover-open': ':popover-open',
      enabled: ':enabled', indeterminate: ':indeterminate', default: ':default',
      required: ':required', valid: ':valid', invalid: ':invalid'
    };
    
    if (pseudoMap[variant]) {
       selectorTarget += pseudoMap[variant];
    } else {
       // Passthrough valid custom state pseudos
       selectorTarget += `:${variant}`;
    }
  }
  
  // Deterministic Property Sort Order (Tailwind Parity)
  const PROPERTY_ORDER_MAP: Record<string, number> = {
    'appearance': 1, 'display': 2, 'position': 3, 'top': 4, 'right': 5, 'bottom': 6, 'left': 7, 'inset': 8,
    'flex': 10, 'flex-basis': 11, 'flex-direction': 12, 'flex-grow': 13, 'flex-shrink': 14, 'flex-wrap': 15,
    'grid': 20, 'grid-area': 21, 'gap': 25, 'align-content': 30, 'align-items': 31, 'align-self': 32,
    'justify-content': 35, 'justify-items': 36, 'justify-self': 37,
    'order': 40, 'float': 45, 'clear': 46,
    'width': 50, 'min-width': 51, 'max-width': 52, 'height': 53, 'min-height': 54, 'max-height': 55,
    'inline-size': 56, 'block-size': 57,
    'margin': 60, 'margin-top': 61, 'margin-right': 62, 'margin-bottom': 63, 'margin-left': 64,
    'padding': 70, 'padding-top': 71, 'padding-right': 72, 'padding-bottom': 73, 'padding-left': 74,
    'font-family': 80, 'font-size': 81, 'font-weight': 82, 'line-height': 83, 'letter-spacing': 84,
    'color': 90, 'text-align': 91, 'text-decoration': 92, 'text-transform': 93,
    'background': 100, 'background-color': 101, 'background-image': 102,
    'border': 110, 'border-width': 111, 'border-style': 112, 'border-color': 113, 'border-radius': 114,
    'outline': 120, 'outline-width': 121, 'outline-style': 122, 'outline-color': 123, 'outline-offset': 124,
    'opacity': 130, 'visibility': 131, 'z-index': 132, 'content': 133,
    'transition': 140, 'transition-property': 141, 'transition-duration': 142, 'transition-timing-function': 143,
    'transform': 150, 'animation': 151, 'filter': 152, 'backdrop-filter': 153
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.kind !== 'declaration' || b.kind !== 'declaration') return 0;
    const propA = a.property || "";
    const propB = b.property || "";
    const orderA = PROPERTY_ORDER_MAP[propA] || 999;
    const orderB = PROPERTY_ORDER_MAP[propB] || 999;
    if (orderA !== orderB) return orderA - orderB;
    return propA.localeCompare(propB);
  });

  let extraCSS = "";
  for (const node of sortedNodes) {
    if (node.kind === 'declaration') {
      if (node.property === 'raw') {
        declarations += node.value;
      } else {
        declarations += `${node.property}: ${node.value}${node.important || candidate.important ? ' !important' : ''}; `;
      }
    } else if (node.kind === 'at-rule') {
      extraCSS += `@${node.name} ${node.params} { ${node.nodes ? node.nodes.map(n => `${n.property}: ${n.value};`).join(' ') : ''} } `;
    } else if (node.kind === 'at-root' && node.selector) {
      // Direct nested rule injection with '&' resolution
      const fullSelector = node.selector.includes('&') 
        ? node.selector.replace(/&/g, selectorTarget)
        : `${selectorTarget} ${node.selector}`;
      const body = node.nodes?.map(n => n.property === 'raw' ? n.value : `${n.property}: ${n.value};`).join('') || '';
      declarations += `} ${fullSelector} { ${body} `;
    }
  }
  
  if (!declarations && !extraCSS) return "";
  return `${extraCSS}${wrapperStart}${selectorTarget} { ${declarations}}${wrapperEnd}`;
}




// ============================================================================
// 3. UTILITY REGISTRY
// ============================================================================
/**
 * tailwind-utilities.ts — Complete Tailwind v4 utility registry
 * Ported from @tailwindcss/browser@4.2.2
 * ZCZS: Pure registration functions, zero heap allocation at runtime
 */
// Helper: create a declaration node (borrowing pattern — no allocation beyond the literal)
function d(property: string, value: string, important = false): ASTNode {
  return { kind: 'declaration', property, value, important };
}

// Helper: create an at-root node
function K(nodes: ASTNode[]): ASTNode {
  return { kind: 'at-root', nodes };
}

// Helper: register a batch of static name→declarations
function statics(ds: DesignSystem, entries: [string, [string, string][]][]) {
  for (const [name, decls] of entries) {
    ds.static(name, () => decls.map(([p, v]) => d(p, v)));
  }
}

// Helper: resolve spacing value from bare number or keyword
function resolveSpacing(val: string, negative = false): string {
  if (val === 'px') return negative ? '-1px' : '1px';
  if (val === 'auto') return 'auto';
  if (val === 'full') return negative ? '-100%' : '100%';
  if (val === 'screen') return '100vw';
  if (val.includes('var(')) return val;
  // Decimal support: 1.5 → calc(var(--spacing) * 1.5)
  const num = Number(val);
  if (!Number.isNaN(num)) {
    const expr = `calc(var(--spacing) * ${val})`;
    return negative ? `calc(${expr} * -1)` : expr;
  }
  return val;
}

function resolveThemeValue(key: string, v: string): string {
  if (v === 'none') return 'none';
  if (v.startsWith('[') || v.startsWith('#') || v.includes('(')) return v;
  // v4 convention: use theme variables for named keys
  return `var(--${key}-${v}, ${v})`;
}

// Helper: resolve color with optional opacity modifier
function resolveColor(val: string | ValueNode | undefined, modifier?: ValueNode | null): string {
  const v = (typeof val === 'string' ? val : val?.value) || '';
  if (v === 'transparent') return 'transparent';
  if (v === 'current') return 'currentcolor';
  if (v === 'inherit') return 'inherit';
  
  // v4 convention: if it starts with [ it is already resolved or arbitrary
  let color = v.startsWith('#') || v.includes('var(') || v.includes('(') || v.startsWith('[')
    ? v
    : `var(--color-${v})`;
    
  if (modifier) {
    const opacity = /^\d+$/.test(modifier.value) ? `${modifier.value}%` : modifier.value;
    return `color-mix(in oklch, ${color} ${opacity}, transparent)`;
  }
  return color;
}

export function populateStandardUtilities(ds: DesignSystem) {
  // ═══════════════════════════════════════════════════════
  // 1. DISPLAY & LAYOUT
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['block', [['display', 'block']]],
    ['inline-block', [['display', 'inline-block']]],
    ['inline', [['display', 'inline']]],
    ['flex', [['display', 'flex']]],
    ['inline-flex', [['display', 'inline-flex']]],
    ['grid', [['display', 'grid']]],
    ['inline-grid', [['display', 'inline-grid']]],
    ['hidden', [['display', 'none', true]]],
    ['contents', [['display', 'contents']]],
    ['flow-root', [['display', 'flow-root']]],
    ['list-item', [['display', 'list-item']]],
    ['table', [['display', 'table']]],
    ['inline-table', [['display', 'inline-table']]],
    ['table-caption', [['display', 'table-caption']]],
    ['table-cell', [['display', 'table-cell']]],
    ['table-column', [['display', 'table-column']]],
    ['table-column-group', [['display', 'table-column-group']]],
    ['table-footer-group', [['display', 'table-footer-group']]],
    ['table-header-group', [['display', 'table-header-group']]],
    ['table-row-group', [['display', 'table-row-group']]],
    ['table-row', [['display', 'table-row']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 2. POSITION
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['static', [['position', 'static']]],
    ['fixed', [['position', 'fixed']]],
    ['absolute', [['position', 'absolute']]],
    ['relative', [['position', 'relative']]],
    ['sticky', [['position', 'sticky']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 3. VISIBILITY
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['visible', [['visibility', 'visible']]],
    ['invisible', [['visibility', 'hidden']]],
    ['collapse', [['visibility', 'collapse']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 4. ISOLATION & Z-INDEX
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['isolate', [['isolation', 'isolate']]],
    ['isolation-auto', [['isolation', 'auto']]],
  ]);
  ds.functional('z', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('z-index', 'auto')];
    return [d('z-index', c.negative ? `calc(${v} * -1)` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 5. FLEXBOX
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['flex-row', [['flex-direction', 'row']]],
    ['flex-row-reverse', [['flex-direction', 'row-reverse']]],
    ['flex-col', [['flex-direction', 'column']]],
    ['flex-col-reverse', [['flex-direction', 'column-reverse']]],
    ['flex-wrap', [['flex-wrap', 'wrap']]],
    ['flex-nowrap', [['flex-wrap', 'nowrap']]],
    ['flex-wrap-reverse', [['flex-wrap', 'wrap-reverse']]],
    ['flex-auto', [['flex', 'auto']]],
    ['flex-initial', [['flex', '0 auto']]],
    ['flex-none', [['flex', 'none']]],
  ]);
  // flex-{n} functional with fraction support
  ds.functional('flex', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'col') return [d('flex-direction', 'column')];
    if (v === 'row') return [d('flex-direction', 'row')];
    // Fraction: flex-1/2 → flex: calc(1/2 * 100%)
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        return [d('flex', `calc(${num}/${den} * 100%)`)];
      }
    }
    if (/^\d+$/.test(v)) return [d('flex', `${v} ${v} 0%`)];
    return [d('flex', v)];
  });

  // grow / shrink
  ds.static('grow', () => [d('flex-grow', '1')]);
  ds.static('shrink', () => [d('flex-shrink', '1')]);
  ds.functional('grow', (c) => {
    if (!c.value) return [d('flex-grow', '1')];
    return [d('flex-grow', c.value.value)];
  });
  ds.functional('shrink', (c) => {
    if (!c.value) return [d('flex-shrink', '1')];
    return [d('flex-shrink', c.value.value)];
  });

  // basis
  ds.functional('basis', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('flex-basis', 'auto')];
    if (v === 'full') return [d('flex-basis', '100%')];
    // Fraction: basis-1/2 → flex-basis: calc(1/2 * 100%)
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        return [d('flex-basis', `calc(${num}/${den} * 100%)`)];
      }
    }
    return [d('flex-basis', resolveSpacing(v))];
  });

  // order
  ds.functional('order', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'first') return [d('order', '-9999')];
    if (v === 'last') return [d('order', '9999')];
    return [d('order', c.negative ? `calc(${v} * -1)` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 6. ALIGNMENT
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    // align-items
    ['items-center', [['align-items', 'center']]],
    ['items-start', [['align-items', 'flex-start']]],
    ['items-end', [['align-items', 'flex-end']]],
    ['items-baseline', [['align-items', 'baseline']]],
    ['items-stretch', [['align-items', 'stretch']]],
    // justify-content
    ['justify-normal', [['justify-content', 'normal']]],
    ['justify-center', [['justify-content', 'center']]],
    ['justify-start', [['justify-content', 'flex-start']]],
    ['justify-end', [['justify-content', 'flex-end']]],
    ['justify-between', [['justify-content', 'space-between']]],
    ['justify-around', [['justify-content', 'space-around']]],
    ['justify-evenly', [['justify-content', 'space-evenly']]],
    ['justify-stretch', [['justify-content', 'stretch']]],
    // justify-items
    ['justify-items-normal', [['justify-items', 'normal']]],
    ['justify-items-center', [['justify-items', 'center']]],
    ['justify-items-start', [['justify-items', 'start']]],
    ['justify-items-end', [['justify-items', 'end']]],
    ['justify-items-stretch', [['justify-items', 'stretch']]],
    // align-content
    ['content-normal', [['align-content', 'normal']]],
    ['content-center', [['align-content', 'center']]],
    ['content-start', [['align-content', 'flex-start']]],
    ['content-end', [['align-content', 'flex-end']]],
    ['content-between', [['align-content', 'space-between']]],
    ['content-around', [['align-content', 'space-around']]],
    ['content-evenly', [['align-content', 'space-evenly']]],
    ['content-stretch', [['align-content', 'stretch']]],
    // place-content
    ['place-content-center', [['place-content', 'center']]],
    ['place-content-start', [['place-content', 'start']]],
    ['place-content-end', [['place-content', 'end']]],
    ['place-content-between', [['place-content', 'space-between']]],
    ['place-content-around', [['place-content', 'space-around']]],
    ['place-content-evenly', [['place-content', 'space-evenly']]],
    ['place-content-stretch', [['place-content', 'stretch']]],
    // place-items
    ['place-items-center', [['place-items', 'center']]],
    ['place-items-start', [['place-items', 'start']]],
    ['place-items-end', [['place-items', 'end']]],
    ['place-items-baseline', [['place-items', 'baseline']]],
    ['place-items-stretch', [['place-items', 'stretch']]],
    // self
    ['self-auto', [['align-self', 'auto']]],
    ['self-start', [['align-self', 'flex-start']]],
    ['self-end', [['align-self', 'flex-end']]],
    ['self-center', [['align-self', 'center']]],
    ['self-stretch', [['align-self', 'stretch']]],
    ['self-baseline', [['align-self', 'baseline']]],
    // justify-self
    ['justify-self-auto', [['justify-self', 'auto']]],
    ['justify-self-start', [['justify-self', 'flex-start']]],
    ['justify-self-end', [['justify-self', 'flex-end']]],
    ['justify-self-center', [['justify-self', 'center']]],
    ['justify-self-stretch', [['justify-self', 'stretch']]],
    // place-self
    ['place-self-auto', [['place-self', 'auto']]],
    ['place-self-start', [['place-self', 'start']]],
    ['place-self-end', [['place-self', 'end']]],
    ['place-self-center', [['place-self', 'center']]],
    ['place-self-stretch', [['place-self', 'stretch']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 7. FLOAT & CLEAR
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['float-start', [['float', 'inline-start']]],
    ['float-end', [['float', 'inline-end']]],
    ['float-right', [['float', 'right']]],
    ['float-left', [['float', 'left']]],
    ['float-none', [['float', 'none']]],
    ['clear-start', [['clear', 'inline-start']]],
    ['clear-end', [['clear', 'inline-end']]],
    ['clear-right', [['clear', 'right']]],
    ['clear-left', [['clear', 'left']]],
    ['clear-both', [['clear', 'both']]],
    ['clear-none', [['clear', 'none']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 6. ASPECT RATIO
  // ═══════════════════════════════════════════════════════
  ds.functional('aspect', (c) => {
    if (!c.value) return;
    const val = c.value.value;
    if (val === 'auto') return [d('aspect-ratio', 'auto')];
    if (val === 'square') return [d('aspect-ratio', '1 / 1')];
    if (val === 'video') return [d('aspect-ratio', '16 / 9')];
    return [d('aspect-ratio', val.replace('_', ' / '))];
  });

  // ═══════════════════════════════════════════════════════
  // 7. BOX SIZING & OUTLINE
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['box-border', [['box-sizing', 'border-box']]],
    ['box-content', [['box-sizing', 'content-box']]],
    ['outline-none', [['outline', '2px solid transparent'], ['outline-offset', '2px']]],
    ['outline', [['outline-style', 'solid']]],
    ['outline-dashed', [['outline-style', 'dashed']]],
    ['outline-dotted', [['outline-style', 'dotted']]],
    ['outline-double', [['outline-style', 'double']]],
  ]);

  ds.functional('outline', (c) => {
    if (!c.value) return;
    const val = c.value.value;
    // Handle colors vs widths
    if (c.value.kind === 'color') {
        const color = resolveColor(c.value, c.modifier);
        return [d('outline-color', color)];
    }
    // Handle specific widths
    return [d('outline-width', resolveSpacing(val))];
  });

  ds.functional('outline-offset', (c) => {
    if (!c.value) return;
    return [d('outline-offset', resolveSpacing(c.value.value))];
  });

  // ═══════════════════════════════════════════════════════
  // 9. OVERFLOW
  // ═══════════════════════════════════════════════════════
  for (const v of ['auto', 'hidden', 'clip', 'visible', 'scroll']) {
    ds.static(`overflow-${v}`, () => [d('overflow', v)]);
    ds.static(`overflow-x-${v}`, () => [d('overflow-x', v)]);
    ds.static(`overflow-y-${v}`, () => [d('overflow-y', v)]);
  }
  for (const v of ['auto', 'contain', 'none']) {
    ds.static(`overscroll-${v}`, () => [d('overscroll-behavior', v)]);
    ds.static(`overscroll-x-${v}`, () => [d('overscroll-behavior-x', v)]);
    ds.static(`overscroll-y-${v}`, () => [d('overscroll-behavior-y', v)]);
  }

  // ═══════════════════════════════════════════════════════
  // 10. SPACING (margin & padding) — functional
  // ═══════════════════════════════════════════════════════
  const spacingMap: Record<string, string[]> = {
    m: ['margin'], mx: ['margin-inline'], my: ['margin-block'],
    ms: ['margin-inline-start'], me: ['margin-inline-end'],
    mbs: ['margin-block-start'], mbe: ['margin-block-end'],
    mt: ['margin-top'], mr: ['margin-right'], mb: ['margin-bottom'], ml: ['margin-left'],
    p: ['padding'], px: ['padding-inline'], py: ['padding-block'],
    ps: ['padding-inline-start'], pe: ['padding-inline-end'],
    pbs: ['padding-block-start'], pbe: ['padding-block-end'],
    pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'],
    gap: ['gap'], 'gap-x': ['column-gap'], 'gap-y': ['row-gap'],
  };
  for (const [root, props] of Object.entries(spacingMap)) {
    // static auto for margins
    if (root.startsWith('m')) {
      ds.static(`${root}-auto`, () => props.map(p => d(p, 'auto')));
    }
    ds.functional(root, (c) => {
      if (!c.value) return;
      const val = resolveSpacing(c.value.value, c.negative);
      return props.map(p => d(p, val));
    });
  }

  // space-x / space-y container spacing
  ['x', 'y'].forEach(axis => {
    ds.functional(`space-${axis}`, (c) => {
      if (!c.value) return;
      const val = resolveSpacing(c.value.value, c.negative);
      const prop = axis === 'x' ? 'margin-left' : 'margin-top';
      return [{
        kind: 'at-root',
        selector: `& > :not([hidden], template) ~ :not([hidden], template)`,
        nodes: [d(prop, val)]
      }];
    });
  });

  // ═══════════════════════════════════════════════════════
  // 11. SIZING (w, h, min-w, min-h, max-w, max-h, size)
  // ═══════════════════════════════════════════════════════
  // Width-specific keywords
  for (const [kw, val] of [['full', '100%'], ['min', 'min-content'], ['max', 'max-content'], ['fit', 'fit-content']] as const) {
    ds.static(`w-${kw}`, () => [d('width', val)]);
    ds.static(`h-${kw}`, () => [d('height', val)]);
    ds.static(`min-w-${kw}`, () => [d('min-width', val)]);
    ds.static(`min-h-${kw}`, () => [d('min-height', val)]);
    ds.static(`max-w-${kw}`, () => [d('max-width', val)]);
    ds.static(`max-h-${kw}`, () => [d('max-height', val)]);
    ds.static(`size-${kw}`, () => [d('width', val), d('height', val)]);
  }
  // Viewport units — width uses vw/svw/lvw/dvw, height uses vh/svh/lvh/dvh
  for (const [kw, wVal, hVal] of [
    ['screen', '100vw', '100vh'],
    ['svw', '100svw', '100svh'], ['lvw', '100lvw', '100lvh'], ['dvw', '100dvw', '100dvh'],
  ] as const) {
    ds.static(`w-${kw}`, () => [d('width', wVal)]);
    ds.static(`h-${kw}`, () => [d('height', hVal)]);
    ds.static(`min-w-${kw}`, () => [d('min-width', wVal)]);
    ds.static(`min-h-${kw}`, () => [d('min-height', hVal)]);
    ds.static(`max-w-${kw}`, () => [d('max-width', wVal)]);
    ds.static(`max-h-${kw}`, () => [d('max-height', hVal)]);
  }
  // dvh/svh/lvh as standalone (h-dvh, h-svh, h-lvh)
  ds.static('h-dvh', () => [d('height', '100dvh')]);
  ds.static('h-svh', () => [d('height', '100svh')]);
  ds.static('h-lvh', () => [d('height', '100lvh')]);
  ds.static('min-h-dvh', () => [d('min-height', '100dvh')]);
  ds.static('max-h-dvh', () => [d('max-height', '100dvh')]);
  statics(ds, [
    ['w-auto', [['width', 'auto']]], ['h-auto', [['height', 'auto']]],
    ['size-auto', [['width', 'auto'], ['height', 'auto']]],
    ['min-w-auto', [['min-width', 'auto']]], ['min-h-auto', [['min-height', 'auto']]],
    ['max-w-none', [['max-width', 'none']]], ['max-h-none', [['max-height', 'none']]],
    ['w-screen', [['width', '100vw']]], ['h-screen', [['height', '100vh']]],
    ['min-w-screen', [['min-width', '100vw']]], ['min-h-screen', [['min-height', '100vh']]],
    ['max-w-screen', [['max-width', '100vw']]], ['max-h-screen', [['max-height', '100vh']]],
    ['h-lh', [['height', '1lh']]], ['min-h-lh', [['min-height', '1lh']]], ['max-h-lh', [['max-height', '1lh']]],
  ]);

  const sizingMap: Record<string, string> = {
    w: 'width', h: 'height', 'min-w': 'min-width', 'min-h': 'min-height',
    'max-w': 'max-width', 'max-h': 'max-height',
    'inline': 'inline-size', 'min-inline': 'min-inline-size', 'max-inline': 'max-inline-size',
    'block': 'block-size', 'min-block': 'min-block-size', 'max-block': 'max-block-size',
  };
  for (const [root, prop] of Object.entries(sizingMap)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      // Fraction support: w-1/2 → width: calc(1/2 * 100%)
      if (v.includes('/')) {
        const [num, den] = v.split('/');
        if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
          return [d(prop, `calc(${num}/${den} * 100%)`)];
        }
      }
      return [d(prop, resolveSpacing(v, c.negative))];
    });
  }
  ds.functional('size', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    // Fraction support
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        const pct = `calc(${num}/${den} * 100%)`;
        return [d('width', pct), d('height', pct)];
      }
    }
    const resolved = resolveSpacing(v, c.negative);
    return [d('width', resolved), d('height', resolved)];
  });

  // ═══════════════════════════════════════════════════════
  // 12. INSET (top, right, bottom, left, inset)
  // ═══════════════════════════════════════════════════════
  const insetMap: Record<string, string[]> = {
    inset: ['inset'], 'inset-x': ['inset-inline'], 'inset-y': ['inset-block'],
    'inset-s': ['inset-inline-start'], 'inset-e': ['inset-inline-end'],
    'inset-bs': ['inset-block-start'], 'inset-be': ['inset-block-end'],
    top: ['top'], right: ['right'], bottom: ['bottom'], left: ['left'],
  };
  for (const [root, props] of Object.entries(insetMap)) {
    ds.static(`${root}-auto`, () => props.map(p => d(p, 'auto')));
    ds.static(`${root}-full`, () => props.map(p => d(p, '100%')));
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      return props.map(p => d(p, resolveSpacing(v, c.negative)));
    });
  }

  // ═══════════════════════════════════════════════════════
  // 13. COLORS (bg, text, border, outline, fill, stroke, accent, caret, divide)
  // ═══════════════════════════════════════════════════════
  const colorRoots: [string, string][] = [
    ['bg', 'background-color'], 
    ['border', 'border-color'],
    ['fill', 'fill'], ['stroke', 'stroke'],
    ['accent', 'accent-color'], ['caret', 'caret-color'],
  ];
  for (const [root, prop] of colorRoots) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const color = resolveColor(c.value, c.modifier);
      return [d(prop, color)];
    });
  }
  statics(ds, [
    ['bg-none', [['background-image', 'none']]],
    ['fill-none', [['fill', 'none']]],
    ['stroke-none', [['stroke', 'none']]],
    ['accent-auto', [['accent-color', 'auto']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 14. TYPOGRAPHY
  // ═══════════════════════════════════════════════════════
  ds.functional('text', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    
    // 1. Check for standard font sizes
    const sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
    if (sizes.includes(v) || /^\d/.test(v)) {
      const res = v.startsWith('[') ? v.slice(1, -1) : resolveThemeValue('text', v);
      // Tailwind v4: text-{size} also sets line-height
      return [
        d('font-size', res), 
        d('line-height', `var(--text-${v}--line-height, 1.5)`)
      ];
    }

    // 2. Otherwise treat as color
    return [d('color', resolveColor(c.value, c.modifier))];
  });

  statics(ds, [
    ['text-left', [['text-align', 'left']]],
    ['text-center', [['text-align', 'center']]],
    ['text-right', [['text-align', 'right']]],
    ['text-justify', [['text-align', 'justify']]],
    ['text-start', [['text-align', 'start']]],
    ['text-end', [['text-align', 'end']]],
    ['text-wrap', [['text-wrap', 'wrap']]],
    ['text-nowrap', [['text-wrap', 'nowrap']]],
    ['text-balance', [['text-wrap', 'balance']]],
    ['text-pretty', [['text-wrap', 'pretty']]],
    ['text-ellipsis', [['text-overflow', 'ellipsis']]],
    ['text-clip', [['text-overflow', 'clip']]],
    ['uppercase', [['text-transform', 'uppercase']]],
    ['lowercase', [['text-transform', 'lowercase']]],
    ['capitalize', [['text-transform', 'capitalize']]],
    ['normal-case', [['text-transform', 'none']]],
    ['italic', [['font-style', 'italic']]],
    ['not-italic', [['font-style', 'normal']]],
    ['underline', [['text-decoration-line', 'underline']]],
    ['overline', [['text-decoration-line', 'overline']]],
    ['line-through', [['text-decoration-line', 'line-through']]],
    ['no-underline', [['text-decoration-line', 'none']]],
    ['antialiased', [['-webkit-font-smoothing', 'antialiased'], ['-moz-osx-font-smoothing', 'grayscale']]],
    ['subpixel-antialiased', [['-webkit-font-smoothing', 'auto'], ['-moz-osx-font-smoothing', 'auto']]],
    ['truncate', [['overflow', 'hidden'], ['text-overflow', 'ellipsis'], ['white-space', 'nowrap']]],
    ['break-normal', [['overflow-wrap', 'normal'], ['word-break', 'normal']]],
    ['break-all', [['word-break', 'break-all']]],
    ['break-keep', [['word-break', 'keep-all']]],
    ['wrap-anywhere', [['overflow-wrap', 'anywhere']]],
    ['wrap-break-word', [['overflow-wrap', 'break-word']]],
    ['wrap-normal', [['overflow-wrap', 'normal']]],
  ]);
  // whitespace
  for (const v of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) {
    ds.static(`whitespace-${v}`, () => [d('white-space', v)]);
  }
  // font-sans / font-mono / font-serif as static
  ds.static('font-sans', () => [d('font-family', 'var(--font-sans, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji")')]);
  ds.static('font-serif', () => [d('font-family', 'var(--font-serif, ui-serif, Georgia, Cambria, "Times New Roman", Times, serif)')]);
  ds.static('font-mono', () => [d('font-family', 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)')]);
  // font-{weight} functional
  ds.functional('font', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    // Named font families handled by statics above
    if (v === 'sans' || v === 'serif' || v === 'mono') return;
    // Font weights
    const weights: Record<string, string> = {
      thin: '100', extralight: '200', light: '300', normal: '400',
      medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900'
    };
    const w = weights[v] || v;
    return [d('font-weight', w)];
  });
  // leading (line-height)
  ds.functional('leading', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    const leadings: Record<string, string> = {
      'none': '1', 'tight': '1.25', 'snug': '1.375', 'normal': '1.5', 'relaxed': '1.625', 'loose': '2'
    };
    return [d('line-height', leadings[v] || resolveSpacing(v))];
  });
  // tracking (letter-spacing)
  ds.functional('tracking', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [d('letter-spacing', v.includes('var(') ? v : `var(--tracking-${v}, ${v})`)];
  });
  // indent
  ds.functional('indent', (c) => {
    if (!c.value) return;
    return [d('text-indent', resolveSpacing(c.value.value, c.negative))];
  });

  // ═══════════════════════════════════════════════════════
  // 15. BORDERS & ROUNDED (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['border-solid', [['border-style', 'solid']]],
    ['border-dashed', [['border-style', 'dashed']]],
    ['border-dotted', [['border-style', 'dotted']]],
    ['border-double', [['border-style', 'double']]],
    ['border-hidden', [['border-style', 'hidden']]],
    ['border-none', [['border-style', 'none']]],
    ['border-collapse', [['border-collapse', 'collapse']]],
    ['border-separate', [['border-collapse', 'separate']]],
  ]);

  const borderWidthMap: Record<string, string[]> = {
    border: ['border-width'],
    'border-x': ['border-inline-width'], 'border-y': ['border-block-width'],
    'border-t': ['border-top-width'], 'border-r': ['border-right-width'],
    'border-b': ['border-bottom-width'], 'border-l': ['border-left-width'],
    'border-s': ['border-inline-start-width'], 'border-e': ['border-inline-end-width'],
  };

  for (const [root, props] of Object.entries(borderWidthMap)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      if (v === 'transparent' || v === 'current' || v === 'inherit' || v.includes('-') || v.startsWith('#')) {
        const color = resolveColor(v, c.modifier);
        return props.map(p => d(p.replace('-width', '-color'), color));
      }
      const width = /^\d+$/.test(v) ? `${v}px` : v;
      return [...props.map(p => d(p, width)), d('border-style', 'solid')];
    });
  }

  const radiusMap: Record<string, string[]> = {
    rounded: ['border-radius'],
    'rounded-t': ['border-top-left-radius', 'border-top-right-radius'],
    'rounded-r': ['border-top-right-radius', 'border-bottom-right-radius'],
    'rounded-b': ['border-bottom-right-radius', 'border-bottom-left-radius'],
    'rounded-l': ['border-top-left-radius', 'border-bottom-left-radius'],
    'rounded-tl': ['border-top-left-radius'], 'rounded-tr': ['border-top-right-radius'],
    'rounded-br': ['border-bottom-right-radius'], 'rounded-bl': ['border-bottom-left-radius'],
    'rounded-s': ['border-start-start-radius', 'border-end-start-radius'],
    'rounded-e': ['border-start-end-radius', 'border-end-end-radius'],
    'rounded-ss': ['border-start-start-radius'], 'rounded-se': ['border-start-end-radius'],
    'rounded-ee': ['border-end-end-radius'], 'rounded-es': ['border-end-start-radius'],
  };

  for (const [root, props] of Object.entries(radiusMap)) {
    ds.static(`${root}-none`, () => props.map(p => d(p, '0')));
    ds.static(`${root}-full`, () => props.map(p => d(p, 'calc(infinity * 1px)')));
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      return props.map(p => d(p, v.includes('var(') ? v : `var(--radius-${v}, ${v})`));
    });
  }

  // ═══════════════════════════════════════════════════════
  // 16. OPACITY
  // ═══════════════════════════════════════════════════════
  ds.functional('opacity', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    const num = Number(v);
    return [d('opacity', !Number.isNaN(num) && num >= 0 && num <= 100 ? `${v}%` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 17. SHADOWS & RING (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  const shadowValue = 'var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000)';
  
  ds.functional('shadow', (c) => {
    if (!c.value) return [d('--tw-shadow', '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'), d('box-shadow', shadowValue)];
    const v = c.value.value;
    if (v === 'none') return [d('box-shadow', 'none')];
    
    // Improved color detection: if it's not a known shadow size, treat as color
    const sizes = ['sm', 'md', 'lg', 'xl', '2xl', 'inner'];
    if (!sizes.includes(v) && !/^\d/.test(v)) {
      return [d('--tw-shadow-color', resolveColor(c.value, c.modifier)), d('box-shadow', shadowValue)];
    }
    
    return [d('--tw-shadow', `var(--shadow-${v}, ${v})`), d('box-shadow', shadowValue)];
  });

  ds.functional('ring', (c) => {
    if (!c.value) return [d('--tw-ring-shadow', 'var(--tw-ring-inset, ) 0 0 0 calc(3px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentColor)'), d('box-shadow', shadowValue)];
    const v = c.value.value;
    
    // If it's a color (not a number/spacing)
    if (!/^\d/.test(v) && v !== 'auto' && v !== 'px') {
      return [d('--tw-ring-color', resolveColor(c.value, c.modifier)), d('box-shadow', shadowValue)];
    }
    
    // v4 Parity: ring-<number> is pixels, not spacing scale
    const width = /^\d+$/.test(v) ? `${v}px` : resolveSpacing(v);
    return [d('--tw-ring-shadow', `var(--tw-ring-inset, ) 0 0 0 calc(${width} + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentColor)`), d('box-shadow', shadowValue)];
  });

  // ═══════════════════════════════════════════════════════
  // 18. TRANSITIONS & ANIMATIONS
  // ═══════════════════════════════════════════════════════

  statics(ds, [
    ['transform-none', [['transform', 'none']]],
    ['transform-gpu', [['transform', 'translateZ(0)']]],
    ['backface-visible', [['backface-visibility', 'visible']]],
    ['backface-hidden', [['backface-visibility', 'hidden']]],
  ]);
  // Compositing helper for transforms
  const tpl = () => K([
    d('--tw-scale-x', '1'), d('--tw-scale-y', '1'), d('--tw-scale-z', '1'),
    d('--tw-rotate-x', '0deg'), d('--tw-rotate-y', '0deg'), d('--tw-rotate-z', '0deg'),
    d('--tw-translate-x', '0'), d('--tw-translate-y', '0'), d('--tw-translate-z', '0'),
    d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')
  ]);
  const transformStr = 'var(--tw-rotate-x) var(--tw-rotate-y) var(--tw-rotate-z) var(--tw-skew-x) var(--tw-skew-y)';

  ds.functional('scale', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [tpl(), d('--tw-scale-x', val), d('--tw-scale-y', val), d('--tw-scale-z', val), d('scale', 'var(--tw-scale-x) var(--tw-scale-y)')];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`scale-${axis}`, (c) => {
      if (!c.value) return;
      const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
      const val = c.negative ? `calc(${v} * -1)` : v;
      return [tpl(), d(`--tw-scale-${axis}`, val), d('scale', 'var(--tw-scale-x) var(--tw-scale-y)' + (axis === 'z' ? ' var(--tw-scale-z)' : ''))];
    });
  });

  ds.functional('rotate', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [d('rotate', val)];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`rotate-${axis}`, (c) => {
      if (!c.value) return;
      const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
      const val = c.negative ? `calc(${v} * -1)` : v;
      return [K([d(`--tw-rotate-${axis}`, '0deg'), d('--tw-rotate-x', ' '), d('--tw-rotate-y', ' '), d('--tw-rotate-z', ' ')]), 
              d(`--tw-rotate-${axis}`, `rotate${axis.toUpperCase()}(${val})`), 
              d('transform', transformStr)];
    });
  });

  ds.functional('translate', (c) => {
    if (!c.value) return;
    const v = resolveSpacing(c.value.value, c.negative);
    return [tpl(), d('--tw-translate-x', v), d('--tw-translate-y', v), d('translate', 'var(--tw-translate-x) var(--tw-translate-y)')];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`translate-${axis}`, (c) => {
      if (!c.value) return;
      const v = resolveSpacing(c.value.value, c.negative);
      return [tpl(), d(`--tw-translate-${axis}`, v), 
              d('translate', axis === 'z' ? 'var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)' : 'var(--tw-translate-x) var(--tw-translate-y)')];
    });
  });

  ds.functional('skew-x', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [K([d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')]), d('--tw-skew-x', `skewX(${val})`), d('transform', transformStr)];
  });
  ds.functional('skew-y', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [K([d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')]), d('--tw-skew-y', `skewY(${val})`), d('transform', transformStr)];
  });

  // ═══════════════════════════════════════════════════════
  // 19. FILTERS & BACKDROP FILTERS (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  const filterVars = () => K([
    d('--tw-blur', ''), d('--tw-brightness', ''), d('--tw-contrast', ''),
    d('--tw-grayscale', ''), d('--tw-hue-rotate', ''), d('--tw-invert', ''),
    d('--tw-saturate', ''), d('--tw-sepia', ''), d('--tw-drop-shadow', '')
  ]);
  const filterStr = 'var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)';

  ds.functional('filter', (c) => {
    if (!c.value) return [filterVars(), d('filter', filterStr)];
    if (c.value.value === 'none') return [d('filter', 'none')];
  });

  const filters: Record<string, string> = {
    blur: '--tw-blur', brightness: '--tw-brightness', contrast: '--tw-contrast',
    grayscale: '--tw-grayscale', 'hue-rotate': '--tw-hue-rotate', invert: '--tw-invert',
    saturate: '--tw-saturate', sepia: '--tw-sepia'
  };

  for (const [root, varName] of Object.entries(filters)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      let val = c.value.value;
      if (root === 'blur') val = /^\d/.test(val) ? resolveSpacing(val) : resolveThemeValue('blur', val);
      else if (root === 'hue-rotate') val = /^\d+$/.test(val) ? `${val}deg` : val;
      else if (/^\d+$/.test(val)) val = `${val}%`;
      else val = resolveThemeValue(root, val);

      const res = `${root}(${c.negative ? `calc(${val} * -1)` : val})`;
      return [filterVars(), d(varName, res), d('filter', filterStr)];
    });
  }

  // Backdrop Filters
  const backdropVars = () => K([
    d('--tw-backdrop-blur', ''), d('--tw-backdrop-brightness', ''), d('--tw-backdrop-contrast', ''),
    d('--tw-backdrop-grayscale', ''), d('--tw-backdrop-hue-rotate', ''), d('--tw-backdrop-invert', ''),
    d('--tw-backdrop-opacity', ''), d('--tw-backdrop-saturate', ''), d('--tw-backdrop-sepia', '')
  ]);

  const backdropStr = 'var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)';

  ds.functional('backdrop-filter', (c) => {
    if (!c.value) return [backdropVars(), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
    if (c.value.value === 'none') return [d('-webkit-backdrop-filter', 'none'), d('backdrop-filter', 'none')];
  });

  for (const [root] of Object.entries(filters)) {
    ds.functional(`backdrop-${root}`, (c) => {
      if (!c.value) return;
      let val = c.value.value;
      if (root === 'blur') val = /^\d/.test(val) ? resolveSpacing(val) : resolveThemeValue('blur', val);
      else if (root === 'hue-rotate') val = /^\d+$/.test(val) ? `${val}deg` : val;
      else if (/^\d+$/.test(val)) val = `${val}%`;
      else val = resolveThemeValue(root, val);

      const res = `${root}(${c.negative ? `calc(${val} * -1)` : val})`;
      return [backdropVars(), d(`--tw-backdrop-${root}`, res), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
    });
  }
  ds.functional('backdrop-opacity', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
    return [backdropVars(), d('--tw-backdrop-opacity', `opacity(${v})`), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
  });

  // Masks
  ds.functional('mask', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [
      d('mask-image', v.startsWith('url') ? v : `url(${v})`),
      d('-webkit-mask-image', v.startsWith('url') ? v : `url(${v})`)
    ];
  });
  // ═══════════════════════════════════════════════════════
  // 19. TRANSITIONS & ANIMATIONS (Consolidated)
  // ═══════════════════════════════════════════════════════
  ds.functional('transition', (c) => {
    const prop = c.value?.value || 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter';
    const v = prop === 'none' ? 'none' : (prop === 'all' ? 'all' : (prop === 'colors' ? 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke' : (prop === 'shadow' ? 'box-shadow' : (prop === 'transform' ? 'transform, translate, scale, rotate' : prop))));
    
    return [
      d('transition-property', v),
      d('transition-timing-function', 'var(--tw-ease, ease)'),
      d('transition-duration', 'var(--tw-duration, 150ms)'),
    ];
  });
  ds.functional('duration', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}ms` : c.value.value;
    return [d('--tw-duration', v), d('transition-duration', v), d('animation-duration', v)];
  });
  ds.functional('delay', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}ms` : c.value.value;
    return [d('transition-delay', v), d('animation-delay', v)];
  });
  ds.functional('ease', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [d('--tw-ease', v), d('transition-timing-function', v), d('animation-timing-function', v)];
  });
  ds.functional('animate', (c) => {
    if (!c.value) return;
    if (c.value.value === 'none') return [d('animation', 'none')];
    const v = c.value.value;
    const val = v.startsWith('[') ? v.slice(1, -1).replace(/_/g, ' ') : `var(--animate-${v}, ${v})`;
    return [d('animation', val)];
  });

  // ═══════════════════════════════════════════════════════
  // 20. GRID & LAYOUT
  // ═══════════════════════════════════════════════════════
  ds.functional('grid-cols', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('grid-template-columns', 'none')];
    if (v === 'subgrid') return [d('grid-template-columns', 'subgrid')];
    if (/^\d+$/.test(v)) return [d('grid-template-columns', `repeat(${v}, minmax(0, 1fr))`)];
    return [d('grid-template-columns', v)];
  });
  ds.functional('grid-rows', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('grid-template-rows', 'none')];
    if (v === 'subgrid') return [d('grid-template-rows', 'subgrid')];
    if (/^\d+$/.test(v)) return [d('grid-template-rows', `repeat(${v}, minmax(0, 1fr))`)];
    return [d('grid-template-rows', v)];
  });
  ds.functional('col-span', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'full') return [d('grid-column', '1 / -1')];
    return [d('grid-column', `span ${v} / span ${v}`)];
  });
  ds.functional('row-span', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'full') return [d('grid-row', '1 / -1')];
    return [d('grid-row', `span ${v} / span ${v}`)];
  });

  // aspect-ratio with fraction support
  ds.functional('aspect', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('aspect-ratio', 'auto')];
    if (v === 'square') return [d('aspect-ratio', '1 / 1')];
    if (v === 'video') return [d('aspect-ratio', '16 / 9')];
    return [d('aspect-ratio', v)];
  });

  // ═══════════════════════════════════════════════════════
  // 21. CURSORS & POINTER EVENTS
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['pointer-events-none', [['pointer-events', 'none']]],
    ['pointer-events-auto', [['pointer-events', 'auto']]],
  ]);
  const cursors = ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'zoom-in', 'zoom-out'];
  cursors.forEach(v => ds.static(`cursor-${v}`, () => [d('cursor', v)]));

  // Insets




  // Additional Insets (Logical Properties)
  const insets: Record<string, string[]> = {
    'inset-inline': ['inset-inline-start', 'inset-inline-end'],
    'inset-block': ['inset-block-start', 'inset-block-end'],
    'inset-is': ['inset-inline-start'],
    'inset-ie': ['inset-inline-end'],
    'inset-bs': ['inset-block-start'],
    'inset-be': ['inset-block-end'],
  };
  Object.entries(insets).forEach(([root, props]) => {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const val = resolveSpacing(c.value.value, c.negative);
      return props.map(p => d(p, val));
    });
  });

  // ═══════════════════════════════════════════════════════
  // 24. SCROLL SPACING
  // ═══════════════════════════════════════════════════════
  const scrollSpacing: Record<string, string> = {
    'scroll-m': 'scroll-margin', 'scroll-mx': 'scroll-margin-inline', 'scroll-my': 'scroll-margin-block',
    'scroll-mt': 'scroll-margin-top', 'scroll-mr': 'scroll-margin-right',
    'scroll-mb': 'scroll-margin-bottom', 'scroll-ml': 'scroll-margin-left',
    'scroll-p': 'scroll-padding', 'scroll-px': 'scroll-padding-inline', 'scroll-py': 'scroll-padding-block',
    'scroll-pt': 'scroll-padding-top', 'scroll-pr': 'scroll-padding-right',
    'scroll-pb': 'scroll-padding-bottom', 'scroll-pl': 'scroll-padding-left',
  };
  for (const [root, prop] of Object.entries(scrollSpacing)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      return [d(prop, resolveSpacing(c.value.value, c.negative))];
    });
  }

  // ═══════════════════════════════════════════════════════
  // 23. MISC & SNAP (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['snap-x', [['scroll-snap-type', 'x var(--tw-scroll-snap-strictness, proximity)']]],
    ['snap-y', [['scroll-snap-type', 'y var(--tw-scroll-snap-strictness, proximity)']]],
    ['snap-mandatory', [['--tw-scroll-snap-strictness', 'mandatory']]],
    ['snap-proximity', [['--tw-scroll-snap-strictness', 'proximity']]],
  ]);

  ds.functional('scroll-m', (c) => {
    if (!c.value) return;
    return [d('scroll-margin', resolveSpacing(c.value.value, c.negative))];
  });
  ds.functional('scroll-p', (c) => {
    if (!c.value) return;
    return [d('scroll-padding', resolveSpacing(c.value.value))];
  });

  ds.functional('bg-linear', (c) => {
    if (c.value?.kind === 'named') {
      return [{ kind: 'declaration', property: 'background-image', value: `linear-gradient(${c.value.value}, var(--tw-gradient-stops))` }];
    }
  });

  ds.functional('from', (c) => {
    if (c.value?.kind === 'named') {
      const color = resolveColor(c.value, c.modifier);
      return [
        { kind: 'declaration', property: '--tw-gradient-from', value: color },
        { kind: 'declaration', property: '--tw-gradient-stops', value: `var(--tw-gradient-from), var(--tw-gradient-to, transparent)` }
      ];
    }
  });

  ds.functional('mask', (c) => {
    if (c.value?.kind === 'named') {
      return [
        { kind: 'declaration', property: 'mask-image', value: c.value.value },
        { kind: 'declaration', property: '-webkit-mask-image', value: c.value.value }
      ];
    }
  });

  ds.functional('outline', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('outline', 'none')];
    const color = resolveColor(c.value, c.modifier);
    if (color && !/^\d/.test(v)) {
      return [d('--tw-outline-color', color), d('outline', 'var(--tw-outline-style, solid) var(--tw-outline-width, 1px) var(--tw-outline-color, currentColor)')];
    }
    return [d('--tw-outline-width', resolveSpacing(v)), d('outline', 'var(--tw-outline-style, solid) var(--tw-outline-width, 1px) var(--tw-outline-color, currentColor)')];
  });
}

// ═══════════════════════════════════════════════════════
// 25. COMPOSITING @PROPERTY REGISTRATIONS
// ═══════════════════════════════════════════════════════
const COMPOSITING_VARS = [
  { name: '--tw-blur', initial: ' ', syntax: '*' },
  { name: '--tw-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-invert', initial: ' ', syntax: '*' },
  { name: '--tw-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-drop-shadow', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-blur', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-invert', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-opacity', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-scale-x', initial: '1', syntax: '<number>' },
  { name: '--tw-scale-y', initial: '1', syntax: '<number>' },
  { name: '--tw-scale-z', initial: '1', syntax: '<number>' },
  { name: '--tw-rotate-x', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-rotate-y', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-rotate-z', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-translate-x', initial: '0', syntax: '*' },
  { name: '--tw-translate-y', initial: '0', syntax: '*' },
  { name: '--tw-translate-z', initial: '0', syntax: '*' },
  { name: '--tw-skew-x', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-skew-y', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-inset-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-inset-ring-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-ring-offset-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-ring-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-shadow', initial: '0 0 #0000', syntax: '*' },
  { name: '--tw-shadow-colored', initial: '0 0 #0000', syntax: '*' },
];

function registerCompositingProperties() {
  let css = '';
  for (const v of COMPOSITING_VARS) {
    css += `@property ${v.name} { syntax: "${v.syntax}"; inherits: false; initial-value: ${v.initial}; }\n`;
  }
  return css;
}


// ============================================================================
// 4. STYLESHEET MANAGER (DOM Injection)
// ============================================================================


class StyleSheetManager {
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();
  private _jitSheet: CSSStyleSheet | null = null;
  private _knownClasses: Set<string> = new Set();
  private _nextId = 0;
  private _preflightEmitted = false;

  private _getJitSheet(): CSSStyleSheet {
    if (!this._jitSheet) {
      if ('CSSStyleSheet' in globalThis) {
        this._jitSheet = new CSSStyleSheet();
        if ('document' in globalThis) {
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, this._jitSheet];
        }
      } else {
        // Fallback for extremely niche environments if necessary, but Nexus-UX mandates modern APIs
        throw new Error("Nexus-UX: CSSStyleSheet (AdoptedStyleSheets) is required for JIT.");
      }
    }
    return this._jitSheet;
  }

  /**
   * Initializes the JIT engine and starts the passive style scanner.
   * Scans existing DOM and watches for new classes to eliminate FOUC.
   */
  public emitPreflightAndTheme(): void {
    if (typeof document === 'undefined') return;

    if (this._preflightEmitted) return;
    
    // 1. Base Framework Styles (Preflight)
    this.adoptCSSSync(PREFLIGHT_CSS, 'nexus-preflight');
    
    // 2. Framework Keyframes (Animations)
    this.adoptCSSSync(KEYFRAMES_CSS, 'nexus-keyframes');

    // 3. Theme Orchestration
    const compositingCSS = registerCompositingProperties();
    this.adoptCSSSync(THEME_CSS + '\n' + compositingCSS, 'nexus-theme');

    this._preflightEmitted = true;

    // Passive Style Scanner: Synchronously scan existing DOM to adopt classes.
    // This kills FOUC by ensuring styles are registered before the first paint 
    // for all elements already in the buffer during initial boot.
    // Continuous scanning is now handled by the main framework MutationObserver.
    const all = document.querySelectorAll('*');
    all.forEach(el => {
      if (el instanceof HTMLElement) {
        el.classList.forEach(cls => this.adoptClass(cls, el));
      }
    });
  }

  /**
   * Synchronous adoption for immediate framework boot.
   */
  adoptCSSSync(cssText: string, id?: string): () => void {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    
    if (existing) {
      existing.replaceSync(cssText);
      return () => this.removeSheet(sheetId);
    }

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    this._adoptedSheets.set(sheetId, sheet);
    
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  async adoptCSS(cssText: string, id?: string): Promise<() => void> {
    // 1. Tailwind v4 At-Rule Intersection (Play CDN Parity)
    const processedCSS = this.processAtRules(cssText);
    
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(processedCSS);
      return () => this.removeSheet(sheetId);
    }

    const sheet = new CSSStyleSheet();
    await sheet.replace(processedCSS);
    this._adoptedSheets.set(sheetId, sheet);
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  /**
   * Scans and interprets Tailwind v4 at-rules.
   * Internal logic for achieveing 100% Play CDN functional parity.
   */
  private processAtRules(css: string): string {
    let result = css;

    // A. @theme parsing (Handle multiple blocks)
    const themeRegex = /@theme\s*(?:default|inline|reference)?\s*\{([\s\S]*?)\}/g;
    let themeMatch;
    while ((themeMatch = themeRegex.exec(css)) !== null) {
      const themeInternal = themeMatch[1];
      const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
      let m;
      while ((m = varRegex.exec(themeInternal)) !== null) {
        const [_, key, _val] = m;
        if (key.startsWith('--color-')) {
          const colorName = key.replace('--color-', '');
          designSystem.functional(colorName, (c) => {
            const propertyMap: Record<string, string> = { bg: 'background-color', text: 'color', border: 'border-color', fill: 'fill', stroke: 'stroke' };
            const prop = propertyMap[c.root] || c.root;
            const color = resolveColor(key, c.modifier);
            return [{ kind: 'declaration', property: prop, value: color }];
          });
        }
      }
    }

    // B. @utility parsing (Tailwind v4 syntax)
    const utilityRegex = /@utility\s+([\w-]+)\s*\{([\s\S]*?)\}/g;
    result = result.replace(utilityRegex, (_, root, body) => {
      designSystem.registerCustomRule(root, body);
      return '';
    });

    // C. @layer parsing (Robust component scanning for DaisyUI)
    const layerRegex = /@layer\s+([\w-]+)\s*\{([\s\S]*?)\}(?!\s*\{)/g;
    result = result.replace(layerRegex, (match, layerName, body) => {
       if (layerName === 'components') {
          // Robust scanning for class-based components (including complex selectors)
          const classDefRegex = /\.([\w-]+)[^{]*\{([\s\S]*?)\}/g;
          let cm;
          while ((cm = classDefRegex.exec(body)) !== null) {
             designSystem.registerCustomRule(cm[1], cm[2]);
          }
          return ''; // Strip components layer, handled by JIT
       }
       return match; // Keep base/utilities as pure CSS
    });

    return result;
  }

  adoptClass(className: string, el?: HTMLElement, runtime?: RuntimeContext): void {
    if (!className || className.trim() === '') return;

    // ZCZS Requirement: Native Style Firewall
    // If the element belongs to an isolated external styling branch, completely 
    // abort JIT evaluation to prevent compilation conflicts.
    if (el && el.closest && el.closest('[data-ignore\\:style]')) {
      return;
    }

    if (this._knownClasses.has(className)) return;

    try {
      this._knownClasses.add(className);
      const candidates = Array.from(designSystem.parseCandidate(className));
      for (const candidate of candidates) {
        const cssRules = designSystem.generateCSS(candidate);
        if (cssRules) {
          const sheet = this._getJitSheet();
          // Split by rules (Tailwind v4 JIT generates multiple rules for container queries/space-y)
          // Simple split by the closing brace followed by space/newline
          const rules = cssRules.split(/(?<=\})\s*(?=\.)|(?<=\})\s*(?=@)/g);
          for (const rule of rules) {
            if (rule.trim()) {
              try {
                sheet.insertRule(rule.trim(), sheet.cssRules.length);
              } catch (e) {
                // Ignore individual rule failures (e.g. invalid experimental selectors)
                console.debug(`Nexus-UX: Non-critical JIT insertion failure:`, e);
              }
            }
          }

          if (candidate.hasSignal && el && runtime) {
            this.adoptSignalBinding(el, candidate.hasSignal, runtime);
          }
        }
      }
    } catch (err) {
      console.warn(`Nexus-UX: Failed to JIT compile class "${className}":`, err);
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
    } catch (_e) {
      /* ignore */
    }
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch (_e) {
      /* ignore */
    }
      if (rules.length) sheets.push(rules.join('\n'));
    });

    if (this._jitSheet) {
      const rules: string[] = [];
      try {
        for (const rule of this._jitSheet.cssRules) rules.push(rule.cssText);
      } catch (_e) {
      /* ignore */
    }
      if (rules.length) sheets.push(rules.join('\n'));
    }
    return sheets.join('\n\n');
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
    if (this._jitSheet && 'document' in globalThis) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== this._jitSheet);
      this._jitSheet = null;
    }
    this._knownClasses.clear();
    this._nextId = 0;
  }
}




// ============================================================================
// 5. INITIALIZATION & EXPORTS
// ============================================================================

export const designSystem = new DesignSystem();

populateStandardUtilities(designSystem);
populateStandardVariants(designSystem);


export function populateStandardVariants(ds: DesignSystem) {
  // ═══════════════════════════════════════════════════════
  // PHASE 2 ADDITIONS (48 MISSING VARIANTS)
  // ═══════════════════════════════════════════════════════

  // 2A. Pseudo-classes
  const pseudos = [
    'enabled', 'indeterminate', 'default', 'required', 'valid', 'invalid',
    'in-range', 'out-of-range', 'placeholder-shown', 'autofill', 'read-only',
    'open', 'empty', 'target', 'even', 'odd', 'first', 'last', 'only',
    'first-of-type', 'last-of-type', 'only-of-type', 'popover-open', 'inert',
    'starting'
  ];
  
  pseudos.forEach(p => ds.variant(p, (_c) => [])); // The serializeAST handles pseudo generation for static variants
  
  // NOTE: Our JIT engine serialization handles mapping these strings to actual pseudo-selectors. 
  // We just need to register them so the parser doesn't reject them as invalid.

  // 2B. Parametric Variants
  const parametric = ['nth', 'nth-of-type', 'nth-last-of-type', 'has', 'not', 'is', 'where'];
  parametric.forEach(p => {
    ds.functional(p, (_c) => []); // Registered as functional roots but in variant context
  });

  // 2D. Accessibility
  ds.variant('contrast-more', (_c) => []); 
  ds.variant('contrast-less', (_c) => []);
  ds.variant('forced-colors', (_c) => []);

  // 2E. Misc
  ds.variant('file', (_c) => []);
  ds.variant('backdrop', (_c) => []);
  ds.variant('screen', (_c) => []);
  ds.variant('any', (_c) => []);
  ds.variant('aria', (_c) => []);
  ds.variant('data', (_c) => []);
  ds.variant('supports', (_c) => []);
  ds.variant('container', (_c) => []);
  ds.variant('min', (_c) => []);
  ds.variant('max', (_c) => []);
  
  // Update: 'group' and 'peer' compound variants
  ds.variant('group', (_c) => []);
  ds.variant('peer', (_c) => []);
}

export const stylesheet = new StyleSheetManager();

