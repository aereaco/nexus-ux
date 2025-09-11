/**
 * Nexus-UX CSP Build.
 *
 * Nexus-UX allows you to use JavaScript directly inside your HTML. This is an
 * incredibly powerful features. However, it violates the "unsafe-eval"
 * Content Security Policy. This alternate Nexus-UX build provides a
 * more constrained API for Nexus-UX that is also CSP-friendly...
 */
import State from '../../library/src/engine/state'

/**
 * _______________________________________________________
 * The Evaluator
 * -------------------------------------------------------
 *
 * By default, Nexus-UX's evaluator "eval"-like utilties to
 * interpret strings as runtime JS. We're going to use
 * a more CSP-friendly evaluator for this instead.
 */
import { cspEvaluator } from './evaluator'

State.setEvaluator(cspEvaluator)

/**
 * The rest of this file bootstraps Nexus-UX the way it is
 * normally bootstrapped in the default build. We will
 * set and define it's directives, magics, etc...
 */
import { reactive, effect, stop, toRaw } from '@vue/reactivity'

State.setReactivityEngine({ reactive, effect, release: stop, raw: toRaw })

import 'statejs/src/magics/index'

import 'statejs/src/directives/index'

export default State
