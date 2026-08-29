/**
 * Universal Native + Tailwind Scrollbar Module for Nexus-UX
 *
 * Provides full support for native HTML5/CSS property values, Tailwind
 * semantic tokens, pointer-motion reveal, declarable fade transitions, and
 * global/local scoping with element-level interactivity isolation.
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
  fade?: number | string;
  fadeIn?: number | string;
  fadeOut?: number | string;
  fadeTiming?: string;
  global?: boolean;
}

const SCROLLBAR_BASE_CSS = `
/* Targeted Scrollbar Containers: Override DaisyUI/Framework default scrollbar-color */
.overflow-auto,
.overflow-y-auto,
.overflow-x-auto,
.overflow-scroll,
.overflow-y-scroll,
.overflow-x-scroll,
.scrollbar-auto-hide,
[data-scrollbar],
[data-scrollbar-global] {
  scrollbar-width: var(--scrollbar-width-std, thin) !important;
  scrollbar-color: transparent transparent !important;
}

.overflow-auto::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar,
.overflow-scroll::-webkit-scrollbar,
.overflow-y-scroll::-webkit-scrollbar,
.overflow-x-scroll::-webkit-scrollbar,
.scrollbar-auto-hide::-webkit-scrollbar,
[data-scrollbar]::-webkit-scrollbar,
[data-scrollbar-global]::-webkit-scrollbar {
  width: var(--scrollbar-width, 6px);
  height: var(--scrollbar-height, 6px);
}

.overflow-auto::-webkit-scrollbar-track,
.overflow-y-auto::-webkit-scrollbar-track,
.overflow-x-auto::-webkit-scrollbar-track,
.overflow-scroll::-webkit-scrollbar-track,
.overflow-y-scroll::-webkit-scrollbar-track,
.overflow-x-scroll::-webkit-scrollbar-track,
.scrollbar-auto-hide::-webkit-scrollbar-track,
[data-scrollbar]::-webkit-scrollbar-track,
[data-scrollbar-global]::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
  border-radius: var(--scrollbar-track-radius, 9999px);
}

/* Idle State: 100% Transparent Thumb with Smooth Fade */
.overflow-auto::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb,
.overflow-scroll::-webkit-scrollbar-thumb,
.overflow-y-scroll::-webkit-scrollbar-thumb,
.overflow-x-scroll::-webkit-scrollbar-thumb,
.scrollbar-auto-hide::-webkit-scrollbar-thumb,
[data-scrollbar]::-webkit-scrollbar-thumb,
[data-scrollbar-global]::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  transition: background-color var(--scrollbar-fade-out, 0.4s) var(--scrollbar-fade-timing, cubic-bezier(0.4, 0, 0.2, 1));
}

/* Motion State: Active Reveal (Targeted .is-scrolling) */
.overflow-auto.is-scrolling,
.overflow-y-auto.is-scrolling,
.overflow-x-auto.is-scrolling,
.overflow-scroll.is-scrolling,
.overflow-y-scroll.is-scrolling,
.overflow-x-scroll.is-scrolling,
.scrollbar-auto-hide.is-scrolling,
[data-scrollbar].is-scrolling,
[data-scrollbar-global].is-scrolling {
  scrollbar-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) var(--scrollbar-track, transparent) !important;
}

.overflow-auto.is-scrolling::-webkit-scrollbar-thumb,
.overflow-y-auto.is-scrolling::-webkit-scrollbar-thumb,
.overflow-x-auto.is-scrolling::-webkit-scrollbar-thumb,
.overflow-scroll.is-scrolling::-webkit-scrollbar-thumb,
.overflow-y-scroll.is-scrolling::-webkit-scrollbar-thumb,
.overflow-x-scroll.is-scrolling::-webkit-scrollbar-thumb,
.scrollbar-auto-hide.is-scrolling::-webkit-scrollbar-thumb,
[data-scrollbar].is-scrolling::-webkit-scrollbar-thumb,
[data-scrollbar-global].is-scrolling::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) !important;
  transition: background-color var(--scrollbar-fade-in, 0.2s) ease-out;
}

.overflow-auto::-webkit-scrollbar-thumb:hover,
.overflow-y-auto::-webkit-scrollbar-thumb:hover,
.overflow-x-auto::-webkit-scrollbar-thumb:hover,
.scrollbar-auto-hide::-webkit-scrollbar-thumb:hover,
[data-scrollbar]::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover, color-mix(in srgb, currentColor 50%, transparent)) !important;
}

.overflow-auto::-webkit-scrollbar-thumb:active,
.overflow-y-auto::-webkit-scrollbar-thumb:active,
.overflow-x-auto::-webkit-scrollbar-thumb:active,
.scrollbar-auto-hide::-webkit-scrollbar-thumb:active,
[data-scrollbar]::-webkit-scrollbar-thumb:active {
  background-color: var(--scrollbar-thumb-active, color-mix(in srgb, currentColor 70%, transparent)) !important;
}

.overflow-auto::-webkit-scrollbar-button,
.overflow-y-auto::-webkit-scrollbar-button,
.overflow-x-auto::-webkit-scrollbar-button,
.scrollbar-auto-hide::-webkit-scrollbar-button,
[data-scrollbar]::-webkit-scrollbar-button {
  display: var(--scrollbar-buttons, none);
}

.overflow-auto::-webkit-scrollbar-corner,
.overflow-y-auto::-webkit-scrollbar-corner,
.overflow-x-auto::-webkit-scrollbar-corner,
.scrollbar-auto-hide::-webkit-scrollbar-corner,
[data-scrollbar]::-webkit-scrollbar-corner {
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
    const styleEl = document.createElement('style');
    styleEl.id = 'nexus-scrollbar-styles';
    styleEl.textContent = SCROLLBAR_BASE_CSS;
    document.head.appendChild(styleEl);
  }
}

// Dual-Value Resolvers: Native CSS vs. Tailwind Tokens
function resolveDimension(val: string | number | undefined, defaultVal: string): string {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return `${val * 4}px`;
  const s = String(val).trim();
  if (!isNaN(Number(s))) return `${Number(s) * 4}px`;
  return s;
}

function resolveDuration(val: string | number | undefined, defaultVal: string): string {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return `${val}ms`;
  const s = String(val).trim();
  if (!isNaN(Number(s))) return `${s}ms`;
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

function findScrollParent(el: Element | null): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    const s = window.getComputedStyle(el);
    const hasScroll = (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowX === 'auto' || s.overflowX === 'scroll');
    if (hasScroll && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

// Global active configuration state
let globalConfig: ScrollbarConfig = {
  autohide: 800,
  thin: true,
  width: '6px',
  height: '6px',
  fade: '0.4s',
  fadeIn: '0.2s',
  fadeOut: '0.4s',
  fadeTiming: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

// Global capture listener registration state
let globalListenerRegistered = false;
const elementTimers = new WeakMap<Element, number>();

function triggerContainerMotion(target: Element): void {
  const autohideMs = typeof globalConfig.autohide === 'number' ? globalConfig.autohide : 800;
  if (globalConfig.autohide === false || autohideMs <= 0) return;

  target.classList.add('is-scrolling');

  const existingTimer = elementTimers.get(target);
  if (existingTimer !== undefined) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    target.classList.remove('is-scrolling');
    elementTimers.delete(target);
  }, autohideMs) as unknown as number;

  elementTimers.set(target, timer);
}

function setupGlobalCaptureListeners(runtime: RuntimeContext): void {
  if (globalListenerRegistered || typeof document === 'undefined') return;
  globalListenerRegistered = true;

  const onGlobalScroll = (e: Event) => {
    const target = e.target;
    if (target instanceof Element) {
      triggerContainerMotion(target);
    }
  };

  let pointerRaf: number | null = null;
  const onGlobalPointerMove = (e: Event) => {
    if (pointerRaf !== null) return;
    const target = e.target;
    pointerRaf = requestAnimationFrame(() => {
      pointerRaf = null;
      if (target instanceof Element) {
        const scrollContainer = findScrollParent(target);
        if (scrollContainer) {
          triggerContainerMotion(scrollContainer);
        }
      }
    });
  };

  document.addEventListener('scroll', onGlobalScroll, { capture: true, passive: true });
  document.addEventListener('pointermove', onGlobalPointerMove, { capture: true, passive: true });

  if (runtime && runtime.registerCleanup) {
    runtime.registerCleanup(() => {
      document.removeEventListener('scroll', onGlobalScroll, { capture: true });
      document.removeEventListener('pointermove', onGlobalPointerMove, { capture: true });
      if (pointerRaf !== null) cancelAnimationFrame(pointerRaf);
      globalListenerRegistered = false;
    });
  }
}

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
      setupGlobalCaptureListeners(runtime);
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

    // Transitions: allow explicit local overrides
    const fadeIn = resolveDuration(config.fadeIn || globalConfig.fadeIn, '0.2s');
    const fadeOut = resolveDuration(config.fadeOut || config.fade || globalConfig.fadeOut || globalConfig.fade, '0.4s');
    const fadeTiming = config.fadeTiming || globalConfig.fadeTiming || 'cubic-bezier(0.4, 0, 0.2, 1)';

    el.style.setProperty('--scrollbar-width', width);
    el.style.setProperty('--scrollbar-height', height);
    el.style.setProperty('--scrollbar-thumb', thumbColor);
    el.style.setProperty('--scrollbar-thumb-hover', thumbHover);
    el.style.setProperty('--scrollbar-thumb-active', thumbActive);
    el.style.setProperty('--scrollbar-track', trackColor);
    el.style.setProperty('--scrollbar-track-hover', trackHover);
    el.style.setProperty('--scrollbar-thumb-radius', thumbRadius);
    el.style.setProperty('--scrollbar-track-radius', trackRadius);
    el.style.setProperty('--scrollbar-buttons', merged.buttons ? 'block' : 'none');
    el.style.setProperty('--scrollbar-fade-in', fadeIn);
    el.style.setProperty('--scrollbar-fade-out', fadeOut);
    el.style.setProperty('--scrollbar-fade-timing', fadeTiming);
    if (merged.corner) el.style.setProperty('--scrollbar-corner', resolveColor(merged.corner, 'transparent'));

    if (!isGlobal) {
      el.classList.add('scrollbar-auto-hide');

      // Local explicit motion tracking
      if (autohideMs !== false && autohideMs > 0) {
        let timer: number | undefined;

        const onMotion = () => {
          el.classList.add('is-scrolling');
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(() => {
            el.classList.remove('is-scrolling');
            timer = undefined;
          }, autohideMs) as unknown as number;
        };

        el.addEventListener('scroll', onMotion, { passive: true });
        el.addEventListener('pointermove', onMotion, { passive: true });

        return () => {
          el.removeEventListener('scroll', onMotion);
          el.removeEventListener('pointermove', onMotion);
          if (timer !== undefined) clearTimeout(timer);
        };
      }
    }
  }
};

export default scrollbarModule;
