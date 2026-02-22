/**
 * $animate Sprite
 * Provides imperative control over animations, including the FLIP (First, Last, Invert, Play) technique.
 */

export interface AnimationConfig {
  enter: string;
  enterStart: string;
  enterEnd: string;
  leave: string;
  leaveStart: string;
  leaveEnd: string;
}

/**
 * Executes a callback (which typically changes the DOM) and animates the transition
 * of elements marked with data-animate-flip.
 */
export async function flip(
  targets: Element[] | NodeListOf<Element>,
  changeCallback: () => void | Promise<void>,
  options: { duration?: number; easing?: string } = {}
) {
  const { duration = 300, easing = 'ease-out' } = options;
  const targetArray = Array.from(targets) as HTMLElement[];

  // 1. First: Capture the initial positions
  const initialRects = new Map<HTMLElement, DOMRect>();
  targetArray.forEach((el) => {
    initialRects.set(el, el.getBoundingClientRect());
  });

  // 2. Last: Execute the change
  await changeCallback();

  // 3. Invert & Play
  targetArray.forEach((el) => {
    const initialRect = initialRects.get(el);
    const finalRect = el.getBoundingClientRect();

    if (!initialRect) return;

    const dx = initialRect.left - finalRect.left;
    const dy = initialRect.top - finalRect.top;

    if (dx !== 0 || dy !== 0) {
      // Invert
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;

      // Force repaint
      el.offsetWidth;

      // Play
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = 'translate3d(0, 0, 0)';

      // Cleanup
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

export const getEffectDurations = (el: HTMLElement): number => {
  if (typeof globalThis.window === 'undefined') return 0;
  const styles = globalThis.window.getComputedStyle(el);
  
  // Handle comma-separated multiple transition durations (e.g., "0.3s, 0.6s")
  const parseDurations = (str: string) => {
    return str.split(',').map(s => parseFloat(s) * 1000 || 0);
  };
  
  const transDurations = parseDurations(styles.transitionDuration);
  const transDelays = parseDurations(styles.transitionDelay);
  const animDurations = parseDurations(styles.animationDuration);
  
  let maxTrans = 0;
  for (let i = 0; i < transDurations.length; i++) {
    const delay = transDelays[i] || 0;
    maxTrans = Math.max(maxTrans, transDurations[i] + delay);
  }
  
  const maxAnim = Math.max(...animDurations, 0);
  return Math.max(maxTrans, maxAnim);
};

const applyClasses = (el: HTMLElement, classString: string) => {
  if (!classString) return;
  classString.split(' ').filter(Boolean).forEach(c => el.classList.add(c));
};

const removeClasses = (el: HTMLElement, classString: string) => {
  if (!classString) return;
  classString.split(' ').filter(Boolean).forEach(c => el.classList.remove(c));
};

export const $animate = (
  el: HTMLElement, 
  state: 'enter' | 'leave', 
  config: Partial<AnimationConfig> = {}, 
  callback?: () => void
): void => {
  if (typeof globalThis.window === 'undefined') {
    if (callback) callback();
    return;
  }

  const base = state === 'enter' ? config.enter : config.leave;
  const start = state === 'enter' ? config.enterStart : config.leaveStart;
  const end = state === 'enter' ? config.enterEnd : config.leaveEnd;

  // 1. Setup Start State
  applyClasses(el, base || '');
  applyClasses(el, start || '');

  // Force reflow to ensure the 'start' state is painted
  void el.offsetHeight;

  // 2. Transition to End State (Requires double rAF to avoid "display: none" rendering gaps)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeClasses(el, start || '');
      applyClasses(el, end || '');

      const duration = getEffectDurations(el);
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        
        // Clean up all animation classes
        removeClasses(el, base || '');
        removeClasses(el, end || '');
        
        el.removeEventListener('transitionend', completionHandler);
        el.removeEventListener('transitioncancel', cleanup);
        
        if (callback) callback();
      };

      const completionHandler = (e: Event) => { if (e.target === el) cleanup(); };

      if (duration > 0) {
        el.addEventListener('transitionend', completionHandler);
        el.addEventListener('transitioncancel', cleanup);
        // Fallback timeout in case tab is backgrounded or events drop
        setTimeout(cleanup, duration + 50);
      } else {
        cleanup();
      }
    });
  });
};
