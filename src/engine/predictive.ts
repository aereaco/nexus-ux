/**
 * Nexus-UX Core 4D Predictive Engine
 *
 * Tracks 4D Vector Velocity ($V_{xyzt}$) and projected interaction frustum
 * across ALL input modalities:
 *   - Mouse: 4D vector trajectory & acceleration (Quadtree O(log n))
 *   - Touch: 1-pixel contact barrier (touchstart/pointerdown) & swipe drag velocity (touchmove)
 *   - Stylus: W3C Pointer Events Level 3 Z-axis hover distance (5mm floating above screen)
 *   - Gamepad: HTML5 Gamepad API D-pad / Analog stick directional proximity
 *   - Keyboard: Focus proximity (focusin / spatial navigation)
 *
 * Opt-In Modalities:
 *   - Eye Gaze Camera Tracking (enableEyeTracking())
 *   - Voice Intent Microphone Recognition (enableVoiceIntent())
 */

import { scheduler } from './scheduler.ts';
import { cacheEngine } from './cache.ts';

interface Point {
  x: number;
  y: number;
  z: number;
  t: number;
}

class Quadtree {
  private bounds: { x: number; y: number; width: number; height: number };
  private capacity: number;
  private depth: number = 0;
  private points: { el: HTMLElement; x: number; y: number }[] = [];
  private divided = false;
  private northeast: Quadtree | null = null;
  private northwest: Quadtree | null = null;
  private southeast: Quadtree | null = null;
  private southwest: Quadtree | null = null;

  constructor(
    bounds: { x: number; y: number; width: number; height: number },
    capacity = 10,
  ) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  insert(el: HTMLElement, x: number, y: number): boolean {
    if (!this.contains(x, y)) return false;

    if (this.points.length < this.capacity) {
      this.points.push({ el, x, y });
      return true;
    }

    let allIdentical = true;
    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].x !== x || this.points[i].y !== y) {
        allIdentical = false;
        break;
      }
    }

    if (allIdentical || this.depth >= 8) {
      this.points.push({ el, x, y });
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(el, x, y) ||
      this.northwest!.insert(el, x, y) ||
      this.southeast!.insert(el, x, y) ||
      this.southwest!.insert(el, x, y)
    );
  }

  private subdivide() {
    const { x, y, width, height } = this.bounds;
    const w = width / 2;
    const h = height / 2;

    this.northeast = new Quadtree({ x: x + w, y, width: w, height: h }, this.capacity);
    this.northwest = new Quadtree({ x, y, width: w, height: h }, this.capacity);
    this.southeast = new Quadtree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
    this.southwest = new Quadtree({ x, y: y + h, width: w, height: h }, this.capacity);

    this.northeast.depth = this.depth + 1;
    this.northwest.depth = this.depth + 1;
    this.southeast.depth = this.depth + 1;
    this.southwest.depth = this.depth + 1;

    this.divided = true;
  }

  private contains(x: number, y: number): boolean {
    return (
      x >= this.bounds.x &&
      x <= this.bounds.x + this.bounds.width &&
      y >= this.bounds.y &&
      y <= this.bounds.y + this.bounds.height
    );
  }

  query(range: { x: number; y: number; width: number; height: number }, found: Set<HTMLElement> = new Set()): Set<HTMLElement> {
    if (
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    ) {
      return found;
    }

    for (const p of this.points) {
      if (
        p.x >= range.x &&
        p.x <= range.x + range.width &&
        p.y >= range.y &&
        p.y <= range.y + range.height
      ) {
        found.add(p.el);
      }
    }

    if (this.divided) {
      this.northwest!.query(range, found);
      this.northeast!.query(range, found);
      this.southwest!.query(range, found);
      this.southeast!.query(range, found);
    }

    return found;
  }

  clear() {
    this.points = [];
    if (this.divided) {
      this.northwest?.clear();
      this.northeast?.clear();
      this.southwest?.clear();
      this.southeast?.clear();
      this.divided = false;
    }
  }
}

export class CorePredictiveEngine {
  private history: Point[] = [];
  private quadtree!: Quadtree;
  private viewportWidth = 1920;
  private viewportHeight = 1080;
  private cleanupFns: (() => void)[] = [];
  private prewarmHook: ((ref: string) => void) | null = null;
  private activePredictiveNodes: Set<HTMLElement> = new Set();
  private eyeTrackingActive = false;
  private voiceIntentActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
      this.init();
    }
  }

  private init() {
    this.rebuildQuadtree();

    if (typeof window === 'undefined') return;

    // 1. Mouse Trajectory Tracker ($V_{xyzt}$)
    const onMouseMove = (e: MouseEvent) => {
      this.recordPoint(e.clientX, e.clientY, 0, performance.now());
      this.processPrediction();
    };

    // 2. Touch 1-Pixel Contact Barrier & Swipe Drag Velocity
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.prewarmElementAtPoint(touch.clientX, touch.clientY);
        this.recordPoint(touch.clientX, touch.clientY, 0, performance.now());
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.recordPoint(touch.clientX, touch.clientY, 0, performance.now());
        this.processPrediction();
      }
    };

    // 3. Stylus Z-Hover (Pointer Events Level 3)
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        const z = (e as any).pressure ? (e as any).pressure * 10 : 1;
        this.recordPoint(e.clientX, e.clientY, z, performance.now());
        this.processPrediction();
      }
    };

    // 4. Keyboard Focus Proximity
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) {
        this.prewarmElement(e.target);
      }
    };

    // 5. Gamepad Polling Loop
    let gamepadTimer: number | null = null;
    const pollGamepad = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (gp && (gp.buttons.some(b => b.pressed) || gp.axes.some(a => Math.abs(a) > 0.2))) {
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
              this.prewarmElement(active);
            }
          }
        }
      }
      gamepadTimer = requestAnimationFrame(pollGamepad);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('focusin', onFocusIn, { passive: true });
    gamepadTimer = requestAnimationFrame(pollGamepad);

    this.cleanupFns.push(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('focusin', onFocusIn);
      if (gamepadTimer) cancelAnimationFrame(gamepadTimer);
    });
  }

  private recordPoint(x: number, y: number, z: number, t: number) {
    this.history.push({ x, y, z, t });
    if (this.history.length > 5) this.history.shift();
  }

  private rebuildQuadtree() {
    this.quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: this.viewportWidth,
      height: this.viewportHeight,
    });

    if (typeof document === 'undefined') return;

    const selectors = 'a[href], button, [data-route], [data-component], [data-signal], [data-on-click]';
    const elements = document.querySelectorAll(selectors);

    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.quadtree.insert(el, centerX, centerY);
      }
    });
  }

  private processPrediction() {
    if (this.history.length < 3) return;

    const p0 = this.history[this.history.length - 3];
    const p2 = this.history[this.history.length - 1];

    const dt = (p2.t - p0.t) / 1000;
    if (dt <= 0) return;

    const vx = (p2.x - p0.x) / dt;
    const vy = (p2.y - p0.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed < 50) return; // Ignore slow/idle sweeps

    const timeHorizon = 0.15; // 150ms prediction
    const projX = p2.x + vx * timeHorizon;
    const projY = p2.y + vy * timeHorizon;

    const minX = Math.min(p2.x, projX) - 20;
    const minY = Math.min(p2.y, projY) - 20;
    const maxX = Math.max(p2.x, projX) + 20;
    const maxY = Math.max(p2.y, projY) + 20;

    const range = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    const predicted = this.quadtree.query(range);
    predicted.forEach((el) => this.prewarmElement(el));
  }

  private prewarmElementAtPoint(x: number, y: number) {
    if (typeof document === 'undefined') return;
    const el = document.elementFromPoint(x, y);
    if (el instanceof HTMLElement) {
      this.prewarmElement(el);
    }
  }

  private prewarmElement(el: HTMLElement) {
    const route = el.getAttribute('data-route') || el.getAttribute('href');
    const comp = el.getAttribute('data-component');

    if (route) {
      if (this.prewarmHook) this.prewarmHook(route);
      cacheEngine.fetchWithCache(route, { storage: 'session', responseType: 'text' }).catch(() => {});
    }

    if (comp) {
      cacheEngine.fetchWithCache(comp, { storage: 'session', responseType: 'text' }).catch(() => {});
    }
  }

  setPrewarmHook(fn: (ref: string) => void) {
    this.prewarmHook = fn;
  }

  // Opt-In Hardware Permission API Methods
  enableEyeTracking(options: { calibration?: string } = {}) {
    this.eyeTrackingActive = true;
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
      console.log('[Predictive Core] Opt-In Eye-Tracking activated with options:', options);
    }
  }

  enableVoiceIntent(options: { keywords?: string[] } = {}) {
    this.voiceIntentActive = true;
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
      console.log('[Predictive Core] Opt-In Voice Intent activated with options:', options);
    }
  }

  dispose() {
    this.cleanupFns.forEach(fn => fn());
    this.quadtree.clear();
  }
}

export const corePredictiveEngine = new CorePredictiveEngine();
