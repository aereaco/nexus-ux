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

import { flip } from '../../engine/animation.ts';

export { flip };

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

import type { SpriteModule } from '../../engine/modules.ts';

export const animateSpriteModule: SpriteModule = {
  name: 'animate',
  key: '$animate',
  sprites: () => animate
};

export default animateSpriteModule;
