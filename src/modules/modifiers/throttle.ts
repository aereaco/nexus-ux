/**
 * Nexus-UX Throttle Modifier
 *
 * Limits handler execution to at most once per specified wait time window.
 *
 * Argument Syntax:
 *   - `_throttle` — uses DEFAULT_THROTTLE_TIME (250ms)
 *   - `_throttle-500` — static 500ms window
 *   - `_throttle-#ms` — dynamic delay from signal/expression
 *   - `_throttle.cancel` / `_throttle.reset` — reset throttle timestamp
 */

import { DEFAULT_THROTTLE_TIME } from '../../engine/consts.ts';
import { createTimerModifier } from '../../engine/utils/timer.ts';

export const throttleModifier = createTimerModifier(
  'throttle',
  DEFAULT_THROTTLE_TIME,
  (run, wait, _el, rec, map) => {
    const now = performance.now();
    const last = rec.last ?? 0;
    if (now - last > wait) {
      rec.last = now;
      map.set('throttle', rec);
      run();
    }
  },
  {
    supportsNonFunctionPromise: true,
    onCancel: (_target, map) => {
      map.delete('throttle');
    }
  }
);

export default throttleModifier;
