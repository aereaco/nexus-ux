import { reactive, watch } from '../../engine/reactivity.ts';

// Initial state
const state = reactive({
  innerWidth: typeof globalThis.innerWidth !== 'undefined' ? globalThis.innerWidth : 1024,
  innerHeight: typeof globalThis.innerHeight !== 'undefined' ? globalThis.innerHeight : 768,
  outerWidth: typeof globalThis.outerWidth !== 'undefined' ? globalThis.outerWidth : 1024,
  outerHeight: typeof globalThis.outerHeight !== 'undefined' ? globalThis.outerHeight : 768,
  devicePixelRatio: typeof globalThis.devicePixelRatio !== 'undefined' ? globalThis.devicePixelRatio : 1,
  scrollX: typeof globalThis.scrollX !== 'undefined' ? globalThis.scrollX : 0,
  scrollY: typeof globalThis.scrollY !== 'undefined' ? globalThis.scrollY : 0,
  title: typeof document !== 'undefined' ? document.title : '',
  location: typeof globalThis.location !== 'undefined' ? globalThis.location.href : ''
});

// Update state on events
if (typeof globalThis.window !== 'undefined') {
  const updateSize = () => {
    state.innerWidth = globalThis.innerWidth;
    state.innerHeight = globalThis.innerHeight;
    state.outerWidth = globalThis.outerWidth;
    state.outerHeight = globalThis.outerHeight;
    state.devicePixelRatio = globalThis.devicePixelRatio;
  };

  const updateScroll = () => {
    state.scrollX = globalThis.scrollX;
    state.scrollY = globalThis.scrollY;
  };

  globalThis.addEventListener('resize', updateSize);
  globalThis.addEventListener('scroll', updateScroll);
}

// Sync title? 'title' event doesn't really exist on window, mostly mutation observer on head title?
// For now, we assume title is updated via _window.title = ... or other means.
// To detect external title changes (e.g. standard JS), we'd need MO.
if (typeof MutationObserver !== 'undefined') {
  const titleObserver = new MutationObserver(() => {
    if (state.title !== document.title) {
      state.title = document.title;
    }
  });
  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
}

// Side effects (Write back to Window)
if (typeof globalThis.window !== 'undefined') {
  watch(() => state.scrollX, (val) => {
    if (Math.abs(globalThis.scrollX - val) > 1) globalThis.scrollTo(val, globalThis.scrollY);
  });
  watch(() => state.scrollY, (val) => {
    if (Math.abs(globalThis.scrollY - val) > 1) globalThis.scrollTo(globalThis.scrollX, val);
  });
  watch(() => state.title, (val) => {
    if (document.title !== val) document.title = val;
  });
  watch(() => state.location, (val) => {
    if (globalThis.location.href !== val) globalThis.location.href = val;
  });
}

export const windowMirror = state;
