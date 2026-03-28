/**
 * Provides universal, expressive control over animations (WAAPI, FLIP, Class Transitions).
 */
import { resolveSelector } from './selector.ts';

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
 * of elements using the FLIP (First, Last, Invert, Play) technique.
 */
export async function flip(
  targets: Element[] | NodeListOf<Element> | string,
  changeCallback: () => void | Promise<void>,
  options: { duration?: number; easing?: string } = {}
) {
  const { duration = 300, easing = 'ease-out' } = options;
  
  // Resolve targets using the core selector engine
  const targetArray = typeof targets === 'string' 
    ? Array.from(resolveSelector(document.body, targets)) as HTMLElement[]
    : Array.from(targets as any) as HTMLElement[];

  // 1. First: Capture the initial positions
  const initialRects = new Map<HTMLElement, DOMRect>();
  targetArray.forEach((el) => {
    initialRects.set(el, el.getBoundingClientRect());
  });

  // 2. Last: Execute the change
  await changeCallback();
  
  // Wait for Zenith reactive DOM cycle to settle completely before capturing final positions
  // We double-tick to ensure both the microtask (reactivity) and paint (layout) have occurred.
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

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

/**
 * Universal $animate Engine
 * Usage:
 *  - $animate($el, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 })
 *  - $animate.flip('.item', () => state.change())
 *  - $animate.out($el, { leave: 'fade-out' })
 */
export function animate(
  el: HTMLElement, 
  keyframesOrState: Keyframe[] | 'enter' | 'leave', 
  optionsOrConfig: KeyframeAnimationOptions | Partial<AnimationConfig> = {}, 
  callback?: () => void
): Animation | void {
  if (typeof globalThis.window === 'undefined') {
    if (callback) callback();
    return;
  }

  // Case 1: Native WAAPI Keyframes
  if (Array.isArray(keyframesOrState)) {
    const anim = el.animate(keyframesOrState, optionsOrConfig as KeyframeAnimationOptions);
    if (callback) anim.onfinish = callback;
    return anim;
  }

  // Case 2: Class Transitions (legacy)
  return $animate_legacy(el, keyframesOrState as 'enter' | 'leave', optionsOrConfig as Partial<AnimationConfig>, callback);
}

// Attach sub-methods for cleaner API
animate.flip = flip;
animate.out = (el: HTMLElement, config: Partial<AnimationConfig>, cb?: () => void) => animate(el, 'leave', config, cb);

/**
 * Legacy Class-based Transition Implementation
 */
function $animate_legacy(
  el: HTMLElement, 
  state: 'enter' | 'leave', 
  config: Partial<AnimationConfig> = {}, 
  callback?: () => void
): void {
  const base = state === 'enter' ? config.enter : config.leave;
  const start = state === 'enter' ? config.enterStart : config.leaveStart;
  const end = state === 'enter' ? config.enterEnd : config.leaveEnd;

  applyClasses(el, base || '');
  applyClasses(el, start || '');

  void el.offsetHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeClasses(el, start || '');
      applyClasses(el, end || '');

      const duration = getEffectDurations(el);
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        removeClasses(el, base || '');
        removeClasses(el, end || '');
        if (callback) callback();
      };

      if (duration > 0) {
        el.addEventListener('transitionend', (e) => { if (e.target === el) cleanup(); }, { once: true });
        setTimeout(cleanup, duration + 50);
      } else {
        cleanup();
      }
    });
  });
}

const getEffectDurations = (el: HTMLElement): number => {
  const styles = globalThis.window.getComputedStyle(el);
  const parse = (str: string) => str.split(',').map(s => parseFloat(s) * 1000 || 0);
  const trans = parse(styles.transitionDuration);
  const delay = parse(styles.transitionDelay);
  const anim = parse(styles.animationDuration);
  
  let max = 0;
  trans.forEach((d, i) => max = Math.max(max, d + (delay[i] || 0)));
  return Math.max(max, ...anim, 0);
};

const applyClasses = (el: HTMLElement, s: string) => s.split(' ').filter(Boolean).forEach(c => el.classList.add(c));
const removeClasses = (el: HTMLElement, s: string) => s.split(' ').filter(Boolean).forEach(c => el.classList.remove(c));
