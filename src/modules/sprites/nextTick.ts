import { RuntimeContext } from '../../engine/composition.ts';

export function nextTickSprite(_runtime: RuntimeContext) {
  return () => {
    return new Promise<void>((resolve) => {
      // We hook into scheduler?
      // queueMicrotask or requestAnimationFrame?
      // Internal scheduler has 'nextTick' phase.
      // Ideally we use scheduler.nextTick(resolve)

      // For now, simple microtask
      Promise.resolve().then(() => {
        // Check if scheduler is done?
        // Force layout?
        requestAnimationFrame(() => resolve());
      });
    });
  };
}

export default function(runtime: RuntimeContext) {
  return {
    $nextTick: nextTickSprite(runtime)
  };
}
