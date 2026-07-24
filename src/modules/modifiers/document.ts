/**
 * Nexus-UX Document Modifier
 *
 * Marker modifier that signals the event listener should be attached to
 * the document object instead of the element. Handled by on.ts during
 * listener construction.
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`:`) not an intent modifier (`-`).
 *   Used as: `data-on-click:document`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Marker only; payload is passed through unchanged.
 *   - Zero-serialization: No state is maintained.
 *
 * Coordination:
 *   - on.ts checks targetModifiers for 'document' and redirects listener
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Declarative window/document listener attachment via modifiers
 */

import { ModifierModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const documentModifier: ModifierModule = {
  name: 'document',
  handle: (_payload: any, _el: HTMLElement, _arg: string, _runtime: RuntimeContext) => {
    return _payload;
  }
};

export default documentModifier;
