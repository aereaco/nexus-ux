import { scheduler } from './scheduler.ts';

/**
 * 4D Predictive Engine
 * Spec 5.3: Tracks 4D Vector Velocity ($V_{xyzt}$) and projected interaction frustum.
 */

interface Point {
  x: number;
  y: number;
  z: number;
  t: number;
}

class PredictiveEngine {
  private lastPoint: Point | null = null;
  private velocity = { x: 0, y: 0, z: 0, t: 0 };
  private predictiveNodes: Set<HTMLElement> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => this.track(e.clientX, e.clientY));
      window.addEventListener('touchstart', (e) => {
        if (e.touches[0]) this.track(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
    }
  }

  private track(x: number, y: number, z: number = 0) {
    const t = performance.now();
    
    if (this.lastPoint) {
      const dt = t - this.lastPoint.t;
      if (dt > 0) {
        this.velocity = {
          x: (x - this.lastPoint.x) / dt,
          y: (y - this.lastPoint.y) / dt,
          z: (z - this.lastPoint.z) / dt,
          t: 1 // Directional intent
        };
        
        // Schedule prediction update in Capture phase
        scheduler.enqueueCapture(() => this.predict(x, y, z));
      }
    }
    
    this.lastPoint = { x, y, z, t };
  }

  /**
   * Projects the interaction frustum and identifies nodes to pre-warm.
   */
  private predict(x: number, y: number, z: number) {
    // 1. Calculate projected point (T+100ms)
    const px = x + this.velocity.x * 100;
    const py = y + this.velocity.y * 100;
    const pz = z + this.velocity.z * 100;

    // 2. Simple bounding box frustum search
    // In a real Zenith-class implementation, this would use a spatial index or 
    // quadtree. For now, we check elements under the projected point.
    const targets = document.elementsFromPoint(px, py);
    
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
