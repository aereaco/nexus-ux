import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { DEFAULT_THROTTLE_TIME } from '../../engine/consts.ts';
import { getTimerMap, parseCommandArg, resolveTimerDuration } from '../../engine/utils/timer.ts';
import { resolveTargetElements } from '../sprites/selector.ts';

export const throttleModifier: ModifierModule = {
  name: 'throttle',
  handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
    const cmd = parseCommandArg(arg);

    if (cmd.command === 'cancel' || cmd.command === 'reset') {
      if (typeof payload === 'function') {
        return (e: Event) => {
          const targets = resolveTargetElements(el, cmd.targetSelector);
          targets.forEach(target => {
            const map = getTimerMap(target);
            map.delete('throttle');
          });
          return payload(e);
        };
      }

      return (...args: any[]) => {
        const targets = resolveTargetElements(el, cmd.targetSelector);
        targets.forEach(target => {
          const map = getTimerMap(target);
          map.delete('throttle');
        });
        return typeof payload === 'function' ? payload(...args) : payload;
      };
    }

    if (typeof payload === 'function') {
      return (e: Event) => {
        const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_THROTTLE_TIME);
        const map = getTimerMap(el);
        const rec = map.get('throttle') || { last: 0 };
        const now = performance.now();
        if (now - rec.last > wait) {
          rec.last = now;
          map.set('throttle', rec);
          return payload(e);
        }
      };
    }

    return (...args: any[]) => {
      const wait = resolveTimerDuration(runtime, el, arg, DEFAULT_THROTTLE_TIME);
      const map = getTimerMap(el);
      const rec = map.get('throttle') || { last: 0 };
      const now = performance.now();
      if (now - rec.last > wait) {
        rec.last = now;
        map.set('throttle', rec);
        return typeof payload === 'function' ? payload(...args) : payload;
      }
    };
  }
};

export default throttleModifier;
