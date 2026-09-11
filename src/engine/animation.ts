import { RuntimeContext } from './composition.ts';

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
      const trackedElements = Array.from(root.querySelectorAll('[data-flow], [data-drag]')) as HTMLElement[];
      if (root.hasAttribute('data-flow') || root.hasAttribute('data-drag')) trackedElements.push(root);

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
 * Executes a callback (which typically changes the DOM) and animates the transition
 * of elements using the FLIP (First, Last, Invert, Play) technique.
 */
export async function flip(
  targets: Element[] | NodeListOf<Element> | string | HTMLElement,
  changeCallback: () => void | Promise<void>,
  options: { duration?: number; easing?: string } = {}
) {
  const { duration = 300, easing = 'ease-out' } = options;

  let targetArray: HTMLElement[] = [];
  if (typeof targets === 'string') {
    targetArray = Array.from(document.querySelectorAll(targets)) as HTMLElement[];
  } else if (targets instanceof Element) {
    targetArray = [targets as HTMLElement];
  } else if (targets && (Array.isArray(targets) || typeof (targets as any)[Symbol.iterator] === 'function')) {
    targetArray = Array.from(targets as any) as HTMLElement[];
  }

  // 1. First: Capture the initial positions
  const initialRects = new Map<HTMLElement, DOMRect>();
  targetArray.forEach((el) => {
    if (el && typeof el.getBoundingClientRect === 'function') {
      initialRects.set(el, el.getBoundingClientRect());
    }
  });

  // 2. Last: Execute the change
  await changeCallback();

  // Wait for the reactive DOM cycle to settle completely before capturing final positions
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  // 3. Invert & Play
  targetArray.forEach((el) => {
    const initialRect = initialRects.get(el);
    if (!initialRect || !el || typeof el.getBoundingClientRect !== 'function') return;
    const finalRect = el.getBoundingClientRect();

    const dx = initialRect.left - finalRect.left;
    const dy = initialRect.top - finalRect.top;

    if (dx !== 0 || dy !== 0) {
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.offsetWidth; // Force repaint
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = 'translate3d(0, 0, 0)';

      el.addEventListener(
        'transitionend',
        () => {
          el.style.transition = '';
          el.style.transform = '';
        },
        { once: true }
      );
    }
  });
}
