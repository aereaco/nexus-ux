import { ModifierModule } from '../modules.ts';
import { RuntimeContext } from '../composition.ts';

export type ModifierHandler = (
  payload: any,
  el: HTMLElement,
  arg: string,
  runtime: RuntimeContext
) => any;

/**
 * Factory for creating a standard ModifierModule.
 */
export function createModifier(name: string, handle: ModifierHandler): ModifierModule {
  return { name, handle };
}

/**
 * Factory for creating an event-guard modifier.
 * Automatically handles function payload wrapping and non-function passthrough.
 */
export function createGuardModifier(
  name: string,
  wrap: (handler: (e: Event) => any, el: HTMLElement, arg: string, runtime: RuntimeContext) => (e: Event) => any
): ModifierModule {
  return {
    name,
    handle: (payload: any, el: HTMLElement, arg: string, runtime: RuntimeContext) => {
      if (typeof payload === 'function') {
        return wrap(payload, el, arg, runtime);
      }
      return payload;
    }
  };
}
