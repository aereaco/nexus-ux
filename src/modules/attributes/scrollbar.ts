/**
 * Universal Native + Overlay Scrollbar Engine for Nexus-UX
 *
 * Supports both `mode: 'native'` (standard CSS/WebKit pseudo-elements) and
 * `mode: 'overlay'` (GPU-accelerated overlay sprite with genuine 60fps/120fps CSS
 * opacity fade transitions and interactive thumb dragging).
 *
 * Built with Pure Generic Modern Native UI/UX Standards:
 * - Constructable StyleSheets (Adopted StyleSheets) for 100% pre-paint certainty.
 * - CSS Logical Properties (`inset-inline-start/end`, `inset-block-start/end`) for seamless RTL/LTR mirroring.
 * - Relative units (`rem`/`em`) for responsive Theme Zoom and root accessibility scaling.
 * - Clean open standard naming with zero hardcoded application classes.
 */
import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ensureAdoptedStylesheet } from '../../engine/utils/styles.ts';

export type ScrollbarMode = 'native' | 'overlay' | 'none';

export interface ScrollbarConfig {
  mode?: ScrollbarMode;
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

// Dual-Value Resolvers with rem Relative Units
function resolveDimension(val: string | number | undefined, defaultVal: string = '0.375rem'): string {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return `${val * 0.25}rem`;
  const s = String(val).trim();
  if (!isNaN(Number(s))) return `${Number(s) * 0.25}rem`;
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

export function buildScrollbarCSS(config?: Partial<ScrollbarConfig>): string {
  const width = resolveDimension(config?.width, '0.375rem');
  const height = resolveDimension(config?.height, width);
  const thumbColor = resolveColor(config?.thumb, 'color-mix(in srgb, currentColor 30%, transparent)');
  const thumbHover = resolveColor(config?.thumbHover, 'color-mix(in srgb, currentColor 50%, transparent)');
  const thumbActive = resolveColor(config?.thumbActive, 'color-mix(in srgb, currentColor 70%, transparent)');
  const trackColor = resolveColor(config?.track, 'transparent');
  const trackHover = resolveColor(config?.trackHover, trackColor);
  const thumbRadius = resolveRadius(config?.thumbRadius || config?.radius, '9999px');
  const trackRadius = resolveRadius(config?.trackRadius || config?.radius, '9999px');
  const fadeIn = resolveDuration(config?.fadeIn, '0.2s');
  const fadeOut = resolveDuration(config?.fadeOut || config?.fade, '0.4s');
  const fadeTiming = config?.fadeTiming || 'cubic-bezier(0.4, 0, 0.2, 1)';

  return `
/* ==========================================================================
   Zero-Flash Native Scrollbar Suppression for Overlay Mode
   ========================================================================== */
[style*="overflow"],
[data-scrollbar],
.overflow-y-auto,
.overflow-x-auto,
.overflow-auto,
.scrollbar-none,
.scrollbar-overlay-active {
  scrollbar-width: none !important;
}

[style*="overflow"]::-webkit-scrollbar,
[data-scrollbar]::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar,
.overflow-auto::-webkit-scrollbar,
.scrollbar-none::-webkit-scrollbar,
.scrollbar-overlay-active::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

[data-scrollbar]::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb,
.overflow-auto::-webkit-scrollbar-thumb,
.scrollbar-none::-webkit-scrollbar-thumb,
.scrollbar-overlay-active::-webkit-scrollbar-thumb {
  display: none !important;
  background-color: transparent !important;
}

/* ==========================================================================
   Root Adopted Theme Tokens
   ========================================================================== */
:root, :host, [data-scrollbar_global] {
  --scrollbar-width: ${width};
  --scrollbar-height: ${height};
  --scrollbar-thumb: ${thumbColor};
  --scrollbar-thumb-hover: ${thumbHover};
  --scrollbar-thumb-active: ${thumbActive};
  --scrollbar-track: ${trackColor};
  --scrollbar-track-hover: ${trackHover};
  --scrollbar-thumb-radius: ${thumbRadius};
  --scrollbar-track-radius: ${trackRadius};
  --scrollbar-fade-in: ${fadeIn};
  --scrollbar-fade-out: ${fadeOut};
  --scrollbar-fade-timing: ${fadeTiming};
}

/* ==========================================================================
   1. OVERLAY SCROLLBAR SPRITE STYLES (Modern CSS Logical Properties & rem Units)
   ========================================================================== */
.scrollbar-track-v {
  display: none;
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0.125rem;
  width: var(--scrollbar-width, 0.375rem);
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}

.scrollbar-thumb-v {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: 100%;
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) var(--scrollbar-fade-timing, cubic-bezier(0.4, 0, 0.2, 1)), background-color 0.2s ease-out;
}

.scrollbar-track-h {
  display: none;
  position: absolute;
  inset-block-end: 0.125rem;
  inset-inline-start: 0;
  width: 0;
  height: var(--scrollbar-height, 0.375rem);
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}

.scrollbar-thumb-h {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  height: 100%;
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) var(--scrollbar-fade-timing, cubic-bezier(0.4, 0, 0.2, 1)), background-color 0.2s ease-out;
}

/* Motion State: Smooth Opacity Reveal */
.is-scrolling > .scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling > .scrollbar-track-h > .scrollbar-thumb-h,
.is-scrolling.scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling.scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-v > .scrollbar-thumb-v,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-thumb-v:hover,
.scrollbar-thumb-h:hover,
.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  opacity: 1 !important;
  transition: opacity var(--scrollbar-fade-in, 0.2s) ease-out, background-color 0.2s ease-out !important;
}

.scrollbar-thumb-v:hover,
.scrollbar-thumb-h:hover {
  background-color: var(--scrollbar-thumb-hover, color-mix(in srgb, currentColor 50%, transparent)) !important;
}

.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  cursor: grabbing !important;
  background-color: var(--scrollbar-thumb-active, color-mix(in srgb, currentColor 70%, transparent)) !important;
}

/* ==========================================================================
   2. NATIVE SCROLLBAR MODE (Fallback / Standard WebKit CSS)
   ========================================================================== */
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar {
  width: var(--scrollbar-width, 0.375rem);
  height: var(--scrollbar-height, 0.375rem);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
  border-radius: var(--scrollbar-track-radius, 9999px);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: var(--scrollbar-thumb-radius, 9999px);
}
[style*="overflow"]:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
[data-scrollbar]:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) !important;
}
`;
}

const scrollbarSheetRef: { sheet: CSSStyleSheet | null } = { sheet: null };

export function ensureScrollbarStyles(root?: Document | ShadowRoot | null, config?: Partial<ScrollbarConfig>) {
  const css = buildScrollbarCSS(config || globalConfig);
  if (scrollbarSheetRef.sheet && config) {
    scrollbarSheetRef.sheet.replaceSync(css);
  }
  ensureAdoptedStylesheet(css, scrollbarSheetRef, root);
}

if (typeof document !== 'undefined') {
  ensureScrollbarStyles();
}

function findScrollParent(el: Element | null): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.getAttribute('data-scrollbar') === 'none' || el.classList.contains('scrollbar-none')) {
      return null;
    }
    const s = window.getComputedStyle(el);
    const hasScrollY = s.overflowY !== 'hidden' && s.overflowY !== 'clip' && s.overflow !== 'hidden' &&
      (s.overflowY === 'auto' || s.overflowY === 'scroll') && (el.scrollHeight > el.clientHeight);
    const hasScrollX = s.overflowX !== 'hidden' && s.overflowX !== 'clip' && s.overflow !== 'hidden' &&
      (s.overflowX === 'auto' || s.overflowX === 'scroll') && (el.scrollWidth > el.clientWidth);
    if (hasScrollY || hasScrollX) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

// Global active configuration state
let globalConfig: ScrollbarConfig = {
  mode: 'native',
  autohide: 800,
  thin: true,
  width: '0.375rem',
  height: '0.375rem',
  fade: '0.4s',
  fadeIn: '0.2s',
  fadeOut: '0.4s',
  fadeTiming: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

// Global capture listener registration state
let globalListenerRegistered = false;
const elementTimers = new WeakMap<Element, number>();
const overlayInstances = new WeakMap<Element, OverlayScrollbarInstance>();
const activeInstances = new Set<OverlayScrollbarInstance>();

export class OverlayScrollbarInstance {
  private el: HTMLElement;
  private host: HTMLElement;
  private trackV: HTMLElement | null = null;
  private thumbV: HTMLElement | null = null;
  private trackH: HTMLElement | null = null;
  private thumbH: HTMLElement | null = null;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartX = 0;
  private dragStartScrollTop = 0;
  private dragStartScrollLeft = 0;
  private activeAxis: 'v' | 'h' = 'v';
  private rafId: number | null = null;
  private cachedOverflowY: boolean | null = null;
  private cachedOverflowX: boolean | null = null;
  private cachedRTL: boolean = false;
  private lastStyleCheck: number = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.host = (el.parentElement || document.body) as HTMLElement;
    activeInstances.add(this);
    this.init();
  }

  public init(): void {
    if (this.host !== document.body && window.getComputedStyle(this.host).position === 'static') {
      this.host.style.position = 'relative';
    }
    this.el.classList.add('scrollbar-overlay-active');
    if (globalConfig.autohide === false) {
      this.el.classList.add('scrollbar-no-autohide');
    }

    // Vertical Overlay Sprite
    this.trackV = document.createElement('div');
    this.trackV.className = 'scrollbar-track-v';
    this.trackV.style.display = 'none';
    this.thumbV = document.createElement('div');
    this.thumbV.className = 'scrollbar-thumb-v';
    this.trackV.appendChild(this.thumbV);
    this.host.appendChild(this.trackV);

    // Horizontal Overlay Sprite
    this.trackH = document.createElement('div');
    this.trackH.className = 'scrollbar-track-h';
    this.trackH.style.display = 'none';
    this.thumbH = document.createElement('div');
    this.thumbH.className = 'scrollbar-thumb-h';
    this.trackH.appendChild(this.thumbH);
    this.host.appendChild(this.trackH);

    this.bindEvents();
    this.update();
  }

  public setScrolling(active: boolean): void {
    if (active) {
      this.trackV?.classList.add('is-scrolling');
      this.trackH?.classList.add('is-scrolling');
    } else {
      this.trackV?.classList.remove('is-scrolling');
      this.trackH?.classList.remove('is-scrolling');
    }
  }

  public scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  public update(): void {
    const { clientHeight, scrollHeight, clientWidth, scrollWidth, scrollTop, scrollLeft } = this.el;

    // Check declarative opt-out or hidden container
    if (
      !this.el.isConnected ||
      this.el.getAttribute('data-scrollbar') === 'none' ||
      this.el.classList.contains('scrollbar-none') ||
      clientHeight === 0 ||
      clientWidth === 0 ||
      this.el.style.display === 'none'
    ) {
      if (this.trackV) this.trackV.style.display = 'none';
      if (this.trackH) this.trackH.style.display = 'none';
      return;
    }

    const now = performance.now();
    if (this.cachedOverflowY === null || now - this.lastStyleCheck > 250) {
      this.lastStyleCheck = now;
      const s = window.getComputedStyle(this.el);
      this.cachedRTL = s.direction === 'rtl';
      this.cachedOverflowY = s.overflowY !== 'hidden' && s.overflowY !== 'clip' && s.overflow !== 'hidden' && (s.overflowY === 'auto' || s.overflowY === 'scroll');
      this.cachedOverflowX = s.overflowX !== 'hidden' && s.overflowX !== 'clip' && s.overflow !== 'hidden' && (s.overflowX === 'auto' || s.overflowX === 'scroll');
    }

    const isRTL = this.cachedRTL;
    const isFixed = this.host === document.body;

    // Vertical Update
    if (this.cachedOverflowY && scrollHeight > clientHeight && clientHeight > 0) {
      if (this.trackV && this.trackV.style.display !== 'block') this.trackV.style.display = 'block';

      if (this.trackV) {
        if (isFixed) {
          const rect = this.el.getBoundingClientRect();
          this.trackV.style.position = 'fixed';
          this.trackV.style.top = `${rect.top}px`;
          this.trackV.style.height = `${clientHeight}px`;
          if (isRTL) {
            this.trackV.style.left = `${rect.left + 2}px`;
            this.trackV.style.right = 'auto';
          } else {
            this.trackV.style.right = `${window.innerWidth - rect.right + 2}px`;
            this.trackV.style.left = 'auto';
          }
        } else {
          this.trackV.style.position = 'absolute';
          this.trackV.style.top = `${this.el.offsetTop}px`;
          this.trackV.style.height = `${clientHeight}px`;
          if (isRTL) {
            this.trackV.style.left = `${this.el.offsetLeft + 2}px`;
            this.trackV.style.right = 'auto';
          } else {
            const rightOffset = Math.max(2, (this.host.clientWidth - (this.el.offsetLeft + this.el.clientWidth)) + 2);
            this.trackV.style.right = `${rightOffset}px`;
            this.trackV.style.left = 'auto';
          }
        }
      }

      const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeight;
      const thumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

      const heightPx = `${thumbHeight}px`;
      if (this.thumbV!.style.height !== heightPx) {
        this.thumbV!.style.height = heightPx;
      }
      this.thumbV!.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
    } else {
      if (this.trackV && this.trackV.style.display !== 'none') this.trackV.style.display = 'none';
    }

    // Horizontal Update
    if (this.cachedOverflowX && scrollWidth > clientWidth && clientWidth > 0) {
      if (this.trackH && this.trackH.style.display !== 'block') this.trackH.style.display = 'block';

      if (this.trackH) {
        if (isFixed) {
          const rect = this.el.getBoundingClientRect();
          this.trackH.style.position = 'fixed';
          this.trackH.style.left = `${rect.left}px`;
          this.trackH.style.width = `${clientWidth}px`;
          this.trackH.style.bottom = `${window.innerHeight - rect.bottom + 2}px`;
        } else {
          this.trackH.style.position = 'absolute';
          this.trackH.style.left = `${this.el.offsetLeft}px`;
          this.trackH.style.width = `${clientWidth}px`;
          const bottomOffset = Math.max(2, (this.host.clientHeight - (this.el.offsetTop + this.el.clientHeight)) + 2);
          this.trackH.style.bottom = `${bottomOffset}px`;
        }
      }

      const thumbWidth = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
      const maxScrollLeft = scrollWidth - clientWidth;
      const maxThumbLeft = clientWidth - thumbWidth;
      const absScrollLeft = Math.abs(scrollLeft);
      const thumbLeft = maxScrollLeft > 0 ? (absScrollLeft / maxScrollLeft) * maxThumbLeft : 0;

      const thumbX = isRTL ? -thumbLeft : thumbLeft;
      const widthPx = `${thumbWidth}px`;
      if (this.thumbH!.style.width !== widthPx) {
        this.thumbH!.style.width = widthPx;
      }
      this.thumbH!.style.transform = `translate3d(${thumbX}px, 0, 0)`;
    } else {
      if (this.trackH && this.trackH.style.display !== 'none') this.trackH.style.display = 'none';
    }
  }

  private bindEvents(): void {
    // Vertical Thumb Drag
    this.thumbV!.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDragging = true;
      this.activeAxis = 'v';
      this.dragStartY = e.clientY;
      this.dragStartScrollTop = this.el.scrollTop;
      this.thumbV!.classList.add('is-dragging');
      this.thumbV!.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvt: PointerEvent) => {
        if (!this.isDragging || this.activeAxis !== 'v') return;
        const deltaY = moveEvt.clientY - this.dragStartY;
        const clientHeight = this.el.clientHeight;
        const scrollHeight = this.el.scrollHeight;
        const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
        const maxThumbTop = clientHeight - thumbHeight;
        const maxScrollTop = scrollHeight - clientHeight;
        if (maxThumbTop > 0) {
          const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
          this.el.scrollTop = this.dragStartScrollTop + scrollDelta;
        }
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        this.isDragging = false;
        this.thumbV!.classList.remove('is-dragging');
        try {
          this.thumbV!.releasePointerCapture(upEvt.pointerId);
        } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });

    // Horizontal Thumb Drag
    this.thumbH!.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDragging = true;
      this.activeAxis = 'h';
      this.dragStartX = e.clientX;
      this.dragStartScrollLeft = this.el.scrollLeft;
      this.thumbH!.classList.add('is-dragging');
      this.thumbH!.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvt: PointerEvent) => {
        if (!this.isDragging || this.activeAxis !== 'h') return;
        const deltaX = moveEvt.clientX - this.dragStartX;
        const clientWidth = this.el.clientWidth;
        const scrollWidth = this.el.scrollWidth;
        const thumbWidth = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
        const maxThumbLeft = clientWidth - thumbWidth;
        const maxScrollLeft = scrollWidth - clientWidth;
        if (maxThumbLeft > 0) {
          const scrollDelta = (deltaX / maxThumbLeft) * maxScrollLeft;
          this.el.scrollLeft = this.dragStartScrollLeft + (this.cachedRTL ? -scrollDelta : scrollDelta);
        }
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        this.isDragging = false;
        this.thumbH!.classList.remove('is-dragging');
        try {
          this.thumbH!.releasePointerCapture(upEvt.pointerId);
        } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });

    // Vertical Track Click-to-Scroll
    this.trackV!.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.target === this.thumbV) return;
      e.stopPropagation();
      e.preventDefault();
      const rect = this.trackV!.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clientHeight = this.el.clientHeight;
      const scrollHeight = this.el.scrollHeight;
      const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
      const targetThumbTop = clickY - thumbHeight / 2;
      const maxThumbTop = clientHeight - thumbHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      if (maxThumbTop > 0) {
        this.el.scrollTop = Math.max(0, Math.min(maxScrollTop, (targetThumbTop / maxThumbTop) * maxScrollTop));
      }
    });

    // Horizontal Track Click-to-Scroll
    this.trackH!.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.target === this.thumbH) return;
      e.stopPropagation();
      e.preventDefault();
      const rect = this.trackH!.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clientWidth = this.el.clientWidth;
      const scrollWidth = this.el.scrollWidth;
      const thumbWidth = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
      const targetThumbLeft = clickX - thumbWidth / 2;
      const maxThumbLeft = clientWidth - thumbWidth;
      const maxScrollLeft = scrollWidth - clientWidth;
      if (maxThumbLeft > 0) {
        this.el.scrollLeft = Math.max(0, Math.min(maxScrollLeft, (targetThumbLeft / maxThumbLeft) * maxScrollLeft));
      }
    });
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.trackV?.remove();
    this.trackH?.remove();
    this.el.classList.remove('scrollbar-overlay-active');
    this.el.classList.remove('scrollbar-no-autohide');
    activeInstances.delete(this);
  }
}

export function ensureOverlayInstance(el: HTMLElement): OverlayScrollbarInstance {
  let inst = overlayInstances.get(el);
  if (!inst) {
    inst = new OverlayScrollbarInstance(el);
    overlayInstances.set(el, inst);
  }
  return inst;
}

export function syncAllOverlayScrollbars(): void {
  activeInstances.forEach(inst => inst.scheduleUpdate());
}

export function isGlobalOverlayActive(): boolean {
  return globalConfig.mode === 'overlay';
}

export function isScrollContainer(el: HTMLElement): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.getAttribute('data-scrollbar') === 'none' || el.classList.contains('scrollbar-none')) {
    return false;
  }
  if (el.hasAttribute('data-scrollbar')) return true;
  if (el.classList.contains('overflow-y-auto') || el.classList.contains('overflow-x-auto') || el.classList.contains('overflow-auto')) {
    return true;
  }
  if (el.hasAttribute('style') && el.getAttribute('style')!.includes('overflow')) {
    return true;
  }
  return false;
}

export function attachOverlayScrollbar(el: HTMLElement): OverlayScrollbarInstance | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  if (el.getAttribute('data-scrollbar') === 'none' || el.classList.contains('scrollbar-none')) {
    return null;
  }
  const inst = ensureOverlayInstance(el);
  inst.scheduleUpdate();
  triggerContainerMotion(el);
  return inst;
}

export function triggerContainerMotion(target: Element): void {
  const autohideMs = typeof globalConfig.autohide === 'number' ? globalConfig.autohide : 800;
  if (globalConfig.autohide === false || autohideMs <= 0) return;

  if (!target.classList.contains('is-scrolling')) {
    target.classList.add('is-scrolling');
  }

  // If overlay mode is active, schedule geometry sync via rAF
  if (target instanceof HTMLElement && (globalConfig.mode === 'overlay' || target.hasAttribute('data-scrollbar'))) {
    const inst = ensureOverlayInstance(target);
    inst.setScrolling(true);
    inst.scheduleUpdate();
  }

  const existingTimer = elementTimers.get(target);
  if (existingTimer !== undefined) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    target.classList.remove('is-scrolling');
    if (target instanceof HTMLElement) {
      const inst = overlayInstances.get(target);
      if (inst) inst.setScrolling(false);
    }
    elementTimers.delete(target);
  }, autohideMs) as unknown as number;

  elementTimers.set(target, timer);
}

function setupGlobalCaptureListeners(runtime: RuntimeContext): void {
  if (globalListenerRegistered || typeof document === 'undefined') return;
  globalListenerRegistered = true;

  const onGlobalScroll = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
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

  const onWindowResize = () => syncAllOverlayScrollbars();

  document.addEventListener('scroll', onGlobalScroll, { capture: true, passive: true });
  document.addEventListener('pointermove', onGlobalPointerMove, { capture: true, passive: true });
  window.addEventListener('resize', onWindowResize, { passive: true });

  if (runtime && (runtime as any).registerCleanup) {
    (runtime as any).registerCleanup(() => {
      document.removeEventListener('scroll', onGlobalScroll, { capture: true });
      document.removeEventListener('pointermove', onGlobalPointerMove, { capture: true });
      window.removeEventListener('resize', onWindowResize);
      if (pointerRaf !== null) cancelAnimationFrame(pointerRaf);
      globalListenerRegistered = false;
    });
  }
}

const scrollbarModule: AttributeModule = {
  name: 'scrollbar',
  attribute: 'scrollbar',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const isGlobal = el.hasAttribute('data-scrollbar_global') || el.tagName.toLowerCase() === 'html';

    let config: ScrollbarConfig = {};
    if (value && value.trim()) {
      try {
        const evaluated = runtime.evaluate(el, value);
        if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as ScrollbarConfig;
        } else if (typeof evaluated === 'string') {
          if (evaluated === 'overlay') {
            config = { mode: 'overlay' };
          } else if (evaluated === 'native') {
            config = { mode: 'native' };
          } else if (evaluated === 'none') {
            config = { mode: 'none' };
          } else if (evaluated === 'auto-hide' || evaluated === 'autohide') {
            config = { autohide: 800 };
          } else if (!isNaN(Number(evaluated))) {
            config = { autohide: Number(evaluated) };
          }
        }
      } catch {
        if (value === 'overlay') config = { mode: 'overlay' };
        if (value === 'none') config = { mode: 'none' };
      }
    }

    if (isGlobal) {
      globalConfig = { ...globalConfig, ...config };
      el.setAttribute('data-scrollbar_global', 'true');
      ensureScrollbarStyles(el.getRootNode() as Document | ShadowRoot, globalConfig);
      setupGlobalCaptureListeners(runtime);
      syncAllOverlayScrollbars();
    } else {
      ensureScrollbarStyles(el.getRootNode() as Document | ShadowRoot);
    }

    const merged = { ...globalConfig, ...config };
    if (merged.mode === 'none') {
      el.classList.add('scrollbar-none');
      return;
    }

    // Initialize Overlay Sprite if in overlay mode
    if (merged.mode === 'overlay') {
      const overlayInst = attachOverlayScrollbar(el);
      if (overlayInst && !isGlobal) {
        return () => {
          overlayInst.destroy();
          overlayInstances.delete(el);
        };
      }
    }
  }
};

export default scrollbarModule;
