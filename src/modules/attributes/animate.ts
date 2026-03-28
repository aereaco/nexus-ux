import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * data-animate Directive
 * 
 * Supports:
 * 1. FLIP (data-animate-flip): Marks an element for FLIP-based reordering transitions.
 * 2. Class-based (data-animate="className"): Adds/removes a class based on a reactive expression.
 * 3. Event-bound WAAPI (data-animate-click="[...]"): Runs WAAPI animations on events.
 */
export const animateModule: AttributeModule = {
  name: 'animate',
  handle(el: HTMLElement, _value: string, runtime: RuntimeContext) {
    const attrs = el.getAttributeNames().filter(a => a.startsWith('data-animate'));
    const cleanups: (() => void)[] = [];

    attrs.forEach(attr => {
      const value = el.getAttribute(attr) || '';
      if (!value && attr !== 'data-animate-flip') return;

      // 1. FLIP marker
      if (attr === 'data-animate-flip') {
        el.dataset.animateFlip = 'true';
        return;
      }

      // 2. Event-bound WAAPI (data-animate-click, etc.)
      const eventMatch = attr.match(/^data-animate-(click|hover|mouseenter|mouseleave|focus|blur|mousedown|mouseup)$/);
      if (eventMatch) {
         const eventName = eventMatch[1];
         const optionsAttr = `${attr}-options`;
         
         const runAnimation = () => {
           try {
              const keyframes = runtime.evaluate(el, value);
              const optionsValue = el.getAttribute(optionsAttr);
              const options = optionsValue ? runtime.evaluate(el, optionsValue) : { duration: 300, easing: 'ease' };
              
              if (Array.isArray(keyframes)) {
                el.animate(keyframes, options as any);
              }
           } catch (err) {
              console.warn(`[nexus] Animation failed for ${attr}:`, err);
           }
         };

         if (eventName === 'hover') {
            el.addEventListener('mouseenter', runAnimation);
            cleanups.push(() => el.removeEventListener('mouseenter', runAnimation));
         } else {
            el.addEventListener(eventName, runAnimation);
            cleanups.push(() => el.removeEventListener(eventName, runAnimation));
         }
         return;
      }

      // 3. Class-based (data-animate="...")
      if (attr === 'data-animate') {
        // Event-prefixed class syntax (hover:scale-110)
        const classEventMatch = value.match(/^(hover|click|focus|blur):(.+)$/);
        if (classEventMatch) {
           const [_, evt, cls] = classEventMatch;
           const name = evt === 'hover' ? 'mouseenter' : evt;
           const leaveName = evt === 'hover' ? 'mouseleave' : null;
           
           const onEnter = () => el.classList.add(cls);
           const onLeave = () => el.classList.remove(cls);
           
           el.addEventListener(name, onEnter);
           cleanups.push(() => el.removeEventListener(name, onEnter));
           
           if (leaveName) {
              el.addEventListener(leaveName, onLeave);
              cleanups.push(() => el.removeEventListener(leaveName, onLeave));
           }
        } else {
           // Reactive class logic
           let lastClass = '';
           const stop = runtime.effect(() => {
             const result = runtime.evaluate(el, value);
             const newClass = typeof result === 'string' ? result : '';

             if (lastClass && lastClass !== newClass) el.classList.remove(lastClass);
             if (newClass) el.classList.add(newClass);
             lastClass = newClass;
           });
           cleanups.push(() => {
             stop();
             if (lastClass) el.classList.remove(lastClass);
           });
        }
      }
    });

    return () => cleanups.forEach(c => c());
  }
};

export default animateModule;
