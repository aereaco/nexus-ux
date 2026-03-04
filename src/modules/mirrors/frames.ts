import { customRef, Ref } from '../../engine/reactivity.ts';

/**
 * _frames Mirror
 * 
 * Reactive mirror for window frames and cross-frame communication.
 * Provides reactive access to frame properties and postMessage
 * communication with iframes.
 *
 * Usage:
 *   _frames.length                    — number of frames (reactive)
 *   _frames.list                      — array of frame info objects
 *   _frames.postMessage(index, data, origin)  — send message to frame
 */

// Helper to check if debug mode is active
const isDebug = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-debug');
};

interface FrameInfo {
  index: number;
  name: string;
  src: string;
}

let lengthRef: Ref<number> | null = null;
let listRef: Ref<FrameInfo[]> | null = null;

function ensureRefs() {
  if (!lengthRef) {
    lengthRef = customRef((track, trigger) => {
      let val = typeof globalThis.window !== 'undefined' ? globalThis.window.frames.length : 0;
      return {
        get() { track(); return val; },
        set(v: number) { val = v; trigger(); }
      };
    });
  }
  if (!listRef) {
    listRef = customRef((track, trigger) => {
      let val: FrameInfo[] = [];
      return {
        get() { track(); return val; },
        set(v: FrameInfo[]) { val = v; trigger(); }
      };
    });
  }
}

function scanFrames(): FrameInfo[] {
  if (typeof document === 'undefined') return [];
  const iframes = document.querySelectorAll('iframe');
  const result: FrameInfo[] = [];
  iframes.forEach((iframe, i) => {
    result.push({
      index: i,
      name: iframe.name || `frame-${i}`,
      src: iframe.src || ''
    });
  });
  return result;
}

function updateFrameState() {
  ensureRefs();
  if (typeof globalThis.window === 'undefined') return;
  if (lengthRef) lengthRef.value = globalThis.window.frames.length;
  if (listRef) listRef.value = scanFrames();
}

const framesMirrorTarget = {
  /**
   * Post a message to a frame by index.
   */
  postMessage(index: number, data: unknown, targetOrigin: string = '*') {
    if (typeof globalThis.window === 'undefined') return;
    try {
      const frame = globalThis.window.frames[index];
      if (frame) {
        frame.postMessage(data, targetOrigin);
        if (isDebug()) console.debug(`[_frames] postMessage to frame ${index}:`, data);
      }
    } catch (e) {
      if (isDebug()) console.error('[_frames] postMessage error:', e);
    }
  },

  /**
   * Post a message to a named frame.
   */
  postMessageByName(name: string, data: unknown, targetOrigin: string = '*') {
    if (typeof document === 'undefined') return;
    const iframe = document.querySelector(`iframe[name="${name}"]`) as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(data, targetOrigin);
      if (isDebug()) console.debug(`[_frames] postMessage to '${name}':`, data);
    }
  },

  /**
   * Force rescan of frames.
   */
  refresh() {
    updateFrameState();
  }
};

export const framesMirror = new Proxy(framesMirrorTarget as any, {
  get(target, key: string) {
    if (typeof key === 'symbol') return Reflect.get(target, key);
    if (key in target) return (target as any)[key];

    ensureRefs();

    switch (key) {
      case 'length':
        return lengthRef!.value;
      case 'list':
        return listRef!.value;
      default:
        return undefined;
    }
  },
  set() {
    if (isDebug()) console.warn('[_frames] Frames mirror is read-only');
    return false;
  }
});

// Auto-scan on init and watch for DOM changes
if (typeof globalThis.window !== 'undefined') {
  ensureRefs();
  updateFrameState();

  // Listen for messages from frames
  globalThis.addEventListener('message', (event: MessageEvent) => {
    if (isDebug()) console.debug('[_frames] Message received:', event.data, 'from', event.origin);
  });

  // Watch for iframe additions/removals
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const hasFrameChange = Array.from(mutation.addedNodes).some(n => (n as Element).tagName === 'IFRAME') ||
                                 Array.from(mutation.removedNodes).some(n => (n as Element).tagName === 'IFRAME');
          if (hasFrameChange) {
            updateFrameState();
            break;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
