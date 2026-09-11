/**
 * Nexus-UX Window Modifier
 *
 * Marker modifier that signals the event listener should be attached to
 * the window object instead of the element. Handled by on.ts during
 * listener construction.
 *
 * NEG Token Boundary:
 *   This is a behavior modifier (`_`) not an intent modifier (`-`).
 *   Used as: `data-on-click_window`
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Marker only; payload is passed through unchanged.
 *   - Zero-serialization: No state is maintained.
 *
 * Coordination:
 *   - on.ts checks targetModifiers for 'window' and redirects listener
 *   - ModuleCoordinator registers via registerModifierModule
 *
 * Nexus-UX Innovation Preserved:
 *   - Declarative window/document listener attachment via modifiers
 */

import { ModifierModule } from '../../engine/modules.ts';
import { createModifier } from '../../engine/utils/modifier.ts';

export const windowModifier: ModifierModule = createModifier('window', (payload) => payload);

export default windowModifier;
