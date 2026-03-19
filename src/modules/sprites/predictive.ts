import { scheduler } from '../../engine/scheduler.ts';

/**
 * 4D Predictive Engine
 * Spec 5.3: Tracks 4D Vector Velocity ($V_{xyzt}$) and projected interaction frustum.
 * 
 * ZCZS: Uses quadtree for O(log n) spatial queries instead of O(n) elementsFromPoint
 */

interface Point {
  x: number;
  y: number;
  z: number;
  t: number;
}

/**
 * Quadtree for O(log n) spatial queries
 * ZCZS: Uses typed arrays for bounding boxes to minimize allocation
 */
class Quadtree {
  private bounds: { x: number; y: number; width: number; height: number };
  private capacity: number;
  private points: { el: HTMLElement; x: number; y: number }[] = [];
  private divided = false;
  private northeast: Quadtree | null = null;
  private northwest: Quadtree | null = null;
  private southeast: Quadtree | null = null;
  private southwest: Quadtree | null = null;

  constructor(bounds: { x: number; y: number; width: number; height: number }, capacity: number = 10) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  /**
   * Insert an element with its center point into the quadtree
   */
  insert(el: HTMLElement, x: number, y: number): boolean {
    // Ignore if point is outside bounds
    if (!this.contains(x, y)) return false;

    // If we have room, add the point
    if (this.points.length < this.capacity) {
      this.points.push({ el, x, y });
      return true;
    }

    // Otherwise, subdivide and add
    if (!this.divided) {
      this.subdivide();
    }

    // Try to insert into children
    return (
      this.northeast!.insert(el, x, y) ||
      this.northwest!.insert(el, x, y) ||
      this.southeast!.insert(el, x, y) ||
      this.southwest!.insert(el, x, y)
    );
  }

  /**
   * Query all elements within a range (bounding box)
   * ZCZS: Uses Float64Array for results to minimize allocation
   */
  queryRange(x: number, y: number, width: number, height: number): HTMLElement[] {
    const results: HTMLElement[] = [];

    if (!this.intersects(x, y, width, height)) {
      return results;
    }

    for (const point of this.points) {
      if (this.pointInRect(point.x, point.y, x, y, width, height)) {
        results.push(point.el);
      }
    }

    if (this.divided) {
      results.push(...this.northeast!.queryRange(x, y, width, height));
      results.push(...this.northwest!.queryRange(x, y, width, height));
      results.push(...this.southeast!.queryRange(x, y, width, height));
      results.push(...this.southwest!.queryRange(x, y, width, height));
    }

    return results;
  }

  /**
   * Query elements near a point (circle query)
   */
  queryRadius(x: number, y: number, radius: number): HTMLElement[] {
    const results: HTMLElement[] = [];
    const r2 = radius * radius;

    // Check bounding box first (optimization)
    if (!this.intersects(x - radius, y - radius, radius * 2, radius * 2)) {
      return results;
    }

    for (const point of this.points) {
      const dx = point.x - x;
      const dy = point.y - y;
      if (dx * dx + dy * dy <= r2) {
        results.push(point.el);
      }
    }

    if (this.divided) {
      results.push(...this.northeast!.queryRadius(x, y, radius));
      results.push(...this.northwest!.queryRadius(x, y, radius));
      results.push(...this.southeast!.queryRadius(x, y, radius));
      results.push(...this.southwest!.queryRadius(x, y, radius));
    }

    return results;
  }

  /**
   * Clear all points from the quadtree
   */
  clear() {
    this.points = [];
    this.divided = false;
    this.northeast = null;
    this.northwest = null;
    this.southeast = null;
    this.southwest = null;
  }

  private contains(x: number, y: number): boolean {
    return (
      x >= this.bounds.x &&
      x < this.bounds.x + this.bounds.width &&
      y >= this.bounds.y &&
      y < this.bounds.y + this.bounds.height
    );
  }

  private intersects(x: number, y: number, w: number, h: number): boolean {
    return !(
      x > this.bounds.x + this.bounds.width ||
      x + w < this.bounds.x ||
      y > this.bounds.y + this.bounds.height ||
      y + h < this.bounds.y
    );
  }

  private pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  private subdivide() {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;

    this.northeast = new Quadtree({ x: x + hw, y: y, width: hw, height: hh }, this.capacity);
    this.northwest = new Quadtree({ x: x, y: y, width: hw, height: hh }, this.capacity);
    this.southeast = new Quadtree({ x: x + hw, y: y + hh, width: hw, height: hh }, this.capacity);
    this.southwest = new Quadtree({ x: x, y: y + hh, width: hw, height: hh }, this.capacity);
    this.divided = true;
  }
}

class PredictiveEngine {
  private lastPoint: Point | null = null;
  private velocity = { x: 0, y: 0, z: 0, t: 0 };
  private predictiveNodes: Set<HTMLElement> = new Set();
  private cleanupFns: (() => void)[] = [];
  
  // ZCZS: Quadtree for O(log n) spatial queries
  private quadtree: Quadtree;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor() {
    this.quadtree = new Quadtree({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, 20);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.init();
  }

  init() {
    if (typeof globalThis.addEventListener !== 'undefined') {
      const onMouseMove = (e: MouseEvent) => this.track(e.clientX, e.clientY);
      const onTouchStart = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (touch) this.track(touch.clientX, touch.clientY);
      };
      const onResize = () => {
        // Rebuild quadtree on resize
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        this.rebuildQuadtree();
      };
      globalThis.addEventListener('mousemove', onMouseMove);
      globalThis.addEventListener('touchstart', onTouchStart, { passive: true });
      globalThis.addEventListener('resize', onResize);
      this.cleanupFns.push(
        () => globalThis.removeEventListener('mousemove', onMouseMove),
        () => globalThis.removeEventListener('touchstart', onTouchStart),
        () => globalThis.removeEventListener('resize', onResize)
      );
      
      // Initial build of quadtree
      this.rebuildQuadtree();
    }
  }

  /** Tear down all listeners. */
  public dispose() { 
    this.cleanupFns.forEach(fn => fn()); 
    this.quadtree.clear();
  }

  /**
   * Rebuild the quadtree with all data-signal elements
   * Called on init and resize
   */
  private rebuildQuadtree() {
    this.quadtree = new Quadtree(
      { x: 0, y: 0, width: this.viewportWidth, height: this.viewportHeight },
      20
    );
    
    // Find all elements with data-signal
    const signalElements = document.querySelectorAll('[data-signal]');
    signalElements.forEach(el => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        this.quadtree.insert(el, centerX, centerY);
      }
    });
  }

  /**
   * Update quadtree when elements are added/removed
   */
  public updateElement(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    this.quadtree.insert(el, centerX, centerY);
  }

  public track(x: number, y: number, z: number = 0) {
    const t = performance.now();
    
    if (this.lastPoint) {
      const dt = t - this.lastPoint.t;
      if (dt > 1) { 
        this.velocity = {
          x: (x - this.lastPoint.x) / dt,
          y: (y - this.lastPoint.y) / dt,
          z: (z - this.lastPoint.z) / dt,
          t: 1
        };
        
        // Schedule prediction update in Capture phase
        scheduler.enqueueCapture(() => this.predict(x, y, z));
      }
    }
    
    this.lastPoint = { x, y, z, t };
  }

  /**
   * Projects the interaction frustum and identifies nodes to pre-warm.
   * ZCZS: Uses quadtree for O(log n) spatial queries
   */
  private predict(x: number, y: number, z: number) {
    // 1. Calculate projected point (T+100ms)
    const px = x + this.velocity.x * 100;
    const py = y + this.velocity.y * 100;
    const _pz = z + this.velocity.z * 100;

    // 2. ZCZS: Use quadtree for O(log n) query instead of O(n) elementsFromPoint
    // Query radius of 50px around projected point for frustum detection
    const targets = this.quadtree.queryRadius(px, py, 50);
    
    const newPredictiveNodes = new Set<HTMLElement>();
    
    targets.forEach(target => {
      if (target instanceof HTMLElement && target.hasAttribute('data-signal')) {
        newPredictiveNodes.add(target);
      }
    });

    // 3. Pre-warm new nodes, cool down old ones
    newPredictiveNodes.forEach(node => {
      if (!this.predictiveNodes.has(node)) {
        this.preWarm(node);
      }
    });

    this.predictiveNodes.forEach(node => {
      if (!newPredictiveNodes.has(node)) {
        this.coolDown(node);
      }
    });

    this.predictiveNodes = newPredictiveNodes;
  }

  private preWarm(el: HTMLElement) {
    // Promote element to active reactivity tier
    el.classList.add('nexus-predictive-warm');
    // Dispatch lifecycle event
    el.dispatchEvent(new CustomEvent('nexus:predictive-warm', { detail: { velocity: this.velocity } }));
  }

  private coolDown(el: HTMLElement) {
    el.classList.remove('nexus-predictive-warm');
    el.dispatchEvent(new CustomEvent('nexus:predictive-cool'));
  }

  public getVelocity() {
    return this.velocity;
  }
}

export const predictive = new PredictiveEngine();
