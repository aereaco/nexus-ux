import { TIMER_MAP_KEY } from '../consts.ts';
import { RuntimeContext } from '../composition.ts';

export interface TimerRecord {
  timer: number | null;
  fn?: () => void;
  cleanup?: () => void;
  last?: number;
}

/**
 * Access or initialize the per-element timer map for async modifiers.
 */
export function getTimerMap<T = TimerRecord>(el: HTMLElement): Map<string, T> {
  let map = (el as any)[TIMER_MAP_KEY];
  if (!map) {
    map = new Map<string, T>();
    (el as any)[TIMER_MAP_KEY] = map;
  }
  return map;
}

/**
 * Parses modifier command arguments of the form command or command(targetSelector).
 * E.g. cancel, cancel(#other), reset, flush(.list)
 */
export function parseCommandArg(arg: string): { command?: string; targetSelector?: string } {
  if (!arg) return {};
  const trimmed = arg.trim();
  const match = trimmed.match(/^([a-zA-Z]+)(?:\((.*)\))?$/i);
  if (match) {
    return {
      command: match[1].toLowerCase(),
      targetSelector: match[2]?.trim()
    };
  }
  return {};
}

/**
 * Resolves static or dynamic (#signal) duration numbers from modifier argument string.
 */
export function resolveTimerDuration(
  runtime: RuntimeContext,
  el: HTMLElement,
  arg: string,
  defaultDuration: number
): number {
  if (!arg) return defaultDuration;
  if (arg.startsWith('#')) {
    const val = runtime.evaluate(el, arg);
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isNaN(num) ? defaultDuration : num;
  }
  return parseInt(arg, 10) || defaultDuration;
}
