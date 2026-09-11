/**
 * Nexus-UX Hold Modifier (_hold)
 *
 * Delays event handler execution until the element is held down for a specified duration (default 500ms).
 * Cancels automatically if released (pointerup, touchend) or moved away (pointerleave, touchcancel) before wait.
 *
 * Usage:
 *   `data-on-pointerdown_hold="expression"` — default 500ms hold
 *   `data-on-pointerdown_hold-750="expression"` — 750ms hold
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Timer references are tracked directly in closure.
 *   - Zero-serialization: Clean event listener wrappers without string serialization.
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { getTimerMap, parseCommandArg } from '../../engine/utils/timer.ts';
import { resolveTargetElements } from '../sprites/selector.ts';

export const holdModifier: ModifierModule = {
  name: 'hold',
  handle: (payload: any, el: HTMLElement, arg: string, _runtime: RuntimeContext) => {
    const cmd = parseCommandArg(arg);

    if (cmd.command === 'cancel') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            const rec = map.get('hold');
            if (rec && rec.cleanup) {
              rec.cleanup();
              map.delete('hold');
            }
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getTimerMap(target);
          const rec = map.get('hold');
          if (rec && rec.cleanup) {
            rec.cleanup();
            map.delete('hold');
          }
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    const wait = parseInt(arg, 10) || 500;

    if (typeof payload === 'function') {
      return (e: Event) => {
        const map = getTimerMap(el);
        const existing = map.get('hold');
        if (existing && existing.cleanup) existing.cleanup();

        let timer: any = null;

        const cleanup = () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          map.delete('hold');
          window.removeEventListener('pointerup', cleanup);
          window.removeEventListener('pointercancel', cleanup);
          window.removeEventListener('pointerleave', cleanup);
          window.removeEventListener('touchend', cleanup);
          window.removeEventListener('touchcancel', cleanup);
        };

        timer = setTimeout(() => {
          cleanup();
          payload(e);
        }, wait);

        map.set('hold', { timer, cleanup });

        window.addEventListener('pointerup', cleanup, { once: true });
        window.addEventListener('pointercancel', cleanup, { once: true });
        window.addEventListener('pointerleave', cleanup, { once: true });
        window.addEventListener('touchend', cleanup, { once: true });
        window.addEventListener('touchcancel', cleanup, { once: true });
      };
    }

    return payload;
  }
};

export default holdModifier;
