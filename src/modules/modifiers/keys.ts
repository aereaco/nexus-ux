import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

const isKeyboardEvent = (e: Event): e is KeyboardEvent => 'key' in e;

const createKeyModifier = (name: string, check: (e: KeyboardEvent) => boolean): ModifierModule => ({
  name,
  handle: (payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    if (typeof payload === 'function') {
      return (e: Event) => {
        if (isKeyboardEvent(e) && check(e)) {
          return payload(e);
        }
      };
    }
    return payload; // Keys don't apply to generic pipeline data flows lacking an Event
  }
});

export const enterModifier = createKeyModifier('enter', e => e.key === 'Enter');
export const escapeModifier = createKeyModifier('escape', e => e.key === 'Escape');
export const escModifier = createKeyModifier('esc', e => e.key === 'Escape');
export const spaceModifier = createKeyModifier('space', e => e.key === ' ' || e.key === 'Spacebar');
export const upModifier = createKeyModifier('up', e => e.key === 'ArrowUp' || e.key === 'Up');
export const downModifier = createKeyModifier('down', e => e.key === 'ArrowDown' || e.key === 'Down');
export const leftModifier = createKeyModifier('left', e => e.key === 'ArrowLeft' || e.key === 'Left');
export const rightModifier = createKeyModifier('right', e => e.key === 'ArrowRight' || e.key === 'Right');
export const tabModifier = createKeyModifier('tab', e => e.key === 'Tab');
export const deleteModifier = createKeyModifier('delete', e => e.key === 'Delete' || e.key === 'Backspace');
export const ctrlModifier = createKeyModifier('ctrl', e => e.ctrlKey);
export const altModifier = createKeyModifier('alt', e => e.altKey);
export const shiftModifier = createKeyModifier('shift', e => e.shiftKey);
export const metaModifier = createKeyModifier('meta', e => e.metaKey);

// We export an object of all key modifiers to hook into the autoloader.
export default {
  enter: enterModifier,
  escape: escapeModifier,
  esc: escModifier,
  space: spaceModifier,
  up: upModifier,
  down: downModifier,
  left: leftModifier,
  right: rightModifier,
  tab: tabModifier,
  delete: deleteModifier,
  ctrl: ctrlModifier,
  alt: altModifier,
  shift: shiftModifier,
  meta: metaModifier
};
