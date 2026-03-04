import { registerScopeProvider } from '../../engine/scope.ts';

/**
 * $refs Scope Provider Sprite
 * 
 * Provides access to the refs registry — a live map of elements marked
 * with `data-ref` attributes.
 * Usage: $refs.myInput.focus()
 * 
 * Previously a dead passthrough stub. Now properly implemented as a
 * scope provider that accesses runtime.refs.
 */
registerScopeProvider('$refs', (_el, runtime) => runtime.refs);
