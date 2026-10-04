/**
 * Nexus-UX Hold Modifier (_hold)
 *
 * Delays event handler execution until the element is held down for a specified duration (default 500ms).
 * Cancels automatically if released (pointerup, touchend) or moved away (pointerleave, touchcancel) before wait.
 *
 * Usage:
 *   `data-on-pointerdown_hold="expression"` — default 500ms hold
 *   `data-on-pointerdown_hold-750="expression"` — 750ms hold
 *   `data-on-click_hold.cancel="expression"` — cancel active hold timer
 */

import { createTimerModifier, clearTimer } from '../../engine/utils/timer.ts';

export const holdModifier = createTimerModifier(
  'hold',
  500,
  (run, wait, _el, rec, map) => {
    clearTimer(rec);

    const cleanup = () => {
      if (rec.timer) {
        clearTimeout(rec.timer);
        rec.timer = null;
      }
      map.delete('hold');
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      window.removeEventListener('pointerleave', cleanup);
      window.removeEventListener('touchend', cleanup);
      window.removeEventListener('touchcancel', cleanup);
    };

    rec.timer = setTimeout(() => {
      cleanup();
      run();
    }, wait) as unknown as number;
    rec.cleanup = cleanup;
    map.set('hold', rec);

    window.addEventListener('pointerup', cleanup, { once: true });
    window.addEventListener('pointercancel', cleanup, { once: true });
    window.addEventListener('pointerleave', cleanup, { once: true });
    window.addEventListener('touchend', cleanup, { once: true });
    window.addEventListener('touchcancel', cleanup, { once: true });
  },
  {
    onCancel: (_target, map) => {
      const rec = map.get('hold');
      if (rec?.cleanup) {
        rec.cleanup();
      }
      map.delete('hold');
    }
  }
);

export default holdModifier;
