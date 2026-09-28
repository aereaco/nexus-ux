/**
 * Universal Native + Overlay Scrollbar Engine for Nexus-UX
 *
 * Zero-copy modern architecture:
 * - Constructable StyleSheets for 100% pre-paint certainty.
 * - CSS Logical Properties (`inset-inline`, `inset-block`) for automatic LTR/RTL mirroring.
 * - Hardware-accelerated GPU transforms (`translateY`/`translateX`).
 * - Self-contained pointer-capture drag coordination.
 * - Exact gutter alignment for search match location ticks.
 * - Instance API (`show`, `hide`, `update`) for tabpanel state management.
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
  fade?: number | string;
  fadeIn?: number | string;
  fadeOut?: number | string;
  global?: boolean;
}

let globalConfig: ScrollbarConfig = {
  mode: 'native',
  autohide: 800,
  thin: true,
  width: '0.625rem',
  height: '0.625rem',
  fade: '0.4s',
  fadeIn: '0.2s',
  fadeOut: '0.4s',
};

export function buildScrollbarCSS(config?: Partial<ScrollbarConfig>): string {
  const cfg = { ...globalConfig, ...config };
  const width = typeof cfg.width === 'number' ? `${cfg.width * 0.25}rem` : (cfg.width || '0.625rem');
  const height = typeof cfg.height === 'number' ? `${cfg.height * 0.25}rem` : (cfg.height || width);
  const fadeOut = typeof cfg.fadeOut === 'number' ? `${cfg.fadeOut}ms` : (cfg.fadeOut || cfg.fade || '0.4s');
  const fadeIn = typeof cfg.fadeIn === 'number' ? `${cfg.fadeIn}ms` : (cfg.fadeIn || '0.2s');

  return `
/* Zero-flash native scrollbar suppression */
[style*="overflow"], [data-scrollbar], .overflow-y-auto, .overflow-x-auto, .overflow-auto, .scrollbar-none, .scrollbar-overlay-active {
  scrollbar-width: none !important;
}
[style*="overflow"]::-webkit-scrollbar, [data-scrollbar]::-webkit-scrollbar, .overflow-y-auto::-webkit-scrollbar, .overflow-x-auto::-webkit-scrollbar, .overflow-auto::-webkit-scrollbar, .scrollbar-none::-webkit-scrollbar, .scrollbar-overlay-active::-webkit-scrollbar {
  display: none !important; width: 0 !important; height: 0 !important;
}
[data-scrollbar]::-webkit-scrollbar-thumb, .overflow-y-auto::-webkit-scrollbar-thumb, .overflow-x-auto::-webkit-scrollbar-thumb, .overflow-auto::-webkit-scrollbar-thumb, .scrollbar-none::-webkit-scrollbar-thumb, .scrollbar-overlay-active::-webkit-scrollbar-thumb {
  display: none !important; background-color: transparent !important;
}

/* Theme tokens */
:root, :host, [data-scrollbar_global] {
  --scrollbar-width: ${width};
  --scrollbar-height: ${height};
  --scrollbar-thumb: color-mix(in srgb, currentColor 30%, transparent);
  --scrollbar-thumb-hover: color-mix(in srgb, currentColor 50%, transparent);
  --scrollbar-thumb-active: color-mix(in srgb, currentColor 70%, transparent);
  --scrollbar-track: transparent;
  --scrollbar-thumb-radius: 9999px;
  --scrollbar-fade-in: ${fadeIn};
  --scrollbar-fade-out: ${fadeOut};
}

/* Vertical track aligned with search ticks */
.scrollbar-track-v {
  display: none;
  position: absolute;
  inset-block-start: 0;
  inset-block-end: 0;
  inset-inline-end: 0;
  width: var(--scrollbar-width, 0.625rem);
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}
.scrollbar-thumb-v {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: 100%;
  min-height: 1.5rem;
  background-color: var(--scrollbar-thumb);
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-out;
}

/* Horizontal track */
.scrollbar-track-h {
  display: none;
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  inset-inline-end: 0;
  height: var(--scrollbar-height, 0.625rem);
  overflow: visible;
  pointer-events: none;
  z-index: 50;
}
.scrollbar-thumb-h {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  height: 100%;
  min-width: 1.5rem;
  background-color: var(--scrollbar-thumb);
  border-radius: var(--scrollbar-thumb-radius, 9999px);
  opacity: 0;
  pointer-events: auto;
  cursor: grab;
  will-change: transform, opacity;
  transition: opacity var(--scrollbar-fade-out, 0.4s) cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease-out;
}

/* Hide when display is none */
.scrollbar-track-v[style*="display: none"], .scrollbar-track-h[style*="display: none"] {
  display: none !important; pointer-events: none !important;
}

/* Smooth motion & hover reveal */
.is-scrolling > .scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling > .scrollbar-track-h > .scrollbar-thumb-h,
.is-scrolling.scrollbar-track-v > .scrollbar-thumb-v,
.is-scrolling.scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-v > .scrollbar-thumb-v,
.scrollbar-overlay-active.scrollbar-no-autohide > .scrollbar-track-h > .scrollbar-thumb-h,
.scrollbar-track-v:not([style*="display: none"]):hover > .scrollbar-thumb-v,
.scrollbar-track-h:not([style*="display: none"]):hover > .scrollbar-thumb-h,
.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  opacity: 1 !important;
  transition: opacity var(--scrollbar-fade-in, 0.2s) ease-out, background-color 0.2s ease-out !important;
}
.scrollbar-track-v:not([style*="display: none"]):hover > .scrollbar-thumb-v,
.scrollbar-track-h:not([style*="display: none"]):hover > .scrollbar-thumb-h {
  background-color: var(--scrollbar-thumb-hover) !important;
}
.scrollbar-thumb-v.is-dragging,
.scrollbar-thumb-h.is-dragging {
  cursor: grabbing !important;
  background-color: var(--scrollbar-thumb-active) !important;
}
`;
}

const scrollbarSheetRef: { sheet: CSSStyleSheet | null } = { sheet: null };

export function ensureScrollbarStyles(root?: Document | ShadowRoot | null, config?: Partial<ScrollbarConfig>): void {
  const css = buildScrollbarCSS(config || globalConfig);
  if (scrollbarSheetRef.sheet && config) {
    scrollbarSheetRef.sheet.replaceSync(css);
  }
  ensureAdoptedStylesheet(css, scrollbarSheetRef, root);
}

if (typeof document !== 'undefined') {
  ensureScrollbarStyles();
}

const overlayInstances = new WeakMap<Element, OverlayScrollbarInstance>();
const activeInstances = new Set<OverlayScrollbarInstance>();
const elementTimers = new WeakMap<Element, number>();

export class OverlayScrollbarInstance {
  public el: HTMLElement;
  public host: HTMLElement;
  private trackV: HTMLElement | null = null;
  private thumbV: HTMLElement | null = null;
  private trackH: HTMLElement | null = null;
  private thumbH: HTMLElement | null = null;
  private rafId: number | null = null;
  private scrollHandler: (() => void) | null = null;

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

    (this.el as any).__scrollbarInstance = this;

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

  public hide(): void {
    if (this.trackV) this.trackV.style.display = 'none';
    if (this.trackH) this.trackH.style.display = 'none';
  }

  public show(): void {
    this.update();
  }

  public scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  public update(): void {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }

    const { clientHeight, scrollHeight, clientWidth, scrollWidth, scrollTop, scrollLeft } = this.el;

    if (
      this.el.getAttribute('data-scrollbar') === 'none' ||
      this.el.classList.contains('scrollbar-none') ||
      clientHeight === 0 ||
      this.el.style.display === 'none'
    ) {
      this.hide();
      return;
    }

    const s = window.getComputedStyle(this.el);

    // Vertical Update
    const isScrollableY = s.overflowY === 'auto' || s.overflowY === 'scroll';
    const canScrollY = isScrollableY && (scrollHeight - clientHeight > 1) && clientHeight > 0;
    if (canScrollY && this.trackV && this.thumbV) {
      if (this.trackV.style.display !== 'block') this.trackV.style.display = 'block';
      const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
      const maxScroll = scrollHeight - clientHeight;
      const maxThumb = clientHeight - thumbHeight;
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumb : 0;

      this.thumbV.style.height = `${thumbHeight}px`;
      this.thumbV.style.transform = `translateY(${thumbTop}px)`;
    } else if (this.trackV && this.trackV.style.display !== 'none') {
      this.trackV.style.display = 'none';
    }

    // Horizontal Update
    const isScrollableX = s.overflowX === 'auto' || s.overflowX === 'scroll';
    const canScrollX = isScrollableX && (scrollWidth - clientWidth > 1) && clientWidth > 0;
    if (canScrollX && this.trackH && this.thumbH) {
      if (this.trackH.style.display !== 'block') this.trackH.style.display = 'block';
      const thumbWidth = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
      const maxScroll = scrollWidth - clientWidth;
      const maxThumb = clientWidth - thumbWidth;
      const thumbLeft = maxScroll > 0 ? (Math.abs(scrollLeft) / maxScroll) * maxThumb : 0;

      this.thumbH.style.width = `${thumbWidth}px`;
      this.thumbH.style.transform = `translateX(${thumbLeft}px)`;
    } else if (this.trackH && this.trackH.style.display !== 'none') {
      this.trackH.style.display = 'none';
    }
  }

  private bindEvents(): void {
    this.scrollHandler = () => {
      this.update();
      triggerContainerMotion(this.el);
    };
    this.el.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Vertical Thumb Drag
    if (this.thumbV) {
      this.thumbV.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        this.thumbV!.setPointerCapture(e.pointerId);
        this.thumbV!.classList.add('is-dragging');
        const startY = e.clientY;
        const startScrollTop = this.el.scrollTop;

        const onMove = (moveEvt: PointerEvent) => {
          const deltaY = moveEvt.clientY - startY;
          const { clientHeight, scrollHeight } = this.el;
          const thumbH = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
          const maxThumb = clientHeight - thumbH;
          const maxScroll = scrollHeight - clientHeight;
          if (maxThumb > 0) {
            this.el.scrollTop = startScrollTop + (deltaY / maxThumb) * maxScroll;
          }
        };

        const onUp = (upEvt: PointerEvent) => {
          this.thumbV!.classList.remove('is-dragging');
          try { this.thumbV!.releasePointerCapture(upEvt.pointerId); } catch {}
          this.thumbV!.removeEventListener('pointermove', onMove);
          this.thumbV!.removeEventListener('pointerup', onUp);
          this.thumbV!.removeEventListener('pointercancel', onUp);
        };

        this.thumbV!.addEventListener('pointermove', onMove);
        this.thumbV!.addEventListener('pointerup', onUp);
        this.thumbV!.addEventListener('pointercancel', onUp);
      });
    }

    // Horizontal Thumb Drag
    if (this.thumbH) {
      this.thumbH.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        this.thumbH!.setPointerCapture(e.pointerId);
        this.thumbH!.classList.add('is-dragging');
        const startX = e.clientX;
        const startScrollLeft = this.el.scrollLeft;

        const onMove = (moveEvt: PointerEvent) => {
          const deltaX = moveEvt.clientX - startX;
          const { clientWidth, scrollWidth } = this.el;
          const thumbW = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
          const maxThumb = clientWidth - thumbW;
          const maxScroll = scrollWidth - clientWidth;
          if (maxThumb > 0) {
            this.el.scrollLeft = startScrollLeft + (deltaX / maxThumb) * maxScroll;
          }
        };

        const onUp = (upEvt: PointerEvent) => {
          this.thumbH!.classList.remove('is-dragging');
          try { this.thumbH!.releasePointerCapture(upEvt.pointerId); } catch {}
          this.thumbH!.removeEventListener('pointermove', onMove);
          this.thumbH!.removeEventListener('pointerup', onUp);
          this.thumbH!.removeEventListener('pointercancel', onUp);
        };

        this.thumbH!.addEventListener('pointermove', onMove);
        this.thumbH!.addEventListener('pointerup', onUp);
        this.thumbH!.addEventListener('pointercancel', onUp);
      });
    }

    // Vertical Track Click-to-Scroll
    if (this.trackV) {
      this.trackV.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.target === this.thumbV) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = this.trackV!.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const { clientHeight, scrollHeight } = this.el;
        const thumbH = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
        const maxThumb = clientHeight - thumbH;
        const maxScroll = scrollHeight - clientHeight;
        if (maxThumb > 0) {
          this.el.scrollTop = Math.max(0, Math.min(maxScroll, ((clickY - thumbH / 2) / maxThumb) * maxScroll));
        }
      });
    }

    // Horizontal Track Click-to-Scroll
    if (this.trackH) {
      this.trackH.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.target === this.thumbH) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = this.trackH!.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const { clientWidth, scrollWidth } = this.el;
        const thumbW = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
        const maxThumb = clientWidth - thumbW;
        const maxScroll = scrollWidth - clientWidth;
        if (maxThumb > 0) {
          this.el.scrollLeft = Math.max(0, Math.min(maxScroll, ((clickX - thumbW / 2) / maxThumb) * maxScroll));
        }
      });
    }
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.scrollHandler) {
      this.el.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.trackV) {
      this.trackV.remove();
      this.trackV = null;
    }
    if (this.trackH) {
      this.trackH.remove();
      this.trackH = null;
    }
    this.el.classList.remove('scrollbar-overlay-active', 'scrollbar-no-autohide');
    activeInstances.delete(this);
    overlayInstances.delete(this.el);
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

if (typeof HTMLElement !== 'undefined' && !Object.prototype.hasOwnProperty.call(HTMLElement.prototype, '__scrollbarInstance')) {
  Object.defineProperty(HTMLElement.prototype, '__scrollbarInstance', {
    get() {
      if (globalConfig.mode === 'overlay' || this.hasAttribute('data-scrollbar')) {
        return ensureOverlayInstance(this);
      }
      return overlayInstances.get(this) || null;
    },
    set(val: OverlayScrollbarInstance | null) {
      if (val) overlayInstances.set(this, val);
      else overlayInstances.delete(this);
    },
    configurable: true,
  });
}

export function syncAllOverlayScrollbars(): void {
  activeInstances.forEach((inst) => inst.scheduleUpdate());
}

export function isScrollContainer(el: HTMLElement): boolean {
  if (!el || !(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.hasAttribute('data-scrollbar_ignore') || el.getAttribute('data-scrollbar') === 'none' || el.classList.contains('scrollbar-none')) {
    return false;
  }
  if (el === document.documentElement || el === document.body) {
    const s = window.getComputedStyle(el);
    if (s.overflow === 'hidden' || (s.overflowX === 'hidden' && s.overflowY === 'hidden')) {
      return false;
    }
  }
  const s = window.getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden') return false;
  if (el.hasAttribute('data-scrollbar') && el.getAttribute('data-scrollbar') !== 'native' && el.getAttribute('data-scrollbar') !== 'none') return true;
  const hasScrollY = (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight - el.clientHeight > 1;
  const hasScrollX = (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth - el.clientWidth > 1;
  return hasScrollY || hasScrollX;
}

export function attachOverlayScrollbar(el: HTMLElement): OverlayScrollbarInstance | null {
  if (!el || !(el instanceof HTMLElement) || !isScrollContainer(el)) return null;
  const inst = ensureOverlayInstance(el);
  inst.scheduleUpdate();
  triggerContainerMotion(el);
  return inst;
}

export function triggerContainerMotion(target: Element): void {
  const autohideMs = typeof globalConfig.autohide === 'number' ? globalConfig.autohide : 800;
  if (globalConfig.autohide === false || autohideMs <= 0) return;

  target.classList.add('is-scrolling');
  if (target instanceof HTMLElement) {
    const inst = overlayInstances.get(target);
    if (inst) inst.setScrolling(true);
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

let globalListenerRegistered = false;

function setupGlobalListeners(): void {
  if (globalListenerRegistered || typeof document === 'undefined') return;
  globalListenerRegistered = true;

  window.addEventListener('resize', () => syncAllOverlayScrollbars(), { passive: true });

  const onGlobalScroll = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLElement && isScrollContainer(target)) {
      attachOverlayScrollbar(target);
    }
  };
  document.addEventListener('scroll', onGlobalScroll, { capture: true, passive: true });

  const scanScrollContainers = () => {
    if (globalConfig.mode !== 'overlay') return;
    document.querySelectorAll('.overflow-y-auto, .overflow-auto, [role="tabpanel"], .cm-scroller, [data-scrollbar="overlay"]').forEach((el) => {
      if (el instanceof HTMLElement && !overlayInstances.has(el) && isScrollContainer(el)) {
        attachOverlayScrollbar(el);
      }
    });
  };

  document.addEventListener('nexus:dom-mutated', scanScrollContainers, { passive: true });
  setTimeout(scanScrollContainers, 50);
}

const scrollbarModule: AttributeModule = {
  name: 'scrollbar',
  attribute: 'scrollbar',
  onRegister() {
    if (typeof document !== 'undefined') {
      ensureScrollbarStyles(document);
    }
  },
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: any): (() => void) | void => {
    const isIgnore = el.hasAttribute('data-scrollbar_ignore') ||
      (parsedAttr?.modifiers && parsedAttr.modifiers.includes('ignore'));

    if (isIgnore) {
      el.setAttribute('data-scrollbar_ignore', 'true');
      const inst = overlayInstances.get(el);
      if (inst) {
        inst.destroy();
      }
      return;
    }

    const isGlobal = el.hasAttribute('data-scrollbar_global') || 
      (parsedAttr?.modifiers && parsedAttr.modifiers.includes('global')) ||
      el.tagName.toLowerCase() === 'html';

    let config: ScrollbarConfig = {};
    if (value && value.trim()) {
      const trimmed = value.trim();
      try {
        const expr = (trimmed.startsWith('{') && trimmed.endsWith('}')) ? `(${trimmed})` : trimmed;
        const evaluated = runtime.evaluate(el, expr);
        if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as ScrollbarConfig;
        } else if (typeof evaluated === 'string') {
          if (evaluated === 'overlay' || evaluated === 'native' || evaluated === 'none') {
            config = { mode: evaluated };
          }
        }
      } catch {
        try {
          config = (new Function(`return (${trimmed});`))();
        } catch {
          if (trimmed === 'overlay' || trimmed === 'none') config = { mode: trimmed };
        }
      }
    }

    if (isGlobal) {
      globalConfig = { ...globalConfig, ...config };
      el.setAttribute('data-scrollbar_global', 'true');
      ensureScrollbarStyles(el.getRootNode() as Document | ShadowRoot, globalConfig);
      setupGlobalListeners();
      syncAllOverlayScrollbars();
      return;
    }

    const merged = { ...globalConfig, ...config };
    if (merged.mode === 'none') {
      el.classList.add('scrollbar-none');
      return;
    }

    if (merged.mode === 'overlay' && isScrollContainer(el)) {
      const overlayInst = attachOverlayScrollbar(el);
      if (overlayInst) {
        return () => {
          overlayInst.destroy();
        };
      }
    }
  }
};

export default scrollbarModule;
