import { registerScopeProvider } from '../../engine/scope.ts';

/**
 * $el Scope Provider Sprite
 * 
 * Provides the current element reference in expression scope.
 * Usage: $el.classList.add('active')
 * 
 * Previously hardcoded in the evaluator — now registered as a modular sprite.
 */
registerScopeProvider('$el', (el) => el);
