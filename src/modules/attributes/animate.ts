import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { animate as _animate } from '../sprites/animate.ts';

/**
 * data-animate Directive
 * 
 * Supports two modes:
 * 1. FLIP (data-animate-flip): Marks an element for FLIP-based reordering transitions.
 * 2. Class-based (data-animate="className"): Adds/removes an animation class based on a reactive expression.
 * 
 * Usage:
 * <div data-animate-flip>...</div>
 * <div data-animate="isHiding ? 'fade-out' : 'fade-in'">...</div>
 */
export const animateModule: AttributeModule = {
  name: 'animate',
  handle(el: HTMLElement, value: string, runtime: RuntimeContext) {
    const parsed = runtime.parseAttribute(el.getAttributeNames().find(a => a.startsWith('data-animate')) || 'data-animate', runtime, el);
    
    // Mode 1: FLIP marker
    if (parsed.modifiers?.includes('flip')) {
      // Mark element for potential FLIP transitions
      el.dataset.animateFlip = 'true';
      return;
    }

    // Mode 2: Class-based animation
    let lastClass = '';
    const cleanup = runtime.effect(() => {
      const result = runtime.evaluate(el, value);
      const newClass = typeof result === 'string' ? result : '';

      if (lastClass) el.classList.remove(lastClass);
      if (newClass) el.classList.add(newClass);
      lastClass = newClass;
    });

    return () => {
      cleanup();
      if (lastClass) el.classList.remove(lastClass);
    };
  }
};

export default animateModule;
