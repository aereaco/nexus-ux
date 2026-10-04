/**
 * Nexus-UX Debounce Modifier
 *
 * Delays handler execution until after a specified wait time has elapsed
 * since the last invocation. Supports static and dynamic wait times.
 *
 * Argument Syntax:
 *   - `_debounce` — uses DEFAULT_DEBOUNCE_TIME (250ms)
 *   - `_debounce-500` — static 500ms delay
 *   - `_debounce-#delay` — dynamic delay from signal/expression
 *   - `_debounce.cancel` / `_debounce.flush` — imperative control commands
 */

import { DEFAULT_DEBOUNCE_TIME } from '../../engine/consts.ts';
import { createTimerModifier, clearTimer } from '../../engine/utils/timer.ts';

export const debounceModifier = createTimerModifier(
  'debounce',
  DEFAULT_DEBOUNCE_TIME,
  (run, wait, _el, rec, map) => {
    clearTimer(rec);
    const runner = () => {
      map.delete('debounce');
      run();
    };
    rec.timer = setTimeout(runner, wait) as unknown as number;
    rec.fn = runner;
    map.set('debounce', rec);
  },
  { supportsFlush: true, supportsNonFunctionPromise: true }
);

export default debounceModifier;
