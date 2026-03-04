/**
 * Observer Registry & Coordinator.
 * 
 * Serves as the centralized registry for all observer services.
 * Each observer module (mutation, resize, intersection, performance)
 * defines its own observer and registers itself here.
 * 
 * This file does NOT instantiate any observers directly — that is
 * the responsibility of each module in `src/modules/observers/`.
 */

import { ObserverModule } from './modules.ts';
import { RuntimeContext } from './composition.ts';

/**
 * Registry entry: tracks the observer module and any active cleanup functions
 * for elements it has been attached to.
 */
interface ObserverRegistryEntry {
  module: ObserverModule;
  activeCleanups: Map<HTMLElement, () => void>;
}

/**
 * Central Observer Registry.
 * Observer modules register themselves here during engine init.
 * The engine can then attach/detach observers to DOM roots as needed.
 */
const registry = new Map<string, ObserverRegistryEntry>();

/**
 * Register an observer module with the registry.
 */
export function registerObserver(name: string, module: ObserverModule): void {
  registry.set(name, {
    module,
    activeCleanups: new Map(),
  });
}

/**
 * Retrieve a registered observer module by name.
 */
export function getObserver(name: string): ObserverModule | undefined {
  return registry.get(name)?.module;
}

/**
 * Attach a registered observer to an element (typically a root).
 * Returns a cleanup function, or undefined if the observer isn't registered.
 */
export function attachObserver(name: string, el: HTMLElement, runtime: RuntimeContext): (() => void) | undefined {
  const entry = registry.get(name);
  if (!entry) return undefined;

  // Prevent double-attach on the same element
  if (entry.activeCleanups.has(el)) return undefined;

  const cleanup = entry.module.observe(el, runtime);
  if (cleanup) {
    entry.activeCleanups.set(el, cleanup);
    return () => {
      cleanup();
      entry.activeCleanups.delete(el);
    };
  }
  return undefined;
}

/**
 * Detach a registered observer from a specific element.
 */
export function detachObserver(name: string, el: HTMLElement): void {
  const entry = registry.get(name);
  if (!entry) return;
  const cleanup = entry.activeCleanups.get(el);
  if (cleanup) {
    cleanup();
    entry.activeCleanups.delete(el);
  }
}

/**
 * Dispose of all registered observers, disconnecting everything.
 */
export function disposeObservers(): void {
  registry.forEach(entry => {
    entry.activeCleanups.forEach(cleanup => cleanup());
    entry.activeCleanups.clear();
  });
  registry.clear();
}
