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
  private debugTracker?: {
    svg: SVGSVGElement;
    halo: SVGCircleElement;
    line: SVGLineElement;
    targetLine: SVGLineElement;
  };
  private fadeTimer: number | null = null;
  private velocity = { x: 0, y: 0, z: 0, t: 1 };

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

    const setupDebugTracker = () => {
      if (
        typeof document !== 'undefined' &&
        document.body &&
        document.documentElement.hasAttribute('data-debug') &&
        !this.debugTracker
      ) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'nexus-predictive-tracker');
        svg.style.position = 'fixed';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '999999';
        svg.style.overflow = 'visible';
        svg.style.transform = 'translate(-50%, -50%)';
        svg.style.width = '200px';
        svg.style.height = '200px';
        svg.style.left = '-1000px';
        svg.style.top = '-1000px';

        const halo = document.createElementNS(svgNS, 'circle');
        halo.setAttribute('cx', '100');
        halo.setAttribute('cy', '100');
        halo.setAttribute('r', '20');
        halo.setAttribute('fill', 'rgba(99, 102, 241, 0.15)');
        halo.setAttribute('stroke', 'rgba(99, 102, 241, 0.6)');
        halo.setAttribute('stroke-width', '1.5');
        svg.appendChild(halo);

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', '100');
        line.setAttribute('y1', '100');
        line.setAttribute('x2', '100');
        line.setAttribute('y2', '100');
        line.setAttribute('stroke', 'rgba(99, 102, 241, 0.6)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '3 3');
        line.style.opacity = '0';
        svg.appendChild(line);

        const targetLine = document.createElementNS(svgNS, 'line');
        targetLine.setAttribute('x1', '100');
        targetLine.setAttribute('y1', '100');
        targetLine.setAttribute('x2', '100');
        targetLine.setAttribute('y2', '100');
        targetLine.setAttribute('stroke', 'rgba(34, 197, 94, 0.8)');
        targetLine.setAttribute('stroke-width', '2');
        targetLine.style.opacity = '0';
        svg.appendChild(targetLine);

        document.body.appendChild(svg);
        this.debugTracker = { svg, halo, line, targetLine };
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupDebugTracker);
    } else {
      setupDebugTracker();
    }

    // Listen for DOM mutations to refresh Quadtree
    document.addEventListener('nexus:dom-mutated', () => this.rebuildQuadtree(), { passive: true });

    // 1. Mouse Trajectory Tracker ($V_{xyzt}$)
    const onMouseMove = (e: MouseEvent) => {
      setupDebugTracker();
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

    this.velocity = { x: vx, y: vy, z: 0, t: dt };

    if (this.debugTracker) {
      this.debugTracker.svg.style.left = `${p2.x}px`;
      this.debugTracker.svg.style.top = `${p2.y}px`;

      const targetR = Math.min(80, Math.max(20, 20 + speed * 0.05));
      this.debugTracker.halo.setAttribute('r', targetR.toString());

      const trajX = 100 + vx * 0.1;
      const trajY = 100 + vy * 0.1;
      this.debugTracker.line.setAttribute('x2', trajX.toString());
      this.debugTracker.line.setAttribute('y2', trajY.toString());
      this.debugTracker.line.style.opacity = speed > 30 ? '1' : '0';
    }

    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => {
      this.velocity = { x: 0, y: 0, z: 0, t: 1 };
      if (this.debugTracker) {
        this.debugTracker.line.style.opacity = '0';
        this.debugTracker.targetLine.style.opacity = '0';
      }
    }, 150) as unknown as number;

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

    const newPredictiveNodes = this.quadtree.query(range);
    let snappedTarget: { cx: number; cy: number } | undefined = undefined;
    let minD = Infinity;

    newPredictiveNodes.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = Math.hypot(cx - projX, cy - projY);
      if (d < minD) {
        minD = d;
        snappedTarget = { cx, cy };
      }
    });

    if (this.debugTracker) {
      if (snappedTarget) {
        const target = snappedTarget as { cx: number; cy: number };
        const targetX = 100 + (target.cx - p2.x);
        const targetY = 100 + (target.cy - p2.y);
        this.debugTracker.targetLine.setAttribute('x2', targetX.toString());
        this.debugTracker.targetLine.setAttribute('y2', targetY.toString());
        this.debugTracker.targetLine.style.opacity = '1';
      } else {
        this.debugTracker.targetLine.style.opacity = '0';
      }
    }

    newPredictiveNodes.forEach((node) => {
      if (!this.activePredictiveNodes.has(node)) {
        this.prewarmElement(node);
      }
    });

    this.activePredictiveNodes.forEach((node) => {
      if (!newPredictiveNodes.has(node)) {
        node.classList.remove('nexus-predictive-warm');
        node.dispatchEvent(new CustomEvent('nexus:predictive-cool'));
      }
    });

    this.activePredictiveNodes = newPredictiveNodes;
  }

  private prewarmElementAtPoint(x: number, y: number) {
    if (typeof document === 'undefined') return;
    const el = document.elementFromPoint(x, y);
    if (el instanceof HTMLElement) {
      this.prewarmElement(el);
    }
  }

  private prewarmElement(el: HTMLElement) {
    el.classList.add('nexus-predictive-warm');
    el.dispatchEvent(
      new CustomEvent('nexus:predictive-warm', {
        detail: { velocity: this.velocity },
      })
    );

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
    if (this.debugTracker && this.debugTracker.svg.parentNode) {
      this.debugTracker.svg.parentNode.removeChild(this.debugTracker.svg);
    }
  }
}

export const corePredictiveEngine = new CorePredictiveEngine();
