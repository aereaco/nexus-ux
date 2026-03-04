import { registerScopeProvider } from '../../engine/scope.ts';

/**
 * $global and $actions Scope Provider Sprites
 * 
 * $global: Provides direct access to the global signals namespace.
 * Usage: $global.mySignal, $global.$router.path
 * 
 * $actions: Provides direct access to the global actions registry.
 * Usage: $actions.myAction()
 * 
 * Previously hardcoded in the evaluator — now registered as modular sprites.
 */
registerScopeProvider('$global', (_el, runtime) => runtime.globalSignals());
registerScopeProvider('$actions', (_el, runtime) => runtime.globalActions());
