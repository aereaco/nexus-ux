import { reactive } from '../../engine/reactivity.ts';

const state = reactive({
  width: typeof window !== 'undefined' ? globalThis.screen.width : 1024,
  height: typeof window !== 'undefined' ? globalThis.screen.height : 768,
  orientation: typeof window !== 'undefined' && globalThis.screen.orientation ? globalThis.screen.orientation.type : 'landscape-primary',
  colorDepth: typeof window !== 'undefined' ? globalThis.screen.colorDepth : 24,
  pixelDepth: typeof window !== 'undefined' ? globalThis.screen.pixelDepth : 24
});

const cleanupFns: (() => void)[] = [];

// Screen properties generally update with window resize or orientation
const update = () => {
  state.width = globalThis.screen.width;
  state.height = globalThis.screen.height;
  state.colorDepth = globalThis.screen.colorDepth;
  state.pixelDepth = globalThis.screen.pixelDepth;
};

if (typeof window !== 'undefined') {
  globalThis.addEventListener('resize', update);
  cleanupFns.push(() => globalThis.removeEventListener('resize', update));

  if (globalThis.screen.orientation) {
    const onOrientationChange = () => {
      state.orientation = globalThis.screen.orientation.type;
      update();
    };
    globalThis.screen.orientation.addEventListener('change', onOrientationChange);
    cleanupFns.push(() => globalThis.screen.orientation.removeEventListener('change', onOrientationChange));
  }
}

export const screenMirror = state;

/** Tear down all listeners — for testing or micro-frontend teardown. */
export function dispose() { cleanupFns.forEach(fn => fn()); }
