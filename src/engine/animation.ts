import { RuntimeContext } from './composition.ts';
import { resolveSelector } from '../modules/sprites/selector.ts';

export interface SpatialOptions {
  duration?: number;
  easing?: string;
  useVT?: boolean;
}

/**
 * Nexus Core Animation Engine
 * Orchestrates WAAPI, FLIP, and View Transitions at the framework level.
 */
export class AnimationEngine {
  private initialRects = new Map<HTMLElement, DOMRect>();
  private isOrchestrating = false;

  constructor(private runtime: RuntimeContext) {}

  /**
   * Orchestrates a state change with guaranteed spatial transitions.
   * Uses a Hybrid Model: VT for layout shifts, FLIP/WAAPI for granular reorders.
   */
  async orchestrate(callback: () => void | Promise<void>, options: SpatialOptions = {}, root: HTMLElement = document.body) {
    if (this.isOrchestrating) return callback();
    this.isOrchestrating = true;

    try {
      const { duration = 300, easing = 'cubic-bezier(0.2, 0, 0, 1)', useVT = true } = options;

      // 1. Capture "Before" state (Surgical tracking instead of Document-wide)
      const trackedElements = Array.from(root.querySelectorAll('[data-spatial], [data-drag]')) as HTMLElement[];
      if (root.hasAttribute('data-spatial') || root.hasAttribute('data-drag')) trackedElements.push(root);

      trackedElements.forEach(el => this.initialRects.set(el, el.getBoundingClientRect()));

      // 2. Execute the mutation
      if (useVT && (document as any).startViewTransition) {
        const transition = (document as any).startViewTransition(async () => {
          await callback();
        });

        try {
          await transition.finished;
        } catch (e) {
          // Ignore interruption errors
        } finally {
          this.initialRects.clear();
        }
      } else {
        // Manual FLIP Fallback
        await callback();
        await new Promise(requestAnimationFrame);
        this.playFlip(trackedElements, duration, easing);
      }
    } finally {
      this.isOrchestrating = false;
    }
  }

  /**
   * Manual FLIP Implementation
   */
  private playFlip(targets: HTMLElement[], duration: number, easing: string) {
    targets.forEach(el => {
      const initialRect = this.initialRects.get(el);
      const finalRect = el.getBoundingClientRect();
      if (!initialRect) return;

      const dx = initialRect.left - finalRect.left;
      const dy = initialRect.top - finalRect.top;

      if (dx !== 0 || dy !== 0) {
        el.animate([
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' }
        ], {
          duration,
          easing
        });
      }
    });
    this.initialRects.clear();
  }

  /**
   * Assigns unique view-transition-names based on element key or id.
   */
  private injectTransitionNames(elements: HTMLElement[]) {
    elements.forEach(el => {
      const id = el.getAttribute('data-bind-id') || el.getAttribute('id') || (el as any)._nexus_key;
      if (id) {
        // Ensure the name is CSS-safe (starts with letter, no spaces)
        const name = `nexus-spatial-${id.replace(/[^a-zA-Z0-9]/g, '-')}`;
        el.style.setProperty('view-transition-name', name);
      }
    });
  }

  private clearTransitionNames(elements: HTMLElement[]) {
    elements.forEach(el => el.style.removeProperty('view-transition-name'));
  }
}

/**
 * Sprite Wrapper Driver
 */
export function createAnimateSprite(runtime: RuntimeContext) {
  const engine = new AnimationEngine(runtime);

  const animate = (el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    return el.animate(keyframes, options);
  };

  (animate as any).orchestrate = engine.orchestrate.bind(engine);
  
  return { $animate: animate };
}
