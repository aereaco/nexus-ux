/**
 * Nexus-UX Predictive Sprite Wrapper (Backward Compatibility)
 * Delegates directly to core engine: src/engine/predictive.ts
 */

import { corePredictiveEngine } from '../../engine/predictive.ts';
import { SpriteModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

export const predictive = corePredictiveEngine;

export const predictiveModule: SpriteModule = {
  name: 'predictive',
  key: '$predictive',
  sprites: (context: RuntimeContext): Record<string, unknown> => {
    (context as any).predictive = corePredictiveEngine;
    return corePredictiveEngine as unknown as Record<string, unknown>;
  },
};

export default predictiveModule;
