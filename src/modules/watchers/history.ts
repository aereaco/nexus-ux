// import { CUSTOM_EVENT_PREFIX } from '../../engine/consts.ts';

/**
 * History Watcher
 * Listens for 'popstate' events and dispatches a custom 'router:popstate' event
 * so the Router module can react to it via the standard event system if needed,
 * or simply creates a global hook.
 *
 * Actually, the Router module typically listens to window 'popstate' directly or logic.
 * But consistent with architecture, we might Normalize it?
 *
 * The plan says: "Adapt popstate -> router:popstate custom event bridge".
 */

export function initHistoryWatcher() {
  if (typeof window === 'undefined') return;

  globalThis.addEventListener('popstate', (event) => {
    // Dispatch custom event
    const e = new CustomEvent('router:popstate', {
      detail: {
        state: event.state,
        path: globalThis.location.pathname,
        hash: globalThis.location.hash,
        search: globalThis.location.search
      }
    });
    globalThis.dispatchEvent(e);
  });
}

// Auto-init for now? Or called by ModuleCoordinator?
// The plan lists it under 'watchers/'. 2025/modules/watchers/history.ts existed.
// If it's a module, it might need 'install'?
// But 'watchers' folder isn't a standard Module type in ModuleCoordinator yet (only Attribute, Action, Listener, Observer, Utility).
// 'listeners' are for element-scoped events.
// 'watchers' might be Utilities?
// The plan says "watchers/history.ts".
// I'll make it export an install function or just run on import?
// Better to export `init`.
