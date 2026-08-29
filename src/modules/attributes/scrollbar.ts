/**
 * Universal Native + Tailwind Scrollbar Module for Nexus-UX
 *
 * Provides full support for native HTML5/CSS property values and Tailwind
 * semantic tokens with both global (`data-scrollbar:global`) and local (`data-scrollbar`)
 * scoping, utilizing constructable stylesheets and the single-observer reactive lifecycle.
 */
import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { stylesheet } from './stylesheet.ts';

export interface ScrollbarConfig {
  autohide?: number | boolean;
  thin?: boolean;
  width?: string | number;
  height?: string | number;
  thumb?: string;
  thumbHover?: string;
  thumbActive?: string;
  track?: string;
  trackHover?: string;
  radius?: string;
  thumbRadius?: string;
  trackRadius?: string;
  buttons?: boolean;
  corner?: string;
  global?: boolean;
}

const SCROLLBAR_BASE_CSS = `
.scrollbar-auto-hide, [data-scrollbar], [data-scrollbar-global] {
  scrollbar-width: var(--scrollbar-width-std, thin);
  scrollbar-color: var(--scrollbar-thumb, transparent) var(--scrollbar-track, transparent);
  transition: scrollbar-color 0.3s ease-out;
}
.scrollbar-auto-hide::-webkit-scrollbar, [data-scrollbar]::-webkit-scrollbar, [data-scrollbar-global]::-webkit-scrollbar {
  width: var(--scrollbar-width, 6px);
  height: var(--scrollbar-height, 6px);
}
.scrollbar-auto-hide::-webkit-scrollbar-track, [data-scrollbar]::-webkit-scrollbar-track, [data-scrollbar-global]::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
  border-radius: var(--scrollbar-track-radius, 9999px);
}
.scrollbar-auto-hide::-webkit-scrollbar-thumb, [data-scrollbar]::-webkit-scrollbar-thumb, [data-scrollbar-global]::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-init, transparent);
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  transition: background-color 0.3s ease-out;
}
.scrollbar-auto-hide.is-scrolling, [data-scrollbar].is-scrolling, [data-scrollbar-global].is-scrolling {
  scrollbar-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) var(--scrollbar-track, transparent) !important;
}
.scrollbar-auto-hide.is-scrolling::-webkit-scrollbar-thumb, [data-scrollbar].is-scrolling::-webkit-scrollbar-thumb, [data-scrollbar-global].is-scrolling::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) !important;
}
.scrollbar-auto-hide::-webkit-scrollbar-thumb:hover, [data-scrollbar]::-webkit-scrollbar-thumb:hover, [data-scrollbar-global]::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover, color-mix(in srgb, currentColor 50%, transparent)) !important;
}
.scrollbar-auto-hide::-webkit-scrollbar-thumb:active, [data-scrollbar]::-webkit-scrollbar-thumb:active, [data-scrollbar-global]::-webkit-scrollbar-thumb:active {
  background-color: var(--scrollbar-thumb-active, color-mix(in srgb, currentColor 70%, transparent)) !important;
}
.scrollbar-auto-hide::-webkit-scrollbar-button, [data-scrollbar]::-webkit-scrollbar-button, [data-scrollbar-global]::-webkit-scrollbar-button {
  display: var(--scrollbar-buttons, none);
}
.scrollbar-auto-hide::-webkit-scrollbar-corner, [data-scrollbar]::-webkit-scrollbar-corner, [data-scrollbar-global]::-webkit-scrollbar-corner {
  background: var(--scrollbar-corner, transparent);
}
`;

// Global adoption tracker
let stylesAdopted = false;
function ensureStylesAdopted(): void {
  if (stylesAdopted || typeof document === 'undefined') return;
  stylesAdopted = true;
  try {
    stylesheet.adoptCSSSync(SCROLLBAR_BASE_CSS, 'nexus-scrollbar-engine');
  } catch {
    // Constructable stylesheet fallback
    const styleEl = document.createElement('style');
    styleEl.id = 'nexus-scrollbar-styles';
    styleEl.textContent = SCROLLBAR_BASE_CSS;
    document.head.appendChild(styleEl);
  }
}

// Dual-Value Resolvers: Native CSS vs. Tailwind Tokens
function resolveDimension(val: string | number | undefined, defaultVal: string): string {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return `${val * 4}px`; // Tailwind scale (1 -> 4px, 2 -> 8px)
  const s = String(val).trim();
  if (!isNaN(Number(s))) return `${Number(s) * 4}px`;
  return s;
}

function resolveRadius(val: string | undefined, defaultVal: string = '9999px'): string {
  if (!val) return defaultVal;
  const map: Record<string, string> = {
    full: '9999px',
    none: '0px',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    rounded: '0.25rem'
  };
  return map[val.toLowerCase()] || val;
}

function resolveColor(val: string | undefined, defaultVal: string): string {
  if (!val) return defaultVal;
  const s = val.trim();
  if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl') || s.startsWith('oklch') || s.startsWith('color-mix') || s.startsWith('var(')) {
    return s;
  }
  // DaisyUI / Tailwind Semantic Theme Variables
  const themeMap: Record<string, string> = {
    primary: 'var(--p, var(--color-primary, currentColor))',
    secondary: 'var(--s, var(--color-secondary, currentColor))',
    accent: 'var(--a, var(--color-accent, currentColor))',
    neutral: 'var(--n, var(--color-neutral, currentColor))',
    base: 'var(--b1, var(--color-base-100, currentColor))',
    'base-100': 'var(--b1, var(--color-base-100, currentColor))',
    'base-200': 'var(--b2, var(--color-base-200, currentColor))',
    'base-300': 'var(--b3, var(--color-base-300, currentColor))',
    'base-content': 'var(--bc, var(--color-base-content, currentColor))',
    info: 'var(--in, var(--color-info, currentColor))',
    success: 'var(--su, var(--color-success, currentColor))',
    warning: 'var(--wa, var(--color-warning, currentColor))',
    error: 'var(--er, var(--color-error, currentColor))',
    transparent: 'transparent'
  };
  if (themeMap[s]) return themeMap[s];
  if (s.includes('/')) {
    const [token, opacity] = s.split('/');
    const baseColor = themeMap[token] || `var(--color-${token}, ${token})`;
    const op = Number(opacity) / 100;
    return `color-mix(in srgb, ${baseColor} ${op * 100}%, transparent)`;
  }
  return `var(--color-${s}, ${s})`;
}

// Global active configuration state
let globalConfig: ScrollbarConfig = {
  autohide: 800,
  thin: true,
  width: '6px',
  height: '6px'
};

const scrollbarModule: AttributeModule = {
  name: 'scrollbar',
  attribute: 'scrollbar',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    ensureStylesAdopted();

    const isGlobal = el.hasAttribute('data-scrollbar:global') || el.tagName.toLowerCase() === 'html';

    let config: ScrollbarConfig = {};
    if (value && value.trim()) {
      try {
        const evaluated = runtime.evaluate(el, value);
        if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as ScrollbarConfig;
        } else if (typeof evaluated === 'number') {
          config = { autohide: evaluated };
        } else if (typeof evaluated === 'string') {
          if (evaluated === 'auto-hide' || evaluated === 'autohide') {
            config = { autohide: 800 };
          } else if (!isNaN(Number(evaluated))) {
            config = { autohide: Number(evaluated) };
          }
        }
      } catch {
        if (value === 'auto-hide' || value === 'autohide') config = { autohide: 800 };
      }
    }

    if (isGlobal) {
      globalConfig = { ...globalConfig, ...config };
      el.setAttribute('data-scrollbar-global', 'true');
    }

    const merged = { ...globalConfig, ...config };
    const autohideMs = merged.autohide === false ? false : (typeof merged.autohide === 'number' ? merged.autohide : 800);

    // Apply Standard & WebKit CSS Custom Properties
    const width = resolveDimension(merged.width, '6px');
    const height = resolveDimension(merged.height, width);
    const thumbColor = resolveColor(merged.thumb, 'color-mix(in srgb, currentColor 30%, transparent)');
    const thumbHover = resolveColor(merged.thumbHover, 'color-mix(in srgb, currentColor 50%, transparent)');
    const thumbActive = resolveColor(merged.thumbActive, 'color-mix(in srgb, currentColor 70%, transparent)');
    const trackColor = resolveColor(merged.track, 'transparent');
    const trackHover = resolveColor(merged.trackHover, trackColor);
    const thumbRadius = resolveRadius(merged.thumbRadius || merged.radius, '9999px');
    const trackRadius = resolveRadius(merged.trackRadius || merged.radius, '9999px');

    el.style.setProperty('--scrollbar-width', width);
    el.style.setProperty('--scrollbar-height', height);
    el.style.setProperty('--scrollbar-thumb', thumbColor);
    el.style.setProperty('--scrollbar-thumb-hover', thumbHover);
    el.style.setProperty('--scrollbar-thumb-active', thumbActive);
    el.style.setProperty('--scrollbar-track', trackColor);
    el.style.setProperty('--scrollbar-track-hover', trackHover);
    el.style.setProperty('--scrollbar-thumb-radius', thumbRadius);
    el.style.setProperty('--scrollbar-track-radius', trackRadius);
    el.style.setProperty('--scrollbar-width-std', merged.thin === false ? 'auto' : 'thin');
    el.style.setProperty('--scrollbar-buttons', merged.buttons ? 'block' : 'none');
    if (merged.corner) el.style.setProperty('--scrollbar-corner', resolveColor(merged.corner, 'transparent'));

    if (!el.classList.contains('scrollbar-auto-hide') && !isGlobal) {
      el.classList.add('scrollbar-auto-hide');
    }

    // Element-Scoped Motion Tracking Lifecycle (Single Observer Reactive Lifecycle)
    if (autohideMs !== false && autohideMs > 0) {
      let timer: number | undefined;

      const onScroll = () => {
        el.classList.add('is-scrolling');
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          el.classList.remove('is-scrolling');
          timer = undefined;
        }, autohideMs) as unknown as number;
      };

      el.addEventListener('scroll', onScroll, { passive: true });

      return () => {
        el.removeEventListener('scroll', onScroll);
        if (timer !== undefined) clearTimeout(timer);
      };
    } else {
      // Permanent visibility when autohide is disabled
      el.style.setProperty('--scrollbar-thumb-init', thumbColor);
    }
  }
};

export default scrollbarModule;
