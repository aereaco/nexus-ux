/**
 * Nexus-UX Delay Modifier
 *
 * Delays handler execution by a fixed wait time. Unlike debounce, delay
 * always fires after the specified time regardless of subsequent calls.
 *
 * Argument Syntax:
 *   - `_delay` — uses DEFAULT_DEBOUNCE_TIME (250ms)
 *   - `_delay-500` — static 500ms delay
 *   - `_delay-#ms` — dynamic delay from signal/expression
 *   - `_delay.cancel` — imperative cancel command
 */

import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';
import { createTimerModifier, clearTimer } from '../../engine/utils/timer.ts';

export const delayModifier = createTimerModifier(
  'delay',
  DEFAULT_DEBOUNCE_TIME,
  (run, wait, _el, rec, map) => {
    clearTimer(rec);
    const runner = () => {
      map.delete('delay');
      run();
    };
    rec.timer = setTimeout(runner, wait) as unknown as number;
    rec.fn = runner;
    map.set('delay', rec);
  },
  { supportsNonFunctionPromise: true }
);

export default delayModifier;
