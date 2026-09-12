/**
 * Universal Native + Overlay Scrollbar Engine for Nexus-UX
 *
 * Supports both `mode: 'native'` (standard CSS/WebKit pseudo-elements) and
 * `mode: 'overlay'` (GPU-accelerated overlay sprite with genuine 60fps/120fps CSS
 * opacity fade transitions and interactive thumb dragging).
 *
 * Built with Pure Generic Modern Native UI/UX Standards:
 * - CSS Logical Properties (`inset-inline-start/end`, `inset-block-start/end`) for seamless RTL/LTR mirroring.
 * - Relative units (`rem`/`em`) for responsive Theme Zoom and root accessibility scaling.
 * - Clean open standard naming with zero branded syntax and zero hardcoded application classes.
 */
import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { stylesheet } from './stylesheet.ts';

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

const SCROLLBAR_BASE_CSS = `
/* ==========================================================================
   Zero-Flash Native Scrollbar Suppression for Overlay Mode
   ========================================================================== */
.overflow-auto,
.overflow-y-auto,
.overflow-x-auto,
.overflow-scroll,
.overflow-y-scroll,
.overflow-x-scroll,
[data-scrollbar],
.scrollbar-none,
.scrollbar-overlay-active {
  scrollbar-width: none !important;
}

.overflow-auto::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar,
.overflow-scroll::-webkit-scrollbar,
.overflow-y-scroll::-webkit-scrollbar,
.overflow-x-scroll::-webkit-scrollbar,
[data-scrollbar]::-webkit-scrollbar,
.scrollbar-none::-webkit-scrollbar,
.scrollbar-overlay-active::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

[data-scrollbar]::-webkit-scrollbar-thumb,
.scrollbar-none::-webkit-scrollbar-thumb,
.scrollbar-overlay-active::-webkit-scrollbar-thumb {
  display: none !important;
  background-color: transparent !important;
}

/* ==========================================================================
   1. OVERLAY SCROLLBAR SPRITE STYLES (Modern CSS Logical Properties & rem Units)
   ========================================================================== */
.scrollbar-track-v {
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
.overflow-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
.overflow-y-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
.overflow-x-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar {
  width: var(--scrollbar-width, 0.375rem);
  height: var(--scrollbar-height, 0.375rem);
}
.overflow-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
.overflow-y-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
.overflow-x-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
  border-radius: var(--scrollbar-track-radius, 9999px);
}
.overflow-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
.overflow-y-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
.overflow-x-auto:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none)::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: var(--scrollbar-thumb-radius, 9999px);
}
.overflow-auto:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
.overflow-y-auto:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
.overflow-x-auto:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb,
.scrollbar-auto-hide:not(.scrollbar-overlay-active):not(.scrollbar-none).is-scrolling::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, color-mix(in srgb, currentColor 30%, transparent)) !important;
}
`;

// Global adoption tracker
let stylesAdopted = false;
function ensureStylesAdopted(): void {
  if (stylesAdopted || typeof document === 'undefined') return;
  stylesAdopted = true;
  try {
    stylesheet.adoptCSSSync(SCROLLBAR_BASE_CSS, 'scrollbar-engine');
  } catch {
    const styleEl = document.createElement('style');
    styleEl.id = 'scrollbar-styles';
    styleEl.textContent = SCROLLBAR_BASE_CSS;
    document.head.appendChild(styleEl);
  }
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

function findScrollParent(el: Element | null): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.getAttribute('data-scrollbar') === 'none' || el.classList.contains('scrollbar-none')) {
      return null;
    }
    const s = window.getComputedStyle(el);
    const hasScrollY = (s.overflowY === 'auto' || s.overflowY === 'scroll') && (el.scrollHeight > el.clientHeight);
    const hasScrollX = (s.overflowX === 'auto' || s.overflowX === 'scroll') && (el.scrollWidth > el.clientWidth);
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

class OverlayScrollbarInstance {
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
    this.init();
  }

  public init(): void {
    if (this.host !== document.body && window.getComputedStyle(this.host).position === 'static') {
      this.host.style.position = 'relative';
    }
    this.el.classList.add('scrollbar-overlay-active');

    // Vertical Overlay Sprite
    this.trackV = document.createElement('div');
    this.trackV.className = 'scrollbar-track-v';
    this.thumbV = document.createElement('div');
    this.thumbV.className = 'scrollbar-thumb-v';
    this.trackV.appendChild(this.thumbV);
    this.host.appendChild(this.trackV);

    // Horizontal Overlay Sprite
    this.trackH = document.createElement('div');
    this.trackH.className = 'scrollbar-track-h';
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
    if (this.cachedOverflowY === null || now - this.lastStyleCheck > 1000) {
      this.lastStyleCheck = now;
      const s = window.getComputedStyle(this.el);
      this.cachedRTL = s.direction === 'rtl';
      this.cachedOverflowY = s.overflowY !== 'hidden' && (s.overflowY === 'auto' || s.overflowY === 'scroll');
      this.cachedOverflowX = s.overflowX !== 'hidden' && (s.overflowX === 'auto' || s.overflowX === 'scroll');
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
    });

    this.thumbV!.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDragging || this.activeAxis !== 'v') return;
      const deltaY = e.clientY - this.dragStartY;
      const { clientHeight, scrollHeight } = this.el;
      const thumbHeight = this.thumbV!.offsetHeight;
      const scrollableDist = scrollHeight - clientHeight;
      const trackDist = clientHeight - thumbHeight;
      if (trackDist > 0) {
        this.el.scrollTop = this.dragStartScrollTop + (deltaY / trackDist) * scrollableDist;
      }
    });

    const stopDragV = (e: PointerEvent) => {
      if (this.isDragging && this.activeAxis === 'v') {
        this.isDragging = false;
        this.thumbV!.classList.remove('is-dragging');
        try { this.thumbV!.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    this.thumbV!.addEventListener('pointerup', stopDragV);
    this.thumbV!.addEventListener('pointercancel', stopDragV);

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
    });

    this.thumbH!.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDragging || this.activeAxis !== 'h') return;
      const isRTL = window.getComputedStyle(this.el).direction === 'rtl';
      const deltaX = isRTL ? (this.dragStartX - e.clientX) : (e.clientX - this.dragStartX);
      const { clientWidth, scrollWidth } = this.el;
      const thumbWidth = this.thumbH!.offsetWidth;
      const scrollableDist = scrollWidth - clientWidth;
      const trackDist = clientWidth - thumbWidth;
      if (trackDist > 0) {
        const scrollDelta = (deltaX / trackDist) * scrollableDist;
        this.el.scrollLeft = isRTL ? (this.dragStartScrollLeft - scrollDelta) : (this.dragStartScrollLeft + scrollDelta);
      }
    });

    const stopDragH = (e: PointerEvent) => {
      if (this.isDragging && this.activeAxis === 'h') {
        this.isDragging = false;
        this.thumbH!.classList.remove('is-dragging');
        try { this.thumbH!.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    this.thumbH!.addEventListener('pointerup', stopDragH);
    this.thumbH!.addEventListener('pointercancel', stopDragH);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.trackV?.remove();
    this.trackH?.remove();
    this.el.classList.remove('scrollbar-overlay-active');
  }
}

function ensureOverlayInstance(el: HTMLElement): OverlayScrollbarInstance {
  let inst = overlayInstances.get(el);
  if (!inst) {
    inst = new OverlayScrollbarInstance(el);
    overlayInstances.set(el, inst);
  }
  return inst;
}

function triggerContainerMotion(target: Element): void {
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

  document.addEventListener('scroll', onGlobalScroll, { capture: true, passive: true });
  document.addEventListener('pointermove', onGlobalPointerMove, { capture: true, passive: true });

  if (runtime && (runtime as any).registerCleanup) {
    (runtime as any).registerCleanup(() => {
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
      setupGlobalCaptureListeners(runtime);
    }

    const merged = { ...globalConfig, ...config };
    if (merged.mode === 'none') {
      el.classList.add('scrollbar-none');
      return;
    }

    const autohideMs = merged.autohide === false ? false : (typeof merged.autohide === 'number' ? merged.autohide : 800);

    // Apply Standard CSS Custom Properties with rem relative units
    const width = resolveDimension(merged.width, '0.375rem');
    const height = resolveDimension(merged.height, width);
    const thumbColor = resolveColor(merged.thumb, 'color-mix(in srgb, currentColor 30%, transparent)');
    const thumbHover = resolveColor(merged.thumbHover, 'color-mix(in srgb, currentColor 50%, transparent)');
    const thumbActive = resolveColor(merged.thumbActive, 'color-mix(in srgb, currentColor 70%, transparent)');
    const trackColor = resolveColor(merged.track, 'transparent');
    const trackHover = resolveColor(merged.trackHover, trackColor);
    const thumbRadius = resolveRadius(merged.thumbRadius || merged.radius, '9999px');
    const trackRadius = resolveRadius(merged.trackRadius || merged.radius, '9999px');

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
    el.style.setProperty('--scrollbar-fade-in', fadeIn);
    el.style.setProperty('--scrollbar-fade-out', fadeOut);
    el.style.setProperty('--scrollbar-fade-timing', fadeTiming);

    // Initialize Overlay Sprite if in overlay mode
    if (merged.mode === 'overlay' && !isGlobal) {
      const overlayInst = ensureOverlayInstance(el);
      return () => {
        overlayInst.destroy();
        overlayInstances.delete(el);
      };
    }
  }
};

export default scrollbarModule;
