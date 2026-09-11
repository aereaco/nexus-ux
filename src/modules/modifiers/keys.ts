/**
 * Nexus-UX Keyboard Key Modifiers
 *
 * Factory and registry for keyboard-specific event modifiers. Each modifier
 * gates the handler on a specific key or key combination.
 *
 * Supported Modifiers:
 *   - enter, escape/esc, space, up, down, left, right, tab, delete
 *   - ctrl, shift, alt (boolean key state modifiers)
 *
 * NEG Token Boundary:
 *   These are behavior modifiers (`_`) not intent modifiers (`-`).
 *   Used as: `data-on-keydown_enter_ctrl`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: KeyboardEvent is passed by reference; no cloning.
 *   - Zero-serialization: Modifier state is a simple boolean check.
 *
 * Coordination:
 *   - on.ts applies these modifiers during event listener construction
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Declarative keyboard gating without manual keydown handling
 *   - Composable key + modifier combinations
 */

import { ModifierModule } from '../../engine/modules.ts';
import { createGuardModifier } from '../../engine/utils/modifier.ts';

const isKeyboardEvent = (e: Event): e is KeyboardEvent => 'key' in e;

const createKeyModifier = (name: string, check: (e: KeyboardEvent) => boolean): ModifierModule =>
  createGuardModifier(name, (fn) => (e) => {
    if (isKeyboardEvent(e) && check(e)) {
      return fn(e);
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
