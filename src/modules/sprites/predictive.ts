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
  private depth: number = 0;
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

    // If we have room, naturally add the point
    if (this.points.length < this.capacity) {
      this.points.push({ el, x, y });
      return true;
    }

    // ZCZS: Detect co-spatial identical clusters to prevent infinite recursion
    // If the capacity is full, but the incoming point shares exact coordinates with ALL 
    // points currently trapped in this node, subdividing is mathematically impossible.
    let allIdentical = true;
    for (let i = 0; i < this.points.length; i++) {
       if (this.points[i].x !== x || this.points[i].y !== y) {
          allIdentical = false;
          break;
       }
    }
    
    if (allIdentical) {
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
  private debugTracker: any = null;
  
  // ZCZS: Quadtree for O(log n) spatial queries
  public quadtree: Quadtree;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private rebuildTimer: number | null = null;
  private fadeTimer: number | null = null;

  constructor() {
    this.quadtree = new Quadtree({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, 20);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.init();
  }

  init() {
    if (typeof globalThis.addEventListener !== 'undefined') {
      if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "nexus-predictive-tracker");
        svg.style.position = "fixed";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "999999";
        svg.style.overflow = "visible";
        svg.style.transform = "translate(-50%, -50%)";
        svg.style.width = "200px";
        svg.style.height = "200px";
        svg.style.left = "-1000px"; 
        svg.style.top = "-1000px";
        
        const halo = document.createElementNS(svgNS, "circle");
        halo.setAttribute("cx", "100");
        halo.setAttribute("cy", "100");
        halo.setAttribute("r", "20");
        halo.setAttribute("fill", "rgba(255, 0, 128, 0.1)");
        halo.setAttribute("stroke", "rgba(255, 0, 128, 0.5)");
        halo.setAttribute("stroke-width", "2");
        halo.style.transition = "r 0.15s ease-out";
        
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "100");
        line.setAttribute("y1", "100");
        line.setAttribute("x2", "100");
        line.setAttribute("y2", "100");
        line.setAttribute("stroke", "rgba(255, 0, 128, 0.5)");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-dasharray", "4 4");
        line.style.opacity = "0";
        line.style.transition = "x2 0.1s linear, y2 0.1s linear, opacity 0.3s ease-out";
        
        const targetLine = document.createElementNS(svgNS, "line");
        targetLine.setAttribute("x1", "100");
        targetLine.setAttribute("y1", "100");
        targetLine.setAttribute("x2", "100");
        targetLine.setAttribute("y2", "100");
        targetLine.setAttribute("stroke", "rgba(34, 197, 94, 0.9)"); // Green
        targetLine.setAttribute("stroke-width", "2");
        targetLine.style.transition = "x2 0.1s linear, y2 0.1s linear, opacity 0.1s ease";
        targetLine.style.opacity = "0";
        
        svg.appendChild(halo);
        svg.appendChild(line);
        svg.appendChild(targetLine);
        document.body.appendChild(svg);
        this.debugTracker = { svg, halo, line, targetLine };
      }

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
      const onDomMutated = () => {
        if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
        this.rebuildTimer = setTimeout(() => this.rebuildQuadtree(), 200) as unknown as number;
      };
      globalThis.addEventListener('nexus:dom-mutated', onDomMutated);

      this.cleanupFns.push(
        () => globalThis.removeEventListener('mousemove', onMouseMove),
        () => globalThis.removeEventListener('touchstart', onTouchStart),
        () => globalThis.removeEventListener('resize', onResize),
        () => globalThis.removeEventListener('nexus:dom-mutated', onDomMutated),
        () => {
          if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
          if (this.fadeTimer) clearTimeout(this.fadeTimer);
        }
      );
      
      // Initial build of quadtree
      this.rebuildQuadtree();
    }
  }

  /** Tear down all listeners. */
  public dispose() { 
    this.cleanupFns.forEach(fn => fn()); 
    this.quadtree.clear();
    if (this.debugTracker && this.debugTracker.svg.parentNode) {
      this.debugTracker.svg.parentNode.removeChild(this.debugTracker.svg);
    }
  }

  /**
   * Rebuild the quadtree with all data-signal elements
   * Called on init and resize
   */
  private getDynamicSelectors(): string {
    const baseSelectors = new Set([
      '[data-signal]', '[data-on-click]', '[data-on-hover]', '[data-on-mouseenter]', 
      '[data-on-touchstart]', 'button', 'a', 'input', 'select', 'textarea', 'label', '[data-bind]'
    ]);

    if (typeof document !== 'undefined') {
      try {
        const sheets: CSSStyleSheet[] = Array.from(document.styleSheets);
        // Integrate Constructable Stylesheets pushed by Native JIT compiler
        if ((document as any).adoptedStyleSheets) {
          sheets.push(...(document as any).adoptedStyleSheets);
        }

        for (const sheet of sheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j] as CSSStyleRule;
              if (rule.selectorText && (rule.selectorText.includes(':hover') || 
                                        rule.selectorText.includes(':active') || 
                                        rule.selectorText.includes(':focus'))) {
                const segments = rule.selectorText.split(',');
                for (let segment of segments) {
                   segment = segment.split('::')[0]; // Strip pseudo-elements
                   const clean = segment.replace(/:hover|:active|:focus/g, '').trim();
                   // Exclude wildly generic or root tokens to prevent tracking the viewport payload
                   if (clean && clean !== '*' && clean !== 'html' && clean !== 'body') {
                      baseSelectors.add(clean);
                   }
                }
              }
            }
          } catch (e) {
             // Silently ignore cross-origin stylesheet exceptions
          }
        }
      } catch (e) {}
    }
    return Array.from(baseSelectors).join(', ');
  }

  private rebuildQuadtree() {
    this.quadtree = new Quadtree({ x: 0, y: 0, width: this.viewportWidth, height: this.viewportHeight }, 20);

    const selectors = this.getDynamicSelectors();
    const elements = document.querySelectorAll(selectors);
    elements.forEach(el => {
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
        
        
        if (this.debugTracker) this.debugTracker.line.style.opacity = '1';
        
        // Schedule prediction update in Capture phase
        scheduler.enqueueCapture(() => this.predict(x, y, z));
      }
    }
    
    this.lastPoint = { x, y, z, t };

    // Handle trajectory fade
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => {
      this.velocity = { x: 0, y: 0, z: 0, t: 1 };
      if (this.debugTracker) {
        this.debugTracker.line.style.opacity = '0';
        this.debugTracker.targetLine.style.opacity = '0';
      }
    }, 150) as unknown as number;
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
    // Query radius of 150px around projected point for target snapping
    const targets = this.quadtree.queryRadius(px, py, 150);
    
    const newPredictiveNodes = new Set<HTMLElement>();
    let snappedTarget: { cx: number, cy: number } | null = null;
    let minD = Infinity;
    
    targets.forEach(target => {
      if (target instanceof HTMLElement) {
        newPredictiveNodes.add(target);
        
        // Find closest interactive element to project line towards
        const className = target.className || '';
        const hasTailwindInteraction = typeof className === 'string' && 
                                      (className.includes('hover:') || 
                                       className.includes('active:') || 
                                       className.includes('focus:'));
                                       
        const isInteractiveNode = target.hasAttribute('data-on-click') || 
                                  target.hasAttribute('data-on-hover') ||
                                  target.hasAttribute('data-on-mouseenter') ||
                                  target.tagName === 'BUTTON' || 
                                  target.tagName === 'A' || 
                                  target.tagName === 'INPUT' ||
                                  target.tagName === 'SELECT' ||
                                  target.tagName === 'TEXTAREA' ||
                                  target.hasAttribute('data-bind') ||
                                  hasTailwindInteraction;
                                  
        if (isInteractiveNode) {
          const rect = target.getBoundingClientRect();
          const cx = rect.x + rect.width / 2;
          const cy = rect.y + rect.height / 2;
          const d = Math.hypot(cx - px, cy - py);
          if (d < minD) {
            minD = d;
            snappedTarget = { cx, cy };
          }
        }
      }
    });

    if (this.debugTracker) {
       this.debugTracker.svg.style.left = `${x}px`;
       this.debugTracker.svg.style.top = `${y}px`;
       
       const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
       const targetR = Math.min(80, Math.max(20, 20 + speed * 5));
       this.debugTracker.halo.setAttribute('r', targetR.toString());
       
       // Always show raw velocity trajectory (matching halo color)
       const trajX = 100 + (this.velocity.x * 200);
       const trajY = 100 + (this.velocity.y * 200);
       this.debugTracker.line.setAttribute('x2', trajX.toString());
       this.debugTracker.line.setAttribute('y2', trajY.toString());
       
       if (snappedTarget) {
         // Show active green snap line to predicted target
         const targetX = 100 + (snappedTarget.cx - x);
         const targetY = 100 + (snappedTarget.cy - y);
         this.debugTracker.targetLine.setAttribute('x2', targetX.toString());
         this.debugTracker.targetLine.setAttribute('y2', targetY.toString());
         this.debugTracker.targetLine.style.opacity = '1';
       } else {
         // Hide the targeting line completely if no interactive target is locked
         this.debugTracker.targetLine.style.opacity = '0';
         this.debugTracker.targetLine.setAttribute('x2', '100');
         this.debugTracker.targetLine.setAttribute('y2', '100');
       }
    }

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

import { SpriteModule } from '../index.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const predictiveModule: SpriteModule = {
  name: 'predictive',
  key: '$predictive',
  sprites: (context: RuntimeContext) => {
    // Inject the engine instance into context so other sprites can use its quadtree
    (context as any).predictive = predictive;
    
    return {
      getVelocity: () => predictive.getVelocity(),
      updateElement: (el: HTMLElement) => predictive.updateElement(el)
    };
  }
};

export default predictiveModule;
